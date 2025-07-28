import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { safeLogError } from "./utils/security";
// import { ddosProtection } from "./middleware/ddos-protection"; // DISABLED - was causing rate limit conflicts

const app = express();

// Enable trust proxy with security restrictions
// Only trust first proxy in production (Cloudflare/Nginx)
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : true);

// Security Headers Middleware
app.use((req, res, next) => {
  // Check if this is an iframe request by looking at headers
  const userAgent = req.headers['user-agent'] || '';
  const referer = req.headers['referer'] || '';
  const isIframeRequest = req.headers['sec-fetch-dest'] === 'iframe' || 
                          req.headers['sec-fetch-site'] === 'cross-site' ||
                          referer.includes('wordpress') || 
                          referer.includes('elementor');
  
  if (isIframeRequest) {
    // More permissive headers for iframe embedding
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://generativelanguage.googleapis.com",
      "frame-ancestors *",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '));
  } else {
    // Standard security headers for direct access
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://generativelanguage.googleapis.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '));
  }
  
  // Common security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // HTTPS enforcement in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
});

// URL Validation Middleware
const validateUrl = (req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/api/analyze' && req.method === 'POST') {
    const { url } = req.body;
    
    // Basic URL validation
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ message: 'Invalid URL provided' });
    }
    
    try {
      const parsedUrl = new URL(url);
      
      // Block dangerous protocols
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).json({ message: 'Only HTTP and HTTPS URLs are allowed' });
      }
      
      // Block local/private IPs
      const hostname = parsedUrl.hostname;
      
      // Check for private IP ranges
      const parts = hostname.split('.');
      if (parts.length === 4 && parts.every(part => !isNaN(Number(part)))) {
        const [a, b, c, d] = parts.map(Number);
        if (
          (a === 10) ||
          (a === 172 && b >= 16 && b <= 31) ||
          (a === 192 && b === 168) ||
          (a === 127) ||
          (a === 0)
        ) {
          return res.status(400).json({ message: 'Private IP addresses are not allowed' });
        }
      }
      
      // Block localhost variations
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0'
      ) {
        return res.status(400).json({ message: 'Localhost addresses are not allowed' });
      }
      
      // URL length limit
      if (url.length > 2048) {
        return res.status(400).json({ message: 'URL is too long' });
      }
      
    } catch (error) {
      return res.status(400).json({ message: 'Invalid URL format' });
    }
  }
  
  next();
};

// DDOS Protection - Temporarily disabled due to aggressive blocking
// app.use(ddosProtection);

app.use(express.json({ limit: '10mb' })); // Limit JSON payload size
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(validateUrl);

// Timeout middleware for long-running requests
app.use((req, res, next) => {
  // Set longer timeout for analysis requests
  if ((req.path === '/api/analyze' || req.path === '/api/analyze-multi-page') && req.method === 'POST') {
    req.setTimeout(600000); // 10 minutes for single-page analysis
    res.setTimeout(600000); // 10 minutes for single-page analysis
    
    // Extra time for multi-page analysis
    if (req.path === '/api/analyze-multi-page') {
      req.setTimeout(1200000); // 20 minutes for multi-page
      res.setTimeout(1200000); // 20 minutes for multi-page
    }
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);
  
  // Set server timeout to 20 minutes for long multi-page analysis
  server.timeout = 1200000; // 20 minutes in milliseconds
  server.keepAliveTimeout = 1200000; // 20 minutes
  server.headersTimeout = 1200000; // 20 minutes

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    let message = err.message || "Internal Server Error";
    
    // Enhanced error code mapping for better debugging
    const errorCode = err.code || 'UNKNOWN_ERROR';
    
    // Enhanced error messages based on common issues
    if (status === 500) {
      if (message.includes('ECONNREFUSED')) {
        message = 'Database connection failed - please try again later';
      } else if (message.includes('TIMEOUT')) {
        message = 'Request timeout - please try again';
      } else if (message.includes('ENOTFOUND')) {
        message = 'Service temporarily unavailable - please try again';
      } else if (message.includes('API key')) {
        message = 'AI service temporarily unavailable - please try again';
      }
    }

    // Use secure logging for errors with more context
    safeLogError(`Error ${status} (${errorCode}):`, {
      message: err.message,
      stack: err.stack,
      url: _req.url,
      method: _req.method,
      timestamp: new Date().toISOString(),
      userAgent: _req.headers['user-agent'],
      ip: _req.ip
    });

    // Only send response if it hasn't been sent already
    if (!res.headersSent) {
      res.status(status).json({ 
        message,
        error: errorCode,
        timestamp: new Date().toISOString()
      });
    }
    
    // Don't throw the error as it's already been handled
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
