import { scrapeWebsite } from "./scraper";
import { analyzeWebsiteWithAI } from "./gemini";
import type { AnalysisResults } from "@shared/schema";

/**
 * SEO ANALYSIS ORCHESTRATOR
 * Coordinates the complete analysis pipeline from data extraction to AI processing
 * 
 * ANALYSIS PIPELINE:
 * 1. Website Data Scraping (60s timeout)
 * 2. Data Quality Validation (Step 1.5)
 * 3. AI Analysis with Gemini (90s timeout)
 * 4. Error Handling & User Feedback
 * 
 * TIMEOUT STRATEGY:
 * - Scraping: 60 seconds (sufficient for most websites)
 * - AI Analysis: 90 seconds (handles complex content processing)
 * - Promise.race() prevents hanging requests
 * 
 * VALIDATION CHECKPOINTS:
 * - Content availability (min 100 characters)
 * - Error page detection (403, 404, Cloudflare blocks)
 * - HTML structure validation
 * - Basic metadata presence
 * 
 * ERROR CATEGORIZATION:
 * - Timeout errors: Network or processing delays
 * - Access errors: Website blocking or authentication
 * - AI errors: Service availability or quota issues
 * - Validation errors: Insufficient or invalid content
 */
export async function performSEOAnalysis(url: string): Promise<AnalysisResults> {
  try {
    console.log(`🔍 Starting comprehensive LLM visibility analysis for: ${url}`);
    
    // Step 1: Fetching website content
    console.log("📥 Step 1/7: Fetching website content - Loading HTML, CSS, and metadata");
    const websiteData = await Promise.race([
      scrapeWebsite(url),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Website content fetching timeout after 60 seconds')), 60000)
      )
    ]);
    
    console.log(`✓ Fetched ${websiteData.content.length} characters of content`);
    
    // Step 2: Validating data quality
    console.log("🔍 Step 2/7: Validating data quality - Checking content accessibility and structure");
    
    /**
     * STEP 2: DATA QUALITY VALIDATION CHECKPOINT
     * Critical validation layer preventing low-quality analysis attempts
     * 
     * VALIDATION CRITERIA:
     * - Content Availability: Minimum 100 characters required
     * - Error Page Detection: Identifies 403, 404, access denied responses
     * - Content Type Validation: Ensures HTML structure vs JSON/plain text
     * - Security Block Detection: Identifies Cloudflare or firewall blocks
     * 
     * VALIDATION LOGIC:
     * 1. Check for empty or minimal content (indicates access issues)
     * 2. Scan for error page indicators (prevents analysis of error responses)
     * 3. Verify HTML structure presence (ensures proper content extraction)
     * 4. Validate basic metadata elements (title, description availability)
     * 
     * ERROR PREVENTION:
     * - Prevents AI analysis of blocked/error content
     * - Provides specific error messages for different failure modes
     * - Saves AI processing costs on invalid content
     * - Improves user experience with clear failure explanations
     */
    
    // Validate essential data fields
    if (!websiteData.content || websiteData.content.trim().length === 0) {
      throw new Error(`No content found on ${websiteData.url}. The webpage might be empty, require authentication, or block automated access.`);
    }
    
    if (websiteData.content.length < 100) {
      throw new Error(`Insufficient content found on ${websiteData.url} (only ${websiteData.content.length} characters). The webpage might be redirecting, showing an error page, or blocking our requests.`);
    }
    
    // Check if we got an error page instead of actual content
    const lowerContent = websiteData.content.toLowerCase();
    
    // More specific validation to avoid false positives
    const errorIndicators = [
      '403 forbidden',
      '404 not found', 
      'access denied',
      'bot blocked',
      'request blocked',
      'cloudflare security challenge',
      'ray id:'
    ];
    
    // Check for redirect pages that weren't followed properly
    if (lowerContent.includes('301 moved permanently') && websiteData.content.length < 1000) {
      throw new Error(`Website redirect not followed: ${websiteData.url} returned a redirect page. Please try the final destination URL.`);
    }
    
    // Check for actual error pages with context-aware validation
    const foundErrorIndicator = errorIndicators.find(indicator => lowerContent.includes(indicator));
    if (foundErrorIndicator) {
      // Additional context check to avoid false positives
      // Only flag as blocked if error indicator appears early in content (likely an error page)
      // or if content is very short (typical of error pages)
      const indicatorPosition = lowerContent.indexOf(foundErrorIndicator);
      const isLikelyErrorPage = indicatorPosition < 500 && websiteData.content.length < 2000;
      
      if (isLikelyErrorPage) {
        console.log(`🚫 Content validation failed - detected "${foundErrorIndicator}" in error page context`);
        throw new Error(`Website access blocked: ${websiteData.url} returned an error page or security block. This could be due to bot detection, firewall rules, or the page being temporarily unavailable.`);
      } else {
        console.log(`⚠️  Warning: Found "${foundErrorIndicator}" in content but appears to be legitimate website content`);
      }
    }
    
    // Validate that we have actual HTML content (not just JSON or plain text)
    if (!lowerContent.includes('<html') && !lowerContent.includes('<!doctype') && !lowerContent.includes('<head') && !lowerContent.includes('<body')) {
      console.warn(`⚠️  Warning: Content doesn't appear to be HTML. First 200 chars: ${websiteData.content.substring(0, 200)}`);
    }
    
    // Check for basic website elements
    if (!websiteData.title || websiteData.title.trim().length === 0) {
      console.warn(`⚠️  Warning: No title found for ${websiteData.url}`);
    }
    
    console.log(`✓ Data validation passed - Content: ${websiteData.content.length} chars, Title: "${websiteData.title}", Meta: "${websiteData.metaDescription}"`);
    
    // Step 3: Preparing AI analysis
    console.log("⚙️  Step 3/7: Preparing AI analysis - Organizing content for AI processing");
    
    // Step 4: AI content analysis
    console.log("🤖 Step 4/7: AI content analysis - Analyzing SEO structure and technical elements");
    
    const analysisResults = await Promise.race([
      (async () => {
        console.log("🧮 Step 5/7: AI visibility scoring - Calculating LLM visibility and authority scores");
        console.log("💡 Step 6/7: Generating recommendations - Creating actionable improvement suggestions");
        console.log("📋 Step 7/7: Finalizing report - Compiling results and formatting output");
        return await analyzeWebsiteWithAI(websiteData);
      })(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('AI Analysis timeout after 90 seconds - the analysis is taking longer than expected')), 90000)
      )
    ]);
    
    console.log("🎉 Analysis completed successfully! LLM visibility report generated.");
    return analysisResults;
  } catch (error) {
    console.error("SEO Analysis error:", error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new Error(`Analysis timeout - the website took too long to analyze. Please try again.`);
      } else if (error.message.includes('fetch')) {
        throw new Error(`Unable to access the website. Please check the URL and try again.`);
      } else if (error.message.includes('AI') || error.message.includes('Gemini')) {
        throw new Error(`AI analysis failed. Please try again in a few moments.`);
      } else {
        throw new Error(`Analysis failed: ${error.message}`);
      }
    } else {
      throw new Error(`Analysis failed due to an unknown error. Please try again.`);
    }
  }
}
