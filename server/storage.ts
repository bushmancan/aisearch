import { analyses, type Analysis, type InsertAnalysis } from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import { safeLog, safeLogError } from "./utils/security";

export interface IStorage {
  createAnalysis(analysis: InsertAnalysis & { originIp?: string; userAgent?: string }, bypassCache?: boolean): Promise<Analysis>;
  getAnalysis(id: number): Promise<Analysis | undefined>;
  updateAnalysis(id: number, updates: Partial<Analysis>): Promise<Analysis | undefined>;
  deleteAnalysis(id: number): Promise<boolean>;
  getAllAnalyses(limit: number, offset: number): Promise<{ analyses: Analysis[], total: number }>;
}

// Legacy MemStorage implementation removed - using DatabaseStorage exclusively

export class DatabaseStorage implements IStorage {
  async createAnalysis(insertAnalysis: InsertAnalysis & { originIp?: string; userAgent?: string }, bypassCache: boolean = false): Promise<Analysis> {
    try {
      const normalizedUrl = this.normalizeUrl(insertAnalysis.url);
      
      // Only bypass cache for multi-page analysis or when explicitly requested
      if (!bypassCache) {
        const cached = await this.getCachedAnalysis(normalizedUrl);
        if (cached && this.isCacheValid(cached)) {
          // Update last_requested timestamp even for cached results
          await this.updateLastRequested(cached.id);
          safeLog(`Using cached analysis for: ${insertAnalysis.url} (ID: ${cached.id}) - updated last_requested`);
          
          // Return updated cached analysis with new last_requested timestamp
          const [updatedCached] = await db
            .select()
            .from(analyses)
            .where(eq(analyses.id, cached.id))
            .limit(1);
          
          return updatedCached || cached;
        }
      }
      
      safeLog(`Creating fresh analysis for: ${insertAnalysis.url} (bypassCache: ${bypassCache})`);
      
      const [analysis] = await db
        .insert(analyses)
        .values({
          ...insertAnalysis,
          url: normalizedUrl
        })
        .returning();
      
      safeLog(`Created analysis in database: ${analysis.id} for ${analysis.url}`);
      return analysis;
    } catch (error) {
      safeLogError('Failed to create analysis in database', error);
      throw new Error(`Database error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getCachedAnalysis(normalizedUrl: string): Promise<Analysis | undefined> {
    try {
      const [cached] = await db
        .select()
        .from(analyses)
        .where(eq(analyses.url, normalizedUrl))
        .orderBy(sql`${analyses.createdAt} DESC`)
        .limit(1);
      
      return cached;
    } catch (error) {
      safeLogError('Failed to get cached analysis', error);
      return undefined;
    }
  }

  private isCacheValid(analysis: Analysis): boolean {
    if (!analysis.createdAt) return false;
    
    // Only cache successful analyses - failed analyses should not be cached
    if (analysis.status !== "completed") return false;
    
    const cacheAge = Date.now() - new Date(analysis.createdAt).getTime();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    return cacheAge < twentyFourHours;
  }

  /**
   * Normalizes URLs to ensure consistent analysis and caching
   * 
   * Key normalizations:
   * - Removes www prefix (www.example.com → example.com)
   * - Converts to lowercase
   * - Removes trailing slashes
   * 
   * This ensures that www.microyes.ai and microyes.ai are treated as the same entity,
   * preventing scoring discrepancies for redirected URLs.
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // Normalize www vs non-www to ensure consistent analysis
      let hostname = urlObj.hostname.toLowerCase();
      if (hostname.startsWith('www.')) {
        hostname = hostname.substring(4); // Remove 'www.' prefix
      }
      
      // Construct normalized URL without www prefix
      const normalizedOrigin = `${urlObj.protocol}//${hostname}${urlObj.port ? ':' + urlObj.port : ''}`;
      const normalizedPath = urlObj.pathname.toLowerCase().replace(/\/$/, '');
      
      return normalizedOrigin + normalizedPath;
    } catch {
      return url.toLowerCase();
    }
  }

  // Efficient method to get all analyses with pagination (ordered by ID descending to show newest first)
  async getAllAnalyses(limit: number = 50, offset: number = 0): Promise<{ analyses: Analysis[], total: number }> {
    try {
      const [allAnalyses, countResult] = await Promise.all([
        db
          .select()
          .from(analyses)
          .orderBy(sql`${analyses.id} DESC`)
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(analyses)
      ]);
      
      const total = countResult[0]?.count || 0;
      return { analyses: allAnalyses, total };
    } catch (error) {
      safeLogError('Failed to get all analyses from database', error);
      throw new Error(`Database error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAnalysis(id: number): Promise<Analysis | undefined> {
    try {
      const [analysis] = await db
        .select()
        .from(analyses)
        .where(eq(analyses.id, id))
        .limit(1);
      
      return analysis || undefined;
    } catch (error) {
      safeLogError('Failed to get analysis from database', error);
      throw new Error(`Database error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateAnalysis(id: number, updates: Partial<Analysis>): Promise<Analysis | undefined> {
    try {
      const [analysis] = await db
        .update(analyses)
        .set(updates)
        .where(eq(analyses.id, id))
        .returning();
      
      if (analysis) {
        safeLog(`Updated analysis in database: ${analysis.id} for ${analysis.url}`);
      }
      return analysis || undefined;
    } catch (error) {
      safeLogError('Failed to update analysis in database', error);
      throw new Error(`Database error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Updates the last_requested timestamp for an analysis
   * Called when cached results are returned to track user activity
   */
  private async updateLastRequested(id: number): Promise<void> {
    try {
      await db
        .update(analyses)
        .set({ lastRequested: new Date() })
        .where(eq(analyses.id, id));
      
      safeLog(`Updated last_requested timestamp for analysis ID: ${id}`);
    } catch (error) {
      safeLogError('Failed to update last_requested timestamp', error);
      // Don't throw error - this is a tracking enhancement, not critical functionality
    }
  }

  async deleteAnalysis(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(analyses)
        .where(eq(analyses.id, id))
        .returning();
      
      if (result.length > 0) {
        safeLog(`Deleted analysis from database: ${id}`);
      }
      return result.length > 0;
    } catch (error) {
      safeLogError('Failed to delete analysis from database', error);
      throw new Error(`Database error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Migration methods removed - DatabaseStorage is now the primary storage system
}

// Primary storage system - PostgreSQL with Drizzle ORM
export const storage = new DatabaseStorage();
