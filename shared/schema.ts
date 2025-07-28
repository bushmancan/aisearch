import { pgTable, text, serial, timestamp, jsonb, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  status: text("status").notNull().default("pending"), // pending, completed, failed
  overallScore: real("overall_score"),
  aiLlmVisibilityScore: real("ai_llm_visibility_score"), // AI/LLM Visibility Score
  techScore: real("tech_score"),
  contentScore: real("content_score"),
  accessibilityScore: real("accessibility_score"),
  authorityScore: real("authority_score"), // NEW: Authority & Trust Signals Score
  results: jsonb("results"),
  originIp: text("origin_ip"), // IP address of analysis requester
  userAgent: text("user_agent"), // Browser/client information
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastRequested: timestamp("last_requested").defaultNow().notNull(), // Last time this analysis was requested (even if cached)
});

export const insertAnalysisSchema = createInsertSchema(analyses).pick({
  url: true,
});

export const analysisRequestSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
});

export const multiPageAnalysisRequestSchema = z.object({
  domain: z.string().url("Please enter a valid domain"),
  paths: z.array(z.string()).min(1, "At least one path is required").max(5, "Maximum 5 pages allowed"),
  analysisType: z.literal("multi-page").default("multi-page"),
  password: z.string().min(1, "Password is required for multi-page analysis"),
});

export const emailReportSchema = z.object({
  email: z.string().min(1, "Email is required").refine((val) => {
    // Support multiple emails separated by commas
    const emails = val.split(',').map(email => email.trim());
    return emails.every(email => z.string().email().safeParse(email).success);
  }, "Please enter valid email addresses separated by commas"),
  name: z.string().min(1),
  company: z.string().optional(),
  analysisId: z.number(), // 0 = multi-page analysis, >0 = single-page analysis ID
  marketingOptIn: z.boolean().optional(), // Optional marketing opt-in
  websiteUrl: z.string().url().optional(),
  analysisResults: z.any().optional() // Flexible for both single-page and multi-page analysis
});

export const followUpQuestionSchema = z.object({
  question: z.string().min(1, "Please enter your question"),
  analysisId: z.number(),
  analysisResults: z.object({}).passthrough() // Allow any analysis results object
});

export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analyses.$inferSelect;
export type AnalysisRequest = z.infer<typeof analysisRequestSchema>;
export type MultiPageAnalysisRequest = z.infer<typeof multiPageAnalysisRequestSchema>;
export type EmailReportRequest = z.infer<typeof emailReportSchema>;
export type FollowUpQuestionRequest = z.infer<typeof followUpQuestionSchema>;



export interface AnalysisResults {
  overallScore: number;
  aiLlmVisibilityScore: number; // AI/LLM Visibility Score (renamed from seoScore)
  techScore: number;
  contentScore: number;
  accessibilityScore: number;
  authorityScore: number; // Authority & Trust Signals Score
  structuredData: {
    schemaTypes: string[];
    jsonLdFound: boolean;
    jsonLdBlocks: number;
    recommendations: string[];
  };
  metadata: {
    titleTag: {
      present: boolean;
      length: number;
      status: 'optimal' | 'too_short' | 'too_long';
    };
    metaDescription: {
      present: boolean;
      length: number;
      status: 'optimal' | 'too_short' | 'too_long';
    };
    openGraph: {
      title: boolean;
      description: boolean;
      image: boolean;
      imageSize?: string;
    };
  };
  contentVisibility: {
    aiCrawlability: number;
    botAccess: number;
    contentQuality: number;
  };
  technicalSeo: {
    https: boolean;
    mobileOptimized: boolean;
    pageSpeed: 'good' | 'needs_improvement' | 'poor';
    botAccessibility: {
      gptBot: boolean;
      claudeBot: boolean;
      ccBot: boolean;
      googleBot: boolean;
    };
  };
  authoritySignals: {
    authorInfo: boolean;
    credentials: boolean;
    aboutPage: boolean;
    contactInfo: boolean;
    privacyPolicy: boolean;
    socialProof: 'high' | 'medium' | 'low';
  };
  citationPotential: {
    relevanceScore: number;
    authorityScore: number;
    citationReadiness: number;
    keyStrengths: string[];
  };
  recommendations: {
    quickFixes: Array<{ title: string; description: string; stepByStep: string[] }>;
    high: Array<{ title: string; description: string }>;
    medium: Array<{ title: string; description: string }>;
    low: Array<{ title: string; description: string }>;
  };
  redFlags: Array<{
    title: string;
    description: string;
    severity: 'critical' | 'high' | 'medium';
    impact: string;
  }>;
  narrativeReport: string;
  analyzedAt: string;
  pageDetails: {
    url: string;
    title: string;
    pageType: string;
    lastModified?: string;
  };
}
