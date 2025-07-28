import { AnalysisResults } from '@shared/schema';
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface InlineHtmlReportProps {
  results: AnalysisResults;
  websiteUrl: string;
}

// Helper function to get grayscale shading based on score
// Higher scores = lighter background (good), Lower scores = darker background (needs attention)
function getGrayscaleForScore(score: number): string {
  if (score >= 80) {
    return "bg-gray-50 border-2 border-gray-200"; // Lightest - Excellent
  } else if (score >= 60) {
    return "bg-gray-100 border-2 border-gray-300"; // Light - Good
  } else if (score >= 40) {
    return "bg-gray-200 border-2 border-gray-400"; // Medium - Needs Improvement
  } else if (score >= 20) {
    return "bg-gray-300 border-2 border-gray-500"; // Dark - Poor
  } else {
    return "bg-gray-400 border-2 border-gray-600"; // Darkest - Critical
  }
}

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string;
  icon: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

function CollapsibleSection({ title, icon, children, isOpen, onToggle }: CollapsibleSectionProps) {
  return (
    <div className="mb-6">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-[#2f2657] text-white rounded-lg hover:bg-[#252043] transition-colors duration-200"
      >
        <div className="flex items-center">
          <span className="text-2xl mr-3">{icon}</span>
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        {isOpen ? (
          <ChevronDown className="w-6 h-6" />
        ) : (
          <ChevronRight className="w-6 h-6" />
        )}
      </button>
      
      {isOpen && (
        <div className="mt-4 border border-gray-200 rounded-lg p-6 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}

export default function InlineHtmlReport({ results, websiteUrl }: InlineHtmlReportProps) {
  const { pageDetails, overallScore, aiLlmVisibilityScore, techScore, contentScore, accessibilityScore, authorityScore } = results;
  
  // State for collapsible sections (all closed by default)
  const [openSections, setOpenSections] = useState({
    llmAccessibility: false,
    prioritizedRecommendations: false,
    authority: false,
    accessibility: false,
    contentStructure: false
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  return (
    <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
      <div className="text-center border-b-2 border-indigo-500 pb-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🔍 LLM Visibility Audit Report
        </h1>
        <p className="text-gray-600">AI Search Optimization Analysis</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-6 mb-8 border-l-4 border-indigo-500">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">PAGE ANALYSIS REPORT</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="font-semibold text-gray-700">PAGE URL:</span>
            <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-indigo-600 hover:text-indigo-800">
              {websiteUrl}
            </a>
          </div>
          <div>
            <span className="font-semibold text-gray-700">PAGE TITLE:</span>
            <span className="ml-2 text-gray-600">{pageDetails?.title || 'Not Available'}</span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">PAGE TYPE:</span>
            <span className="ml-2 text-gray-600">{pageDetails?.pageType || 'Website'}</span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">ANALYSIS DATE:</span>
            <span className="ml-2 text-gray-600">
              {new Date(results.analyzedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 border-4 border-blue-200 p-6 rounded-xl text-center md:col-span-3">
          <div className="text-4xl font-bold text-blue-700 mb-2">{overallScore.toFixed(1)}/100</div>
          <div className="text-lg font-medium text-blue-700 uppercase tracking-wide">Overall Score</div>
          <div className="text-sm text-blue-600 mt-2">Based on weighted analysis of all categories</div>
        </div>
      </div>

      {/* 5-Category Detailed Scores - Grayscale (Dark = Low Score/Urgent, Light = High Score/Good) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className={`${getGrayscaleForScore(aiLlmVisibilityScore)} p-6 rounded-xl text-center`}>
          <div className="text-2xl font-bold text-gray-800 mb-2">{aiLlmVisibilityScore}/100</div>
          <div className="text-sm font-medium text-gray-700 uppercase tracking-wide">AI/LLM Visibility</div>
          <div className="text-xs text-gray-600 mt-1">25% Weight</div>
        </div>
        <div className={`${getGrayscaleForScore(techScore)} p-6 rounded-xl text-center`}>
          <div className="text-2xl font-bold text-gray-800 mb-2">{techScore}/100</div>
          <div className="text-sm font-medium text-gray-700 uppercase tracking-wide">Technical Score</div>
          <div className="text-xs text-gray-600 mt-1">20% Weight</div>
        </div>
        <div className={`${getGrayscaleForScore(contentScore)} p-6 rounded-xl text-center`}>
          <div className="text-2xl font-bold text-gray-800 mb-2">{contentScore}/100</div>
          <div className="text-sm font-medium text-gray-700 uppercase tracking-wide">Content Score</div>
          <div className="text-xs text-gray-600 mt-1">25% Weight</div>
        </div>
        <div className={`${getGrayscaleForScore(accessibilityScore)} p-6 rounded-xl text-center`}>
          <div className="text-2xl font-bold text-gray-800 mb-2">{accessibilityScore}/100</div>
          <div className="text-sm font-medium text-gray-700 uppercase tracking-wide">Accessibility Score</div>
          <div className="text-xs text-gray-600 mt-1">10% Weight</div>
        </div>
        <div className={`${getGrayscaleForScore(authorityScore)} p-6 rounded-xl text-center`}>
          <div className="text-2xl font-bold text-gray-800 mb-2">{authorityScore}/100</div>
          <div className="text-sm font-medium text-gray-700 uppercase tracking-wide">Authority Score</div>
          <div className="text-xs text-gray-600 mt-1">20% Weight</div>
        </div>
      </div>

      <div className="space-y-6">
        <CollapsibleSection
          title="PRIORITIZED RECOMMENDATIONS"
          icon="🎯"
          isOpen={openSections.prioritizedRecommendations}
          onToggle={() => toggleSection('prioritizedRecommendations')}
        >
          <div className="bg-blue-50 border border-blue-200 border-l-4 border-l-blue-500 p-6 rounded-lg">
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 border-l-4 border-l-red-600 p-4 rounded-md">
                <div className="font-semibold text-gray-800 mb-2">🔴 HIGH-IMPACT RECOMMENDATIONS (Immediate - 7 days)</div>
                <RecommendationsList recommendations={results.recommendations.high} />
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 border-l-4 border-l-yellow-600 p-4 rounded-md">
                <div className="font-semibold text-gray-800 mb-2">🟡 MEDIUM-TERM IMPROVEMENTS (7-30 days)</div>
                <RecommendationsList recommendations={results.recommendations.medium} />
              </div>
              
              <div className="bg-green-50 border border-green-200 border-l-4 border-l-green-600 p-4 rounded-md">
                <div className="font-semibold text-gray-800 mb-2">🟢 OPTIMIZATION ENHANCEMENTS (30-90 days)</div>
                <RecommendationsList recommendations={results.recommendations.low} />
              </div>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="LLM ACCESSIBILITY ANALYSIS"
          icon="🔍"
          isOpen={openSections.llmAccessibility}
          onToggle={() => toggleSection('llmAccessibility')}
        >

          <div className="bg-gray-100 border-l-4 border-l-gray-600 p-6 rounded-lg mb-6">
            <div className="flex items-center mb-3">
              <span className="text-lg mr-2">✅</span>
              <h3 className="text-lg font-semibold text-gray-800">WHAT WORKS FOR LLM DISCOVERY:</h3>
            </div>
            <ul className="space-y-2 ml-6">
              <li className="text-gray-700">
                <strong>Structured Data Implementation:</strong> {results.structuredData.schemaTypes.join(', ')} schema types detected
              </li>
              <li className="text-gray-700">
                <strong>Metadata Quality:</strong> Title tag {results.metadata.titleTag.present ? 'present' : 'missing'} ({results.metadata.titleTag.length} characters)
              </li>
              <li className="text-gray-700">
                <strong>Technical SEO:</strong> HTTPS {results.technicalSeo.https ? 'enabled' : 'disabled'}, Mobile {results.technicalSeo.mobileOptimized ? 'optimized' : 'not optimized'}
              </li>
              <li className="text-gray-700">
                <strong>Bot Accessibility:</strong> {Object.entries(results.technicalSeo.botAccessibility).filter(([_, allowed]) => allowed).map(([bot, _]) => bot).join(', ')} access enabled
              </li>
            </ul>
          </div>

          <div className="bg-gray-100 border-l-4 border-l-gray-600 p-6 rounded-lg mb-6">
            <div className="flex items-center mb-3">
              <span className="text-lg mr-2">❌</span>
              <h3 className="text-lg font-semibold text-gray-800">WHAT BLOCKS LLM DISCOVERY:</h3>
            </div>
            <ul className="space-y-2 ml-6">
              <li className="text-gray-700">
                <strong>Page Speed:</strong> Load time classified as '{results.technicalSeo.pageSpeed}' - impacts crawler efficiency
              </li>
              <li className="text-gray-700">
                <strong>Content Structure:</strong> Limited structured content for AI citation
              </li>
              <li className="text-gray-700">
                <strong>Schema Coverage:</strong> Missing advanced schema types for enhanced context
              </li>
            </ul>
          </div>

          <div className="bg-gray-100 border-l-4 border-l-gray-600 p-6 rounded-lg mb-6">
            <div className="flex items-center mb-3">
              <span className="text-lg mr-2">🔧</span>
              <h3 className="text-lg font-semibold text-gray-800">IMMEDIATE TECHNICAL FIXES NEEDED:</h3>
            </div>
            <div className="ml-6">
              <TechnicalFixesList results={results} />
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="AUTHORITY & TRUST SIGNALS"
          icon="🛡️"
          isOpen={openSections.authority}
          onToggle={() => toggleSection('authority')}
        >
          <div className="bg-gray-100 border-l-4 border-l-gray-600 p-6 rounded-lg mb-6">
            <div className="flex items-center mb-3">
              <span className="text-lg mr-2">✅</span>
              <h3 className="text-lg font-semibold text-gray-800">AUTHORITY INDICATORS DETECTED:</h3>
            </div>
            <ul className="space-y-2 ml-6">
              <li className="text-gray-700">
                <strong>Author Information:</strong> {results.authoritySignals.authorInfo ? 'Present and detailed' : 'Missing or insufficient'}
              </li>
              <li className="text-gray-700">
                <strong>Credentials & Expertise:</strong> {results.authoritySignals.credentials ? 'Verified credentials found' : 'No credentials displayed'}
              </li>
              <li className="text-gray-700">
                <strong>About Page:</strong> {results.authoritySignals.aboutPage ? 'Comprehensive about section' : 'Missing or incomplete'}
              </li>
              <li className="text-gray-700">
                <strong>Contact Information:</strong> {results.authoritySignals.contactInfo ? 'Contact details available' : 'No contact information'}
              </li>
              <li className="text-gray-700">
                <strong>Social Proof Level:</strong> {results.authoritySignals.socialProof} social proof indicators
              </li>
            </ul>
          </div>

          {(!results.authoritySignals.authorInfo || !results.authoritySignals.credentials || !results.authoritySignals.contactInfo) && (
            <div className="bg-gray-100 border-l-4 border-l-gray-600 p-6 rounded-lg mb-6">
              <div className="flex items-center mb-3">
                <span className="text-lg mr-2">❌</span>
                <h3 className="text-lg font-semibold text-gray-800">AUTHORITY GAPS AFFECTING AI TRUST:</h3>
              </div>
              <ul className="space-y-2 ml-6">
                {!results.authoritySignals.authorInfo && (
                  <li className="text-gray-700">
                    <strong>Missing Author Attribution:</strong> AI systems prefer content with clear authorship
                  </li>
                )}
                {!results.authoritySignals.credentials && (
                  <li className="text-gray-700">
                    <strong>No Credentials Displayed:</strong> Add expertise indicators for AI credibility assessment
                  </li>
                )}
                {!results.authoritySignals.contactInfo && (
                  <li className="text-gray-700">
                    <strong>No Contact Information:</strong> Trust signals for AI citation algorithms missing
                  </li>
                )}
              </ul>
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="ACCESSIBILITY & USER EXPERIENCE"
          icon="📱"
          isOpen={openSections.accessibility}
          onToggle={() => toggleSection('accessibility')}
        >
          <div className="bg-gray-100 border-l-4 border-l-gray-600 p-6 rounded-lg mb-6">
            <div className="flex items-center mb-3">
              <span className="text-lg mr-2">✅</span>
              <h3 className="text-lg font-semibold text-gray-800">ACCESSIBILITY FEATURES:</h3>
            </div>
            <ul className="space-y-2 ml-6">
              <li className="text-gray-700">
                <strong>Mobile Optimization:</strong> {results.technicalSeo.mobileOptimized ? 'Mobile-friendly design detected' : 'Mobile optimization needed'}
              </li>
              <li className="text-gray-700">
                <strong>HTTPS Security:</strong> {results.technicalSeo.https ? 'Secure connection established' : 'Security upgrade required'}
              </li>
              <li className="text-gray-700">
                <strong>Page Speed Performance:</strong> Loading time classified as '{results.technicalSeo.pageSpeed}'
              </li>
              <li className="text-gray-700">
                <strong>Content Accessibility:</strong> AI crawlers can access and process content effectively
              </li>
            </ul>
          </div>

          {(!results.technicalSeo.mobileOptimized || !results.technicalSeo.https || results.technicalSeo.pageSpeed !== 'good') && (
            <div className="bg-gray-100 border-l-4 border-l-gray-600 p-6 rounded-lg mb-6">
              <div className="flex items-center mb-3">
                <span className="text-lg mr-2">⚠️</span>
                <h3 className="text-lg font-semibold text-gray-800">ACCESSIBILITY IMPROVEMENTS NEEDED:</h3>
              </div>
              <ul className="space-y-2 ml-6">
                {!results.technicalSeo.mobileOptimized && (
                  <li className="text-gray-700">
                    <strong>Mobile Optimization:</strong> Improve responsive design for mobile users and AI mobile crawlers
                  </li>
                )}
                {!results.technicalSeo.https && (
                  <li className="text-gray-700">
                    <strong>HTTPS Security:</strong> Implement SSL certificate for secure connections
                  </li>
                )}
                {results.technicalSeo.pageSpeed !== 'good' && (
                  <li className="text-gray-700">
                    <strong>Page Speed:</strong> Optimize loading times for better user experience and AI crawler efficiency
                  </li>
                )}
              </ul>
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="CONTENT STRUCTURE FOR AI CITATION"
          icon="📝"
          isOpen={openSections.contentStructure}
          onToggle={() => toggleSection('contentStructure')}
        >
          <div className="bg-gray-100 border-l-4 border-l-gray-600 p-6 rounded-lg">
            <div className="flex items-center mb-3">
              <span className="text-lg mr-2">✅</span>
              <h3 className="text-lg font-semibold text-gray-800">WHAT WORKS FOR AI CITATION:</h3>
            </div>
            <ul className="space-y-2 ml-6">
              {results.citationPotential.keyStrengths.map((strength, index) => (
                <li key={index} className="text-gray-700">
                  <strong>{strength}:</strong> Well-structured for AI citation
                </li>
              ))}
              <li className="text-gray-700">
                <strong>Citation Readiness:</strong> Content is well-structured for AI extraction and citation
              </li>
              <li className="text-gray-700">
                <strong>Authority Foundation:</strong> Credibility signals present for AI trust assessment
              </li>
            </ul>
          </div>
        </CollapsibleSection>
      </div>

      <div className="text-center mt-12 pt-8 border-t border-gray-200">
        <p className="text-gray-600">
          <strong>© 2025 Revenue Experts AI</strong> - LLM Visibility Optimization
        </p>
        <p className="text-sm text-gray-500 mt-2">
          This report was generated automatically by our AI analysis system on {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

function TechnicalFixesList({ results }: { results: AnalysisResults }) {
  const fixes = [];
  
  if (results.technicalSeo.pageSpeed !== 'good') {
    fixes.push('Improve Page Speed: Optimize server response time, compress images, minify CSS/JS');
  }
  
  if (!results.structuredData.jsonLdFound) {
    fixes.push('Add Schema.org Markup: Implement structured data for better AI understanding');
  }
  
  if (!results.metadata.openGraph.title) {
    fixes.push('Complete Open Graph: Add missing OG tags for social and AI context');
  }
  
  if (fixes.length === 0) {
    return <p className="text-gray-700">No immediate technical fixes required.</p>;
  }
  
  return (
    <ol className="space-y-2 list-decimal list-inside">
      {fixes.map((fix, index) => (
        <li key={index} className="text-gray-700">{fix}</li>
      ))}
    </ol>
  );
}

function RecommendationsList({ recommendations }: { recommendations: Array<{ title: string; description: string }> }) {
  return (
    <div className="space-y-3">
      {recommendations.map((rec, index) => (
        <div key={index}>
          <div className="font-semibold text-gray-800">{rec.title}</div>
          <div className="text-sm text-gray-600">{rec.description}</div>
        </div>
      ))}
    </div>
  );
}