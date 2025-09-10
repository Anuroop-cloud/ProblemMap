import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertProblemSchema, insertVoteSchema, insertEntrepreneurSchema } from "@shared/schema";
import { analyzeProblem, clusterProblems, analyzeSimilarity } from "./services/gemini";
import { fetchRedditData } from "./services/reddit";

const submitProblemSchema = insertProblemSchema.extend({
  originalText: z.string().min(50, "Problem description must be at least 50 characters"),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Check for similar problems before submission
  app.post("/api/problems/check-similarity", async (req, res) => {
    try {
      const { problemText } = req.body;
      if (!problemText || problemText.length < 20) {
        return res.status(400).json({ message: "Problem text must be at least 20 characters" });
      }

      // Get existing problems for comparison
      const existingProblems = await storage.getProblems({
        page: 1,
        limit: 50,
        sortBy: 'createdAt',
        order: 'desc'
      });

      const similarity = await analyzeSimilarity(problemText, existingProblems.map(p => ({
        id: p.id,
        summary: p.summary || p.originalText.substring(0, 200),
        originalText: p.originalText
      })));
      res.json(similarity);
    } catch (error) {
      console.error("Error checking similarity:", error);
      res.status(500).json({ message: "Failed to check for similar problems" });
    }
  });

  // Submit a new problem
  app.post("/api/problems", async (req, res) => {
    try {
      const data = submitProblemSchema.parse(req.body);
      
      // Check for duplicates first (optional - can be skipped if forced)
      const existingProblems = await storage.getProblems({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        order: 'desc'
      });
      
      const similarity = await analyzeSimilarity(data.originalText, existingProblems.map(p => ({
        id: p.id,
        summary: p.summary || p.originalText.substring(0, 200),
        originalText: p.originalText
      })));
      
      // If duplicate detected and not forced, return similarity analysis
      if (similarity.isDuplicate && !req.body.forceSubmit) {
        return res.status(409).json({
          message: "Similar problem detected",
          similarity,
          canForce: true
        });
      }
      
      // Analyze with Gemini
      const analysis = await analyzeProblem(data.originalText, data.source || 'User');
      
      const problem = await storage.createProblem({
        ...data,
        summary: analysis.summary,
        keywords: analysis.keywords,
        category: analysis.category,
        processed: true,
      });
      
      res.json(problem);
    } catch (error) {
      console.error("Error creating problem:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to create problem" 
      });
    }
  });

  // Get problems with filtering and pagination
  app.get("/api/problems", async (req, res) => {
    try {
      const {
        category,
        source,
        search,
        sortBy = 'createdAt',
        order = 'desc',
        page = '1',
        limit = '20'
      } = req.query;

      const problems = await storage.getProblems({
        category: category as string,
        source: source as string,
        search: search as string,
        sortBy: sortBy as string,
        order: order as 'asc' | 'desc',
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });
      
      res.json(problems);
    } catch (error) {
      console.error("Error fetching problems:", error);
      res.status(500).json({ message: "Failed to fetch problems" });
    }
  });

  // Vote on a problem
  app.post("/api/problems/:id/vote", async (req, res) => {
    try {
      const { id } = req.params;
      const { userIdentifier } = req.body;
      
      // Create the vote
      const vote = await storage.createVote({
        problemId: id,
        userIdentifier: userIdentifier || 'anonymous',
      });
      
      // Update problem score based on vote count
      const updatedProblem = await storage.updateProblemScore(id);
      
      res.json({ vote, problem: updatedProblem });
    } catch (error) {
      console.error("Error creating vote:", error);
      res.status(400).json({ message: "Failed to create vote" });
    }
  });

  // Load Reddit data
  app.post("/api/load-reddit-data", async (req, res) => {
    try {
      const { subreddits } = req.body;
      const redditProblems = await fetchRedditData(subreddits);
      
      const processedProblems = [];
      for (const problemData of redditProblems) {
        try {
          const analysis = await analyzeProblem(problemData.originalText, 'Reddit');
          const problem = await storage.createProblem({
            ...problemData,
            summary: analysis.summary,
            keywords: analysis.keywords,
            category: analysis.category,
            processed: true,
          });
          processedProblems.push(problem);
        } catch (error) {
          console.error("Error processing Reddit problem:", error);
        }
      }
      
      res.json({ 
        message: `Loaded and processed ${processedProblems.length} problems from Reddit`,
        problems: processedProblems 
      });
    } catch (error) {
      console.error("Error loading Reddit data:", error);
      res.status(500).json({ message: "Failed to load Reddit data" });
    }
  });

  // Get problem clusters
  app.get("/api/clusters", async (req, res) => {
    try {
      const problems = await storage.getProblemsForClustering();
      const clusters = await clusterProblems(problems);
      res.json(clusters);
    } catch (error) {
      console.error("Error getting clusters:", error);
      res.status(500).json({ message: "Failed to get clusters" });
    }
  });

  // Get entrepreneurs
  app.get("/api/entrepreneurs", async (req, res) => {
    try {
      const { expertise, search } = req.query;
      const entrepreneurs = await storage.getEntrepreneurs({
        expertise: expertise as string,
        search: search as string,
      });
      res.json(entrepreneurs);
    } catch (error) {
      console.error("Error fetching entrepreneurs:", error);
      res.status(500).json({ message: "Failed to fetch entrepreneurs" });
    }
  });

  // Create entrepreneur profile
  app.post("/api/entrepreneurs", async (req, res) => {
    try {
      const data = insertEntrepreneurSchema.parse(req.body);
      const entrepreneur = await storage.createEntrepreneur(data);
      res.json(entrepreneur);
    } catch (error) {
      console.error("Error creating entrepreneur:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to create entrepreneur" 
      });
    }
  });

  // Get matching entrepreneurs for a problem
  app.get("/api/problems/:id/matches", async (req, res) => {
    try {
      const { id } = req.params;
      const matches = await storage.getMatchingEntrepreneurs(id);
      res.json(matches);
    } catch (error) {
      console.error("Error finding entrepreneur matches:", error);
      res.status(500).json({ message: "Failed to find entrepreneur matches" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
