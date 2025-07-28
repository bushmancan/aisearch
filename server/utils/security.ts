/**
 * Security utilities for API key protection and error sanitization
 */

// List of sensitive patterns that should be scrubbed from logs and errors
const SENSITIVE_PATTERNS = [
  /AIzaSy[A-Za-z0-9_-]{33}/g, // Google API keys
  /sk-[A-Za-z0-9]{48}/g, // OpenAI API keys
  /xoxb-[A-Za-z0-9-]{50,}/g, // Slack bot tokens
  /ghp_[A-Za-z0-9]{36}/g, // GitHub personal access tokens
  /Bearer\s+[A-Za-z0-9._-]+/gi, // Bearer tokens
  /Authorization:\s*[A-Za-z0-9._-]+/gi, // Authorization headers
  /api[_-]?key[s]?["\s:=]+[A-Za-z0-9._-]+/gi, // Generic API keys
  /secret[s]?["\s:=]+[A-Za-z0-9._-]+/gi, // Generic secrets
  /token[s]?["\s:=]+[A-Za-z0-9._-]+/gi, // Generic tokens
  /password[s]?["\s:=]+[A-Za-z0-9._-]+/gi, // Passwords
];

/**
 * Sanitize text by removing sensitive information like API keys
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let sanitized = text;

  // Replace sensitive patterns
  SENSITIVE_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });

  // Remove environment variable references
  sanitized = sanitized.replace(/process\.env\.[A-Z_]+/g, '[ENV_VAR]');

  return sanitized;
}

/**
 * Sanitize error objects to remove sensitive information
 */
export function sanitizeError(error: any): any {
  if (!error) return error;

  // Handle string errors
  if (typeof error === 'string') {
    return sanitizeText(error);
  }

  // Handle Error objects
  if (error instanceof Error) {
    return {
      name: error.name,
      message: sanitizeText(error.message),
      stack: error.stack ? sanitizeText(error.stack) : undefined,
    };
  }

  // Handle plain objects
  if (typeof error === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(error)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeText(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeError(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return error;
}

/**
 * Safe logger that sanitizes sensitive information
 */
export function safeLog(message: string, data?: any): void {
  const sanitizedMessage = sanitizeText(message);
  
  if (data) {
    const sanitizedData = sanitizeError(data);
    console.log(sanitizedMessage, sanitizedData);
  } else {
    console.log(sanitizedMessage);
  }
}

/**
 * Safe error logger that sanitizes sensitive information
 */
export function safeLogError(message: string, error?: any): void {
  const sanitizedMessage = sanitizeText(message);
  
  if (error) {
    const sanitizedError = sanitizeError(error);
    console.error(sanitizedMessage, sanitizedError);
  } else {
    console.error(sanitizedMessage);
  }
}

/**
 * Secure API key validator
 */
export function validateApiKey(keyName: string): boolean {
  const key = process.env[keyName];
  
  if (!key || key.length < 10) {
    safeLogError(`Invalid or missing API key: ${keyName}`);
    return false;
  }

  // Log successful validation without exposing the key
  safeLog(`API key validated: ${keyName}`);
  return true;
}

/**
 * Create secure API client with key validation
 */
export function createSecureApiClient<T>(
  ClientClass: new (config: any) => T,
  apiKeyName: string,
  additionalConfig?: any
): T | null {
  if (!validateApiKey(apiKeyName)) {
    throw new Error(`Failed to initialize API client: Invalid ${apiKeyName}`);
  }

  try {
    const config = {
      apiKey: process.env[apiKeyName],
      ...additionalConfig
    };

    return new ClientClass(config);
  } catch (error) {
    safeLogError(`Failed to create API client for ${apiKeyName}:`, error);
    throw new Error(`API client initialization failed for ${apiKeyName}`);
  }
}