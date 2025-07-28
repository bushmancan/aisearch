import { GoogleGenAI } from "@google/genai";
import type { AnalysisResults } from "@shared/schema";
import { createSecureApiClient, safeLog, safeLogError } from "../utils/security";

const ai = createSecureApiClient(GoogleGenAI, 'GEMINI_API_KEY');

export interface WebsiteData {
  url: string;
  title: string;
  metaDescription: string;
  content: string;
  structuredData: any[];
  headers: Record<string, string>;
  links: string[];
  images: string[];
  robotsTxt: string;
  isHttps: boolean;
  hasMobileViewport: boolean;
  pageSize: number;
  loadTime: number;
}

/**
 * AI ANALYSIS ENGINE - PRIMARY ENTRY POINT
 * Orchestrates comprehensive LLM visibility analysis using Google Gemini 2.5 Pro
 * 
 * TIMEOUT STRATEGY:
 * - 90-second analysis timeout for complex websites with heavy content
 * - Race condition between analysis and timeout to prevent hanging requests
 * - Graceful error handling with user-friendly timeout messages
 * 
 * ARCHITECTURE:
 * - Wrapper function handles timeouts and error propagation
 * - Core analysis delegated to analyzeWithAI() for separation of concerns
 * - Promise.race() ensures non-blocking execution with guaranteed completion
 * 
 * ERROR HANDLING:
 * - Timeout errors provide specific guidance for users
 * - Maintains system responsiveness under heavy load
 * - Prevents resource exhaustion from long-running AI requests
 */
export async function analyzeWebsiteWithAI(websiteData: WebsiteData): Promise<AnalysisResults> {
  // Implement timeout wrapper for AI analysis - longer for complex sites with double-check
  const timeout = 150000; // 150 second timeout for double-check analysis (was 90s)
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Analysis timeout - please try again. Try again with a simpler website or check your connection')), timeout);
  });
  
  return Promise.race([timeoutPromise, doubleCheckAnalysis(websiteData)]);
}

/**
 * DOUBLE-CHECK ANALYSIS SYSTEM
 * Runs analysis twice and validates consistency to prevent score variance
 * 
 * VARIANCE DETECTION:
 * - Compares scores between two independent analysis runs
 * - Flags variance >10 points in any category for investigation
 * - Uses median scoring when significant variance detected
 * - Logs detailed variance reports for quality monitoring
 * 
 * RESOURCE IMPACT:
 * - Cost: ~100% increase (2x analysis calls)
 * - Time: +15-45 seconds (parallel processing)
 * - Accuracy: Significantly improved consistency
 */
async function doubleCheckAnalysis(websiteData: WebsiteData): Promise<AnalysisResults> {
  console.log('🔄 Starting double-check analysis for enhanced accuracy...');
  
  // Run two parallel analyses
  const [analysis1, analysis2] = await Promise.all([
    analyzeWithAI(websiteData),
    analyzeWithAI(websiteData)
  ]);
  
  // Compare scores and detect variance
  const scoreComparison = {
    overall: Math.abs(analysis1.overallScore - analysis2.overallScore),
    aiLlmVisibility: Math.abs(analysis1.aiLlmVisibilityScore - analysis2.aiLlmVisibilityScore),
    tech: Math.abs(analysis1.techScore - analysis2.techScore),
    content: Math.abs(analysis1.contentScore - analysis2.contentScore),
    accessibility: Math.abs(analysis1.accessibilityScore - analysis2.accessibilityScore),
    authority: Math.abs(analysis1.authorityScore - analysis2.authorityScore)
  };
  
  const maxVariance = Math.max(...Object.values(scoreComparison));
  const hasSignificantVariance = maxVariance > 10;
  
  if (hasSignificantVariance) {
    console.warn(`🚨 SCORE VARIANCE DETECTED - Max variance: ${maxVariance.toFixed(1)} points`);
    console.warn('Score differences:', scoreComparison);
    
    // Log detailed variance report
    Object.entries(scoreComparison).forEach(([category, variance]) => {
      if (variance > 8) {
        console.warn(`  • ${category}: ${variance.toFixed(1)} point variance`);
      }
    });
    
    // Use median scoring for high-variance results
    const mediatedResult = {
      ...analysis1,
      overallScore: Math.round((analysis1.overallScore + analysis2.overallScore) / 2),
      aiLlmVisibilityScore: Math.round((analysis1.aiLlmVisibilityScore + analysis2.aiLlmVisibilityScore) / 2),
      techScore: Math.round((analysis1.techScore + analysis2.techScore) / 2),
      contentScore: Math.round((analysis1.contentScore + analysis2.contentScore) / 2),
      accessibilityScore: Math.round((analysis1.accessibilityScore + analysis2.accessibilityScore) / 2),
      authorityScore: Math.round((analysis1.authorityScore + analysis2.authorityScore) / 2),
      // Use the more comprehensive narrative report
      narrativeReport: analysis1.narrativeReport.length > analysis2.narrativeReport.length ? 
        analysis1.narrativeReport : analysis2.narrativeReport
    };
    
    console.log('✅ Using mediated scores to resolve variance');
    return mediatedResult;
  } else {
    console.log(`✅ Score consistency verified - Max variance: ${maxVariance.toFixed(1)} points`);
    return analysis1; // Use first analysis if consistent
  }
}

/**
 * CORE AI ANALYSIS FUNCTION
 * Executes comprehensive LLM visibility analysis using advanced prompt engineering
 * 
 * INPUT VALIDATION STRATEGY:
 * - Verifies AI service availability and API configuration
 * - Ensures minimum required data fields (url, content) are present
 * - Implements content quality thresholds to prevent low-quality analysis
 * - Provides specific error messages for different validation failures
 * 
 * CONTENT QUALITY VALIDATION:
 * - Minimum 50 characters required for meaningful analysis
 * - Detects potential website blocking or access restrictions
 * - Identifies empty content scenarios vs legitimate minimal content
 * 
 * ERROR SCENARIOS HANDLED:
 * - AI service unavailable: API configuration issues
 * - Missing required fields: Data extraction failures
 * - Insufficient content: Website blocking or access issues
 * - Content extraction failures: JavaScript-heavy sites or bot detection
 */
async function analyzeWithAI(websiteData: WebsiteData): Promise<AnalysisResults> {
  if (!ai) {
    throw new Error('AI service not available - please check API configuration');
  }
  
  // Validate that we have the minimum required data for analysis
  if (!websiteData.url || !websiteData.content) {
    throw new Error('Invalid website data - missing required fields (url or content)');
  }
  
  console.log(`Starting AI analysis for ${websiteData.url} with ${websiteData.content.length} characters of content`);
  
  // Add additional validation for content quality
  if (websiteData.content.length < 50) {
    throw new Error(`Insufficient content for analysis (${websiteData.content.length} characters). The website may be blocking access or returning empty content.`);
  }
  
  /**
   * SYSTEM PROMPT ENGINEERING STRATEGY
   * Comprehensive instruction set for LLM visibility analysis using specialized prompt engineering
   * 
   * PROMPT ARCHITECTURE:
   * - Role Definition: Expert LLM Visibility Auditor with specific domain expertise
   * - Output Format: Structured analysis with consistent technical term formatting
   * - Focus Areas: AI crawler accessibility, content structure, authority signals
   * - Formatting Requirements: Triple asterisk formatting for technical terms
   * 
   * FORMATTING STRATEGY (***term***):
   * - Ensures consistent technical term identification in analysis output
   * - Helps with post-processing and result parsing for structured display
   * - Improves readability and professional presentation in reports
   * - Standardizes technical vocabulary across all analysis reports
   * 
   * ANALYSIS SCOPE:
   * - AI Crawler Accessibility: Technical blocks preventing bot access
   * - Content Structure: FAQ sections, Q&A format, heading hierarchy
   * - Authority Signals: E-A-T implementation and trust indicators
   * - Citation Potential: Quotable content and direct answer capability
   * - Technical Infrastructure: Performance and mobile optimization
   * - Competitive Positioning: Content depth and implementation quality
   */
  const systemPrompt = `You are an expert LLM Visibility Auditor. Your task is to conduct a comprehensive analysis of ONE specific webpage and deliver a detailed audit report showing exactly what's blocking this page from ranking in search and being surfaced by ChatGPT, Gemini, Perplexity, and other Large Language Models.

**IMPORTANT FORMATTING REQUIREMENT**: When mentioning any technical terms, schema types, specific code elements, meta descriptions, title tags, or any specific text content from the page being analyzed, format them as ***bold and italics*** using triple asterisks (***text***). This includes but is not limited to:

**MUST FORMAT AS ***BOLD AND ITALICS***:**
- Schema types: ***Organization***, ***WebPage***, ***Article***, ***FAQPage***, ***WebSite***, ***BreadcrumbList***, ***LocalBusiness***, ***Person***, ***HowTo***, ***Review***, etc.
- HTML elements: ***H1***, ***H2***, ***H3***, ***H4***, ***H5***, ***H6***, ***meta description***, ***title tag***, ***alt text***, ***canonical tags***, ***Open Graph***, etc.
- Technical terms: ***JavaScript***, ***server-side rendering***, ***Schema.org***, ***HTTPS***, ***HTML***, ***CSS***, ***JSON-LD***, ***TTFB***, ***CDN***, ***responsive design***, etc.
- File names: ***robots.txt***, ***sitemap.xml***, ***llms.txt***, ***favicon.ico***, etc.
- AI crawlers: ***GPTBot***, ***ClaudeBot***, ***CCBot***, ***Bingbot***, ***Googlebot***, etc.
- Content concepts: ***Structured Data***, ***Metadata***, ***Content Visibility***, ***E-A-T***, ***Citation Potential***, ***Authority Signals***, etc.
- Specific quoted text from the page: ***"actual content from the page"***, etc.
- Performance metrics: ***2.5 seconds***, ***500ms***, ***TTFB under 1 second***, ***Core Web Vitals***, etc.
- SEO terms: ***meta description***, ***title tag***, ***heading hierarchy***, ***internal linking***, ***keyword density***, etc.

**CRITICAL**: Every single technical term, schema name, HTML element, file name, quoted content, and technical concept MUST be wrapped in triple asterisks (***term***) throughout your entire analysis.

FOCUS AREAS:
1. **AI Crawler Accessibility**: Technical blocks preventing ***GPTBot***, ***ClaudeBot***, ***CCBot*** access
2. **Technical Infrastructure**: ***Server-side rendering***, ***page speed***, ***HTTPS***, ***mobile optimization***
3. **Content Structure**: ***FAQ sections***, ***question-answer format***, ***summary sections***, ***heading hierarchy***
4. **Authority & Trust Signals**: ***E-A-T*** implementation, ***author attribution***, ***contact information***
5. **Citation Potential**: ***Quotable content***, ***direct answers***, ***structured information***
6. **Competitive Positioning**: Content depth, technical implementation, freshness
7. **Actionable Recommendations**: Prioritized fixes with implementation timelines

ANALYSIS APPROACH:
- Identify specific technical blocks preventing AI crawler access
- Evaluate content structure for question-answer format and summary sections
- Assess ***schema markup*** and ***metadata*** for LLM comprehension
- Examine ***authority signals*** and ***expertise demonstration***
- Provide quantified citation potential scores
- Recommend prioritized fixes with expected outcomes categorized by timeline:
  - **Critical Fixes (0-7 days)**: Technical blocks preventing AI crawler access
  - **High-Impact Improvements (7-30 days)**: Content structure and authority enhancements
  - **Optimization Enhancements (30-90 days)**: Competitive positioning and advanced features

Provide scores from 0-100 and specific, actionable recommendations with implementation timelines and expected outcomes.`;

  const analysisPrompt = `Conduct a comprehensive LLM Visibility Audit for this webpage:

**WEBPAGE TO AUDIT:** ***${websiteData.url}***
**PAGE TITLE:** ***"${websiteData.title}"***
**META DESCRIPTION:** ***"${websiteData.metaDescription}"***
**ANALYSIS DATE:** ***${new Date().toISOString().split('T')[0]}***

**TECHNICAL DATA:**
- Content Length: ***${websiteData.content.length} characters***
- Structured Data: ${JSON.stringify(websiteData.structuredData)}
- HTTPS: ***${websiteData.isHttps}***
- Mobile Viewport: ***${websiteData.hasMobileViewport}***
- Page Size: ***${websiteData.pageSize} bytes***
- Load Time: ***${websiteData.loadTime}ms***
- Robots.txt: ${websiteData.robotsTxt || 'Not found'}

**CONTENT PREVIEW:** ${websiteData.content.substring(0, 3000)}...

**IMPORTANT ANALYSIS CONTEXT:**
If the content length is very low (under 500 characters), this likely indicates a JavaScript-heavy site where content is loaded dynamically. In such cases:
- Do NOT assume the site has no content - it may be rich with content that loads via JavaScript
- Focus analysis on what IS available: meta tags, structured data, technical implementation
- Consider that authority signals and trust indicators might be present but not extracted
- Be more balanced in scoring - low content extraction doesn't necessarily mean low authority
- Mention in recommendations that the site may benefit from server-side rendering for better crawler access

**ANALYSIS REQUIREMENTS:**

#### 🔍 LLM ACCESSIBILITY ANALYSIS
**✅ WHAT WORKS FOR LLM DISCOVERY:**
- Analyze ***Structured Data*** implementation (***Schema.org*** markup)
- Evaluate ***Metadata*** quality (***meta description***, ***Open Graph*** tags)
- Check ***Content Visibility*** in HTML without ***JavaScript*** execution

**❌ WHAT BLOCKS LLM DISCOVERY:**
- Identify ***JavaScript Dependencies*** that hide content from AI crawlers
- Check for missing ***llms.txt*** file
- Review incomplete ***Schema*** markup (missing ***Article***, ***FAQPage***, etc.)

**🔧 IMMEDIATE TECHNICAL FIXES NEEDED:**
- ***Server-side rendering (SSR)*** requirements
- ***robots.txt*** file creation with ***GPTBot***, ***ClaudeBot***, ***CCBot*** permissions
- Missing ***Schema*** markup additions

#### 📝 CONTENT STRUCTURE FOR AI CITATION
**✅ WHAT WORKS FOR AI CITATION:**
- Identify clear ***value propositions*** and quotable statements
- Review ***service descriptions*** and ***proper heading structure***
- Analyze ***H1***, ***H2***, ***H3*** hierarchy

**❌ WHAT PREVENTS AI CITATION:**
- Missing ***FAQ sections*** with ***question-and-answer*** format
- Lack of ***summary sections*** with ***"Key Takeaways"*** or ***"In Summary"***
- Absence of ***step-by-step content*** with ***"Step 1:"***, ***"Step 2:"*** format

**📋 CONTENT OPTIMIZATION NEEDED:**
- Add ***FAQ section*** with ***FAQPage*** schema markup
- Include ***"Key Benefits"*** or ***"Summary"*** sections
- Restructure content into ***question-answer format***

#### ⚙️ TECHNICAL IMPLEMENTATION REVIEW
**✅ TECHNICAL STRENGTHS:**
- ***HTTPS Implementation*** for crawler trust
- ***Mobile Responsiveness*** with ***responsive design***
- ***Page Speed*** performance analysis

**❌ TECHNICAL WEAKNESSES:**
- Missing ***robots.txt*** file
- ***TTFB (Time to First Byte)*** performance issues
- Missing ***canonical tags*** (***rel="canonical"***)

#### 🏆 AUTHORITY & TRUST SIGNALS
**✅ AUTHORITY STRENGTHS:**
- ***Author Attribution*** and expertise signals
- ***Publication Dates*** with ***datePublished*** timestamps
- ***Contact Information*** completeness

**❌ AUTHORITY GAPS:**
- Missing ***author bios*** with ***E-A-T*** demonstration
- Lack of ***credentials*** and professional experience
- Missing ***source citations*** to authoritative sources

#### 🎯 COMPETITIVE POSITIONING
Analyze competitive advantages and disadvantages in:
- ***Content depth*** vs competitors
- ***Technical implementation*** quality
- ***Content freshness*** and publication dates
- ***Domain authority*** and backlink profiles
- ***multimedia content*** availability

**MANDATORY SCORING ENFORCEMENT - FOLLOW THESE RANGES EXACTLY:**
**CRITICAL: The AI is currently giving scores that are TOO HIGH (80-95/100). This is WRONG.**

**FORCED SCORING REALITY:**
- **MAXIMUM SCORE FOR ANY CATEGORY: 60/100** unless website has exceptional AI-specific optimization
- **TYPICAL BUSINESS WEBSITE: 25-45/100** overall (this is the reality)
- **WELL-BUILT WEBSITE: 45-65/100** overall (decent but not AI-optimized)
- **AI-OPTIMIZED WEBSITE: 65-80/100** overall (specifically built for LLM discovery)
- **INDUSTRY LEADER: 80-95/100** overall (comprehensive AI optimization)

/**
 * 5-CATEGORY WEIGHTED SCORING ALGORITHM
 * Implements realistic LLM visibility scoring with enforced penalty system
 * 
 * SCORING CATEGORIES & WEIGHTS:
 * 1. AI/LLM Visibility (25%) - Technical accessibility for AI crawlers
 * 2. Technical Score (20%) - Infrastructure and performance  
 * 3. Content Score (25%) - Content structure for AI citation
 * 4. Accessibility Score (10%) - User experience and mobile optimization
 * 5. Authority Score (20%) - E-A-T signals and trust indicators
 * 
 * MATHEMATICAL FORMULA:
 * Overall Score = (AI/LLM × 0.25) + (Technical × 0.20) + (Content × 0.25) + (Accessibility × 0.10) + (Authority × 0.20)
 * 
 * SCORING ENFORCEMENT CAPS:
 * - No FAQ sections → Content score MAX 40/100
 * - No robots.txt for AI bots → AI/LLM Visibility MAX 40/100
 * - No author credentials → Authority score MAX 40/100
 * - Generic content → Content score MAX 40/100
 * 
 * REALISTIC SCORE DISTRIBUTION:
 * - Most websites: 15-35/100 (Poor - no AI optimization)
 * - Average business: 25-45/100 (Below Average - basic content)
 * - Well-built sites: 45-65/100 (Average - some optimization)
 * - AI-optimized: 65-80/100 (Good - purposeful LLM preparation)
 * - Industry leaders: 80-95/100 (Excellent - comprehensive optimization)
 * 
 * PENALTY SYSTEM:
 * - Missing robots.txt: -2.5 Technical points
 * - No FAQ sections: -4 Content points  
 * - No author info: -4 Authority points
 * - Generic content: -4 Content points
 * - Slow loading (>3s): -2 Technical points
 * - Missing structured data: -2.5 Technical points
 */
**NEW 5-CATEGORY WEIGHTED SCORING SYSTEM:**
You must provide scores for these 5 categories:
1. **AI/LLM Visibility Score** (25% weight) - Technical accessibility, robots.txt, structured data
2. **Technical Score** (20% weight) - HTTPS, speed, mobile optimization, rendering
3. **Content Score** (25% weight) - FAQ sections, Q&A format, quotable content
4. **Accessibility Score** (10% weight) - Mobile responsiveness, user experience
5. **Authority Score** (20% weight) - Author attribution, credentials, E-A-T signals

**SCORING ENFORCEMENT RULES:**
- If a website lacks FAQ sections → Content score CANNOT exceed 40/100
- If a website has no robots.txt for AI bots → AI/LLM Visibility score CANNOT exceed 40/100  
- If a website has no author bios/credentials → Authority score CANNOT exceed 40/100
- If a website has generic content → Content score CANNOT exceed 40/100
- Standard business websites should score 25-45/100 overall - NOT 80-95/100!

**CRITICAL OVERALL SCORE CALCULATION:**
Overall Score = (AI/LLM Visibility × 0.25) + (Technical × 0.20) + (Content × 0.25) + (Accessibility × 0.10) + (Authority × 0.20)

**MANDATORY WEIGHTED CALCULATION CONSISTENCY:**
Calculate the overall score using this EXACT formula:
Overall Score = (AI/LLM Visibility × 0.25) + (Technical × 0.20) + (Content × 0.25) + (Accessibility × 0.10) + (Authority × 0.20)

YOU MUST use this mathematically calculated score in BOTH:
1. Your JSON response "overallScore" field
2. Your narrative report text "Overall Score of X/100"
NO ROUNDING until the final result - these MUST be identical numbers!

- **Technical Accessibility (0-100): ENFORCED SCORING CAPS**
  - 0-20: Basic website with no AI optimization → SCORE: 15-25/100
  - 21-40: HTTPS + mobile responsive but missing robots.txt/AI bot permissions → SCORE: 25-40/100
  - 41-60: Has robots.txt but missing structured data, slow loading, no SSR → SCORE: 40-55/100
  - 61-80: Good technical foundation + structured data + fast loading → SCORE: 55-70/100
  - 81-100: Perfect AI crawler access + SSR + comprehensive schema markup + sub-2s loading → SCORE: 70-85/100
  - **MAXIMUM TECHNICAL SCORE: 85/100** (reserved for exceptional AI optimization)

- **Content Structure (0-100): ENFORCED SCORING CAPS**
  - 0-20: Wall of text, no structure for AI consumption → SCORE: 10-20/100
  - 21-40: Basic headings but no FAQ/Q&A sections for AI citation → SCORE: 20-35/100
  - 41-60: Some FAQ sections but missing summary blocks and key takeaways → SCORE: 35-50/100
  - 61-80: Good FAQ structure + summary sections + clear value propositions → SCORE: 50-65/100
  - 81-100: Perfect AI-citation format: FAQ + summaries + step-by-step + quotable segments → SCORE: 65-80/100
  - **MAXIMUM CONTENT SCORE: 80/100** (reserved for exceptional AI-structured content)

- **Authority Signals (0-100): REQUIRE COMPREHENSIVE E-A-T**
  - 0-20: No author info, credentials, or contact details
  - 21-40: Basic contact info but no author bios or expertise demonstration
  - 41-60: Author info present but limited credentials/experience shown
  - 61-80: Strong author bios + credentials + expertise but missing citations
  - 81-100: Complete E-A-T: detailed author bios + credentials + source citations + trust signals

- **Citation Potential (0-100): REQUIRE QUOTABLE, AUTHORITATIVE CONTENT**
  - 0-20: Generic content with no quotable value for AI systems
  - 21-40: Some useful content but not structured for AI citation
  - 41-60: Decent information but lacks direct answers and structured data
  - 61-80: Good quotable content + structured data + clear answers
  - 81-100: Perfect citation readiness: expert quotes + data + structured answers + comprehensive schema

- **Competitive Position (0-100): COMPARE AGAINST AI-OPTIMIZED LEADERS**
  - 0-20: Far behind competitors in AI visibility preparation
  - 21-40: Basic presence but competitors have better AI optimization
  - 41-60: On par with average competitors but leaders are ahead
  - 61-80: Above average AI optimization vs most competitors
  - 81-100: Industry leader in AI visibility and LLM citation potential

**MANDATORY SCORE RANGES - FOLLOW EXACTLY:**
- **Most websites: 15-35/100** (Poor - lacks basic AI optimization) ← MOST COMMON
- **Average business websites: 25-45/100** (Below Average - has content but no AI structure) ← TYPICAL
- **Decent websites: 45-65/100** (Average - some optimization but missing key elements)
- **Good websites: 65-80/100** (Good - purposefully built for AI discovery) ← RARE
- **Excellent websites: 80-90/100** (Excellent - comprehensive AI optimization) ← VERY RARE
- **Perfect LLM optimization: 90-100/100** (Exceptional - industry benchmark) ← ALMOST NEVER

**SCORING REALITY CHECK:**
- If you're scoring above 60/100 overall, ask yourself: "Does this website have FAQ sections, robots.txt for AI bots, author bios, and structured data?"
- If the answer is NO to any of these, the score should be 45/100 or lower
- **STOP GIVING SCORES OF 80-95/100** unless the website is exceptionally AI-optimized

**AI/GEO RED FLAGS - HIGHLIGHT IN EXECUTIVE SUMMARY:**
Always prominently display these critical AI visibility blockers in the executive summary:

🚨 **CRITICAL AI VISIBILITY RED FLAGS** (if present):
- ❌ **No robots.txt allowing AI bots** (GPTBot, ClaudeBot, CCBot blocked)
- ❌ **No FAQ sections for AI citation** (Missing Q&A format for AI systems)
- ❌ **No author/expertise info** (Lacks E-A-T signals for AI trust)
- ❌ **Generic content with no quotable value** (Not structured for AI citation)
- ❌ **No structured data** (Schema markup missing for AI comprehension)
- ❌ **Slow loading (>3 seconds)** (AI crawlers may timeout)

**MODERATE PENALTY TRIGGERS:**
- No robots.txt allowing AI bots: -2.5 points from Technical score
- No FAQ sections for AI citation: -4 points from Content score
- No author/expertise info: -4 points from Authority score
- Generic content with no quotable value: -4 points from Citation score
- Slow loading (>3 seconds): -2 points from Technical score
- Missing structured data: -2.5 points from Technical score

**RECOMMENDATION PRIORITIES:**
- **🔥 CRITICAL FIXES (0-7 days):** Technical blocks preventing AI crawler access
- **⚡ HIGH-IMPACT IMPROVEMENTS (7-30 days):** Content structure and authority enhancements  
- **📈 OPTIMIZATION ENHANCEMENTS (30-90 days):** Competitive positioning and advanced features

**⚡ QUICK FIXES REQUIREMENT:**
Identify and rank the top 3 steps a user can take to remedy the most critical issues without requiring deep technical knowledge. These should be actionable steps that can be implemented by non-technical users such as:
- Content changes they can make directly
- Simple settings they can adjust
- Basic additions they can implement
- Clear instructions for common CMS platforms

**MANDATORY QUICK FIX CHECKS:**
Always evaluate and recommend when applicable:

1. **URL Consolidation (High Priority)**: If the analyzed URL is accessible with/without www prefix, ALWAYS recommend choosing one primary version and setting up 301 redirects + canonical tags. This is critical for LLM authority consolidation.

2. **robots.txt for AI Crawlers**: Check if robots.txt allows GPTBot, ClaudeBot, and CCBot - if not, make this Quick Fix #1

3. **FAQ/Q&A Content**: If no FAQ sections exist, recommend adding Q&A format content for AI citation potential

**ADDITIONAL QUICK FIX RECOMMENDATIONS TO CONSIDER:**
- **Author Attribution**: Add author names and credentials to content for E-A-T signals
- **Content Structure**: Convert generic content to question-answer format  
- **Basic Schema Markup**: Add simple structured data for organization/service information
- **Page Speed Optimization**: If loading >3 seconds, recommend image optimization and caching

Format these as "Quick Fix #1:", "Quick Fix #2:", "Quick Fix #3:" with clear, step-by-step instructions.

**NARRATIVE REPORT REQUIREMENTS:**
Generate a comprehensive narrative report that includes:
1. **Executive summary with overall website score AND prominent AI/GEO Red Flags section**
   - **CRITICAL: Use EXACTLY the calculated overallScore from your JSON response - do NOT calculate a different score in the narrative**
   - Start with the EXACT overall score from your JSON calculation and category (Poor, Below Average, Average, Good, Excellent)
   - Note: The overall score is a weighted average of all 5 categories, NOT just AI/LLM visibility
   - **IMMEDIATELY follow with "🚨 CRITICAL AI VISIBILITY RED FLAGS" section listing specific blockers**
   - Include brief explanation of why each red flag prevents AI discovery
   - **SHOW SPECIFIC PENALTIES APPLIED**: Clearly state which penalties were applied (e.g., "Technical score reduced by 5 points for missing robots.txt")
2. Detailed analysis of each focus area with specific findings using the ***bold and italics*** formatting
3. Critical technical blocks preventing AI crawler access
4. Content structure improvements for citation potential
5. Authority signal gaps and improvement opportunities
6. Competitive positioning analysis
7. **Top 3 Quick Fixes** - Non-technical actionable steps the user can implement immediately
8. Prioritized action plan with implementation timelines
9. Expected outcomes and success metrics

Format the narrative as a professional audit report suitable for client presentation and lead generation.

**ANALYSIS TIMESTAMP:** Include the current timestamp (${new Date().toISOString()}) in the analyzedAt field to show when this analysis was performed.

**PAGE DETAILS:** Include comprehensive page information in the pageDetails field:
- URL: ${websiteData.url}
- Title: ${websiteData.title}
- Page Type: Determine the type (Homepage, Product, About, Blog, Contact, etc.) based on URL structure and content
- Last Modified: Extract from meta tags, headers, or content if available`;

  try {
    console.log('Starting Gemini AI analysis...');
    console.log('Content length:', websiteData.content.length);
    console.log('Model: gemini-2.5-flash');
    
    // Use simpler flash model for faster response
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.05,
        responseSchema: {
          type: "object",
          properties: {
            overallScore: { type: "number" },
            aiLlmVisibilityScore: { type: "number" },
            techScore: { type: "number" },
            contentScore: { type: "number" },
            accessibilityScore: { type: "number" },
            authorityScore: { type: "number" },
            structuredData: {
              type: "object",
              properties: {
                schemaTypes: { type: "array", items: { type: "string" } },
                jsonLdFound: { type: "boolean" },
                jsonLdBlocks: { type: "number" },
                recommendations: { type: "array", items: { type: "string" } }
              },
              required: ["schemaTypes", "jsonLdFound", "jsonLdBlocks", "recommendations"]
            },
            metadata: {
              type: "object",
              properties: {
                titleTag: {
                  type: "object",
                  properties: {
                    present: { type: "boolean" },
                    length: { type: "number" },
                    status: { type: "string", enum: ["optimal", "too_short", "too_long"] }
                  },
                  required: ["present", "length", "status"]
                },
                metaDescription: {
                  type: "object",
                  properties: {
                    present: { type: "boolean" },
                    length: { type: "number" },
                    status: { type: "string", enum: ["optimal", "too_short", "too_long"] }
                  },
                  required: ["present", "length", "status"]
                },
                openGraph: {
                  type: "object",
                  properties: {
                    title: { type: "boolean" },
                    description: { type: "boolean" },
                    image: { type: "boolean" },
                    imageSize: { type: "string" }
                  },
                  required: ["title", "description", "image"]
                }
              },
              required: ["titleTag", "metaDescription", "openGraph"]
            },
            contentVisibility: {
              type: "object",
              properties: {
                aiCrawlability: { type: "number" },
                botAccess: { type: "number" },
                contentQuality: { type: "number" }
              },
              required: ["aiCrawlability", "botAccess", "contentQuality"]
            },
            technicalSeo: {
              type: "object",
              properties: {
                https: { type: "boolean" },
                mobileOptimized: { type: "boolean" },
                pageSpeed: { type: "string", enum: ["good", "needs_improvement", "poor"] },
                botAccessibility: {
                  type: "object",
                  properties: {
                    gptBot: { type: "boolean" },
                    claudeBot: { type: "boolean" },
                    ccBot: { type: "boolean" },
                    googleBot: { type: "boolean" }
                  },
                  required: ["gptBot", "claudeBot", "ccBot", "googleBot"]
                }
              },
              required: ["https", "mobileOptimized", "pageSpeed", "botAccessibility"]
            },
            authoritySignals: {
              type: "object",
              properties: {
                authorInfo: { type: "boolean" },
                credentials: { type: "boolean" },
                aboutPage: { type: "boolean" },
                contactInfo: { type: "boolean" },
                privacyPolicy: { type: "boolean" },
                socialProof: { type: "string", enum: ["high", "medium", "low"] }
              },
              required: ["authorInfo", "credentials", "aboutPage", "contactInfo", "privacyPolicy", "socialProof"]
            },
            citationPotential: {
              type: "object",
              properties: {
                relevanceScore: { type: "number" },
                authorityScore: { type: "number" },
                citationReadiness: { type: "number" },
                keyStrengths: { type: "array", items: { type: "string" } }
              },
              required: ["relevanceScore", "authorityScore", "citationReadiness", "keyStrengths"]
            },
            recommendations: {
              type: "object",
              properties: {
                quickFixes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      stepByStep: { type: "array", items: { type: "string" } }
                    },
                    required: ["title", "description", "stepByStep"]
                  },
                  description: "Top 3 non-technical quick fixes users can implement immediately"
                },
                high: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" }
                    },
                    required: ["title", "description"]
                  }
                },
                medium: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" }
                    },
                    required: ["title", "description"]
                  }
                },
                low: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" }
                    },
                    required: ["title", "description"]
                  }
                }
              },
              required: ["quickFixes", "high", "medium", "low"]
            },
            redFlags: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  severity: { type: "string", enum: ["critical", "high", "medium"] },
                  impact: { type: "string" }
                },
                required: ["title", "description", "severity", "impact"]
              },
              description: "Critical AI visibility red flags that block LLM discovery"
            },
            narrativeReport: {
              type: "string",
              description: "Comprehensive narrative report with detailed analysis and recommendations"
            },
            analyzedAt: {
              type: "string",
              description: "ISO timestamp of when the analysis was performed"
            },
            pageDetails: {
              type: "object",
              properties: {
                url: { type: "string" },
                title: { type: "string" },
                pageType: { type: "string", description: "Type of page (Homepage, Product, About, Blog, etc.)" },
                lastModified: { type: "string", description: "Last modified date if available" }
              },
              required: ["url", "title", "pageType"]
            }
          },
          required: [
            "overallScore", "aiLlmVisibilityScore", "techScore", "contentScore", "accessibilityScore", "authorityScore",
            "structuredData", "metadata", "contentVisibility", "technicalSeo", 
            "authoritySignals", "citationPotential", "recommendations", "redFlags", "narrativeReport", "analyzedAt", "pageDetails"
          ]
        },
      },
      contents: analysisPrompt,
    });

    const rawJson = response.text;
    safeLog(`Raw JSON response length: ${rawJson?.length || 0}`);
    
    if (!rawJson) {
      throw new Error("Empty response from Gemini AI - please try again");
    }

    // Check for common AI response issues
    if (rawJson.trim().length < 100) {
      throw new Error(`AI response too short (${rawJson.trim().length} characters) - this may indicate a service issue. Please try again.`);
    }

    // Check if the response contains actual error messages (not just the word "error" in JSON)
    const lowerResponse = rawJson.toLowerCase();
    if (lowerResponse.includes('"error":') || lowerResponse.includes('analysis failed') || lowerResponse.includes('unable to analyze')) {
      safeLogError('AI response contains error indicators:', rawJson.substring(0, 500));
      throw new Error('AI analysis encountered an error while processing your website. Please try again.');
    }

    try {
      const results: AnalysisResults = JSON.parse(rawJson);
      
      // Validate that we got a proper analysis result
      if (!results || typeof results !== 'object') {
        throw new Error('Invalid analysis result format');
      }
      
      // Validate essential fields
      if (typeof results.overallScore !== 'number' || results.overallScore < 0 || results.overallScore > 100) {
        throw new Error('Invalid overall score in analysis results');
      }
      
      if (!results.recommendations || !Array.isArray(results.recommendations.high)) {
        throw new Error('Missing or invalid recommendations in analysis results');
      }
      
      // Ensure analyzedAt is set if not provided by AI
      if (!results.analyzedAt) {
        results.analyzedAt = new Date().toISOString();
      }
      
      // Ensure pageDetails is set if not provided by AI
      if (!results.pageDetails) {
        results.pageDetails = {
          url: websiteData.url,
          title: websiteData.title,
          pageType: "Website", // Default fallback
        };
      }
      
      safeLog('AI analysis completed successfully');
      return results;
    } catch (parseError) {
      safeLogError('JSON parsing error:', parseError);
      safeLogError('Raw response preview:', rawJson.substring(0, 500) + '...');
      
      // Provide more specific error messages based on the type of parsing error
      if (parseError instanceof SyntaxError) {
        throw new Error(`AI generated malformed response (JSON syntax error). This may be due to high server load. Please try again.`);
      } else if (parseError instanceof Error && parseError.message.includes('Invalid')) {
        throw new Error(`AI response validation failed: ${parseError.message}. Please try again.`);
      } else {
        throw new Error(`Failed to process AI analysis results. This may be a temporary service issue. Please try again.`);
      }
    }
  } catch (error) {
    safeLogError("Gemini AI analysis error:", error);
    
    // Enhanced error handling for different types of AI service failures
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      // Network and service errors
      if (errorMessage.includes('timeout') || errorMessage.includes('deadline exceeded')) {
        throw new Error('AI analysis timeout - the website is too complex to analyze quickly. Please try again or contact support.');
      } else if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
        throw new Error('AI service quota exceeded - please try again in a few minutes.');
      } else if (errorMessage.includes('service unavailable') || errorMessage.includes('internal error')) {
        throw new Error('AI service temporarily unavailable - please try again in a few moments.');
      } else if (errorMessage.includes('invalid request') || errorMessage.includes('bad request')) {
        throw new Error('Invalid request sent to AI service - this may be due to unusual website content. Please try again.');
      } else if (errorMessage.includes('authentication') || errorMessage.includes('api key')) {
        throw new Error('AI service authentication error - please contact support.');
      } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        throw new Error('Network error connecting to AI service - please check your connection and try again.');
      } else if (errorMessage.includes('permission') || errorMessage.includes('access')) {
        throw new Error('AI service access denied - please try again or contact support.');
      } else {
        // Log the specific error for debugging
        console.error('Unexpected AI service error:', error);
        throw new Error(`AI analysis failed: ${error.message}. Please try again.`);
      }
    }
    
    throw new Error(`Failed to analyze website with AI: Unknown error occurred. Please try again.`);
  }
}
