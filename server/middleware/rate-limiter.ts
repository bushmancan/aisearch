import { Request, Response, NextFunction } from 'express';

interface RateLimitData {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private static instance: RateLimiter;
  private requests: Map<string, RateLimitData> = new Map();

  private constructor() {}

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  private getClientKey(req: Request): string {
    // Use IP address and user agent for rate limiting
    const forwarded = req.headers['x-forwarded-for'] as string;
    const ip = forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const clientKey = `${ip}:${userAgent}`;
    
    console.log(`🔍 Rate Limiter - Client Key Generation:`, {
      path: req.path,
      method: req.method,
      forwarded: forwarded,
      socketIP: req.socket.remoteAddress,
      finalIP: ip,
      userAgent: userAgent.substring(0, 50) + '...',
      clientKey: clientKey.substring(0, 100) + '...'
    });
    
    return clientKey;
  }

  private cleanup() {
    const now = Date.now();
    let cleanedCount = 0;
    const totalBefore = this.requests.size;
    
    for (const [key, data] of this.requests.entries()) {
      if (now > data.resetTime) {
        this.requests.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Rate Limiter - Cleanup:`, {
        totalBefore: totalBefore,
        cleaned: cleanedCount,
        remaining: this.requests.size,
        currentTime: now
      });
    }
  }

  checkRateLimit(req: Request, windowMs: number, maxRequests: number): boolean {
    // COMPLETELY DISABLED - BYPASSING ALL RATE LIMITING
    console.log(`🚫 Rate Limiter - COMPLETELY DISABLED - Request allowed through for ${req.path}`);
    return true;
    
    // ALL RATE LIMITING CODE DISABLED BELOW
    /*
    this.cleanup();
    
    const clientKey = this.getClientKey(req);
    const now = Date.now();
    const rateLimitData = this.requests.get(clientKey);

    console.log(`🚦 Rate Limiter - Check Request:`, {
      path: req.path,
      method: req.method,
      clientKey: clientKey.substring(0, 100) + '...',
      windowMs: windowMs,
      maxRequests: maxRequests,
      currentTime: now,
      existingData: rateLimitData ? {
        count: rateLimitData.count,
        resetTime: rateLimitData.resetTime,
        timeUntilReset: rateLimitData.resetTime - now
      } : 'none',
      totalTrackedClients: this.requests.size
    });

    if (!rateLimitData) {
      this.requests.set(clientKey, {
        count: 1,
        resetTime: now + windowMs
      });
      console.log(`✅ Rate Limiter - New Client Allowed:`, {
        path: req.path,
        clientKey: clientKey.substring(0, 100) + '...',
        newResetTime: now + windowMs
      });
      return true;
    }

    if (now > rateLimitData.resetTime) {
      // Reset the window
      rateLimitData.count = 1;
      rateLimitData.resetTime = now + windowMs;
      console.log(`🔄 Rate Limiter - Window Reset:`, {
        path: req.path,
        clientKey: clientKey.substring(0, 100) + '...',
        newResetTime: now + windowMs
      });
      return true;
    }

    if (rateLimitData.count >= maxRequests) {
      console.log(`❌ Rate Limiter - BLOCKED:`, {
        path: req.path,
        clientKey: clientKey.substring(0, 100) + '...',
        currentCount: rateLimitData.count,
        maxRequests: maxRequests,
        timeUntilReset: rateLimitData.resetTime - now,
        resetTime: new Date(rateLimitData.resetTime).toISOString()
      });
      return false;
    }

    rateLimitData.count++;
    console.log(`⚠️ Rate Limiter - Request Counted:`, {
      path: req.path,
      clientKey: clientKey.substring(0, 100) + '...',
      newCount: rateLimitData.count,
      maxRequests: maxRequests,
      remaining: maxRequests - rateLimitData.count
    });
    return true;
  }

  getRemainingRequests(req: Request, maxRequests: number): number {
    const clientKey = this.getClientKey(req);
    const rateLimitData = this.requests.get(clientKey);
    
    if (!rateLimitData) {
      return maxRequests;
    }

    const now = Date.now();
    if (now > rateLimitData.resetTime) {
      return maxRequests;
    }

    return Math.max(0, maxRequests - rateLimitData.count);
  }

  getResetTime(req: Request): number {
    const clientKey = this.getClientKey(req);
    const rateLimitData = this.requests.get(clientKey);
    
    if (!rateLimitData) {
      return 0;
    }

    return Math.max(0, rateLimitData.resetTime - Date.now());
  }
}

export function rateLimiter(windowMs: number, maxRequests: number) {
  const limiter = RateLimiter.getInstance();

  return (req: Request, res: Response, next: NextFunction) => {
    const allowed = limiter.checkRateLimit(req, windowMs, maxRequests);

    if (!allowed) {
      const resetTime = limiter.getResetTime(req);
      const resetTimeSeconds = Math.ceil(resetTime / 1000);
      const resetMinutes = Math.ceil(resetTimeSeconds / 60);

      // Create specific error message based on endpoint
      let errorMessage = `Rate limit exceeded. Try again in ${resetTimeSeconds} seconds.`;
      let userAdvice = 'Please wait before trying again.';

      if (req.path.includes('/analyze-multi-page')) {
        errorMessage = `Multi-page analysis limit reached (${maxRequests} analyses per ${Math.ceil(windowMs / 60000)} minutes).`;
        userAdvice = `Please wait ${resetMinutes} minute${resetMinutes > 1 ? 's' : ''} before starting another multi-page analysis. You can still use single-page analysis in the meantime.`;
      } else if (req.path.includes('/analyze')) {
        errorMessage = `Analysis limit reached (${maxRequests} analyses per ${Math.ceil(windowMs / 60000)} minutes).`;
        userAdvice = `Please wait ${resetMinutes} minute${resetMinutes > 1 ? 's' : ''} before analyzing another website.`;
      } else if (req.path.includes('/validate-url')) {
        errorMessage = `URL validation limit reached (${maxRequests} validations per ${Math.ceil(windowMs / 60000)} minutes).`;
        userAdvice = `Please wait ${resetMinutes} minute${resetMinutes > 1 ? 's' : ''} before validating more URLs.`;
      }

      res.status(429).json({
        error: 'Rate limit exceeded',
        message: errorMessage,
        advice: userAdvice,
        retryAfter: resetTimeSeconds,
        resetTime: new Date(Date.now() + resetTime).toISOString()
      });
      return;
    }

    // Add rate limit headers
    const remaining = limiter.getRemainingRequests(req, maxRequests);
    const resetTime = limiter.getResetTime(req);
    
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': Math.ceil((Date.now() + resetTime) / 1000).toString()
    });

    next();
  };
}