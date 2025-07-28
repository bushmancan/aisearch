import { AnalysisResults } from '@shared/schema';

interface HtmlReportGeneratorProps {
  results: AnalysisResults;
  websiteUrl: string;
}

export function generateHtmlReport(results: AnalysisResults, websiteUrl: string): string {
  const { pageDetails, overallScore, aiLlmVisibilityScore, techScore, contentScore, accessibilityScore, authorityScore } = results;
  
  // Parse narrative report sections
  const narrativeReport = results.narrativeReport || '';
  const sections = parseNarrativeReport(narrativeReport);
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LLM Visibility Audit Report - ${pageDetails.title}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #ffffff;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #667eea;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #1a1a1a;
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .page-info {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            border-left: 4px solid #667eea;
        }
        .page-info h2 {
            margin: 0 0 15px 0;
            color: #1e293b;
            font-size: 18px;
        }
        .info-row {
            margin: 8px 0;
        }
        .info-label {
            font-weight: 600;
            color: #475569;
        }
        .score-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .score-card {
            background: #f8fafc;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            border: 2px solid #e2e8f0;
        }
        .score-card.overall {
            border-color: #667eea;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .score-number {
            font-size: 36px;
            font-weight: 800;
            margin: 10px 0;
        }
        .score-label {
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .section {
            margin: 30px 0;
        }
        .section-header {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e2e8f0;
        }
        .section-icon {
            margin-right: 10px;
            font-size: 20px;
        }
        .section-title {
            font-size: 20px;
            font-weight: 700;
            color: #1e293b;
        }
        .what-works {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-left: 4px solid #22c55e;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .what-blocks {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-left: 4px solid #ef4444;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .immediate-fixes {
            background: #fefbeb;
            border: 1px solid #fed7aa;
            border-left: 4px solid #f59e0b;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .subsection-title {
            font-size: 16px;
            font-weight: 600;
            color: #1e293b;
            margin: 15px 0 10px 0;
            display: flex;
            align-items: center;
        }
        .subsection-title .icon {
            margin-right: 8px;
        }
        .bullet-list {
            margin: 10px 0;
            padding-left: 20px;
        }
        .bullet-list li {
            margin: 8px 0;
            color: #475569;
        }
        .bullet-list li strong {
            color: #1e293b;
        }
        .recommendations {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-left: 4px solid #0ea5e9;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .priority-high {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-left: 4px solid #dc2626;
            padding: 15px;
            margin: 15px 0;
            border-radius: 6px;
        }
        .priority-medium {
            background: #fffbeb;
            border: 1px solid #fed7aa;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 15px 0;
            border-radius: 6px;
        }
        .priority-low {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-left: 4px solid #22c55e;
            padding: 15px;
            margin: 15px 0;
            border-radius: 6px;
        }
        .priority-title {
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 5px;
        }
        .priority-desc {
            color: #475569;
            font-size: 14px;
        }
        .footer {
            text-align: center;
            margin-top: 50px;
            padding-top: 30px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 14px;
        }
        .status-summary {
            background: #f8fafc;
            padding: 25px;
            border-radius: 12px;
            margin: 30px 0;
            border-left: 4px solid #667eea;
        }
        .status-summary h2 {
            margin: 0 0 20px 0;
            color: #1e293b;
            font-size: 20px;
            font-weight: 700;
        }
        .status-item {
            display: flex;
            align-items: center;
            margin: 12px 0;
            padding: 8px 0;
        }
        .status-item i {
            margin-right: 12px;
            font-size: 18px;
            width: 20px;
            text-align: center;
        }
        .status-item strong {
            font-weight: 600;
            font-size: 16px;
        }
        .status-pass {
            color: #28a745;
        }
        .status-caution {
            color: #ffc107;
        }
        .status-fail {
            color: #dc3545;
        }
        @media print {
            body { margin: 0; padding: 15px; }
            .header { page-break-inside: avoid; }
            .section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 LLM Visibility Audit Report</h1>
        <p style="color: #64748b; margin: 10px 0;">AI Search Optimization Analysis</p>
    </div>

    <div class="page-info">
        <h2>PAGE ANALYSIS REPORT</h2>
        <div class="info-row">
            <span class="info-label">PAGE URL:</span> <a href="${websiteUrl}" target="_blank">${websiteUrl}</a>
        </div>
        <div class="info-row">
            <span class="info-label">PAGE TITLE:</span> ${pageDetails.title}
        </div>
        <div class="info-row">
            <span class="info-label">PAGE TYPE:</span> ${pageDetails.pageType}
        </div>
        <div class="info-row">
            <span class="info-label">ANALYSIS DATE:</span> ${new Date(results.analyzedAt).toLocaleDateString()}
        </div>
    </div>

    <!-- BEGIN LLM VISIBILITY AUDIT REPORT SECTION -->
    <div class="status-summary">
        <h2>Executive Summary</h2>
        ${generateStatusSummary({ overallScore, aiLlmVisibilityScore, techScore, contentScore, accessibilityScore, authorityScore })}
    </div>
    <!-- END LLM VISIBILITY AUDIT REPORT SECTION -->

    <!-- BEGIN DETAILED ANALYSIS REPORT SECTION -->
    <div class="section">
        <div class="section-header">
            <span class="section-icon">🔍</span>
            <h2 class="section-title">LLM ACCESSIBILITY ANALYSIS</h2>
        </div>

        <div class="what-works">
            <div class="subsection-title">
                <span class="icon">✅</span>
                WHAT WORKS FOR LLM DISCOVERY:
            </div>
            ${generateLlmAccessibilityPoints(results, 'works')}
        </div>

        <div class="what-blocks">
            <div class="subsection-title">
                <span class="icon">❌</span>
                WHAT BLOCKS LLM DISCOVERY:
            </div>
            ${generateLlmAccessibilityPoints(results, 'blocks')}
        </div>

        <div class="immediate-fixes">
            <div class="subsection-title">
                <span class="icon">🔧</span>
                IMMEDIATE TECHNICAL FIXES NEEDED:
            </div>
            ${generateTechnicalFixes(results)}
        </div>
    </div>

    <div class="section">
        <div class="section-header">
            <span class="section-icon">🛡️</span>
            <h2 class="section-title">AUTHORITY & TRUST SIGNALS</h2>
        </div>

        <div class="what-works">
            <div class="subsection-title">
                <span class="icon">✅</span>
                AUTHORITY INDICATORS DETECTED:
            </div>
            ${generateAuthorityPoints(results)}
        </div>

        ${(!results.authoritySignals.authorInfo || !results.authoritySignals.credentials || !results.authoritySignals.contactInfo) ? 
          `<div class="what-blocks">
            <div class="subsection-title">
                <span class="icon">❌</span>
                AUTHORITY GAPS AFFECTING AI TRUST:
            </div>
            ${generateAuthorityGaps(results)}
          </div>` : ''}
    </div>

    <div class="section">
        <div class="section-header">
            <span class="section-icon">📱</span>
            <h2 class="section-title">ACCESSIBILITY & USER EXPERIENCE</h2>
        </div>

        <div class="what-works">
            <div class="subsection-title">
                <span class="icon">✅</span>
                ACCESSIBILITY FEATURES:
            </div>
            ${generateAccessibilityPoints(results)}
        </div>

        ${(!results.technicalSeo.mobileOptimized || !results.technicalSeo.https || results.technicalSeo.pageSpeed !== 'good') ? 
          `<div class="what-blocks">
            <div class="subsection-title">
                <span class="icon">⚠️</span>
                ACCESSIBILITY IMPROVEMENTS NEEDED:
            </div>
            ${generateAccessibilityGaps(results)}
          </div>` : ''}
    </div>

    <div class="section">
        <div class="section-header">
            <span class="section-icon">📝</span>
            <h2 class="section-title">CONTENT STRUCTURE FOR AI CITATION</h2>
        </div>

        <div class="what-works">
            <div class="subsection-title">
                <span class="icon">✅</span>
                WHAT WORKS FOR AI CITATION:
            </div>
            ${generateCitationPoints(results, 'works')}
        </div>
    </div>

    <div class="section">
        <div class="section-header">
            <span class="section-icon">🚨</span>
            <h2 class="section-title">CRITICAL AI VISIBILITY RED FLAGS</h2>
        </div>
        <div class="what-blocks">
            <div class="subsection-title">
                <span class="icon">❌</span>
                CRITICAL ISSUES BLOCKING AI DISCOVERY:
            </div>
            ${generateCriticalRedFlags(results)}
        </div>
    </div>
    <!-- END DETAILED ANALYSIS REPORT SECTION -->

    <!-- BEGIN PRIORITIZED RECOMMENDATIONS SECTION -->
    <div class="section">
        <div class="section-header">
            <span class="section-icon">🎯</span>
            <h2 class="section-title">Critical Action Items</h2>
        </div>

        <div class="recommendations">
            <div class="priority-high">
                <div class="priority-title">🔴 HIGH-IMPACT RECOMMENDATIONS (Immediate - 7 days)</div>
                ${generateRecommendations(results.recommendations.high)}
            </div>
            
            <div class="priority-medium">
                <div class="priority-title">🟡 MEDIUM-TERM IMPROVEMENTS (7-30 days)</div>
                ${generateRecommendations(results.recommendations.medium)}
            </div>
            
            <div class="priority-low">
                <div class="priority-title">🟢 OPTIMIZATION ENHANCEMENTS (30-90 days)</div>
                ${generateRecommendations(results.recommendations.low)}
            </div>
        </div>
    </div>
    <!-- END PRIORITIZED RECOMMENDATIONS SECTION -->

    <div class="footer">
        <p><strong>© 2025 Revenue Experts AI</strong> - LLM Visibility Optimization</p>
        <p>This report was generated automatically by our AI analysis system on ${new Date().toLocaleDateString()}</p>
    </div>
</body>
</html>
  `;
}

function parseNarrativeReport(narrativeReport: string) {
  // Parse the markdown narrative report to extract structured sections
  const sections = {
    executiveSummary: '',
    llmAccessibility: '',
    contentStructure: '',
    recommendations: ''
  };
  
  // This would parse the markdown and extract sections
  // For now, return the raw narrative
  return sections;
}

function generateLlmAccessibilityPoints(results: AnalysisResults, type: 'works' | 'blocks'): string {
  const { technicalSeo, metadata, structuredData } = results;
  
  if (type === 'works') {
    return `
      <ul class="bullet-list">
        <li><strong>Structured Data Implementation:</strong> ${structuredData.schemaTypes.join(', ')} schema types detected</li>
        <li><strong>Metadata Quality:</strong> Title tag ${metadata.titleTag.present ? 'present' : 'missing'} (${metadata.titleTag.length} characters)</li>
        <li><strong>Technical SEO:</strong> HTTPS ${technicalSeo.https ? 'enabled' : 'disabled'}, Mobile ${technicalSeo.mobileOptimized ? 'optimized' : 'not optimized'}</li>
        <li><strong>Bot Accessibility:</strong> ${Object.entries(technicalSeo.botAccessibility).filter(([_, allowed]) => allowed).map(([bot, _]) => bot).join(', ')} access enabled</li>
      </ul>
    `;
  } else {
    return `
      <ul class="bullet-list">
        <li><strong>Page Speed:</strong> Load time classified as '${technicalSeo.pageSpeed}' - impacts crawler efficiency</li>
        <li><strong>Content Structure:</strong> Limited structured content for AI citation</li>
        <li><strong>Schema Coverage:</strong> Missing advanced schema types for enhanced context</li>
      </ul>
    `;
  }
}

function generateTechnicalFixes(results: AnalysisResults): string {
  const fixes = [];
  
  if (results.technicalSeo.pageSpeed !== 'good') {
    fixes.push('<li><strong>Improve Page Speed:</strong> Optimize server response time, compress images, minify CSS/JS</li>');
  }
  
  if (!results.structuredData.jsonLdFound) {
    fixes.push('<li><strong>Add Schema.org Markup:</strong> Implement structured data for better AI understanding</li>');
  }
  
  if (!results.metadata.openGraph.title) {
    fixes.push('<li><strong>Complete Open Graph:</strong> Add missing OG tags for social and AI context</li>');
  }
  
  return fixes.length > 0 ? `<ol class="bullet-list">${fixes.join('')}</ol>` : '<p>No immediate technical fixes required.</p>';
}

function generateCitationPoints(results: AnalysisResults, type: 'works'): string {
  const { citationPotential } = results;
  
  return `
    <ul class="bullet-list">
      ${citationPotential.keyStrengths.map(strength => `<li><strong>${strength}:</strong> Well-structured for AI citation</li>`).join('')}
      <li><strong>Citation Readiness:</strong> ${citationPotential.citationReadiness}/100 score</li>
      <li><strong>Authority Score:</strong> ${citationPotential.authorityScore}/100 for credibility</li>
    </ul>
  `;
}

function generateRecommendations(recommendations: Array<{ title: string; description: string }>): string {
  return recommendations.map(rec => `
    <div style="margin: 10px 0;">
      <div class="priority-title">${rec.title}</div>
      <div class="priority-desc">${rec.description}</div>
    </div>
  `).join('');
}

function generateStatusSummary(scores: { overallScore: number; aiLlmVisibilityScore: number; techScore: number; contentScore: number; accessibilityScore: number; authorityScore: number }): string {
  const categories = [
    { label: "Overall Score", score: scores.overallScore },
    { label: "AI/LLM Visibility", score: scores.aiLlmVisibilityScore },
    { label: "Technical Score", score: scores.techScore },
    { label: "Content Score", score: scores.contentScore },
    { label: "Accessibility Score", score: scores.accessibilityScore },
    { label: "Authority Score", score: scores.authorityScore }
  ];

  return categories.map(category => {
    let status, icon, cssClass;
    
    if (category.score >= 75) {
      status = "OPTIMIZED";
      icon = "fas fa-check-circle";
      cssClass = "status-pass";
    } else if (category.score >= 40) {
      status = "IMPROVE";
      icon = "fas fa-exclamation-triangle";
      cssClass = "status-caution";
    } else {
      status = "FIX NOW";
      icon = "fas fa-times-circle";
      cssClass = "status-fail";
    }

    return `
        <div class="status-item ${cssClass}">
            <i class="${icon}"></i>
            <strong>${status}: ${category.label}</strong>
        </div>`;
  }).join('');
}

function generateAuthorityPoints(results: AnalysisResults): string {
  const { authoritySignals } = results;
  
  return `
    <ul class="bullet-list">
      <li><strong>Author Information:</strong> ${authoritySignals.authorInfo ? 'Present and detailed' : 'Missing or insufficient'}</li>
      <li><strong>Credentials & Expertise:</strong> ${authoritySignals.credentials ? 'Verified credentials found' : 'No credentials displayed'}</li>
      <li><strong>About Page:</strong> ${authoritySignals.aboutPage ? 'Comprehensive about section' : 'Missing or incomplete'}</li>
      <li><strong>Contact Information:</strong> ${authoritySignals.contactInfo ? 'Contact details available' : 'No contact information'}</li>
      <li><strong>Social Proof Level:</strong> ${authoritySignals.socialProof} social proof indicators</li>
    </ul>
  `;
}

function generateAuthorityGaps(results: AnalysisResults): string {
  const { authoritySignals } = results;
  const gaps = [];
  
  if (!authoritySignals.authorInfo) {
    gaps.push('<li><strong>Missing Author Attribution:</strong> AI systems prefer content with clear authorship</li>');
  }
  if (!authoritySignals.credentials) {
    gaps.push('<li><strong>No Credentials Displayed:</strong> Add expertise indicators for AI credibility assessment</li>');
  }
  if (!authoritySignals.contactInfo) {
    gaps.push('<li><strong>No Contact Information:</strong> Trust signals for AI citation algorithms missing</li>');
  }
  
  return gaps.length > 0 ? `<ul class="bullet-list">${gaps.join('')}</ul>` : '<p>No major authority gaps detected.</p>';
}

function generateAccessibilityPoints(results: AnalysisResults): string {
  const { technicalSeo, contentVisibility } = results;
  
  return `
    <ul class="bullet-list">
      <li><strong>Mobile Optimization:</strong> ${technicalSeo.mobileOptimized ? 'Mobile-friendly design detected' : 'Mobile optimization needed'}</li>
      <li><strong>HTTPS Security:</strong> ${technicalSeo.https ? 'Secure connection established' : 'Security upgrade required'}</li>
      <li><strong>Page Speed Performance:</strong> Loading time classified as '${technicalSeo.pageSpeed}'</li>
      <li><strong>Content Accessibility:</strong> ${contentVisibility.aiCrawlability}% accessibility score</li>
    </ul>
  `;
}

function generateAccessibilityGaps(results: AnalysisResults): string {
  const { technicalSeo } = results;
  const gaps = [];
  
  if (!technicalSeo.mobileOptimized) {
    gaps.push('<li><strong>Mobile Optimization:</strong> Improve responsive design for mobile users and AI mobile crawlers</li>');
  }
  if (!technicalSeo.https) {
    gaps.push('<li><strong>HTTPS Security:</strong> Implement SSL certificate for secure connections</li>');
  }
  if (technicalSeo.pageSpeed !== 'good') {
    gaps.push('<li><strong>Page Speed:</strong> Optimize loading times for better user experience and AI crawler efficiency</li>');
  }
  
  return gaps.length > 0 ? `<ul class="bullet-list">${gaps.join('')}</ul>` : '<p>No major accessibility issues detected.</p>';
}

function generateCriticalRedFlags(results: AnalysisResults): string {
  const redFlags = [];
  
  // Check for common red flags based on analysis results
  if (!results.technicalSeo.botAccessibility.gptBot) {
    redFlags.push('<li><strong>No robots.txt allowing AI bots:</strong> GPTBot, ClaudeBot, CCBot may be blocked from accessing content</li>');
  }
  
  // Check for FAQ/Q&A content in the narrative (as a fallback indicator)
  if (!results.narrativeReport.toLowerCase().includes('faq') && !results.narrativeReport.toLowerCase().includes('question')) {
    redFlags.push('<li><strong>No FAQ sections for AI citation:</strong> Missing Q&A format that AI systems prefer for generating answers</li>');
  }
  
  // Check for author information in citation potential strengths
  if (results.citationPotential.keyStrengths.length === 0 || !results.citationPotential.keyStrengths.some(strength => strength.toLowerCase().includes('author'))) {
    redFlags.push('<li><strong>No author/expertise info:</strong> Lacks E-A-T signals that AI systems use to determine content trustworthiness</li>');
  }
  
  if (results.technicalSeo.pageSpeed === 'poor') {
    redFlags.push('<li><strong>Slow loading (>3 seconds):</strong> AI crawlers may timeout before fully indexing content</li>');
  }
  
  if (!results.structuredData.jsonLdFound) {
    redFlags.push('<li><strong>Missing structured data:</strong> No Schema.org markup to help AI systems understand content context</li>');
  }
  
  return redFlags.length > 0 ? `<ul class="bullet-list">${redFlags.join('')}</ul>` : '<p>No critical red flags detected. Good AI visibility foundation!</p>';
}

export default function HtmlReportGenerator({ results, websiteUrl }: HtmlReportGeneratorProps) {
  return null; // This is a utility component
}