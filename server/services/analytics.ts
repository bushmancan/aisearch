// Simple analytics tracking for website analyses
interface AnalyticsData {
  totalAnalyses: number;
  successfulAnalyses: number;
  failedAnalyses: number;
  uniqueWebsites: Set<string>;
  analysisLog: Array<{
    timestamp: Date;
    url: string;
    status: 'success' | 'failed';
    loadTime?: number;
    overallScore?: number;
    error?: string;
  }>;
  lastReset: Date;
}

class AnalyticsService {
  private data: AnalyticsData;

  constructor() {
    this.data = {
      totalAnalyses: 0,
      successfulAnalyses: 0,
      failedAnalyses: 0,
      uniqueWebsites: new Set(),
      analysisLog: [],
      lastReset: new Date()
    };
  }

  logAnalysisStarted(url: string) {
    this.data.totalAnalyses++;
    this.data.uniqueWebsites.add(this.normalizeDomain(url));
    
    console.log(`📊 Analytics: Started analysis #${this.data.totalAnalyses} for ${url}`);
  }

  logAnalysisCompleted(url: string, loadTime: number, overallScore: number) {
    this.data.successfulAnalyses++;
    
    this.data.analysisLog.push({
      timestamp: new Date(),
      url,
      status: 'success',
      loadTime,
      overallScore
    });

    console.log(`📊 Analytics: Completed analysis for ${url} (Score: ${overallScore}, Load: ${loadTime}ms)`);
    console.log(`📊 Total: ${this.data.totalAnalyses} analyses, ${this.data.successfulAnalyses} successful, ${this.data.uniqueWebsites.size} unique websites`);
  }

  logAnalysisFailed(url: string, error: string) {
    this.data.failedAnalyses++;
    
    this.data.analysisLog.push({
      timestamp: new Date(),
      url,
      status: 'failed',
      error
    });

    console.log(`📊 Analytics: Failed analysis for ${url} - ${error}`);
    console.log(`📊 Total: ${this.data.totalAnalyses} analyses, ${this.data.failedAnalyses} failed`);
  }

  getStats() {
    const now = new Date();
    const uptime = now.getTime() - this.data.lastReset.getTime();
    const uptimeHours = Math.round(uptime / (1000 * 60 * 60) * 100) / 100;

    return {
      totalAnalyses: this.data.totalAnalyses,
      successfulAnalyses: this.data.successfulAnalyses,
      failedAnalyses: this.data.failedAnalyses,
      successRate: this.data.totalAnalyses > 0 ? 
        Math.round((this.data.successfulAnalyses / this.data.totalAnalyses) * 100) : 0,
      uniqueWebsites: this.data.uniqueWebsites.size,
      averageScore: this.getAverageScore(),
      uptimeHours,
      lastReset: this.data.lastReset,
      recentAnalyses: this.data.analysisLog.slice(-10) // Last 10 analyses
    };
  }

  getDetailedLog() {
    return {
      ...this.getStats(),
      fullAnalysisLog: this.data.analysisLog,
      websiteList: Array.from(this.data.uniqueWebsites).sort()
    };
  }

  private getAverageScore(): number {
    const successfulAnalyses = this.data.analysisLog.filter(a => a.status === 'success' && a.overallScore);
    if (successfulAnalyses.length === 0) return 0;
    
    const totalScore = successfulAnalyses.reduce((sum, analysis) => sum + (analysis.overallScore || 0), 0);
    return Math.round(totalScore / successfulAnalyses.length);
  }

  private normalizeDomain(url: string): string {
    try {
      const domain = new URL(url).hostname;
      return domain.startsWith('www.') ? domain.substring(4) : domain;
    } catch {
      return url;
    }
  }
}

export const analytics = new AnalyticsService();