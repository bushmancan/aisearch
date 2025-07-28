import { GoogleGenAI } from "@google/genai";
import type { AnalysisResults } from "../../shared/schema";
import { createSecureApiClient, safeLog, safeLogError } from "../utils/security";

const ai = createSecureApiClient(GoogleGenAI, 'GEMINI_API_KEY');

export interface FollowUpResponse {
  answer: string;
  relatedRecommendations?: string[];
}

export async function handleFollowUpQuestion(
  question: string,
  analysisResults: AnalysisResults,
  websiteUrl: string
): Promise<FollowUpResponse> {
  try {
    if (!ai) {
      throw new Error('AI service not available - please check API configuration');
    }

    // Add validation for required fields
    if (!question || question.trim().length === 0) {
      throw new Error("Question cannot be empty");
    }

    if (!analysisResults || !websiteUrl) {
      throw new Error("Analysis results and website URL are required");
    }

    const systemPrompt = `You are an expert LLM Visibility Auditor providing follow-up clarification on website analysis results. 

The user has already received a comprehensive analysis of their website and now has a specific follow-up question about the results.

Website analyzed: ${websiteUrl}

Original analysis results:
- Overall Score: ${analysisResults.overallScore || 'N/A'}
- SEO Score: ${analysisResults.seoScore || 'N/A'}
- Technical Score: ${analysisResults.techScore || 'N/A'}
- Content Score: ${analysisResults.contentScore || 'N/A'}
- Accessibility Score: ${analysisResults.accessibilityScore || 'N/A'}

Key findings from the analysis:
${analysisResults.recommendations ? JSON.stringify(analysisResults.recommendations, null, 2) : 'No recommendations available'}

Narrative report summary:
${analysisResults.narrativeReport ? analysisResults.narrativeReport.substring(0, 500) + '...' : 'No narrative report available'}

Your task is to:
1. Answer the user's specific question with detailed, actionable insights
2. Reference specific findings from the original analysis when relevant
3. Provide concrete, implementable recommendations
4. Focus on AI search visibility (ChatGPT, Gemini, Perplexity) implications
5. Keep the response conversational but professional
6. If the question relates to a specific recommendation, explain the reasoning and impact

Respond in JSON format with:
{
  "answer": "Your detailed answer to the question",
  "relatedRecommendations": ["array", "of", "related", "actionable", "recommendations"]
}`;

    const userPrompt = `User's follow-up question: "${question}"

Please provide a detailed answer based on the analysis results for ${websiteUrl}.`;

    const response = await Promise.race([
      ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              answer: { type: "string" },
              relatedRecommendations: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["answer"]
          }
        },
        contents: userPrompt
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AI response timeout - please try asking a simpler question')), 45000)
      )
    ]) as any;

    const rawJson = response.text;
    safeLog(`Follow-up response JSON length: ${rawJson?.length || 0}`);

    if (rawJson) {
      const followUpResponse: FollowUpResponse = JSON.parse(rawJson);
      return followUpResponse;
    } else {
      throw new Error("Empty response from model");
    }
  } catch (error) {
    safeLogError("Follow-up question error:", error);
    
    // More specific error handling
    if (error instanceof Error && error.message.includes('JSON')) {
      throw new Error("Failed to parse AI response. Please try again.");
    }
    
    throw new Error(`Failed to process follow-up question: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}