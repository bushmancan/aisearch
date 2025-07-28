import { Request } from "express";

/**
 * Extract the real client IP address from request headers
 * Handles various proxy scenarios including iframe embedding
 * SECURITY: Only trusts certain headers in production environments
 */
export function getRealClientIP(req: Request): string {
  // In production, only trust specific proxy headers from known sources
  const trustedHeaders = process.env.NODE_ENV === 'production' 
    ? ['cf-connecting-ip', 'x-real-ip'] // Only trust Cloudflare and Nginx in production
    : ['cf-connecting-ip', 'x-real-ip', 'x-forwarded-for']; // More permissive in development
  
  // Check trusted headers for IP address
  for (const header of trustedHeaders) {
    const value = req.headers[header] as string;
    if (value && value.length < 50) { // Prevent header injection with length limit
      // X-Forwarded-For can contain multiple IPs, take the first (original client)
      const firstIP = value.split(',')[0].trim();
      if (isValidIP(firstIP) && !isPrivateIP(firstIP)) {
        console.log(`Found real IP ${firstIP} from trusted header ${header}`);
        return sanitizeIP(firstIP);
      }
    }
  }

  // Check connection remote address
  const remoteAddress = req.connection?.remoteAddress || req.socket?.remoteAddress;
  if (remoteAddress && isValidIP(remoteAddress)) {
    // Remove IPv6 prefix if present
    const cleanIP = remoteAddress.replace(/^::ffff:/, '');
    if (isValidIP(cleanIP) && cleanIP !== '127.0.0.1') {
      console.log(`Found real IP ${cleanIP} from connection`);
      return cleanIP;
    }
  }

  // Check req.ip (Express.js built-in)
  if (req.ip && isValidIP(req.ip)) {
    const cleanIP = req.ip.replace(/^::ffff:/, '');
    if (isValidIP(cleanIP) && cleanIP !== '127.0.0.1') {
      console.log(`Found real IP ${cleanIP} from req.ip`);
      return cleanIP;
    }
  }

  // Last resort - check for any IP in user agent or referer (for iframe detection)
  const userAgent = req.headers['user-agent'] || '';
  const referer = req.headers['referer'] || '';
  
  if (referer && !referer.includes('localhost') && !referer.includes('127.0.0.1')) {
    // Try to extract domain from referer for iframe cases
    try {
      const refererUrl = new URL(referer);
      const hostname = refererUrl.hostname;
      if (hostname && !hostname.includes('localhost') && hostname !== '127.0.0.1') {
        console.log(`Iframe detected from domain: ${hostname}`);
        return `iframe:${hostname}`;
      }
    } catch (e) {
      // Invalid referer URL, ignore
    }
  }

  // Default fallback
  console.log('Using fallback IP for localhost/iframe access');
  return '127.0.0.1';
}

/**
 * Validate if a string is a valid IP address
 */
function isValidIP(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false;
  
  // Sanitize input - remove any non-IP characters
  const cleanIP = ip.replace(/[^0-9a-fA-F:\.]/g, '');
  if (cleanIP !== ip) return false; // Reject if sanitization changed the string
  
  // IPv4 validation
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (ipv4Regex.test(cleanIP)) return true;
  
  // IPv6 validation (basic)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  if (ipv6Regex.test(cleanIP)) return true;
  
  return false;
}

/**
 * Check if an IP address is private/internal
 */
function isPrivateIP(ip: string): boolean {
  if (!ip) return false;
  
  // Private IPv4 ranges
  const privateRanges = [
    /^10\./,                    // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[01])\./,  // 172.16.0.0/12
    /^192\.168\./,              // 192.168.0.0/16
    /^127\./,                   // 127.0.0.0/8 (localhost)
    /^169\.254\./,              // 169.254.0.0/16 (link-local)
    /^0\./,                     // 0.0.0.0/8
  ];
  
  return privateRanges.some(range => range.test(ip));
}

/**
 * Sanitize IP address to prevent injection attacks
 */
function sanitizeIP(ip: string): string {
  if (!ip || typeof ip !== 'string') return '127.0.0.1';
  
  // Remove any characters that aren't valid in IP addresses
  const cleaned = ip.replace(/[^0-9a-fA-F:\.]/g, '');
  
  // Ensure it's still a valid IP after cleaning
  if (isValidIP(cleaned)) {
    return cleaned;
  }
  
  return '127.0.0.1';
}

/**
 * Get user agent with iframe detection
 */
export function getClientInfo(req: Request): { ip: string; userAgent: string; isIframe: boolean } {
  const realIP = getRealClientIP(req);
  const userAgent = req.headers['user-agent'] || 'unknown';
  const referer = req.headers['referer'] || '';
  
  // Detect iframe embedding
  const isIframe = req.headers['sec-fetch-dest'] === 'iframe' || 
                   req.headers['sec-fetch-site'] === 'cross-site' ||
                   referer.includes('wordpress') || 
                   referer.includes('elementor') ||
                   referer.includes('iframe') ||
                   realIP.startsWith('iframe:');
  
  return {
    ip: realIP,
    userAgent: isIframe ? `${userAgent} (iframe)` : userAgent,
    isIframe
  };
}