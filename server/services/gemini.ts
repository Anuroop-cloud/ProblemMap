import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "" });

export interface ProblemAnalysis {
  summary: string;
  keywords: string[];
  category: string;
}

export async function analyzeProblem(text: string, source: string): Promise<ProblemAnalysis> {
  try {
    const systemPrompt = `Analyze this problem and provide a summary, keywords, and category.
    
Instructions:
- Summarize the problem in 3 sentences or less, focusing on the core issue
- Extract 3-5 relevant keywords that capture the essence of the problem
- Categorize into one of: Traffic, Environment, Education, Healthcare, Governance, Technology, Other
- Consider the source context (Reddit vs User submission)

Respond with JSON in this exact format:
{"summary": "string", "keywords": ["string"], "category": "string"}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            keywords: { 
              type: "array",
              items: { type: "string" }
            },
            category: { type: "string" }
          },
          required: ["summary", "keywords", "category"]
        }
      },
      contents: `Problem text: "${text}"\nSource: ${source}`
    });

    const rawJson = response.text;
    if (rawJson) {
      const analysis: ProblemAnalysis = JSON.parse(rawJson);
      return analysis;
    } else {
      throw new Error("Empty response from Gemini");
    }
  } catch (error) {
    console.error("Failed to analyze problem with Gemini:", error);
    // Fallback analysis
    return {
      summary: text.length > 200 ? text.substring(0, 200) + "..." : text,
      keywords: [],
      category: "Other"
    };
  }
}

export async function clusterProblems(problems: Array<{ id: string; summary: string; keywords: string[] }>): Promise<Array<{
  clusterName: string;
  problemIds: string[];
  commonThemes: string[];
  innovationGaps: number;
}>> {
  try {
    // If we have very few problems, create simple clusters
    if (problems.length < 3) {
      return problems.map(problem => ({
        clusterName: problem.keywords[0] || "Miscellaneous Issues",
        problemIds: [problem.id],
        commonThemes: problem.keywords.slice(0, 3),
        innovationGaps: 7
      }));
    }

    const systemPrompt = `Analyze these problems and group them into meaningful clusters based on similarity.

Instructions:
- Group similar problems together based on themes, keywords, and problem domains
- Create 2-5 meaningful clusters (fewer clusters for better coherence)
- Give each cluster a descriptive name that captures the essence of the problems
- Identify common themes that span across problems in each cluster
- Estimate innovation gaps (1-10 scale) where 10 = highly innovative opportunity, 1 = already well solved
- Ensure every problem ID appears in exactly one cluster

Format your response as a JSON array of cluster objects.`;

    const problemsForPrompt = problems.map(p => ({
      id: p.id,
      summary: p.summary.substring(0, 150) + (p.summary.length > 150 ? "..." : ""),
      keywords: p.keywords
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              clusterName: { type: "string" },
              problemIds: { type: "array", items: { type: "string" } },
              commonThemes: { type: "array", items: { type: "string" } },
              innovationGaps: { type: "number", minimum: 1, maximum: 10 }
            },
            required: ["clusterName", "problemIds", "commonThemes", "innovationGaps"]
          }
        },
        temperature: 0.3
      },
      contents: `Problems to analyze and cluster:\n${JSON.stringify(problemsForPrompt, null, 2)}`
    });

    const rawJson = response.text;
    if (rawJson) {
      const clusters: Array<{
        clusterName: string;
        problemIds: string[];
        commonThemes: string[];
        innovationGaps: number;
      }> = JSON.parse(rawJson);
      // Validate that all problems are included
      const allIds = new Set(problems.map(p => p.id));
      const clusteredIds = new Set(clusters.flatMap((c: any) => c.problemIds));
      
      // Add any missing problems to a miscellaneous cluster
      const missingIds = Array.from(allIds).filter(id => !clusteredIds.has(id));
      if (missingIds.length > 0) {
        clusters.push({
          clusterName: "Miscellaneous Issues",
          problemIds: missingIds,
          commonThemes: ["other", "miscellaneous"],
          innovationGaps: 5
        });
      }
      
      return clusters.filter((c: any) => c.problemIds.length > 0);
    }
    return createFallbackClusters(problems);
  } catch (error) {
    console.error("Failed to cluster problems:", error);
    return createFallbackClusters(problems);
  }
}

function createFallbackClusters(problems: Array<{ id: string; summary: string; keywords: string[] }>) {
  // Group by common keywords or create individual clusters
  const keywordGroups = new Map<string, string[]>();
  
  problems.forEach(problem => {
    const primaryKeyword = problem.keywords[0] || "other";
    if (!keywordGroups.has(primaryKeyword)) {
      keywordGroups.set(primaryKeyword, []);
    }
    keywordGroups.get(primaryKeyword)!.push(problem.id);
  });

  return Array.from(keywordGroups.entries()).map(([keyword, ids]) => ({
    clusterName: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Related Issues`,
    problemIds: ids,
    commonThemes: [keyword, "user-reported", "community-driven"],
    innovationGaps: 6
  }));
}
