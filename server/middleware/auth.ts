import { Request, Response, NextFunction } from 'express';

// Session management for admin users
interface AdminSession {
  sessionId: string;
  startTime: Date;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
}

class AdminSessionManager {
  private sessions: Map<string, AdminSession> = new Map();
  private readonly MAX_SESSIONS = 3;

  generateSessionId(): string {
    return `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  createSession(ipAddress: string, userAgent: string): { sessionId: string; kicked?: AdminSession } {
    const sessionId = this.generateSessionId();
    const newSession: AdminSession = {
      sessionId,
      startTime: new Date(),
      lastActivity: new Date(),
      ipAddress,
      userAgent
    };

    let kickedSession: AdminSession | undefined;

    // If we're at max capacity, remove the least recently active session
    if (this.sessions.size >= this.MAX_SESSIONS) {
      const oldestSession = this.findOldestSession();
      if (oldestSession) {
        kickedSession = oldestSession;
        this.sessions.delete(oldestSession.sessionId);
      }
    }

    this.sessions.set(sessionId, newSession);
    return { sessionId, kicked: kickedSession };
  }

  updateActivity(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
      return true;
    }
    return false;
  }

  removeSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  isValidSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    // Update activity
    session.lastActivity = new Date();
    return true;
  }

  getActiveSessions(): AdminSession[] {
    return Array.from(this.sessions.values());
  }

  private findOldestSession(): AdminSession | undefined {
    let oldest: AdminSession | undefined;
    
    for (const session of this.sessions.values()) {
      if (!oldest || session.lastActivity < oldest.lastActivity) {
        oldest = session;
      }
    }
    
    return oldest;
  }

  // Clean up expired sessions (older than 2 hours)
  cleanupExpiredSessions(): void {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastActivity < twoHoursAgo) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

const sessionManager = new AdminSessionManager();

// Clean up expired sessions every 15 minutes
setInterval(() => {
  sessionManager.cleanupExpiredSessions();
}, 15 * 60 * 1000);

// Simple admin authentication middleware
export function authenticateAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized - Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];
  const adminApiKey = process.env.ADMIN_API_KEY;

  if (!adminApiKey) {
    console.error('ADMIN_API_KEY environment variable not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (token !== adminApiKey) {
    return res.status(401).json({ error: 'Unauthorized - Invalid API key' });
  }

  next();
}

// Session-based admin authentication middleware
export function authenticateAdminSession(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const sessionId = req.headers['x-admin-session'] as string;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized - Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];
  const adminApiKey = process.env.ADMIN_API_KEY;

  if (!adminApiKey) {
    console.error('ADMIN_API_KEY environment variable not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (token !== adminApiKey) {
    return res.status(401).json({ error: 'Unauthorized - Invalid API key' });
  }

  // Check session validity
  if (sessionId && !sessionManager.isValidSession(sessionId)) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }

  next();
}

// Admin login endpoint
export function adminLogin(req: Request, res: Response) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized - Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];
  const adminApiKey = process.env.ADMIN_API_KEY;

  if (!adminApiKey) {
    console.error('ADMIN_API_KEY environment variable not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (token !== adminApiKey) {
    return res.status(401).json({ error: 'Unauthorized - Invalid API key' });
  }

  // Create new session
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  
  const { sessionId, kicked } = sessionManager.createSession(ipAddress, userAgent);
  
  const response: any = {
    sessionId,
    message: 'Admin session created successfully',
    activeSessions: sessionManager.getActiveSessions().length
  };

  if (kicked) {
    response.warning = `Session limit reached. Disconnected admin session from ${kicked.ipAddress}`;
  }

  res.json(response);
}

// Admin logout endpoint
export function adminLogout(req: Request, res: Response) {
  const sessionId = req.headers['x-admin-session'] as string;
  
  if (sessionId) {
    sessionManager.removeSession(sessionId);
  }
  
  res.json({ message: 'Admin session ended' });
}

// Get session info
export function getAdminSessionInfo(req: Request, res: Response) {
  const sessionId = req.headers['x-admin-session'] as string;
  
  if (!sessionId || !sessionManager.isValidSession(sessionId)) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  const activeSessions = sessionManager.getActiveSessions();
  const currentSession = activeSessions.find(s => s.sessionId === sessionId);
  
  res.json({
    sessionId,
    activeSessions: activeSessions.length,
    maxSessions: 3,
    currentSession: currentSession ? {
      startTime: currentSession.startTime,
      lastActivity: currentSession.lastActivity,
      ipAddress: currentSession.ipAddress
    } : null
  });
}