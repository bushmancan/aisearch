/**
 * Advanced DDOS Protection and Security Middleware
 * Implements multiple layers of protection against various attack vectors
 */

import { Request, Response, NextFunction } from 'express';
import { getClientInfo } from '../utils/ip-utils';

// Connection tracking for DDOS detection
interface ConnectionData {
  count: number;
  lastRequest: number;
  consecutiveRequests: number;
  suspiciousActivity: boolean;
  blacklistedUntil?: number;
}

// Global connection tracking
const connections = new Map<string, ConnectionData>();
const suspiciousIPs = new Set<string>();

// Configuration
const DDOS_CONFIG = {
  // Rate limiting
  MAX_REQUESTS_PER_MINUTE: 120, // Increased for legitimate use
  MAX_REQUESTS_PER_HOUR: 500,
  MAX_CONSECUTIVE_REQUESTS: 20, // Increased threshold
  
  // Connection limits
  MAX_CONCURRENT_CONNECTIONS: 200,
  CONNECTION_TIMEOUT: 30000, // 30 seconds
  
  // Blacklist duration
  BLACKLIST_DURATION: 10 * 60 * 1000, // 10 minutes (reduced)
  TEMP_BLACKLIST_DURATION: 2 * 60 * 1000, // 2 minutes (reduced)
  
  // Thresholds
  SUSPICIOUS_THRESHOLD: 10, // Increased threshold
  RAPID_FIRE_THRESHOLD: 15, // Increased to 15 requests in 1 second
  
  // Memory cleanup
  CLEANUP_INTERVAL: 10 * 60 * 1000, // 10 minutes
  MAX_TRACKED_IPS: 10000,
};

// Cleanup old connections periodically
setInterval(() => {
  const now = Date.now();
  const cutoff = now - (60 * 60 * 1000); // 1 hour ago
  
  for (const [ip, data] of connections.entries()) {
    if (data.lastRequest < cutoff) {
      connections.delete(ip);
    }
    // Remove expired blacklists
    if (data.blacklistedUntil && data.blacklistedUntil < now) {
      data.blacklistedUntil = undefined;
      data.suspiciousActivity = false;
    }
  }
  
  // Limit memory usage
  if (connections.size > DDOS_CONFIG.MAX_TRACKED_IPS) {
    const oldestEntries = Array.from(connections.entries())
      .sort(([,a], [,b]) => a.lastRequest - b.lastRequest)
      .slice(0, connections.size - DDOS_CONFIG.MAX_TRACKED_IPS);
    
    for (const [ip] of oldestEntries) {
      connections.delete(ip);
    }
  }
}, DDOS_CONFIG.CLEANUP_INTERVAL);

// Analyze request patterns for suspicious behavior
function analyzeRequestPattern(ip: string, req: Request): boolean {
  const now = Date.now();
  const data = connections.get(ip) || {
    count: 0,
    lastRequest: now,
    consecutiveRequests: 0,
    suspiciousActivity: false
  };
  
  // Check for rapid-fire requests (potential bot)
  if (now - data.lastRequest < 1000) {
    data.consecutiveRequests++;
    if (data.consecutiveRequests > DDOS_CONFIG.RAPID_FIRE_THRESHOLD) {
      data.suspiciousActivity = true;
      return true;
    }
  } else {
    data.consecutiveRequests = 0;
  }
  
  // Check for suspicious patterns
  const userAgent = req.headers['user-agent'] || '';
  const suspiciousPatterns = [
    /bot/i,
    /crawl/i,
    /spider/i,
    /scrape/i,
    /^$/,
    /curl/i,
    /wget/i,
    /python/i,
    /php/i,
    /java/i
  ];
  
  // Allow legitimate search engine bots and browsers
  const legitimateBots = [
    /googlebot/i,
    /bingbot/i,
    /slurp/i,
    /duckduckbot/i,
    /baiduspider/i,
    /yandexbot/i,
    /facebookexternalhit/i,
    /twitterbot/i,
    /linkedinbot/i,
    /whatsapp/i,
    /telegrambot/i,
    /mozilla/i,
    /chrome/i,
    /safari/i,
    /firefox/i,
    /edge/i
  ];
  
  const isLegitimateBot = legitimateBots.some(pattern => pattern.test(userAgent));
  const isSuspiciousBot = suspiciousPatterns.some(pattern => pattern.test(userAgent)) && !isLegitimateBot;
  
  if (isSuspiciousBot) {
    data.suspiciousActivity = true;
    return true;
  }
  
  // Check for missing common headers (potential bot)
  const hasCommonHeaders = req.headers.accept && req.headers['accept-language'];
  if (!hasCommonHeaders && !isLegitimateBot) {
    data.suspiciousActivity = true;
    return true;
  }
  
  // Update connection data
  data.count++;
  data.lastRequest = now;
  connections.set(ip, data);
  
  return false;
}

// Check if IP is currently blacklisted
function isBlacklisted(ip: string): boolean {
  const data = connections.get(ip);
  if (!data) return false;
  
  if (data.blacklistedUntil && data.blacklistedUntil > Date.now()) {
    return true;
  }
  
  return false;
}

// Blacklist an IP address
function blacklistIP(ip: string, duration: number = DDOS_CONFIG.BLACKLIST_DURATION): void {
  const data = connections.get(ip) || {
    count: 0,
    lastRequest: Date.now(),
    consecutiveRequests: 0,
    suspiciousActivity: true
  };
  
  data.blacklistedUntil = Date.now() + duration;
  data.suspiciousActivity = true;
  connections.set(ip, data);
  suspiciousIPs.add(ip);
  
  console.log(`🚨 DDOS Protection: IP ${ip} blacklisted for ${duration/1000/60} minutes`);
}

// Rate limiting check
function checkRateLimit(ip: string): boolean {
  const data = connections.get(ip);
  if (!data) return false;
  
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  const oneHourAgo = now - 3600000;
  
  // Simple rate limiting (this is basic - in production you'd want sliding window)
  if (data.count > DDOS_CONFIG.MAX_REQUESTS_PER_MINUTE) {
    return true;
  }
  
  return false;
}

// Main DDOS protection middleware
export function ddosProtection(req: Request, res: Response, next: NextFunction): void {
  const clientInfo = getClientInfo(req);
  const ip = clientInfo.ip;
  
  // Skip protection for localhost in development
  if (process.env.NODE_ENV === 'development' && (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.'))) {
    return next();
  }
  
  // Check if IP is blacklisted
  if (isBlacklisted(ip)) {
    console.log(`🚨 DDOS Protection: Blocked blacklisted IP ${ip}`);
    return res.status(429).json({
      error: 'Access temporarily restricted',
      message: 'Your IP has been temporarily blocked due to suspicious activity. Please try again later.',
      retryAfter: 900, // 15 minutes
      timestamp: new Date().toISOString()
    });
  }
  
  // Analyze request pattern
  if (analyzeRequestPattern(ip, req)) {
    // Temporary blacklist for suspicious behavior
    blacklistIP(ip, DDOS_CONFIG.TEMP_BLACKLIST_DURATION);
    
    console.log(`🚨 DDOS Protection: Suspicious activity detected from ${ip}`);
    return res.status(429).json({
      error: 'Suspicious activity detected',
      message: 'Please verify you are not a bot. Access temporarily restricted.',
      retryAfter: 300, // 5 minutes
      timestamp: new Date().toISOString()
    });
  }
  
  // Check rate limits
  if (checkRateLimit(ip)) {
    console.log(`🚨 DDOS Protection: Rate limit exceeded for ${ip}`);
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please slow down.',
      retryAfter: 60,
      timestamp: new Date().toISOString()
    });
  }
  
  // Check concurrent connections
  if (connections.size > DDOS_CONFIG.MAX_CONCURRENT_CONNECTIONS) {
    console.log(`🚨 DDOS Protection: Connection limit reached (${connections.size})`);
    return res.status(503).json({
      error: 'Service temporarily unavailable',
      message: 'Server is experiencing high traffic. Please try again in a few moments.',
      retryAfter: 30,
      timestamp: new Date().toISOString()
    });
  }
  
  // Add security headers
  res.setHeader('X-RateLimit-Limit', DDOS_CONFIG.MAX_REQUESTS_PER_MINUTE);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, DDOS_CONFIG.MAX_REQUESTS_PER_MINUTE - (connections.get(ip)?.count || 0)));
  res.setHeader('X-RateLimit-Reset', new Date(Date.now() + 60000).toISOString());
  
  next();
}

// Enhanced rate limiter with DDOS protection
export function enhancedRateLimiter(windowMs: number, maxRequests: number, endpoint: string) {
  const store = new Map<string, { count: number; resetTime: number; firstRequest: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const clientInfo = getClientInfo(req);
    const ip = clientInfo.ip;
    const now = Date.now();
    
    // Skip for localhost in development
    if (process.env.NODE_ENV === 'development' && (ip === '127.0.0.1' || ip === '::1')) {
      return next();
    }
    
    const key = `${ip}:${endpoint}`;
    const record = store.get(key);
    
    if (!record || now > record.resetTime) {
      // New window
      store.set(key, {
        count: 1,
        resetTime: now + windowMs,
        firstRequest: now
      });
      return next();
    }
    
    // Check for rapid requests (potential attack)
    if (record.count > maxRequests) {
      // Escalate to blacklist for severe abuse
      if (record.count > maxRequests * 2) {
        blacklistIP(ip, DDOS_CONFIG.BLACKLIST_DURATION);
        console.log(`🚨 DDOS Protection: Severe abuse detected from ${ip} on ${endpoint}`);
      }
      
      const resetTime = Math.ceil((record.resetTime - now) / 1000);
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests to ${endpoint}. Please wait ${resetTime} seconds.`,
        retryAfter: resetTime,
        timestamp: new Date().toISOString()
      });
    }
    
    record.count++;
    next();
  };
}

// Get DDOS protection statistics
export function getDDOSStats() {
  const now = Date.now();
  const activeConnections = Array.from(connections.entries()).filter(([, data]) => 
    now - data.lastRequest < 300000 // 5 minutes
  );
  
  const blacklistedCount = Array.from(connections.entries()).filter(([, data]) => 
    data.blacklistedUntil && data.blacklistedUntil > now
  ).length;
  
  return {
    totalTrackedIPs: connections.size,
    activeConnections: activeConnections.length,
    blacklistedIPs: blacklistedCount,
    suspiciousIPs: suspiciousIPs.size,
    memoryUsage: process.memoryUsage(),
    config: DDOS_CONFIG
  };
}

// Manual IP management functions
export function manualBlacklistIP(ip: string, duration?: number) {
  blacklistIP(ip, duration);
}

export function unblacklistIP(ip: string) {
  const data = connections.get(ip);
  if (data) {
    data.blacklistedUntil = undefined;
    data.suspiciousActivity = false;
    connections.set(ip, data);
  }
  suspiciousIPs.delete(ip);
  console.log(`✅ DDOS Protection: IP ${ip} removed from blacklist`);
}

// Clear all current blacklists (for development)
export function clearAllBlacklists() {
  for (const [ip, data] of connections.entries()) {
    data.blacklistedUntil = undefined;
    data.suspiciousActivity = false;
    connections.set(ip, data);
  }
  suspiciousIPs.clear();
  console.log(`✅ DDOS Protection: All blacklists cleared`);
}