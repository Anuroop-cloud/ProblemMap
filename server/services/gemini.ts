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
    const systemPrompt = `Analyze these problems and group them into clusters based on similarity.
    
Instructions:
- Group similar problems together based on themes and keywords
- Create 4-8 meaningful clusters
- Give each cluster a descriptive name
- Identify common themes across problems in each cluster
- Estimate innovation gaps (0-10 scale) based on how many unsolved aspects exist

Respond with JSON array of clusters.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
              innovationGaps: { type: "number" }
            },
            required: ["clusterName", "problemIds", "commonThemes", "innovationGaps"]
          }
        }
      },
      contents: `Problems to cluster: ${JSON.stringify(problems)}`
    });

    const rawJson = response.text;
    if (rawJson) {
      return JSON.parse(rawJson);
    }
    return [];
  } catch (error) {
    console.error("Failed to cluster problems:", error);
    return [];
  }
}
