import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertProblemSchema, insertVoteSchema, insertEntrepreneurSchema } from "@shared/schema";
import { analyzeProblem, clusterProblems, analyzeSimilarity } from "./services/gemini";
import { fetchRedditData } from "./services/reddit";

// Helper function to sanitize CSV fields to prevent injection attacks
function sanitizeCSVField(field: any): string {
  if (field === null || field === undefined) {
    return '';
  }
  
  let sanitized = String(field);
  
  // Replace quotes with double quotes for CSV escaping
  sanitized = sanitized.replace(/"/g, '""');
  
  // Prevent CSV injection by sanitizing fields that start with dangerous characters
  const dangerousChars = ['=', '+', '-', '@', '\t', '\r'];
  if (dangerousChars.some(char => sanitized.startsWith(char))) {
    // Prefix with single quote to neutralize formula execution
    sanitized = "'" + sanitized;
  }
  
  return sanitized;
}

// Helper functions for data export
function convertProblemsToCSV(problems: any[]): string {
  const headers = [
    'ID', 'Summary', 'Category', 'Source', 'Original Text', 'Keywords', 'Score', 'Created At'
  ];
  
  const rows = problems.map(problem => [
    sanitizeCSVField(problem.id),
    sanitizeCSVField(problem.summary),
    sanitizeCSVField(problem.category),
    sanitizeCSVField(problem.source),
    sanitizeCSVField(problem.originalText || '').substring(0, 500),
    sanitizeCSVField((problem.keywords || []).join(', ')),
    sanitizeCSVField(problem.score || 0),
    sanitizeCSVField(problem.createdAt ? new Date(problem.createdAt).toISOString() : '')
  ]);
  
  return [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
}

function convertClustersToCSV(clusters: any[]): string {
  const headers = [
    'Cluster Name', 'Innovation Gap', 'Problem Count', 'Keywords', 'Problem IDs', 'Summary'
  ];
  
  const rows = clusters.map(cluster => [
    sanitizeCSVField(cluster.clusterName || ''),
    sanitizeCSVField(cluster.innovationGap || ''),
    sanitizeCSVField((cluster.problemIds || []).length),
    sanitizeCSVField((cluster.keywords || []).join(', ')),
    sanitizeCSVField((cluster.problemIds || []).join(', ')),
    sanitizeCSVField(cluster.summary || '')
  ]);
  
  return [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
}

function convertAnalyticsToCSV(analytics: any): string {
  const summaryData = [
    ['Metric', 'Value'],
    ['Total Problems', analytics.summary?.totalProblems || 0],
    ['Total Clusters', analytics.summary?.totalClusters || 0],
    ['Total Entrepreneurs', analytics.summary?.totalEntrepreneurs || 0],
    ['', ''],
    ['Problems by Category', ''],
    ...Object.entries(analytics.summary?.problemsByCategory || {}).map(([category, count]) => [category, count]),
    ['', ''],
    ['Problems by Source', ''],
    ...Object.entries(analytics.summary?.problemsBySource || {}).map(([source, count]) => [source, count]),
    ['', ''],
    ['Clusters by Innovation Gap', ''],
    ...Object.entries(analytics.summary?.clustersByInnovationGap || {}).map(([gap, count]) => [gap, count]),
    ['', ''],
    ['Top Keywords', ''],
    ...(analytics.summary?.topKeywords || []).map((kw: any) => [kw?.keyword || '', kw?.count || 0])
  ];
  
  return summaryData
    .map(row => row.map((field: any) => `"${sanitizeCSVField(field)}"`).join(','))
    .join('\n');
}

function generateCategoryStats(problems: any[]): Record<string, number> {
  const stats: Record<string, number> = {};
  problems.forEach(problem => {
    const category = problem.category || 'Unknown';
    stats[category] = (stats[category] || 0) + 1;
  });
  return stats;
}

function generateSourceStats(problems: any[]): Record<string, number> {
  const stats: Record<string, number> = {};
  problems.forEach(problem => {
    stats[problem.source] = (stats[problem.source] || 0) + 1;
  });
  return stats;
}

function generateInnovationGapStats(clusters: any[]): Record<string, number> {
  const stats: Record<string, number> = {};
  clusters.forEach(cluster => {
    stats[cluster.innovationGap] = (stats[cluster.innovationGap] || 0) + 1;
  });
  return stats;
}

function generateTopKeywords(problems: any[]): Array<{ keyword: string; count: number }> {
  const keywordCounts: Record<string, number> = {};
  
  problems.forEach(problem => {
    if (problem.keywords) {
      problem.keywords.forEach((keyword: string) => {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      });
    }
  });
  
  return Object.entries(keywordCounts)
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

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

  // Export problems data
  app.get("/api/export/problems", async (req, res) => {
    try {
      const {
        format = 'json',
        category,
        source,
        search,
        sortBy = 'createdAt',
        order = 'desc'
      } = req.query as {
        format?: 'json' | 'csv';
        category?: string;
        source?: string;
        search?: string;
        sortBy?: string;
        order?: 'asc' | 'desc';
      };

      const problems = await storage.getProblems({
        category,
        source,
        search,
        sortBy,
        order,
        page: 1,
        limit: 10000, // Export up to 10k problems with filtering
      });

      const filename = `problems-${new Date().toISOString().split('T')[0]}${category ? `-${category}` : ''}${source ? `-${source}` : ''}`;

      if (format === 'csv') {
        const csvData = convertProblemsToCSV(problems);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
        res.send(csvData);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.json`);
        res.json({
          exportDate: new Date().toISOString(),
          filters: { category, source, search, sortBy, order },
          totalProblems: problems.length,
          data: problems
        });
      }
    } catch (error) {
      console.error("Error exporting problems:", error);
      res.status(500).json({ message: "Failed to export problems" });
    }
  });

  // Export clusters data
  app.get("/api/export/clusters", async (req, res) => {
    try {
      const {
        format = 'json',
        category,
        source,
        search
      } = req.query as {
        format?: 'json' | 'csv';
        category?: string;
        source?: string;
        search?: string;
      };

      // Get filtered problems if filters are applied
      const filteredProblems = await storage.getProblems({
        category,
        source,
        search,
        page: 1,
        limit: 10000,
        sortBy: 'createdAt',
        order: 'desc'
      });

      // Use filtered problems for clustering if filters are applied, otherwise get all clustering data
      const clusteringData = (category || source || search) 
        ? filteredProblems.filter(p => p.processed)
        : await storage.getProblemsForClustering();
      
      const clusters = await clusterProblems(clusteringData);

      const clustersWithProblems = clusters.map((cluster: any) => ({
        ...cluster,
        problems: cluster.problemIds.map((id: string) => filteredProblems.find(p => p.id === id)).filter(Boolean)
      }));

      const filename = `clusters-${new Date().toISOString().split('T')[0]}${category ? `-${category}` : ''}${source ? `-${source}` : ''}`;

      if (format === 'csv') {
        const csvData = convertClustersToCSV(clustersWithProblems);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
        res.send(csvData);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.json`);
        res.json({
          exportDate: new Date().toISOString(),
          filters: { category, source, search },
          totalClusters: clustersWithProblems.length,
          data: clustersWithProblems
        });
      }
    } catch (error) {
      console.error("Error exporting clusters:", error);
      res.status(500).json({ message: "Failed to export clusters" });
    }
  });

  // Export analytics data
  app.get("/api/export/analytics", async (req, res) => {
    try {
      const {
        format = 'json',
        category,
        source,
        search
      } = req.query as {
        format?: 'json' | 'csv';
        category?: string;
        source?: string;
        search?: string;
      };
      
      const problems = await storage.getProblems({
        category,
        source,
        search,
        page: 1,
        limit: 10000,
        sortBy: 'createdAt',
        order: 'desc'
      });
      
      // Use filtered problems for clustering if filters are applied
      const clusteringData = (category || source || search) 
        ? problems.filter(p => p.processed)
        : await storage.getProblemsForClustering();
      
      const clusters = await clusterProblems(clusteringData);
      const entrepreneurs = await storage.getEntrepreneurs({});

      // Generate analytics summary
      const analytics = {
        summary: {
          totalProblems: problems.length,
          totalClusters: clusters.length,
          totalEntrepreneurs: entrepreneurs.length,
          problemsByCategory: generateCategoryStats(problems),
          problemsBySource: generateSourceStats(problems),
          clustersByInnovationGap: generateInnovationGapStats(clusters),
          topKeywords: generateTopKeywords(problems),
        },
        problems,
        clusters,
        entrepreneurs
      };

      const filename = `analytics-${new Date().toISOString().split('T')[0]}${category ? `-${category}` : ''}${source ? `-${source}` : ''}`;

      if (format === 'csv') {
        const csvData = convertAnalyticsToCSV(analytics);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
        res.send(csvData);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.json`);
        res.json({
          exportDate: new Date().toISOString(),
          filters: { category, source, search },
          ...analytics
        });
      }
    } catch (error) {
      console.error("Error exporting analytics:", error);
      res.status(500).json({ message: "Failed to export analytics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
