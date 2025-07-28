import { Request, Response, NextFunction } from 'express';

// Basic HTML/Script sanitization
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim()
    .slice(0, 1000); // Limit length
}

// Sanitize email addresses (supports multiple emails separated by commas)
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') return '';
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const emails = email.split(',').map(e => e.trim().toLowerCase());
  
  // Validate each email address
  const validEmails = emails.filter(e => emailRegex.test(e));
  
  // Return valid emails joined by commas, or empty string if none are valid
  return validEmails.length > 0 ? validEmails.join(', ') : '';
}

// Sanitize URLs
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') return '';
  
  try {
    const parsed = new URL(url);
    
    // Only allow HTTP and HTTPS
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    
    // Remove potentially dangerous query parameters
    const dangerousParams = ['javascript', 'script', 'eval', 'exec'];
    dangerousParams.forEach(param => {
      parsed.searchParams.delete(param);
    });
    
    return parsed.toString();
  } catch {
    return '';
  }
}

// Input sanitization middleware
export function inputSanitizer(req: Request, res: Response, next: NextFunction) {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        switch (key) {
          case 'email':
            req.body[key] = sanitizeEmail(req.body[key]);
            break;
          case 'url':
            req.body[key] = sanitizeUrl(req.body[key]);
            break;
          case 'name':
          case 'company':
          case 'question':
            req.body[key] = sanitizeString(req.body[key]);
            break;
          default:
            // General sanitization for other string fields
            req.body[key] = sanitizeString(req.body[key]);
        }
      }
    });
  }
  
  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeString(req.query[key] as string);
      }
    });
  }
  
  next();
}