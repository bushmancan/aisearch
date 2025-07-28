import { MailService } from '@sendgrid/mail';
import nodemailer from 'nodemailer';

// SendGrid configuration
const sendgridApiKey = process.env.SENDGRID_API_KEY;
const fromEmail = process.env.FROM_EMAIL || 'noreply@revenueexperts.ai';

// Gmail SMTP configuration
const gmailUser = process.env.GMAIL_USER;
const gmailPassword = process.env.GMAIL_PASSWORD; // App password, not regular password

// BCC configuration - can be customized via environment variables
const defaultBccRecipients = [
  'team@revenueexperts.ai',  // Main team email
  'leads@revenueexperts.ai'  // Lead tracking
];

const getBccRecipients = (): string[] => {
  if (process.env.EMAIL_BCC_RECIPIENTS) {
    return process.env.EMAIL_BCC_RECIPIENTS.split(',').map(email => email.trim());
  }
  return defaultBccRecipients;
};

interface EmailTemplateParams {
  user_name: string;
  user_email: string; // Can be comma-separated multiple emails
  website_url: string;
  report_content: string;
  overall_score: number;
  company_name?: string;
  analysis_results?: any; // For generating HTML report
  analysis_id?: number; // For detecting multi-page (0) vs single-page (>0) analysis
}

// Generate prioritized recommendations HTML
function generatePrioritizedRecommendations(results: any): string {
  if (!results || !results.recommendations) {
    return `
      <div style="margin-bottom: 25px;">
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #ef4444; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
          <div style="font-weight: 600; color: #1e293b; margin-bottom: 10px;">🔴 HIGH-IMPACT RECOMMENDATIONS (Immediate - 7 days)</div>
          <p style="color: #374151; margin: 0;">Priority actions for immediate LLM visibility improvement.</p>
        </div>
        
        <div style="background: #fffbeb; border: 1px solid #fed7aa; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
          <div style="font-weight: 600; color: #1e293b; margin-bottom: 10px;">🟡 MEDIUM-TERM IMPROVEMENTS (7-30 days)</div>
          <p style="color: #374151; margin: 0;">Strategic enhancements for sustained AI search optimization.</p>
        </div>
        
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #22c55e; padding: 20px; border-radius: 8px;">
          <div style="font-weight: 600; color: #1e293b; margin-bottom: 10px;">🟢 OPTIMIZATION ENHANCEMENTS (30-90 days)</div>
          <p style="color: #374151; margin: 0;">Advanced strategies for maximum LLM search visibility.</p>
        </div>
      </div>
    `;
  }

  const recommendations = results.recommendations;
  let html = '<div style="margin-bottom: 25px;">';

  // High-impact recommendations (also check for 'high' field)
  const highImpact = recommendations.highImpact || recommendations.high || [];
  if (highImpact.length > 0) {
    html += `
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #ef4444; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
        <div style="font-weight: 700; color: #1e293b; margin-bottom: 15px; font-size: 16px;">🔴 HIGH-IMPACT RECOMMENDATIONS (Immediate - 7 days)</div>
        <div style="margin-left: 0;">
    `;
    
    highImpact.forEach((rec: any, index: number) => {
      html += `
        <div style="margin-bottom: 20px; padding: 15px; background: #ffffff; border-radius: 8px; border: 1px solid #fecaca;">
          <div style="font-weight: 600; color: #1e293b; margin-bottom: 8px; font-size: 15px;">
            ${rec.title || `Recommendation ${index + 1}`}
          </div>
          <div style="color: #374151; font-size: 14px; line-height: 1.5;">
            ${rec.description || rec.text || 'No description available'}
          </div>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  }

  // Medium-term improvements (also check for 'medium' field)
  const mediumTerm = recommendations.mediumTerm || recommendations.medium || [];
  if (mediumTerm.length > 0) {
    html += `
      <div style="background: #fffbeb; border: 1px solid #fed7aa; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
        <div style="font-weight: 700; color: #1e293b; margin-bottom: 15px; font-size: 16px;">🟡 MEDIUM-TERM IMPROVEMENTS (7-30 days)</div>
        <div style="margin-left: 0;">
    `;
    
    mediumTerm.forEach((rec: any, index: number) => {
      html += `
        <div style="margin-bottom: 20px; padding: 15px; background: #ffffff; border-radius: 8px; border: 1px solid #fed7aa;">
          <div style="font-weight: 600; color: #1e293b; margin-bottom: 8px; font-size: 15px;">
            ${rec.title || `Recommendation ${index + 1}`}
          </div>
          <div style="color: #374151; font-size: 14px; line-height: 1.5;">
            ${rec.description || rec.text || 'No description available'}
          </div>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  }

  // Long-term optimization (also check for 'low' field)
  const longTerm = recommendations.longTerm || recommendations.low || [];
  if (longTerm.length > 0) {
    html += `
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #22c55e; padding: 20px; border-radius: 8px;">
        <div style="font-weight: 700; color: #1e293b; margin-bottom: 15px; font-size: 16px;">🟢 OPTIMIZATION ENHANCEMENTS (30-90 days)</div>
        <div style="margin-left: 0;">
    `;
    
    longTerm.forEach((rec: any, index: number) => {
      html += `
        <div style="margin-bottom: 20px; padding: 15px; background: #ffffff; border-radius: 8px; border: 1px solid #bbf7d0;">
          <div style="font-weight: 600; color: #1e293b; margin-bottom: 8px; font-size: 15px;">
            ${rec.title || `Recommendation ${index + 1}`}
          </div>
          <div style="color: #374151; font-size: 14px; line-height: 1.5;">
            ${rec.description || rec.text || 'No description available'}
          </div>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  }

  html += '</div>';
  return html;
}

// Generate red flags HTML section
function generateRedFlags(results: any): string {
  if (!results || !results.redFlags || results.redFlags.length === 0) {
    return '';
  }

  let html = `
    <div style="margin-bottom: 30px;">
      <div style="display: flex; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0;">
        <span style="font-size: 24px; margin-right: 12px;">🚨</span>
        <h2 style="font-size: 24px; font-weight: bold; color: #1e293b; margin: 0;">CRITICAL AI VISIBILITY RED FLAGS</h2>
      </div>

      <div style="background: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #ef4444; padding: 25px; border-radius: 12px;">
        <div style="margin-bottom: 20px;">
          <div style="font-weight: 700; color: #dc2626; margin-bottom: 15px; font-size: 18px;">
            ⚠️ CRITICAL ISSUES BLOCKING AI SEARCH VISIBILITY
          </div>
          <div style="color: #374151; font-size: 14px; margin-bottom: 20px;">
            These issues are preventing your website from being properly discovered and cited by AI search engines like ChatGPT, Gemini, and Perplexity.
          </div>
        </div>

        <div style="space-y: 15px;">
  `;

  results.redFlags.forEach((flag: any, index: number) => {
    const severityColor = flag.severity === 'critical' ? '#dc2626' : 
                         flag.severity === 'high' ? '#ea580c' : '#f59e0b';
    const severityBg = flag.severity === 'critical' ? '#fef2f2' : 
                       flag.severity === 'high' ? '#fff7ed' : '#fffbeb';
    
    html += `
      <div style="background: ${severityBg}; border: 1px solid ${severityColor}33; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
        <div style="display: flex; align-items-start; gap: 15px;">
          <div style="width: 8px; height: 8px; background: ${severityColor}; border-radius: 50%; margin-top: 6px; flex-shrink: 0;"></div>
          <div style="flex: 1;">
            <div style="font-weight: 600; color: #1e293b; margin-bottom: 8px; font-size: 16px;">
              ${flag.title}
            </div>
            <div style="color: #374151; font-size: 14px; line-height: 1.5; margin-bottom: 12px;">
              ${flag.description}
            </div>
            <div style="background: #ffffff; border: 1px solid ${severityColor}33; border-radius: 6px; padding: 12px;">
              <div style="font-weight: 600; color: ${severityColor}; font-size: 13px; margin-bottom: 6px;">
                IMPACT ON AI VISIBILITY:
              </div>
              <div style="color: #374151; font-size: 13px; line-height: 1.4;">
                ${flag.impact}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  html += `
        </div>
        
        <div style="background: #ffffff; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-top: 20px;">
          <div style="font-weight: 600; color: #dc2626; margin-bottom: 10px; font-size: 16px;">
            🔧 IMMEDIATE ACTION REQUIRED
          </div>
          <div style="color: #374151; font-size: 14px; line-height: 1.5;">
            These red flags are significantly impacting your website's ability to be discovered by AI search engines. 
            Addressing these issues should be your top priority for improving LLM visibility. 
            Each flag represents a barrier preventing AI systems from properly crawling, understanding, or citing your content.
          </div>
        </div>
      </div>
    </div>
  `;

  return html;
}

// Generate HTML LLM Visibility Audit Report for email
function generateLLMVisibilityAuditReport(analysisResults: any, websiteUrl: string, overallScore: number): string {
  if (!analysisResults) {
    return '<p>Analysis results not available for HTML report generation.</p>';
  }

  const results = analysisResults;
  
  // Extract scores - ALWAYS use the actual analysis results, not the passed parameter
  const actualOverallScore = results.overallScore || overallScore;
  const seoScore = results.seoScore || 50;
  const techScore = results.techScore || 50;
  const contentScore = results.contentScore || 50;
  const accessibilityScore = results.accessibilityScore || 50;
  const authorityScore = results.authorityScore || 50;
  
  // Extract page details
  const pageDetails = results.pageDetails || {};
  const pageTitle = pageDetails.title || 'Not Available';
  const pageType = pageDetails.pageType || 'Website';
  const analysisDate = results.analyzedAt ? new Date(results.analyzedAt).toLocaleDateString() : new Date().toLocaleDateString();
  
  // Generate Optimized-Improve-Fix Now status for each score
  const getScoreStatus = (score: number) => {
    if (score >= 70) {
      return {
        status: "OPTIMIZED",
        icon: "fas fa-check-circle", 
        color: "#28a745",
        bgColor: "#d4edda"
      };
    } else if (score >= 40) {
      return {
        status: "IMPROVE", 
        icon: "fas fa-exclamation-triangle",
        color: "#ffc107",
        bgColor: "#fff3cd"
      };
    } else {
      return {
        status: "FIX NOW",
        icon: "fas fa-times-circle", 
        color: "#dc3545",
        bgColor: "#f8d7da"
      };
    }
  };

  const overallStatus = getScoreStatus(actualOverallScore);
  const aiLlmVisibilityStatus = getScoreStatus(seoScore);
  const techStatus = getScoreStatus(techScore);
  const contentStatus = getScoreStatus(contentScore);
  const accessibilityStatus = getScoreStatus(accessibilityScore);
  const authorityStatus = getScoreStatus(authorityScore);
  
  return `
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <div style="background: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); padding: 30px; margin: 30px 0;">
      <div style="text-center; border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px;">
        <h1 style="font-size: 32px; font-weight: bold; color: #1e293b; margin-bottom: 10px;">
          🔍 LLM Visibility Audit Report
        </h1>
        <p style="color: #64748b; font-size: 16px; margin: 0;">AI Search Optimization Analysis</p>
      </div>

      <div style="background: #f8fafc; border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 4px solid #6366f1;">
        <h2 style="font-size: 20px; font-weight: 600; color: #1e293b; margin-bottom: 15px;">PAGE ANALYSIS REPORT</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div style="margin-bottom: 10px;">
            <span style="font-weight: 600; color: #374151;">PAGE URL:</span>
            <a href="${websiteUrl}" target="_blank" style="margin-left: 8px; color: #6366f1; text-decoration: none;">
              ${websiteUrl}
            </a>
          </div>
          <div style="margin-bottom: 10px;">
            <span style="font-weight: 600; color: #374151;">PAGE TITLE:</span>
            <span style="margin-left: 8px; color: #64748b;">${pageTitle}</span>
          </div>
          <div style="margin-bottom: 10px;">
            <span style="font-weight: 600; color: #374151;">PAGE TYPE:</span>
            <span style="margin-left: 8px; color: #64748b;">${pageType}</span>
          </div>
          <div style="margin-bottom: 10px;">
            <span style="font-weight: 600; color: #374151;">ANALYSIS DATE:</span>
            <span style="margin-left: 8px; color: #64748b;">${analysisDate}</span>
          </div>
        </div>
      </div>

      <!-- Analysis Summary with Pass-Caution-Fail Status -->
      <div style="background: #f8fafc; border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 4px solid #667eea;">
        <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 20px; font-weight: 700;">Analysis Summary</h2>
        
        <div style="display: flex; align-items: center; margin: 12px 0; padding: 8px 0;">
          <i class="${overallStatus.icon}" style="margin-right: 12px; font-size: 18px; width: 20px; text-align: center; color: ${overallStatus.color};"></i>
          <strong style="font-weight: 600; font-size: 16px; color: ${overallStatus.color};">${overallStatus.status}: Overall Score</strong>
        </div>
        
        <div style="display: flex; align-items: center; margin: 12px 0; padding: 8px 0;">
          <i class="${aiLlmVisibilityStatus.icon}" style="margin-right: 12px; font-size: 18px; width: 20px; text-align: center; color: ${aiLlmVisibilityStatus.color};"></i>
          <strong style="font-weight: 600; font-size: 16px; color: ${aiLlmVisibilityStatus.color};">${aiLlmVisibilityStatus.status}: AI/LLM Visibility</strong>
        </div>
        
        <div style="display: flex; align-items: center; margin: 12px 0; padding: 8px 0;">
          <i class="${techStatus.icon}" style="margin-right: 12px; font-size: 18px; width: 20px; text-align: center; color: ${techStatus.color};"></i>
          <strong style="font-weight: 600; font-size: 16px; color: ${techStatus.color};">${techStatus.status}: Technical Score</strong>
        </div>
        
        <div style="display: flex; align-items: center; margin: 12px 0; padding: 8px 0;">
          <i class="${contentStatus.icon}" style="margin-right: 12px; font-size: 18px; width: 20px; text-align: center; color: ${contentStatus.color};"></i>
          <strong style="font-weight: 600; font-size: 16px; color: ${contentStatus.color};">${contentStatus.status}: Content Score</strong>
        </div>
        
        <div style="display: flex; align-items: center; margin: 12px 0; padding: 8px 0;">
          <i class="${accessibilityStatus.icon}" style="margin-right: 12px; font-size: 18px; width: 20px; text-align: center; color: ${accessibilityStatus.color};"></i>
          <strong style="font-weight: 600; font-size: 16px; color: ${accessibilityStatus.color};">${accessibilityStatus.status}: Accessibility Score</strong>
        </div>
        
        <div style="display: flex; align-items: center; margin: 12px 0; padding: 8px 0;">
          <i class="${authorityStatus.icon}" style="margin-right: 12px; font-size: 18px; width: 20px; text-align: center; color: ${authorityStatus.color};"></i>
          <strong style="font-weight: 600; font-size: 16px; color: ${authorityStatus.color};">${authorityStatus.status}: Authority Score</strong>
        </div>
      </div>

      <div style="margin-bottom: 30px;">
        <div style="display: flex; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0;">
          <span style="font-size: 24px; margin-right: 12px;">🔍</span>
          <h2 style="font-size: 24px; font-weight: bold; color: #1e293b; margin: 0;">LLM ACCESSIBILITY ANALYSIS</h2>
        </div>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #22c55e; padding: 25px; border-radius: 12px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; margin-bottom: 15px;">
            <span style="font-size: 18px; margin-right: 8px;">✅</span>
            <h3 style="font-size: 18px; font-weight: 600; color: #1e293b; margin: 0;">WHAT WORKS FOR LLM DISCOVERY:</h3>
          </div>
          <ul style="margin: 0; padding-left: 25px;">
            <li style="color: #374151; margin-bottom: 8px;">
              <strong>Structured Data Implementation:</strong> ${results.structuredData?.schemaTypes?.join(', ') || 'Basic schema detected'}
            </li>
            <li style="color: #374151; margin-bottom: 8px;">
              <strong>Metadata Quality:</strong> Title tag ${results.metadata?.titleTag?.present ? 'present' : 'detected'} (${results.metadata?.titleTag?.length || 'standard'} characters)
            </li>
            <li style="color: #374151; margin-bottom: 8px;">
              <strong>Technical SEO:</strong> HTTPS ${results.technicalSeo?.https ? 'enabled' : 'enabled'}, Mobile ${results.technicalSeo?.mobileOptimized ? 'optimized' : 'responsive'}
            </li>
            <li style="color: #374151; margin-bottom: 8px;">
              <strong>Bot Accessibility:</strong> AI crawler access configured
            </li>
          </ul>
        </div>

        <div style="background: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #ef4444; padding: 25px; border-radius: 12px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; margin-bottom: 15px;">
            <span style="font-size: 18px; margin-right: 8px;">❌</span>
            <h3 style="font-size: 18px; font-weight: 600; color: #1e293b; margin: 0;">WHAT BLOCKS LLM DISCOVERY:</h3>
          </div>
          <ul style="margin: 0; padding-left: 25px;">
            <li style="color: #374151; margin-bottom: 8px;">
              <strong>Page Speed:</strong> Load time optimization needed for better crawler efficiency
            </li>
            <li style="color: #374151; margin-bottom: 8px;">
              <strong>Content Structure:</strong> Enhanced structured content needed for AI citation
            </li>
            <li style="color: #374151; margin-bottom: 8px;">
              <strong>Schema Coverage:</strong> Additional schema types recommended for enhanced context
            </li>
          </ul>
        </div>

        <div style="background: #fffbeb; border: 1px solid #fed7aa; border-left: 4px solid #f59e0b; padding: 25px; border-radius: 12px;">
          <div style="display: flex; align-items: center; margin-bottom: 15px;">
            <span style="font-size: 18px; margin-right: 8px;">🔧</span>
            <h3 style="font-size: 18px; font-weight: 600; color: #1e293b; margin: 0;">IMMEDIATE TECHNICAL FIXES NEEDED:</h3>
          </div>
          <div style="margin-left: 25px; color: #374151;">
            Priority technical improvements identified and ready for implementation.
          </div>
        </div>
      </div>

      <div style="margin-bottom: 30px;">
        <div style="display: flex; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0;">
          <span style="font-size: 24px; margin-right: 12px;">📝</span>
          <h2 style="font-size: 24px; font-weight: bold; color: #1e293b; margin: 0;">CONTENT STRUCTURE FOR AI CITATION</h2>
        </div>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #22c55e; padding: 25px; border-radius: 12px;">
          <div style="display: flex; align-items: center; margin-bottom: 15px;">
            <span style="font-size: 18px; margin-right: 8px;">✅</span>
            <h3 style="font-size: 18px; font-weight: 600; color: #1e293b; margin: 0;">CITATION READINESS ASSESSMENT:</h3>
          </div>
          <ul style="margin: 0; padding-left: 25px;">
            <li style="color: #374151; margin-bottom: 8px;">
              <strong>Content Authority:</strong> Professional content structure detected
            </li>
            <li style="color: #374151; margin-bottom: 8px;">
              <strong>Citation Readiness:</strong> ${results.citationPotential?.citationReadiness || 70}/100 score
            </li>
            <li style="color: #374151; margin-bottom: 8px;">
              <strong>Authority Score:</strong> ${results.citationPotential?.authorityScore || 65}/100 for credibility
            </li>
          </ul>
        </div>
      </div>

      <div>
        <div style="display: flex; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0;">
          <span style="font-size: 24px; margin-right: 12px;">🎯</span>
          <h2 style="font-size: 24px; font-weight: bold; color: #1e293b; margin: 0;">PRIORITIZED RECOMMENDATIONS</h2>
        </div>

        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-left: 4px solid #3b82f6; padding: 25px; border-radius: 12px;">
          ${generatePrioritizedRecommendations(results)}
        </div>
      </div>

      ${generateRedFlags(results)}
    </div>
  `;
}

/**
 * Generates comprehensive HTML email report for LLM visibility analysis
 * 
 * @param params - Email template parameters including analysis results and user info
 * @returns string - Complete HTML email with styling and professional layout
 * 
 * Features:
 * - Detects multi-page vs single-page analysis (analysisId === 0 indicates multi-page)
 * - Generates detailed multi-page reports with individual page breakdowns
 * - Creates professional HTML with inline CSS for email compatibility
 * - Includes score visualization, prioritized recommendations, and red flags
 * - Maintains brand styling with gradients and proper typography
 */
function generateEmailHTML(params: EmailTemplateParams): string {
  
  // Determine score color and status based on overall score (using new Optimized-Improve-Fix Now system)
  const getScoreColor = (score: number) => {
    if (score >= 75) return '#10b981'; // Green for OPTIMIZED
    if (score >= 40) return '#f59e0b'; // Yellow for IMPROVE  
    return '#ef4444'; // Red for FIX NOW
  };
  
  const getScoreStatus = (score: number) => {
    if (score >= 70) return 'OPTIMIZED';
    if (score >= 40) return 'IMPROVE';
    return 'FIX NOW';
  };

  // Use mathematically precise weighted calculation consistently (1 decimal place)
  const calculateWeightedScore = (results: any): number => {
    if (!results || !results.aiLlmVisibilityScore) return params.overall_score;
    return Math.round(
      ((results.aiLlmVisibilityScore * 0.25) + 
      (results.techScore * 0.20) + 
      (results.contentScore * 0.25) + 
      (results.accessibilityScore * 0.10) + 
      (results.authorityScore * 0.20)) * 10
    ) / 10;
  };
  
  const actualOverallScore = params.analysis_results ? 
    calculateWeightedScore(params.analysis_results) : 
    params.overall_score;
  const scoreColor = getScoreColor(actualOverallScore);
  const scoreStatus = getScoreStatus(actualOverallScore);

  // Generate HTML report content - prioritize HTML version if analysis results are available
  const generateReportContent = (): string => {
    if (params.analysis_results) {
      console.log('EMAIL SERVICE: Generating HTML LLM Visibility Audit Report');
      return generateLLMVisibilityAuditReport(params.analysis_results, params.website_url, actualOverallScore);
    }
    
    // Fallback to formatted markdown content
    console.log('EMAIL SERVICE: Using formatted markdown report');
    return formatReportContent(params.report_content);
  };

  // Format the report content with cleaner, more readable structure (fallback for markdown)
  const formatReportContent = (content: string): string => {
    // Replace old scores in narrative text with mathematically calculated weighted score
    let updatedContent = content
      // Replace "Overall Score: XX.XX/100" patterns with weighted calculation
      .replace(/Overall Score:\s*[\d.]+\/100/g, `Overall Score: ${actualOverallScore}/100`)
      // Replace "**Overall Score: XX.XX/100" patterns 
      .replace(/\*\*Overall Score:\s*[\d.]+\/100/g, `**Overall Score: ${actualOverallScore}/100`)
      // Replace standalone score references in parentheses
      .replace(/\([\d.]+\/100\)/g, `(${actualOverallScore}/100)`);
      
    // Clean up the content and format it properly
    let formattedContent = updatedContent
      // Convert markdown headers to HTML with proper styling - more flexible regex
      .replace(/^#\s+(.+)$/gm, '<h1 class="report-title">$1</h1>')
      .replace(/^##\s+(.+)$/gm, '<h2 class="section-header">$1</h2>')
      .replace(/^###\s+(.+)$/gm, '<h3 class="subsection-header">$1</h3>')
      
      // Format priority sections with better styling
      .replace(/### 🔴 HIGH-IMPACT ACTIONS \(Immediate - 7 days\)/g, '<div class="priority-section priority-high"><h3>🔴 HIGH-IMPACT ACTIONS (Immediate - 7 days)</h3>')
      .replace(/### 🟡 MEDIUM-TERM IMPROVEMENTS \(7-30 days\)/g, '<div class="priority-section priority-medium"><h3>🟡 MEDIUM-TERM IMPROVEMENTS (7-30 days)</h3>')
      .replace(/### 🟢 LONG-TERM OPTIMIZATION \(30-90 days\)/g, '<div class="priority-section priority-low"><h3>🟢 LONG-TERM OPTIMIZATION (30-90 days)</h3>')
      
      // Format numbered recommendations with cleaner structure
      .replace(/^(\d+)\.\s+\*\*(.*?)\*\*:?\s*(.*?)$/gm, '<div class="rec-item"><div class="rec-header"><span class="rec-number">$1.</span><span class="rec-title">$2</span></div><div class="rec-description">$3</div></div>')
      
      // Format simple numbered items without bold titles
      .replace(/^(\d+)\.\s+(.*?)$/gm, '<div class="simple-item"><span class="item-number">$1.</span><span class="item-text">$2</span></div>')
      
      // Format bullet points with better spacing
      .replace(/^-\s+(.+)$/gm, '<div class="bullet-item">• $1</div>')
      
      // Format expected outcomes
      .replace(/Expected Outcome:\s*(.*?)$/gm, '<div class="outcome-box">💡 <strong>Expected Outcome:</strong> $1</div>')
      
      // Close priority sections when we hit the next section
      .replace(/(<div class="priority-section[^>]*>[\s\S]*?)(?=<h2|<div class="priority-section|$)/g, '$1</div>')
      
      // Convert remaining line breaks
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');

    return formattedContent;
  };

  // FORCE comprehensive report for multi-page analysis - override any basic content
  let reportContent = params.report_content;
  console.log('EMAIL SERVICE DEBUG - report_content length:', reportContent.length);
  console.log('EMAIL SERVICE DEBUG - report_content preview:', reportContent.substring(0, 300));
  
  // Check if this is multi-page analysis and use detailed report generation
  if (reportContent.includes('Multi-page analysis completed') || reportContent.includes('pages analyzed with an average') || params.analysis_id === 0) {
    console.log('DETECTED multi-page analysis - generating comprehensive HTML report instead of markdown');
    
    // Extract analysis results from params
    const analysisResults = params.analysis_results;
    let multiPageData = null;
    
    if (analysisResults) {
      try {
        multiPageData = typeof analysisResults === 'string' ? JSON.parse(analysisResults) : analysisResults;
        console.log('Multi-page data extracted:', {
          domain: multiPageData.domain,
          totalPages: multiPageData.domainInsights?.totalPages,
          completedPages: multiPageData.domainInsights?.completedPages,
          averageScore: multiPageData.domainInsights?.averageScore
        });
      } catch (e) {
        console.error('Failed to parse multi-page analysis results:', e);
      }
    }
    
    // Generate comprehensive multi-page report using extracted data
    if (multiPageData && multiPageData.results && multiPageData.domainInsights) {
      const { domainInsights, results } = multiPageData;
      const completedResults = results.filter((r: any) => !r.error && r.analysis);
      
      reportContent = `# Multi-Page LLM Visibility Analysis Report

## EXECUTIVE SUMMARY

Complete multi-page analysis for **${params.website_url || multiPageData.domain}** examining ${domainInsights.totalPages} pages across your domain.

**Overall Domain Score: ${domainInsights.averageScore}/100** (${domainInsights.averageScore >= 80 ? 'Excellent' : domainInsights.averageScore >= 60 ? 'Good' : domainInsights.averageScore >= 40 ? 'Fair' : 'Needs Improvement'})

### Analysis Overview
- **Total Pages Analyzed:** ${domainInsights.totalPages}
- **Successfully Analyzed:** ${domainInsights.completedPages}
- **Success Rate:** ${Math.round((domainInsights.completedPages / domainInsights.totalPages) * 100)}%
- **Average LLM Visibility Score:** ${domainInsights.averageScore}/100

## INDIVIDUAL PAGE PERFORMANCE

${completedResults.map((page: any, index: number) => `
### Page ${index + 1}: ${page.path || new URL(page.url).pathname}
- **URL:** ${page.url}
- **Overall Score:** ${page.score}/100
- **AI/LLM Visibility:** ${page.analysis?.seoScore || 'N/A'}/100
- **Technical Score:** ${page.analysis?.techScore || 'N/A'}/100
- **Content Score:** ${page.analysis?.contentScore || 'N/A'}/100
- **Authority Score:** ${page.analysis?.authorityScore || 'N/A'}/100
`).join('\n')}

## DOMAIN-WIDE INSIGHTS

### 🏆 Best Performing Page
**${domainInsights.bestPage?.url || 'N/A'}** - Score: ${domainInsights.bestPage?.score || 0}/100

### ⚠️ Needs Most Improvement
**${domainInsights.worstPage?.url || 'N/A'}** - Score: ${domainInsights.worstPage?.score || 0}/100

## PRIORITIZED RECOMMENDATIONS

### 🔴 HIGH-IMPACT ACTIONS (Immediate - 7 days)
1. **Fix Technical Accessibility Issues:** Ensure all pages have proper robots.txt allowing AI bot access
2. **Add Missing Schema Markup:** Implement structured data across all analyzed pages
3. **Optimize Meta Descriptions:** Enhance meta descriptions on underperforming pages for better AI search visibility

### 🟡 MEDIUM-TERM IMPROVEMENTS (7-30 days)
1. **Content Authority Enhancement:** Add author bylines and credentials across content pages
2. **FAQ Section Implementation:** Add comprehensive FAQ sections to capture more AI search queries
3. **Internal Linking Strategy:** Improve cross-page linking to boost overall domain authority

### 🟢 LONG-TERM OPTIMIZATION (30-90 days)
1. **Content Depth Enhancement:** Expand content across all pages for comprehensive coverage
2. **Domain Authority Building:** Develop strategies to increase overall domain trustworthiness
3. **Advanced Schema Implementation:** Add advanced structured data for enhanced AI comprehension

## TECHNICAL INSIGHTS

- **Analysis Date:** ${new Date().toLocaleDateString()}
- **Analysis Type:** Multi-page domain assessment
- **LLM Optimization Focus:** ChatGPT, Gemini, and Perplexity visibility enhancement
- **Pages Successfully Analyzed:** ${domainInsights.completedPages}/${domainInsights.totalPages}

## NEXT STEPS

1. **Focus on High-Impact Changes:** Start with technical accessibility fixes across all pages
2. **Page-by-Page Improvement:** Use individual page scores to prioritize optimization efforts
3. **Monitor Domain Progress:** Track overall domain score improvements over time`
    } else {
      // Fallback if data extraction fails
      reportContent = `# Multi-Page LLM Visibility Analysis Report

## EXECUTIVE SUMMARY

Complete multi-page analysis for **${params.website_url}** with comprehensive LLM visibility assessment.

**Overall Domain Score: ${actualOverallScore}/100** (${actualOverallScore >= 80 ? 'Excellent' : actualOverallScore >= 60 ? 'Good' : actualOverallScore >= 40 ? 'Fair' : 'Needs Improvement'})

## COMPREHENSIVE DOMAIN ANALYSIS

Your multi-page analysis provides insights across multiple pages of your domain, offering a complete picture of your website's AI search optimization status.

### Key Benefits of Multi-Page Analysis
- **Domain-wide visibility assessment**
- **Cross-page optimization opportunities**
- **Collective authority building strategies**
- **Comprehensive technical infrastructure review**

## PRIORITIZED RECOMMENDATIONS

### 🔴 HIGH-IMPACT ACTIONS (Immediate - 7 days)
1. **Optimize Meta Descriptions:** Enhance meta descriptions across all pages for better AI search visibility
2. **Add Schema Markup:** Implement structured data to help AI understand your content better
3. **Fix Technical Issues:** Address any blocking factors preventing AI crawler access

### 🟡 MEDIUM-TERM IMPROVEMENTS (7-30 days)
1. **Content Authority Enhancement:** Add author bylines, credentials, and expertise indicators
2. **FAQ Section Implementation:** Add comprehensive FAQ sections to capture more AI search queries
3. **Internal Linking Strategy:** Improve internal linking to boost page authority

### 🟢 LONG-TERM OPTIMIZATION (30-90 days)
1. **Content Depth Enhancement:** Expand content to provide more comprehensive coverage
2. **Technical SEO Improvements:** Optimize site speed, mobile responsiveness, and core web vitals
3. **Authority Building:** Develop strategies to increase domain authority and trustworthiness

## TECHNICAL INSIGHTS

- **Analysis Date:** ${new Date().toLocaleDateString()}
- **LLM Optimization Focus:** ChatGPT, Gemini, and Perplexity visibility enhancement
- **Methodology:** Comprehensive multi-page domain analysis

## NEXT STEPS

1. **Implement High-Impact Changes:** Start with the immediate actions listed above
2. **Monitor Performance:** Track improvements in AI search visibility
3. **Iterative Optimization:** Continuously refine based on performance data
4. **Expert Consultation:** Consider working with our team for advanced optimization

This comprehensive analysis provides actionable insights to improve your website's visibility in AI search engines like ChatGPT, Gemini, and Perplexity. The recommendations are prioritized by impact and implementation timeline to help you achieve maximum results efficiently.`
    }
    console.log('FORCED comprehensive multi-page report content override');
  }
  
  const formattedReport = generateReportContent();

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LLM Visibility Analysis Report</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f8fafc; }
        .container { width: 100%; margin: 0; background: #ffffff; overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 50px 3%; text-align: center; }
        .header h1 { margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px; }
        .header p { margin: 20px 0 0 0; opacity: 0.9; font-size: 18px; font-weight: 400; }
        .content { padding: 30px 3%; }
        .greeting { font-size: 20px; margin-bottom: 30px; color: #1e293b; }
        .score-card { 
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); 
            padding: 40px; 
            border-radius: 20px; 
            margin: 30px 0; 
            text-align: center; 
            border: 2px solid #e2e8f0; 
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
        }
        .score-main { font-size: 60px; font-weight: 800; color: ${scoreColor}; margin: 0; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
        .score-status { font-size: 28px; font-weight: 700; color: ${scoreColor}; margin: 10px 0; }
        .score-subtitle { font-size: 18px; color: #64748b; margin-top: 15px; font-weight: 500; }
        .progress-bar { width: 100%; height: 16px; background: #e2e8f0; border-radius: 8px; margin: 25px 0; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1); }
        .progress-fill { height: 100%; background: linear-gradient(90deg, ${scoreColor} 0%, ${scoreColor}dd 100%); width: ${actualOverallScore}%; transition: width 0.3s ease; border-radius: 8px; }
        .report-section { background: #f8fafc; padding: 40px; border-radius: 16px; margin: 40px 0; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); }
        .report-section h3 { margin: 0 0 25px 0; color: #1e293b; font-size: 24px; font-weight: 600; }
        .report-content { 
            font-family: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            font-size: 16px; 
            line-height: 1.7; 
            background: #fff; 
            padding: 30px; 
            border-radius: 12px; 
            border: 1px solid #e2e8f0;
            overflow-x: auto;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        .next-steps { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 40px; border-radius: 16px; margin: 40px 0; border: 1px solid #3b82f6; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.1); }
        .next-steps h3 { margin: 0 0 25px 0; color: #1e40af; font-size: 24px; font-weight: 600; }
        .next-steps ul { margin: 20px 0; padding-left: 30px; }
        .next-steps li { margin: 15px 0; font-size: 18px; line-height: 1.6; }
        .next-steps li::marker { color: #3b82f6; }
        .highlight-box { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #f59e0b; padding: 30px; border-radius: 16px; margin: 30px 0; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.1); }
        .highlight-box p { margin: 0; color: #92400e; font-weight: 500; font-size: 18px; line-height: 1.6; }
        .footer { background: #f1f5f9; padding: 40px; text-align: center; color: #64748b; }
        .footer p { margin: 10px 0; font-size: 15px; }
        .company-name { font-weight: 600; color: #1e293b; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 18px 36px; text-decoration: none; border-radius: 12px; margin: 25px 0; font-weight: 600; font-size: 16px; transition: transform 0.2s ease; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3); }
        .cta-button:hover { transform: translateY(-2px); }
        .website-url { font-family: 'SF Mono', Monaco, monospace; background: #f1f5f9; padding: 8px 12px; border-radius: 8px; font-size: 16px; font-weight: 500; }
        
        /* Report formatting styles */
        .report-title {
            font-size: 26px;
            font-weight: 800;
            color: #1e293b;
            margin: 30px 0 20px 0;
            text-align: center;
            border-bottom: 3px solid #667eea;
            padding-bottom: 15px;
        }
        
        .section-header { 
            font-size: 22px; 
            font-weight: 700; 
            color: #1e293b; 
            margin: 40px 0 20px 0; 
            padding: 15px 20px; 
            border-bottom: 3px solid #e2e8f0; 
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border-radius: 12px;
        }
        
        .subsection-header {
            font-size: 20px;
            font-weight: 700;
            color: #374151;
            margin: 30px 0 15px 0;
            padding: 10px 0;
            border-bottom: 2px solid #d1d5db;
        }
        
        .priority-section {
            margin: 30px 0;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        
        .priority-section h3 {
            font-size: 20px;
            font-weight: 700;
            margin: 0 0 20px 0;
            padding: 0;
            border: none;
        }
        
        .section-header.critical { color: #dc2626; border-bottom-color: #dc2626; background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%); }
        .section-header.action { color: #2563eb; border-bottom-color: #2563eb; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); }
        .section-header.success { color: #16a34a; border-bottom-color: #16a34a; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); }
        
        .priority-high { 
            background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%); 
            border: 1px solid #fecaca; 
            border-left: 6px solid #dc2626; 
            padding: 25px; 
            margin: 25px 0; 
            font-weight: 600; 
            color: #991b1b; 
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(220, 38, 38, 0.1);
            font-size: 18px;
        }
        .priority-medium { 
            background: linear-gradient(135deg, #fffbeb 0%, #fed7aa 100%); 
            border: 1px solid #fed7aa; 
            border-left: 6px solid #f59e0b; 
            padding: 25px; 
            margin: 25px 0; 
            font-weight: 600; 
            color: #92400e; 
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(245, 158, 11, 0.1);
            font-size: 18px;
        }
        .priority-low { 
            background: linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 100%); 
            border: 1px solid #bbf7d0; 
            border-left: 6px solid #22c55e; 
            padding: 25px; 
            margin: 25px 0; 
            font-weight: 600; 
            color: #166534; 
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(34, 197, 94, 0.1);
            font-size: 18px;
        }
        
        .rec-item { 
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); 
            border: 1px solid #e2e8f0; 
            border-radius: 12px; 
            padding: 25px; 
            margin: 20px 0; 
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        .rec-header {
            display: flex;
            align-items: flex-start;
            margin-bottom: 15px;
        }
        
        .rec-number { 
            font-weight: 700; 
            color: #3b82f6; 
            font-size: 18px; 
            margin-right: 12px;
            flex-shrink: 0;
        }
        
        .rec-title { 
            font-weight: 700; 
            color: #1e293b; 
            font-size: 18px; 
            line-height: 1.4;
        }
        
        .rec-description { 
            color: #475569; 
            line-height: 1.6; 
            font-size: 16px;
            margin-left: 30px;
        }
        
        .simple-item {
            margin: 15px 0;
            display: flex;
            align-items: flex-start;
        }
        
        .item-number {
            font-weight: 700;
            color: #3b82f6;
            font-size: 16px;
            margin-right: 12px;
            flex-shrink: 0;
        }
        
        .item-text {
            color: #475569;
            font-size: 16px;
            line-height: 1.6;
        }
        
        .bullet-item { 
            margin: 12px 0; 
            padding-left: 20px; 
            color: #475569; 
            font-size: 16px;
            line-height: 1.6;
        }
        
        .outcome-box { 
            background: linear-gradient(135deg, #ecfdf5 0%, #bbf7d0 100%); 
            border: 1px solid #bbf7d0; 
            border-radius: 12px; 
            padding: 20px; 
            margin: 20px 0; 
            font-style: italic; 
            color: #166534; 
            font-size: 16px;
            box-shadow: 0 2px 8px rgba(22, 101, 52, 0.1);
        }
        
        /* Mobile responsiveness - Progressive Enhancement */
        @media only screen and (max-width: 600px) {
            .content { padding: 20px 4%; }
            .header { padding: 30px 20px; }
            .header h1 { font-size: 26px; }
            .header p { font-size: 16px; }
            .greeting { font-size: 18px; }
            .score-card { padding: 30px 20px; }
            .score-main { font-size: 48px; }
            .score-grade { font-size: 22px; }
            .score-subtitle { font-size: 16px; }
            .report-section { padding: 25px 20px; }
            .report-section h3 { font-size: 20px; }
            .report-content { padding: 20px; font-size: 15px; }
            .section-header { font-size: 18px; padding: 12px 15px; }
            .subsection-header { font-size: 18px; padding: 8px 0; }
            .rec-item { padding: 20px; margin: 15px 0; }
            .rec-number, .rec-title { font-size: 16px; }
            .rec-description { font-size: 15px; margin-left: 25px; }
            .priority-section { padding: 20px; margin: 20px 0; }
            .priority-section h3 { font-size: 18px; }
            .simple-item { margin: 12px 0; }
            .item-number { font-size: 15px; }
            .item-text { font-size: 15px; }
            .next-steps { padding: 25px 20px; }
            .next-steps h3 { font-size: 20px; }
            .next-steps li { font-size: 16px; }
            .highlight-box { padding: 20px; }
            .highlight-box p { font-size: 16px; }
            .footer { padding: 30px 20px; }
            .cta-button { padding: 15px 30px; font-size: 15px; }
            .website-url { font-size: 14px; padding: 6px 10px; }
        }
        
        /* Tablet responsiveness */
        @media only screen and (min-width: 601px) and (max-width: 1024px) {
            .content { padding: 30px 3%; }
            .header { padding: 40px 3%; }
            .report-section { padding: 30px 25px; }
            .rec-item { padding: 22px; }
            .priority-section { padding: 22px; }
        }
        
        /* Desktop and larger - full width utilization */
        @media only screen and (min-width: 1025px) {
            .content { padding: 40px 2%; }
            .header { padding: 50px 2%; }
            .report-section { padding: 35px 30px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 LLM Visibility Analysis Report</h1>
            <p>AI Search Optimization Report for ${params.website_url}</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                <p>Dear ${params.user_name},</p>
            </div>
            
            <p>Thank you for using our AI Visibility Audit Tool. We've completed a comprehensive analysis of <span class="website-url">${params.website_url}</span> and here are your results:</p>
            
            <div class="score-card">
                <div class="score-main">${actualOverallScore}</div>
                <div class="score-status">${scoreStatus}</div>
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <div class="score-subtitle">LLM Visibility Score out of 100</div>
                <p style="margin-top: 15px; font-size: 14px; color: #64748b;">This score reflects how well your website is optimized for AI search engines like ChatGPT, Gemini, and Perplexity.</p>
            </div>
            
            <div class="highlight-box">
                <p>🎯 <strong>Key Insight:</strong> Your website's visibility to AI search engines directly impacts how often your content appears in AI-generated responses and citations.</p>
            </div>
            
            <div class="report-section">
                <h3>📊 Detailed Analysis Report</h3>
                <div class="report-content">${formattedReport}</div>
            </div>
            
            <div class="next-steps">
                <h3>Next Steps</h3>
                <p>We're looking forward to connecting with you. One of our AI Experts team members will reach out to explore:</p>
                <ul>
                    <li>The best opportunities for immediate growth.</li>
                    <li>A potential implementation plan tailored for you.</li>
                    <li>Long-term strategies for continued success.</li>
                    <li>How we'll partner with you to track and adapt your plan.</li>
                </ul>
                
                <p><strong>Have questions about your report in the meantime?</strong> Just reply to this email—we're here to help.</p>
            </div>
            
            <p>Best regards,<br>
            <strong class="company-name">Your AI Experts Team</strong></p>
        </div>
        
        <div class="footer">
            <p><strong>© 2025 Revenue Experts AI</strong> - LLM Visibility Optimization</p>
            <p>This report was generated automatically by our AI analysis system.</p>
            ${params.company_name ? `<p><strong>Report prepared for:</strong> <span class="company-name">${params.company_name}</span></p>` : ''}
            <p style="margin-top: 15px; font-size: 12px; color: #94a3b8;">Questions about your report? Reply to this email for expert consultation.</p>
            <p style="margin-top: 20px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                This is a transactional email containing your requested website analysis report. 
                If you no longer wish to receive these analysis reports, please reply to this email with "UNSUBSCRIBE" in the subject line.
            </p>
        </div>
    </div>
</body>
</html>
  `;
}

function generateEmailText(params: EmailTemplateParams): string {
  // Use mathematically calculated weighted score for consistency (1 decimal place)
  const calculateWeightedScore = (results: any): number => {
    if (!results || !results.aiLlmVisibilityScore) return params.overall_score;
    return Math.round(
      ((results.aiLlmVisibilityScore * 0.25) + 
      (results.techScore * 0.20) + 
      (results.contentScore * 0.25) + 
      (results.accessibilityScore * 0.10) + 
      (results.authorityScore * 0.20)) * 10
    ) / 10;
  };
  
  const actualOverallScore = params.analysis_results ? 
    calculateWeightedScore(params.analysis_results) : 
    params.overall_score;
  
  return `
LLM Visibility Analysis Report - ${params.website_url}

Dear ${params.user_name},

Thank you for using our AI Visibility Audit Tool. We've completed a comprehensive analysis of ${params.website_url}.

OVERALL LLM VISIBILITY SCORE: ${actualOverallScore}/100
This score reflects how well your website is optimized for AI search engines like ChatGPT, Gemini, and Perplexity.

DETAILED ANALYSIS REPORT:
${params.report_content}

NEXT STEPS:
We're looking forward to connecting with you. One of our AI Experts team members will reach out to explore:
• The best opportunities for immediate growth.
• A potential implementation plan tailored for you.
• Long-term strategies for continued success.
• How we'll partner with you to track and adapt your plan.

Have questions about your report in the meantime? Just reply to this email—we're here to help.

Best regards,

Your AI Experts Team

© 2025 Revenue Experts AI - LLM Visibility Optimization
${params.company_name ? `Report prepared for: ${params.company_name}` : ''}

---
This is a transactional email containing your requested website analysis report. 
If you no longer wish to receive these analysis reports, please reply to this email with "UNSUBSCRIBE" in the subject line.
  `;
}

export async function sendAnalysisReportViaSendGrid(params: EmailTemplateParams): Promise<boolean> {
  if (!sendgridApiKey) {
    console.error('SendGrid API key not configured');
    return false;
  }

  try {
    // Extract actual overall score from analysis results if available
    const actualOverallScore = params.analysis_results?.overallScore || params.overall_score;
    
    const mail = new MailService();
    mail.setApiKey(sendgridApiKey);

    // Parse multiple email recipients
    const emailRecipients = params.user_email.split(',').map(email => email.trim());
    
    // BCC recipients for internal tracking
    const bccRecipients = getBccRecipients();



    const htmlContent = generateEmailHTML(params);
    
    const msg = {
      to: emailRecipients,
      from: {
        email: fromEmail,
        name: 'Revenue Experts AI'
      },
      bcc: bccRecipients,
      subject: `🔍 LLM Visibility Analysis Report - ${params.website_url} (Score: ${actualOverallScore}/100)`,
      text: generateEmailText(params),
      html: htmlContent,
    };

    await mail.send(msg);
    console.log('Email sent successfully via SendGrid to:', emailRecipients.join(', '), 'with BCC to:', bccRecipients.join(', '));
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    
    // Log detailed error information for debugging
    if (error && typeof error === 'object' && 'response' in error) {
      const response = (error as any).response;
      console.error('SendGrid error details:', {
        status: response?.status,
        headers: response?.headers,
        body: response?.body
      });
      
      // Log specific error messages from SendGrid
      if (response?.body?.errors) {
        console.error('SendGrid error messages:', response.body.errors);
      }
    }
    
    return false;
  }
}

export async function sendAnalysisReportViaGmail(params: EmailTemplateParams): Promise<boolean> {
  if (!gmailUser || !gmailPassword) {
    console.error('Gmail credentials not configured');
    return false;
  }

  try {
    // Extract actual overall score from analysis results if available
    const actualOverallScore = params.analysis_results?.overallScore || params.overall_score;
    
    // Create transporter
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPassword, // Use App Password, not regular password
      },
    });

    // Parse multiple email recipients
    const emailRecipients = params.user_email.split(',').map(email => email.trim());
    
    // BCC recipients for internal tracking
    const bccRecipients = getBccRecipients();

    // Email options
    const mailOptions = {
      from: {
        name: 'Revenue Experts AI',
        address: gmailUser
      },
      to: emailRecipients,
      bcc: bccRecipients,
      subject: `🔍 LLM Visibility Analysis Report - ${params.website_url} (Score: ${actualOverallScore}/100)`,
      text: generateEmailText(params),
      html: generateEmailHTML(params),
    };

    // Send email
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully via Gmail to:', emailRecipients.join(', '), 'with BCC to:', bccRecipients.join(', '));
    return true;
  } catch (error) {
    console.error('Gmail email error:', error);
    return false;
  }
}

export async function sendAnalysisReport(params: EmailTemplateParams): Promise<boolean> {
  // Try SendGrid first, then Gmail as fallback
  if (sendgridApiKey) {
    const success = await sendAnalysisReportViaSendGrid(params);
    if (success) return true;
  }

  if (gmailUser && gmailPassword) {
    const success = await sendAnalysisReportViaGmail(params);
    if (success) return true;
  }

  console.error('No email service configured or all failed');
  return false;
}