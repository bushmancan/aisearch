import { Request, Response, NextFunction } from 'express';
import { safeLogError } from '../utils/security';

/**
 * Simple admin authentication middleware for debug endpoints
 * Uses API key from environment variables
 */
export function authenticateAdmin(req: Request, res: Response, next: NextFunction) {
  const adminApiKey = process.env.ADMIN_API_KEY;
  
  // If no admin API key is configured, block access
  if (!adminApiKey) {
    safeLogError('Admin API key not configured - blocking debug endpoint access');
    return res.status(503).json({ 
      error: 'Admin authentication not configured',
      message: 'Debug endpoints are not available'
    });
  }

  // Check for API key in Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Missing authorization',
      message: 'Admin API key required. Use: Authorization: Bearer <admin-api-key>'
    });
  }

  const providedKey = authHeader.substring(7); // Remove 'Bearer ' prefix

  // Validate API key
  if (providedKey !== adminApiKey) {
    safeLogError(`Invalid admin API key attempt from ${req.ip}`);
    return res.status(401).json({
      error: 'Invalid authorization',
      message: 'Invalid admin API key'
    });
  }

  // Log successful admin access
  console.log(`Admin access granted to ${req.path} from ${req.ip}`);
  next();
}

/**
 * Alternative authentication using query parameter (less secure, for development)
 */
export function authenticateAdminQuery(req: Request, res: Response, next: NextFunction) {
  const adminApiKey = process.env.ADMIN_API_KEY;
  
  if (!adminApiKey) {
    return res.status(503).json({ 
      error: 'Admin authentication not configured'
    });
  }

  const queryKey = req.query.key as string;
  
  if (!queryKey || queryKey !== adminApiKey) {
    return res.status(401).json({
      error: 'Invalid or missing admin key',
      message: 'Add ?key=<admin-api-key> to the URL'
    });
  }

  console.log(`Admin access granted via query to ${req.path} from ${req.ip}`);
  next();
}