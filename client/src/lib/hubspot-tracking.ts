// HubSpot tracking utilities for custom events
declare global {
  interface Window {
    _hsq: any[];
  }
}

export function trackAnalysisStarted(url: string) {
  if (typeof window !== 'undefined' && window._hsq) {
    window._hsq.push(['trackEvent', {
      id: 'analysis_started',
      properties: {
        website_url: url,
        tool_version: '1.0',
        timestamp: new Date().toISOString()
      }
    }]);
  }
}

export function trackAnalysisCompleted(url: string, overallScore: number) {
  if (typeof window !== 'undefined' && window._hsq) {
    window._hsq.push(['trackEvent', {
      id: 'analysis_completed',
      properties: {
        website_url: url,
        overall_score: overallScore,
        tool_version: '1.0',
        timestamp: new Date().toISOString()
      }
    }]);
  }
}

export function trackLeadCaptured(email: string, url: string) {
  if (typeof window !== 'undefined' && window._hsq) {
    window._hsq.push(['identify', {
      email: email
    }]);
    
    window._hsq.push(['trackEvent', {
      id: 'lead_captured',
      properties: {
        website_url: url,
        lead_source: 'LLM Visibility Audit Tool',
        tool_version: '1.0',
        timestamp: new Date().toISOString()
      }
    }]);
  }
}

export function trackAnalysisUnlocked(email: string, url: string, score: number) {
  if (typeof window !== 'undefined' && window._hsq) {
    window._hsq.push(['identify', {
      email: email
    }]);
    
    window._hsq.push(['trackEvent', {
      id: 'analysis_unlocked',
      properties: {
        website_url: url,
        overall_score: score,
        action_type: 'unlock',
        tool_version: '1.0',
        timestamp: new Date().toISOString()
      }
    }]);
  }
}

export function trackReportEmailed(email: string, url: string, score: number) {
  if (typeof window !== 'undefined' && window._hsq) {
    window._hsq.push(['identify', {
      email: email
    }]);
    
    window._hsq.push(['trackEvent', {
      id: 'report_emailed',
      properties: {
        website_url: url,
        overall_score: score,
        action_type: 'email_report',
        tool_version: '1.0',
        timestamp: new Date().toISOString()
      }
    }]);
  }
}

export function trackReportDownload(url: string) {
  if (typeof window !== 'undefined' && window._hsq) {
    window._hsq.push(['trackEvent', {
      id: 'report_downloaded',
      properties: {
        website_url: url,
        tool_version: '1.0',
        timestamp: new Date().toISOString()
      }
    }]);
  }
}