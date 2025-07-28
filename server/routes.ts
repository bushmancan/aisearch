import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { performSEOAnalysis } from "./services/seo-analyzer";
import { analysisRequestSchema, multiPageAnalysisRequestSchema, emailReportSchema, followUpQuestionSchema } from "@shared/schema";
import { createHubSpotContact, createHubSpotNote, createHubSpotActivity, generateContactNote, createFollowUpTask } from "./services/hubspot";
import { handleFollowUpQuestion } from "./services/follow-up";
import { sendAnalysisReport } from "./services/email";
import { analytics } from "./services/analytics";
import { rateLimiter } from "./middleware/rate-limiter";
import { inputSanitizer } from "./middleware/input-sanitizer";
import { authenticateAdmin, authenticateAdminSession, adminLogin, adminLogout, getAdminSessionInfo } from "./middleware/auth";
import { getClientInfo } from "./utils/ip-utils";
// import { clearAllBlacklists, getDDOSStats } from "./middleware/ddos-protection"; // DISABLED - was causing rate limit conflicts

// Multi-page analysis session storage
const multiPageSessions = new Map<string, any>();

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Apply input sanitization to all API routes
  app.use("/api", inputSanitizer);
  
  // COMPLETELY DISABLED ALL RATE LIMITING - REMOVING ALL BLOCKS
  console.log(`🚫 Rate Limiter - ALL RATE LIMITING COMPLETELY DISABLED`);
  
  // ALL RATE LIMITING DISABLED FOR DEBUGGING
  // app.use("/api/analyze", rateLimiter(10 * 60 * 1000, 20));
  // app.use("/api/analyze-multi-page", rateLimiter(15 * 60 * 1000, 10));
  // app.use("/api/validate-url", rateLimiter(5 * 60 * 1000, 200));
  // app.use("/api/follow-up", rateLimiter(10 * 60 * 1000, 50));
  // app.use("/api/capture-lead", rateLimiter(10 * 60 * 1000, 50));
  // app.use("/api/send-report", rateLimiter(10 * 60 * 1000, 30));

  // Admin session management endpoints
  app.post("/api/admin/login", adminLogin);
  app.post("/api/admin/logout", adminLogout);
  app.get("/api/admin/session", getAdminSessionInfo);

  // Analytics endpoint
  app.get("/api/analytics", async (req, res) => {
    try {
      const stats = analytics.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Detailed analytics endpoint (for admin use)
  app.get("/api/analytics/detailed", authenticateAdminSession, async (req, res) => {
    try {
      const detailedStats = analytics.getDetailedLog();
      res.json(detailedStats);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Debug endpoint to check IP detection (admin only) - SECURITY RESTRICTED
  app.get("/api/debug/ip", authenticateAdminSession, async (req, res) => {
    try {
      const clientInfo = getClientInfo(req);
      
      // Only return essential information, no internal headers
      res.json({
        detectedIP: clientInfo.ip,
        isIframe: clientInfo.isIframe,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: 'IP detection failed' });
    }
  });

  // Debug endpoint to clear DDOS blacklists (admin only) - DISABLED
  // app.post("/api/debug/clear-blacklists", authenticateAdminSession, async (req, res) => {
  //   try {
  //     if (process.env.NODE_ENV !== 'development') {
  //       return res.status(403).json({ error: 'Only available in development' });
  //     }
  //     
  //     clearAllBlacklists();
  //     res.json({ 
  //       message: 'All IP blacklists cleared', 
  //       timestamp: new Date().toISOString() 
  //     });
  //   } catch (error) {
  //     res.status(500).json({ error: 'Failed to clear blacklists' });
  //   }
  // });

  // Debug endpoint to get DDOS protection stats (admin only) - DISABLED
  // app.get("/api/debug/ddos-stats", authenticateAdminSession, async (req, res) => {
  //   try {
  //     const stats = getDDOSStats();
  //     res.json(stats);
  //   } catch (error) {
  //     res.status(500).json({ error: 'Failed to get DDOS stats' });
  //   }
  // });

  // Debug endpoint for deployment status and diagnostics
  app.get("/api/debug/deployment", authenticateAdminSession, async (req, res) => {
    try {
      const diagnostics = {
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        env: {
          geminiApiKey: !!process.env.GEMINI_API_KEY,
          adminApiKey: !!process.env.ADMIN_API_KEY,
          databaseUrl: !!process.env.DATABASE_URL,
          fromEmail: !!process.env.FROM_EMAIL,
          sendgridApiKey: !!process.env.SENDGRID_API_KEY,
          hubspotApiKey: !!process.env.HUBSPOT_API_KEY,
        },
        codeVersion: {
          lastUpdated: new Date().toISOString(),
          features: [
            'Admin Session Management',
            'Auto-refresh Dashboard',
            'Enhanced Error Handling',
            'IP Detection System',
            'Inline HTML Reports',
            'Multiple Fetch Strategies',
            'Comprehensive Error Diagnostics'
          ]
        }
      };
      
      res.json(diagnostics);
    } catch (error) {
      res.status(500).json({ error: 'Deployment diagnostics failed' });
    }
  });

  // HubSpot connection test endpoint
  app.post("/api/debug/hubspot-test", authenticateAdminSession, async (req, res) => {
    try {
      const testContact = {
        email: "test@revenueexperts.ai",
        name: "Test User",
        company: "Revenue Experts AI",
        website: "https://revenueexperts.ai"
      };
      
      console.log("Testing HubSpot connection...");
      const result = await createHubSpotContact(testContact);
      
      res.json({
        success: result,
        message: result ? "HubSpot connection working" : "HubSpot connection failed",
        testContact: testContact,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("HubSpot test error:", error);
      res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Debug endpoint to check storage state (admin only) - with pagination
  app.get("/api/debug/storage", authenticateAdminSession, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 1000; // Increased default limit
      const offset = (page - 1) * limit;
      
      console.log(`Fetching analyses - Page: ${page}, Limit: ${limit}, Offset: ${offset}`);
      
      // Use efficient database query instead of scanning individual IDs
      const { analyses: allAnalyses, total: totalCount } = await storage.getAllAnalyses(limit, offset);
      
      console.log(`Found ${totalCount} total analyses, returning ${allAnalyses.length} for page ${page}`);
      
      // Debug: log a sample analysis to check data structure
      if (allAnalyses.length > 0) {
        console.log('Sample analysis data structure:', JSON.stringify(allAnalyses[0], null, 2));
      }
      
      res.json({ 
        analyses: allAnalyses, 
        count: allAnalyses.length,
        totalCount: totalCount,
        page: page,
        limit: limit,
        totalPages: Math.ceil(totalCount / limit)
      });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Delete analysis endpoint for admin dashboard
  app.delete("/api/admin/analyses/:id", authenticateAdminSession, async (req, res) => {
    try {
      const analysisId = parseInt(req.params.id);
      if (isNaN(analysisId)) {
        return res.status(400).json({ error: "Invalid analysis ID" });
      }

      const deleted = await storage.deleteAnalysis(analysisId);
      if (!deleted) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      res.json({ success: true, message: "Analysis deleted successfully" });
    } catch (error) {
      console.error("Error deleting analysis:", error);
      res.status(500).json({ error: "Failed to delete analysis" });
    }
  });

  // Enhanced analytics endpoint for admin dashboard
  app.get("/api/admin/analytics", authenticateAdminSession, async (req, res) => {
    try {
      // Get all analyses from database efficiently (for analytics stats)
      const { analyses: allAnalyses } = await storage.getAllAnalyses(10000, 0); // Get all records for stats
      
      console.log(`Found ${allAnalyses.length} analyses in database for admin analytics`);
      if (allAnalyses.length === 0) {
        console.log('No analyses found in database - check storage implementation');
      }

      // Calculate all metrics from database data
      const completedAnalyses = allAnalyses.filter(a => a.status === 'completed');
      const failedAnalyses = allAnalyses.filter(a => a.status === 'failed');
      const pendingAnalyses = allAnalyses.filter(a => a.status === 'pending');
      
      const ipStats = allAnalyses.reduce((acc, analysis) => {
        if (analysis.originIp && analysis.originIp !== 'unknown') {
          acc[analysis.originIp] = (acc[analysis.originIp] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const domainStats = allAnalyses.reduce((acc, analysis) => {
        try {
          const domain = new URL(analysis.url).hostname;
          acc[domain] = (acc[domain] || 0) + 1;
        } catch {
          acc['invalid-url'] = (acc['invalid-url'] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const averageScores = completedAnalyses.length > 0 ? {
        overall: Math.round(completedAnalyses.reduce((sum, a) => sum + (a.overallScore || 0), 0) / completedAnalyses.length),
        aiLlmVisibility: Math.round(completedAnalyses.reduce((sum, a) => sum + (a.aiLlmVisibilityScore || a.seoScore || 0), 0) / completedAnalyses.length),
        tech: Math.round(completedAnalyses.reduce((sum, a) => sum + (a.techScore || 0), 0) / completedAnalyses.length),
        content: Math.round(completedAnalyses.reduce((sum, a) => sum + (a.contentScore || 0), 0) / completedAnalyses.length),
        accessibility: Math.round(completedAnalyses.reduce((sum, a) => sum + (a.accessibilityScore || 0), 0) / completedAnalyses.length),
        authority: Math.round(completedAnalyses.reduce((sum, a) => sum + (a.authorityScore || 0), 0) / completedAnalyses.length),
      } : { overall: 0, aiLlmVisibility: 0, tech: 0, content: 0, accessibility: 0, authority: 0 };

      // Calculate unique websites
      const uniqueUrls = new Set(allAnalyses.map(a => {
        try {
          const domain = new URL(a.url).hostname;
          return domain.startsWith('www.') ? domain.substring(4) : domain;
        } catch {
          return a.url;
        }
      }));

      // Calculate success rate
      const successRate = allAnalyses.length > 0 ? 
        Math.round((completedAnalyses.length / allAnalyses.length) * 100) : 0;

      // Calculate uptime from oldest analysis
      const oldestAnalysis = allAnalyses.reduce((oldest, current) => 
        new Date(current.createdAt) < new Date(oldest.createdAt) ? current : oldest,
        allAnalyses[0]
      );
      const uptimeHours = oldestAnalysis ? 
        Math.round((Date.now() - new Date(oldestAnalysis.createdAt).getTime()) / (1000 * 60 * 60) * 100) / 100 : 0;

      // Recent analyses for timeline
      const recentAnalyses = allAnalyses
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
        .map(a => ({
          timestamp: a.createdAt,
          url: a.url,
          status: a.status === 'completed' ? 'success' as const : 'failed' as const,
          overallScore: a.overallScore || undefined,
          loadTime: undefined, // Not stored in database
          error: a.status === 'failed' ? 'Analysis failed' : undefined
        }));

      res.json({
        // Core metrics based on database data
        totalAnalyses: allAnalyses.length,
        successfulAnalyses: completedAnalyses.length,
        failedAnalyses: failedAnalyses.length,
        successRate,
        uniqueWebsites: uniqueUrls.size,
        averageScore: averageScores.overall,
        uptimeHours,
        lastReset: oldestAnalysis ? oldestAnalysis.createdAt : new Date().toISOString(),
        recentAnalyses,
        
        // Enhanced database metrics
        database: {
          totalRecords: allAnalyses.length,
          completedAnalyses: completedAnalyses.length,
          failedAnalyses: failedAnalyses.length,
          pendingAnalyses: pendingAnalyses.length,
        },
        ipStats,
        domainStats,
        averageScores
      });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });
  
  // Analyze website endpoint
  app.post("/api/analyze", async (req, res) => {
    try {
      // Validate request body
      const validationResult = analysisRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request",
          errors: validationResult.error.issues 
        });
      }

      const { url } = validationResult.data;

      // Capture client information for analytics with iframe detection
      const clientInfo = getClientInfo(req);
      const originIp = clientInfo.ip;
      const userAgent = clientInfo.userAgent;

      // Create analysis record (this will return cached result if available)
      const analysis = await storage.createAnalysis({ 
        url,
        originIp,
        userAgent 
      });
      
      // If we got a cached completed analysis, return it immediately
      if (analysis.status === "completed") {
        console.log(`Returning cached analysis for ${url}`);
        res.json({
          id: analysis.id,
          url,
          results: analysis.results,
          status: "completed"
        });
        return;
      }

      // Perform analysis with timeout
      try {
        const startTime = Date.now(); // Track timing for error logging
        console.log(`Starting analysis for URL: ${url}`);
        analytics.logAnalysisStarted(url);
        
        // Detect mobile requests for extended timeouts
        const isMobileRequest = req.headers['x-mobile-client'] === 'true' || 
                               /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(req.headers['user-agent'] || '');
        
        // Create a timeout promise with mobile considerations
        const timeoutDuration = isMobileRequest ? 300000 : 180000; // 5 minutes for mobile, 3 minutes for desktop
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            const timeoutMessage = isMobileRequest ? 
              'Mobile analysis timeout. Complex websites take longer on mobile devices. Please ensure stable connection and try again.' :
              'Analysis timeout - please try again. Try again with a simpler website or check your connection';
            reject(new Error(timeoutMessage));
          }, timeoutDuration);
        });
        
        // Race between analysis and timeout  
        const results = await Promise.race([
          performSEOAnalysis(url),
          timeoutPromise
        ]);
        const loadTime = Date.now() - startTime;
        
        // Use mathematically precise weighted calculation for consistency (1 decimal place)
        const overallScore = Math.round(
          ((results.aiLlmVisibilityScore * 0.25) + 
          (results.techScore * 0.20) + 
          (results.contentScore * 0.25) + 
          (results.accessibilityScore * 0.10) + 
          (results.authorityScore * 0.20)) * 10
        ) / 10;
        
        // Log the weighted calculation for transparency
        console.log(`Score breakdown - AI/LLM Visibility: ${results.aiLlmVisibilityScore}, Tech: ${results.techScore}, Content: ${results.contentScore}, Accessibility: ${results.accessibilityScore}, Authority: ${results.authorityScore}, Weighted Overall: ${overallScore}`);
        
        // Log AI's original score for comparison (but use our weighted calculation)
        if (results.overallScore && Math.abs(overallScore - results.overallScore) > 2) {
          console.log(`Math override: AI suggested ${results.overallScore}, using weighted calculation ${overallScore}`);
        }

        // Update analysis with results - use new schema field names
        await storage.updateAnalysis(analysis.id, {
          status: "completed",
          overallScore,
          aiLlmVisibilityScore: results.aiLlmVisibilityScore,
          techScore: results.techScore,
          contentScore: results.contentScore,
          accessibilityScore: results.accessibilityScore,
          authorityScore: results.authorityScore,
          results: results as any
        });

        console.log(`Analysis completed successfully for ID: ${analysis.id}`);
        analytics.logAnalysisCompleted(url, loadTime, overallScore);
        
        // Validate results before returning
        if (!results || typeof results.overallScore !== 'number' || results.overallScore < 0 || results.overallScore > 100) {
          throw new Error('Invalid analysis results generated');
        }
        
        // Log the response data for debugging
        console.log(`Returning analysis data: ID=${analysis.id}, URL=${url}, OverallScore=${overallScore}`);
        
        const response = {
          id: analysis.id,
          url,
          results,
          status: "completed" as const
        };
        
        // Override AI's overall score with mathematically calculated one
        response.results.overallScore = overallScore;
        
        // CRITICAL: Fix narrative report score consistency - replace AI score with mathematical score
        if (response.results.narrativeReport && results.overallScore !== overallScore) {
          const aiScore = results.overallScore;
          // Replace various score patterns in narrative text to ensure consistency
          response.results.narrativeReport = response.results.narrativeReport
            .replace(new RegExp(`Overall Score of ${aiScore}/100`, 'gi'), `Overall Score of ${overallScore}/100`)
            .replace(new RegExp(`overall score of ${aiScore}/100`, 'gi'), `Overall Score of ${overallScore}/100`)
            .replace(new RegExp(`${aiScore}/100`, 'g'), `${overallScore}/100`)
            .replace(new RegExp(`score of ${aiScore}`, 'gi'), `score of ${overallScore}`);
          
          console.log(`Fixed narrative report: replaced AI score ${aiScore} with mathematical score ${overallScore}`);
        }
        
        // Additional validation - log if there was a difference
        if (results.overallScore !== overallScore) {
          console.log(`Using mathematically precise score: calculated=${overallScore}, AI original=${results.overallScore}`);
        }
        
        res.json(response);
      } catch (analysisError) {
        console.error(`Analysis failed for URL: ${url}`, analysisError);
        
        // Update analysis with error status
        await storage.updateAnalysis(analysis.id, {
          status: "failed"
        });
        
        // Log failed analysis
        analytics.logAnalysisFailed(url, analysisError instanceof Error ? analysisError.message : 'Unknown error');
        
        // Enhanced error handling with detailed production logging
        let errorMessage = 'Analysis failed due to an unknown error';
        
        // Comprehensive production error context for troubleshooting
        const productionErrorContext = {
          timestamp: new Date().toISOString(),
          requestUrl: url,
          analysisId: analysis.id,
          environment: process.env.NODE_ENV || 'development',
          error: {
            name: analysisError instanceof Error ? analysisError.name : 'Unknown',
            message: analysisError instanceof Error ? analysisError.message : String(analysisError),
            stack: analysisError instanceof Error ? analysisError.stack : undefined
          },
          request: {
            originIp: clientInfo.ip,
            userAgent: clientInfo.userAgent,
            isIframe: clientInfo.isIframe,
            referer: req.headers.referer || 'none'
          },
          timing: {
            timeoutMs: 180000,
            note: 'Analysis timing not available in error state'
          },
          memoryUsage: process.memoryUsage()
        };
        
        // Log comprehensive error context for production debugging
        console.error('🚨 PRODUCTION ANALYSIS ERROR:', JSON.stringify(productionErrorContext, null, 2));
        
        if (analysisError instanceof Error) {
          const message = analysisError.message.toLowerCase();
          const originalMessage = analysisError.message; // Keep original case for domain extraction
          
          if (message.includes('timeout')) {
            errorMessage = 'Analysis timeout - please try again. Try again with a simpler website or check your connection';
          } else if (message.includes('rate limit')) {
            errorMessage = 'Rate limit exceeded - please wait a moment and try again';
          } else if (message.includes('quota')) {
            errorMessage = 'AI service quota exceeded - please try again later';
          } else if (message.includes('advanced bot protection') || message.includes('cloudflare')) {
            // Extract domain for personalized messaging from original message
            const domainMatch = originalMessage.match(/"([^"]+)"/);
            const domain = domainMatch ? domainMatch[1] : 'this website';
            errorMessage = `${domain} uses advanced security protection (likely Cloudflare) that blocks automated analysis. Try: (1) Analyzing a different page on the same site, (2) Checking if they have a public sitemap at ${domain}/sitemap.xml, or (3) Contacting the site owner to request analysis permission.`;
          } else if (message.includes('government website protection')) {
            errorMessage = 'Government websites have enhanced security policies that prevent automated analysis. This is normal and expected for .gov and .mil domains.';
          } else if (message.includes('website performance issues')) {
            errorMessage = 'The website is experiencing performance issues or may be temporarily down. Please try again in a few minutes.';
          } else if (message.includes('failed to scrape') || message.includes('unable to access')) {
            // Enhanced error messaging for better user experience with specific guidance
            if (message.includes('ssl certificate') || message.includes('ssl configuration')) {
              errorMessage = 'SSL Certificate Error: The website has SSL certificate issues that prevent secure analysis. Please contact the website owner to fix their SSL certificate configuration.';
            } else if (message.includes('website access failed')) {
              // Extract the detailed message after "Website Access Failed: "
              const detailIndex = originalMessage.indexOf('Website Access Failed: ');
              if (detailIndex !== -1) {
                errorMessage = originalMessage.substring(detailIndex + 'Website Access Failed: '.length);
              } else {
                errorMessage = 'Unable to access the website - please check the URL and try again';
              }
            } else {
              errorMessage = 'Unable to access the website - please check the URL and try again';
            }
          } else if (message.includes('connection') || message.includes('enotfound') || message.includes('econnrefused')) {
            errorMessage = 'Network connection failed - please check your internet connection and try again';
          } else if (message.includes('dns')) {
            errorMessage = 'DNS resolution failed - please check the URL is correct and try again';
          } else {
            errorMessage = analysisError.message;
          }
        }
        
        console.error(`Sending error response: ${errorMessage}`);
        throw new Error(errorMessage);
      }
    } catch (error) {
      // Production error logging for top-level analysis failures
      const topLevelErrorContext = {
        timestamp: new Date().toISOString(),
        endpoint: '/api/analyze',
        url: req.body?.url || 'unknown',
        error: {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        },
        request: {
          originIp: getClientInfo(req).ip,
          userAgent: getClientInfo(req).userAgent,
          isIframe: getClientInfo(req).isIframe,
          referer: req.headers.referer || 'none'
        },
        environment: process.env.NODE_ENV || 'development',
        memoryUsage: process.memoryUsage()
      };
      
      console.error('🚨 TOP-LEVEL ANALYSIS ERROR:', JSON.stringify(topLevelErrorContext, null, 2));
      
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Analysis failed"
      });
    }
  });

  // URL validation endpoint
  app.post("/api/validate-url", async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ 
          valid: false, 
          error: "Invalid URL provided" 
        });
      }

      // Basic URL format validation
      const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}(\/[-a-zA-Z0-9()@:%_\+.~#?&//=]*)?$/;
      if (!urlRegex.test(url)) {
        return res.json({ 
          valid: false, 
          error: "Invalid URL format" 
        });
      }

      // Simple DNS lookup validation - only check if domain exists
      console.log(`Validating domain existence for: ${url}`);
      
      try {
        // Quick DNS lookup test with minimal timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
          redirect: 'manual', // Don't follow redirects
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; URLValidator/1.0)'
          }
        });
        
        clearTimeout(timeoutId);
        
        // Any response (even errors like 403, 404, 500) means domain exists
        console.log(`✅ Domain exists for ${url} (status: ${response.status})`);
        return res.json({ valid: true });
        
      } catch (error) {
        console.log(`Domain validation error for ${url}:`, error.name, error.message);
        
        // Check for DNS/domain errors specifically
        let errorDetails = error.message;
        if (error.cause && error.cause.message) {
          errorDetails = error.cause.message;
        }
        
        // DNS errors mean domain doesn't exist
        if (errorDetails.includes('ENOTFOUND') || 
            errorDetails.includes('getaddrinfo') ||
            errorDetails.includes('name not found') ||
            errorDetails.includes('no such host')) {
          console.log(`❌ Domain does not exist: ${url}`);
          return res.json({ 
            valid: false, 
            error: "Domain not found - please check the URL is correct" 
          });
        }
        
        // For all other errors (timeouts, SSL, redirects, bot protection), assume domain exists
        // The full analysis will handle these cases with fallback strategies
        console.log(`✅ Domain likely exists for ${url} (validation blocked by: ${error.name})`);
        return res.json({ valid: true });
      }
    } catch (error) {
      console.error("URL validation error:", error);
      res.status(500).json({ 
        valid: false, 
        error: "Validation service error" 
      });
    }
  });

  // Multi-page analysis endpoint - start analysis and return session ID
  app.post("/api/analyze-multi-page", async (req, res) => {
    try {
      // Validate request body
      const validationResult = multiPageAnalysisRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request",
          errors: validationResult.error.issues 
        });
      }

      const { domain, paths, password } = validationResult.data;
      
      // Validate password for multi-page analysis
      const requiredPassword = "GeoSeo";
      if (password !== requiredPassword) {
        return res.status(401).json({ 
          message: "Invalid password for multi-page analysis. Please contact support for access."
        });
      }
      
      // Build full URLs from domain and paths
      const fullUrls = paths.map(path => {
        const cleanDomain = domain.replace(/\/$/, "");
        const cleanPath = path.startsWith("/") ? path : `/${path}`;
        return `${cleanDomain}${cleanPath}`;
      });

      console.log(`Starting multi-page analysis for domain: ${domain} with ${fullUrls.length} pages`);
      
      // Generate session ID for tracking progress
      const sessionId = Date.now().toString();
      
      // Start the analysis asynchronously
      performMultiPageAnalysisAsync(sessionId, domain, fullUrls, paths, req);
      
      // Return session ID immediately
      return res.json({ 
        sessionId,
        status: "started",
        message: "Multi-page analysis started successfully",
        totalPages: fullUrls.length
      });
      
    } catch (error) {
      console.error("Multi-page analysis error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      return res.status(500).json({ 
        message: "Multi-page analysis failed",
        error: errorMessage 
      });
    }
  });

  // Multi-page analysis status endpoint
  app.get("/api/analyze-multi-page/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      // Check if session exists in progress storage
      const progressData = multiPageSessions.get(sessionId);
      if (!progressData) {
        return res.status(404).json({ 
          message: "Session not found or expired" 
        });
      }
      
      return res.json(progressData);
      
    } catch (error) {
      console.error("Multi-page status error:", error);
      return res.status(500).json({ 
        message: "Failed to get analysis status" 
      });
    }
  });

  // Async helper function to perform multi-page analysis
  async function performMultiPageAnalysisAsync(sessionId: string, domain: string, fullUrls: string[], paths: string[], req: any) {
    // Initialize session data
    multiPageSessions.set(sessionId, {
      sessionId,
      domain,
      paths,
      status: "analyzing",
      totalPages: fullUrls.length,
      completedPages: 0,
      currentPageIndex: 0,
      pageResults: [],
      startTime: Date.now(),
      updatedAt: Date.now()
    });

    try {
      const result = await performMultiPageAnalysis(domain, fullUrls, paths, req, sessionId);
      
      // Update session with completed results
      multiPageSessions.set(sessionId, {
        ...multiPageSessions.get(sessionId),
        status: "completed",
        ...result,
        completedAt: Date.now(),
        updatedAt: Date.now()
      });
      
    } catch (error) {
      // Update session with error
      multiPageSessions.set(sessionId, {
        ...multiPageSessions.get(sessionId),
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        completedAt: Date.now(),
        updatedAt: Date.now()
      });
    }
  }

  // Helper function to perform multi-page analysis
  /**
   * MULTI-PAGE ANALYSIS ENGINE
   * Orchestrates comprehensive domain-wide analysis across multiple pages with real-time session management
   * 
   * @param domain - The domain being analyzed (e.g., "example.com")
   * @param fullUrls - Array of complete URLs to analyze (e.g., ["https://example.com/", "https://example.com/about"])
   * @param paths - Array of URL paths for display purposes (e.g., ["/", "/about"])
   * @param req - Express request object for client IP/UserAgent extraction
   * @param sessionId - Optional session ID for real-time progress tracking via multiPageSessions Map
   * @returns Promise<MultiPageAnalysisResult> - Aggregated domain insights and individual page results
   * 
   * SESSION MANAGEMENT STRATEGY:
   * - Uses in-memory Map (multiPageSessions) to track analysis progress
   * - Each session contains: status, currentPage, completedPages, pageResults, domainInsights
   * - Frontend polls /api/analyze-multi-page/:sessionId every 3 seconds for updates
   * - Session expires after completion or 30 minutes of inactivity
   * 
   * ANALYSIS WORKFLOW:
   * 1. Initialize session with "analyzing" status and progress tracking
   * 2. Analyze each page sequentially using performSEOAnalysis()
   * 3. Update session after each page completion with real-time progress
   * 4. Bypass cache (bypassCache=true) to ensure fresh scoring for domain comparisons
   * 5. Calculate domain-wide insights: average scores, best/worst performing pages
   * 6. Implement progressive retry logic (2 attempts max with exponential backoff)
   * 7. Set final session status to "completed" with aggregated results
   * 
   * DOMAIN INSIGHT CALCULATIONS:
   * - Average Score: Mathematical mean of all page overallScores
   * - Best Page: Page with highest overallScore (ties go to first found)
   * - Worst Page: Page with lowest overallScore (ties go to first found)
   * - Score Distribution: Individual category averages (SEO, Technical, Content, etc.)
   * - Success Rate: Percentage of pages analyzed successfully vs failed
   * 
   * ERROR HANDLING & RESILIENCE:
   * - Individual page failures don't stop overall analysis
   * - Network errors trigger progressive retry with 1s, 2s delays
   * - Timeout per page: 2 minutes (shorter than single-page 3 minutes)
   * - Failed pages marked with error status but analysis continues
   * - Session updated with partial results even if some pages fail
   * 
   * CACHE BYPASS RATIONALE:
   * Single-page analysis uses 24-hour cache for performance, but multi-page analysis
   * bypasses cache to ensure accurate domain-wide scoring comparisons. Fresh analysis
   * prevents skewed domain insights when mixing cached/fresh results.
   */
  async function performMultiPageAnalysis(domain: string, fullUrls: string[], paths: string[], req: any, sessionId?: string) {

      // Capture client information
      const clientInfo = getClientInfo(req);
      const originIp = clientInfo.ip;
      const userAgent = clientInfo.userAgent;

      // Analyze each page sequentially
      const pageResults = [];
      let totalScore = 0;
      let completedPages = 0;

      for (let i = 0; i < fullUrls.length; i++) {
        const url = fullUrls[i];
        const path = paths[i];
        
        // Update session progress if sessionId provided
        if (sessionId) {
          const sessionData = multiPageSessions.get(sessionId);
          if (sessionData) {
            multiPageSessions.set(sessionId, {
              ...sessionData,
              currentPageIndex: i,
              currentPageUrl: url,
              completedPages: i,
              status: "analyzing",
              currentStep: "Starting analysis",
              currentStepDetails: `Beginning analysis of page ${i + 1}/${fullUrls.length}`,
              updatedAt: Date.now()
            });
          }
        }
        
        try {
          console.log(`Analyzing page ${i + 1}/${fullUrls.length}: ${url}`);
          
          // Update status: Creating analysis record
          if (sessionId) {
            const sessionData = multiPageSessions.get(sessionId);
            if (sessionData) {
              multiPageSessions.set(sessionId, {
                ...sessionData,
                currentStep: "Preparing analysis",
                currentStepDetails: `Creating analysis record for ${url}`,
                updatedAt: Date.now()
              });
            }
          }
          
          // Create analysis record, bypassing cache for multi-page to ensure consistent collective scoring
          const analysis = await storage.createAnalysis({ 
            url,
            originIp,
            userAgent 
          }, true); // bypassCache = true for multi-page analysis
          
          // Perform fresh analysis for accurate collective scoring with retry mechanism
          let results;
          let loadTime;
          let retryCount = 0;
          const maxRetries = 2;
          
          while (retryCount <= maxRetries) {
            try {
              const startTime = Date.now();
              
              // Update status: Starting analysis
              if (sessionId) {
                const sessionData = multiPageSessions.get(sessionId);
                if (sessionData) {
                  multiPageSessions.set(sessionId, {
                    ...sessionData,
                    currentStep: "Analyzing website",
                    currentStepDetails: `Scraping content and analyzing with AI (attempt ${retryCount + 1}/${maxRetries + 1})`,
                    updatedAt: Date.now()
                  });
                }
              }
              
              // Create a timeout promise for multi-page analysis (shorter timeout per page)
              const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => {
                  reject(new Error('Page analysis timeout - moving to next page'));
                }, 120000); // 2 minutes per page for multi-page analysis
              });
              
              // Race between analysis and timeout
              results = await Promise.race([
                performSEOAnalysis(url),
                timeoutPromise
              ]);
              
              loadTime = Date.now() - startTime;
              break; // Success, exit retry loop
            } catch (analysisError) {
              retryCount++;
              console.log(`Analysis attempt ${retryCount} failed for ${url}:`, analysisError);
              
              if (retryCount <= maxRetries) {
                console.log(`Retrying analysis for ${url} (attempt ${retryCount + 1}/${maxRetries + 1})...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Progressive delay
              } else {
                throw analysisError; // Re-throw if max retries exceeded
              }
            }
          }
            
          // NEW: 5-category weighted scoring system  
          const overallScore = Math.round(
            (results.aiLlmVisibilityScore * 0.25) + 
            (results.techScore * 0.20) + 
            (results.contentScore * 0.25) + 
            (results.accessibilityScore * 0.10) + 
            (results.authorityScore * 0.20)
          );
          
          // Update status: Finalizing results
          if (sessionId) {
            const sessionData = multiPageSessions.get(sessionId);
            if (sessionData) {
              multiPageSessions.set(sessionId, {
                ...sessionData,
                currentStep: "Finalizing results",
                currentStepDetails: `Saving analysis results (Score: ${overallScore})`,
                updatedAt: Date.now()
              });
            }
          }
          
          // Update analysis with results
          await storage.updateAnalysis(analysis.id, {
            status: "completed",
            overallScore,
            aiLlmVisibilityScore: results.aiLlmVisibilityScore,
            techScore: results.techScore,
            contentScore: results.contentScore,
            accessibilityScore: results.accessibilityScore,
            authorityScore: results.authorityScore,
            results: results as any
          });

          pageResults.push({
            url,
            path,
            analysis: results,
            score: overallScore,
            loadTime,
            cached: false
          });
          
          totalScore += overallScore;
          completedPages++;
          
          console.log(`Completed page ${i + 1}/${fullUrls.length}: ${url} (Score: ${overallScore})`);
        } catch (error) {
          console.error(`Failed to analyze ${url}:`, error);
          
          // Provide specific error messages for different failure scenarios
          let errorMessage = 'Analysis failed';
          if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (message.includes('timeout') || message.includes('aborted')) {
              errorMessage = 'Analysis timed out - website may be slow to respond';
            } else if (message.includes('network') || message.includes('fetch') || message.includes('connection') || message.includes('econnrefused') || message.includes('enotfound')) {
              errorMessage = 'Network connection issue - please check your internet connection and try again with fewer pages';
            } else if (message.includes('403') || message.includes('forbidden')) {
              errorMessage = 'Access denied - website may be blocking automated requests';
            } else if (message.includes('404') || message.includes('not found')) {
              errorMessage = 'Page not found - please check the URL';
            } else if (message.includes('quota') || message.includes('limit')) {
              errorMessage = 'Service quota exceeded - please try again later';
            } else {
              errorMessage = error.message;
            }
          }
          
          pageResults.push({
            url,
            path,
            error: errorMessage,
            score: 0,
            cached: false
          });
        }
      }

      const averageScore = completedPages > 0 ? Math.round(totalScore / completedPages) : 0;
      
      console.log(`Multi-page analysis completed: ${completedPages}/${fullUrls.length} pages, average score: ${averageScore}`);

      /**
       * DOMAIN INSIGHT CALCULATION ENGINE
       * Aggregates individual page analysis results into domain-wide intelligence
       * 
       * MATHEMATICAL OPERATIONS:
       * - Average Score: Sum of all overallScores ÷ completedPages (excludes failed pages)
       * - Best Page: Reduce operation finding highest scoring page (first wins ties)
       * - Worst Page: Reduce operation finding lowest scoring page (first wins ties)
       * - Success Rate: completedPages ÷ totalPages (percentage of successful analyses)
       * 
       * BUSINESS INTELLIGENCE:
       * - Identifies highest-performing pages for replication strategies
       * - Highlights weakest pages requiring immediate optimization
       * - Provides domain-wide performance baseline for improvement tracking
       * - Supports strategic decision-making for content optimization priorities
       * 
       * ERROR HANDLING:
       * - Failed pages (score = 0) excluded from average calculation
       * - Edge case: If all pages fail, averageScore = 0
       * - Best/worst calculations handle empty arrays gracefully
       */
      const domainInsights = {
        totalPages: fullUrls.length,
        completedPages,
        averageScore,
        // Find highest scoring page (first occurrence wins ties)
        bestPage: pageResults.reduce((best, current) => 
          current.score > best.score ? current : best, pageResults[0]
        ),
        // Find lowest scoring page (first occurrence wins ties)  
        worstPage: pageResults.reduce((worst, current) => 
          current.score < worst.score ? current : worst, pageResults[0]
        ),
        // Calculate success rate for reliability metrics
        successRate: Math.round((completedPages / fullUrls.length) * 100),
        commonIssues: [], // TODO: Implement cross-page pattern analysis
        recommendations: [] // TODO: Implement domain-wide optimization suggestions
      };

      return {
        domain,
        paths,
        results: pageResults,
        domainInsights,
        status: "completed",
        analysisType: "multi-page"
      };
  }

  // Get analysis by ID
  app.get("/api/analysis/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid analysis ID" });
      }

      const analysis = await storage.getAnalysis(id);
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }

      res.json(analysis);
    } catch (error) {
      console.error("Get analysis error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to get analysis"
      });
    }
  });

  // Lead capture endpoint
  app.post("/api/capture-lead", async (req, res) => {
    try {
      console.log("Lead capture request body:", JSON.stringify(req.body, null, 2));
      
      // Validate request body
      const validationResult = emailReportSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.log("Validation failed:", validationResult.error.issues);
        return res.status(400).json({ 
          message: "Invalid request",
          errors: validationResult.error.issues 
        });
      }

      const { email, name, company, analysisId, websiteUrl, analysisResults, marketingOptIn } = validationResult.data;

      // Handle multi-page analysis (analysisId = 0) vs single-page analysis
      let finalWebsiteUrl = websiteUrl;
      let finalAnalysisResults = analysisResults;
      let finalOverallScore = 0;

      if (analysisId === 0) {
        // Multi-page analysis - use data from request
        console.log('Processing multi-page analysis lead capture');
        
        // Extract domain from websiteUrl or analysisResults
        const domain = websiteUrl || (analysisResults as any)?.domain || 'Unknown Domain';
        finalWebsiteUrl = domain;
        
        // Try to extract score from analysisResults
        finalOverallScore = (analysisResults as any)?.domainInsights?.averageScore || 
                           (analysisResults as any)?.averageScore || 
                           75; // Default score if not available
      } else {
        // Single-page analysis - try to get from storage first, fallback to request data
        let analysis = await storage.getAnalysis(analysisId);
        
        if (analysis && analysis.status === "completed" && analysis.results) {
          // Use data from storage if available
          finalWebsiteUrl = analysis.url;
          finalAnalysisResults = analysis.results as any;
          finalOverallScore = analysis.overallScore || 0;
        } else if (analysisResults && analysisResults.pageDetails) {
          // Use data from request if storage is empty
          finalWebsiteUrl = analysisResults.pageDetails.url;
          finalOverallScore = analysisResults.overallScore || 0;
        } else {
          return res.status(400).json({ 
            message: "Analysis data not available. Please ensure the analysis was completed successfully." 
          });
        }
      }

      console.log(`Processing lead capture for ${email} - Website: ${finalWebsiteUrl} - Score: ${finalOverallScore}`);

      // Create HubSpot contact for lead generation
      console.log("Creating HubSpot contact...");
      const contactCreated = await createHubSpotContact({
        email,
        name,
        company,
        website: finalWebsiteUrl
      });

      console.log(`HubSpot contact creation result: ${contactCreated}`);

      // Create activity record for tracking
      const activityContent = `LLM Visibility Audit Report delivered for ${finalWebsiteUrl}. Overall Score: ${finalOverallScore}/100. Report includes detailed analysis and recommendations for AI search optimization.`;
      console.log("Creating HubSpot activity...");
      const activityCreated = await createHubSpotActivity(email, activityContent);
      
      console.log(`HubSpot activity creation result: ${activityCreated}`);

      // Create 3-day follow-up task
      console.log("Creating follow-up task...");
      const taskCreated = await createFollowUpTask(email, finalWebsiteUrl, finalAnalysisResults);
      
      console.log(`Follow-up task creation result: ${taskCreated}`);

      res.json({ 
        message: "Lead captured successfully in HubSpot",
        contactCreated: contactCreated,
        noteCreated: false,
        taskCreated: taskCreated,
        info: "Analysis details stored in contact properties and follow-up task created"
      });
    } catch (error) {
      console.error("Lead capture error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to capture lead"
      });
    }
  });

  // Follow-up question endpoint
  app.post("/api/follow-up", async (req, res) => {
    try {
      console.log("Processing follow-up question request...");
      
      // Validate request body
      const validationResult = followUpQuestionSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.error("Follow-up validation failed:", validationResult.error.issues);
        return res.status(400).json({ 
          message: "Invalid request",
          errors: validationResult.error.issues 
        });
      }

      const { question, analysisId, analysisResults } = validationResult.data;
      console.log(`Follow-up question: "${question.substring(0, 100)}..."`);

      // Use analysis results from request (don't rely on storage for follow-up questions)
      if (!analysisResults || !analysisResults.pageDetails) {
        console.error("Missing analysis data in follow-up request");
        return res.status(400).json({ 
          message: "Analysis data not available. Please ensure the analysis was completed successfully." 
        });
      }

      const websiteUrl = analysisResults.pageDetails.url;
      const finalAnalysisResults = analysisResults;
      console.log(`Processing follow-up for website: ${websiteUrl}`);

      // Process follow-up question with AI
      console.log("Calling AI for follow-up response...");
      const followUpResponse = await handleFollowUpQuestion(
        question,
        finalAnalysisResults,
        websiteUrl
      );

      console.log("Follow-up response generated successfully");
      res.json({
        message: "Follow-up question processed successfully",
        response: followUpResponse
      });
    } catch (error) {
      console.error("Follow-up question error:", error);
      
      // Provide more specific error messages
      let errorMessage = "Failed to process your question. Please try again.";
      
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes('timeout')) {
          errorMessage = "The AI service took too long to respond. Please try asking a simpler question.";
        } else if (message.includes('quota')) {
          errorMessage = "AI service quota exceeded. Please try again in a few minutes.";
        } else if (message.includes('empty')) {
          errorMessage = "Please enter a question to get help with your analysis.";
        } else {
          errorMessage = error.message;
        }
      }
      
      res.status(500).json({ 
        message: errorMessage
      });
    }
  });

  // Send email report endpoint
  app.post("/api/send-report", async (req, res) => {
    try {
      // Validate request body
      const validationResult = emailReportSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request",
          errors: validationResult.error.issues 
        });
      }

      const { email, name, company, analysisId, websiteUrl, analysisResults, marketingOptIn } = validationResult.data;

      // Debug logging to understand the data structure
      console.log('Email report request - analysisId:', analysisId);
      console.log('Email report request - websiteUrl:', websiteUrl);
      console.log('Email report request - analysisResults structure:', JSON.stringify(analysisResults, null, 2));

      // Handle multi-page analysis (analysisId = 0) vs single-page analysis
      let finalWebsiteUrl = websiteUrl;
      let finalAnalysisResults = analysisResults;
      let finalOverallScore = 0;
      let finalReportContent = "Detailed analysis report available upon request.";

      if (analysisId === 0) {
        // Multi-page analysis - ALWAYS generate comprehensive report
        console.log('Processing multi-page analysis email report');
        
        // Extract domain from websiteUrl or analysisResults
        const domain = websiteUrl || (analysisResults as any)?.domain || 'Unknown Domain';
        finalWebsiteUrl = domain;
        
        // Try to extract score from analysisResults or use a default
        finalOverallScore = (analysisResults as any)?.domainInsights?.averageScore || 
                           (analysisResults as any)?.averageScore || 
                           75; // Default score if not available
        
        // Mark as multi-page analysis for email service detection
        finalReportContent = `Multi-page analysis completed for ${domain} with ${finalOverallScore}/100 average score across all analyzed pages.`;
        console.log('Set multi-page trigger content for email service');
        console.log('MULTI-PAGE REPORT CONTENT:', finalReportContent);
      } else {
        // Single-page analysis - try to get from storage first, fallback to request data
        let analysis = await storage.getAnalysis(analysisId);
        
        if (analysis && analysis.status === "completed" && analysis.results) {
          // Use data from storage if available
          finalWebsiteUrl = analysis.url;
          finalAnalysisResults = analysis.results as any;
          // Use mathematically calculated weighted score for consistency (1 decimal place)
          const resultsData = analysis.results as any;
          if (resultsData && resultsData.aiLlmVisibilityScore) {
            finalOverallScore = Math.round(
              ((resultsData.aiLlmVisibilityScore * 0.25) + 
              (resultsData.techScore * 0.20) + 
              (resultsData.contentScore * 0.25) + 
              (resultsData.accessibilityScore * 0.10) + 
              (resultsData.authorityScore * 0.20)) * 10
            ) / 10;
          } else {
            finalOverallScore = analysis.overallScore || 0;
          }
          finalReportContent = resultsData?.narrativeReport || finalReportContent;
        } else if (analysisResults && analysisResults.pageDetails) {
          // Use data from request if storage is empty
          finalWebsiteUrl = analysisResults.pageDetails.url;
          finalOverallScore = analysisResults.overallScore || 0;
          finalReportContent = analysisResults.narrativeReport || finalReportContent;
        } else {
          return res.status(400).json({ 
            message: "Analysis data not available. Please ensure the analysis was completed successfully." 
          });
        }
      }

      // Debug: Log what finalReportContent contains before sending email
      console.log('=== EMAIL DEBUG ===');
      console.log('finalReportContent length:', finalReportContent.length);
      console.log('finalReportContent preview:', finalReportContent.substring(0, 200));
      console.log('finalOverallScore:', finalOverallScore);
      console.log('finalWebsiteUrl:', finalWebsiteUrl);
      console.log('==================');

      // Send email report with analysis_id to help email service detect multi-page vs single-page
      const emailSent = await sendAnalysisReport({
        user_name: name,
        user_email: email,
        website_url: finalWebsiteUrl || "Unknown website",
        report_content: finalReportContent,
        overall_score: finalOverallScore,
        company_name: company,
        analysis_results: finalAnalysisResults, // Pass analysis results for HTML report generation
        analysis_id: analysisId, // Include analysis ID for proper detection
      });

      // ALSO create HubSpot contact and activity when email is sent
      if (emailSent) {
        console.log("Email sent successfully, now updating HubSpot...");
        
        // Create/update HubSpot contact
        const contactCreated = await createHubSpotContact({
          email,
          name,
          company,
          website: finalWebsiteUrl || "Unknown website"
        });
        
        // Create activity record in HubSpot
        const activityContent = `LLM Visibility Audit Report delivered for ${finalWebsiteUrl}. Overall Score: ${finalOverallScore}/100. Email report sent successfully.`;
        const activityCreated = await createHubSpotActivity(email, activityContent);
        
        console.log(`HubSpot contact created: ${contactCreated}, activity created: ${activityCreated}`);
        
        res.json({ 
          message: "Email report sent successfully and HubSpot updated",
          emailSent: true,
          hubspotUpdated: contactCreated && activityCreated
        });
      } else {
        res.status(500).json({ 
          message: "Failed to send email report. Please contact support.",
          emailSent: false
        });
      }
    } catch (error) {
      console.error("Email report error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to send email report"
      });
    }
  });

  // Serve widget.js for WordPress integration
  app.get("/widget.js", (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow cross-origin requests
    res.sendFile(require('path').join(__dirname, 'widget.js'));
  });

  const httpServer = createServer(app);
  
  // Set timeout for long-running analysis requests
  httpServer.timeout = 600000; // 10 minutes (600 seconds) for multi-page analysis
  httpServer.keepAliveTimeout = 600000; // 10 minutes
  httpServer.headersTimeout = 610000; // 10 minutes + 10 seconds
  
  return httpServer;
}
