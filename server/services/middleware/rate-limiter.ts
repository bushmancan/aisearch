import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

export function rateLimiter(
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  maxRequests: number = 10, // limit each IP to 10 requests per windowMs
  skipSuccessfulRequests: boolean = true
) {
  return (req: Request, res: Response, next: NextFunction) => {
    // COMPLETELY DISABLED - BYPASSING ALL RATE LIMITING
    console.log(`🚫 Rate Limiter - COMPLETELY DISABLED - Request allowed through`);
    next();
    return;
    
    // ALL RATE LIMITING CODE DISABLED BELOW
    /*
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const key = `${ip}-${req.path}`;
    const now = Date.now();
    
    // Initialize or reset if window expired
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs
      };
    }
    
    // Check if limit exceeded
    if (store[key].count >= maxRequests) {
      return res.status(429).json({
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((store[key].resetTime - now) / 1000)
      });
    }
    
    // Increment counter
    store[key].count++;
    
    // Set response headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - store[key].count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(store[key].resetTime / 1000));
    
    // If skipSuccessfulRequests is true, decrement counter for successful responses
    if (skipSuccessfulRequests) {
      res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          store[key].count = Math.max(0, store[key].count - 1);
        }
      });
    }
    
    next();
    */
  };
}