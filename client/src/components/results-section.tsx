import { Download, Code, Tags, Eye, Settings, Award, MessageSquare, AlertCircle, AlertTriangle, Info, FileText, ChevronDown, CheckCircle, XCircle, Lock, Unlock, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import type { AnalysisResults } from "@shared/schema";
import { trackReportDownload } from "@/lib/hubspot-tracking";
import LeadCaptureForm from "@/components/email-report-form";
// import NarrativeReport from "@/components/narrative-report"; // REMOVED - caused score inconsistencies
import FAQ from "@/components/follow-up-question";
import InlineHtmlReport from "@/components/inline-html-report";
import { useState } from "react";

interface ResultsSectionProps {
  results: AnalysisResults;
  analyzedUrl: string;
  analysisId?: number;
  hideExportButtons?: boolean;
}

// Helper function to get Optimized-Improve-Fix Now status
function getScoreStatus(score: number) {
  if (score >= 70) {
    return {
      status: "OPTIMIZED",
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200"
    };
  } else if (score >= 40) {
    return {
      status: "IMPROVE", 
      icon: AlertTriangle,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50", 
      borderColor: "border-yellow-200"
    };
  } else {
    return {
      status: "FIX NOW",
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200"
    };
  }
}

export default function ResultsSection({ results, analyzedUrl, analysisId, hideExportButtons }: ResultsSectionProps) {
  // State for email gate - tracks if user has submitted lead info to unlock full report
  const [isReportUnlocked, setIsReportUnlocked] = useState(false);
  
  // Map legacy field names to current schema for backward compatibility
  const mappedResults = {
    ...results,
    aiLlmVisibilityScore: results.aiLlmVisibilityScore || (results as any).seoScore,
  };

  // Tooltip descriptions for each score category
  const scoreDescriptions = {
    overall: "Combined weighted score across all analysis categories. Shows your website's overall readiness for AI search engines like ChatGPT, Gemini, and Perplexity.",
    aiLlmVisibility: "Measures how well AI search engines can discover, understand, and cite your content. Includes robots.txt permissions, FAQ sections, and quotable content.",
    technical: "Technical infrastructure that supports AI discovery. Covers structured data, site speed, HTTPS security, and mobile optimization.",
    content: "Quality and structure of your content for AI citation. Analyzes readability, expertise signals, and question-answer formatting.",
    accessibility: "User experience factors that affect AI crawling. Includes page load speed, mobile responsiveness, and navigation clarity.",
    authority: "Trust signals that help AI engines evaluate your credibility. Reviews author information, credentials, and domain authority indicators."
  };
  
  // Get status for all scores
  const overallStatus = getScoreStatus(mappedResults.overallScore);
  const aiLlmVisibilityStatus = getScoreStatus(mappedResults.aiLlmVisibilityScore);
  const techStatus = getScoreStatus(mappedResults.techScore);
  const contentStatus = getScoreStatus(mappedResults.contentScore);
  const accessibilityStatus = getScoreStatus(mappedResults.accessibilityScore);
  const authorityStatus = getScoreStatus(mappedResults.authorityScore);

  // Handler for successful lead capture - unlocks the full report
  const handleLeadCaptureSuccess = () => {
    setIsReportUnlocked(true);
  };
  const handleExportJson = () => {
    // Track report download in HubSpot
    trackReportDownload(analyzedUrl);
    
    // Create a simplified text report
    const reportData = {
      url: analyzedUrl,
      timestamp: new Date().toISOString(),
      scores: {
        overall: mappedResults.overallScore,
        aiVisibility: mappedResults.aiLlmVisibilityScore,
        technical: mappedResults.techScore,
        content: mappedResults.contentScore,
        accessibility: mappedResults.accessibilityScore,
        authority: mappedResults.authorityScore,
      },
      recommendations: mappedResults.recommendations,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `llm-visibility-analysis-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = () => {
    trackReportDownload(analyzedUrl);
    
    const markdownContent = `# LLM Visibility Analysis Report

## Page Details
- **URL:** ${analyzedUrl}
- **Title:** ${results.pageDetails?.title || 'Not Available'}
- **Type:** ${results.pageDetails?.pageType || 'Website'}
- **Analysis Date:** ${new Date(results.analyzedAt).toLocaleDateString()}

## Scores
- **Overall:** ${mappedResults.overallScore}/100
- **AI/LLM Visibility:** ${mappedResults.aiLlmVisibilityScore}/100
- **Technical Score:** ${mappedResults.techScore}/100
- **Content Score:** ${mappedResults.contentScore}/100
- **Accessibility Score:** ${mappedResults.accessibilityScore}/100
- **Authority Score:** ${mappedResults.authorityScore}/100

## Detailed Analysis
${results.narrativeReport}

## Recommendations

### High Priority (0-7 days)
${mappedResults.recommendations?.high?.map(rec => `- **${rec.title}:** ${rec.description}`).join('\n') || 'None'}

### Medium Priority (7-30 days)
${mappedResults.recommendations?.medium?.map(rec => `- **${rec.title}:** ${rec.description}`).join('\n') || 'None'}

### Low Priority (30-90 days)
${mappedResults.recommendations?.low?.map(rec => `- **${rec.title}:** ${rec.description}`).join('\n') || 'None'}

---
*Generated by Revenue Experts AI - LLM Visibility Optimization*
`;

    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `llm-visibility-analysis-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };



  // Debug: Log red flags for debugging
  if (mappedResults.redFlags) {
    console.log('Red flags found:', mappedResults.redFlags);
    mappedResults.redFlags.forEach((flag, index) => {
      console.log(`Flag ${index + 1}: "${flag.title}" - ${flag.description.substring(0, 100)}...`);
    });
  }
  
  return (
    <div>
      {/* Results Header */}
      <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
        {/* Executive Summary Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Executive Summary</h2>
        </div>

        {/* Page Details Section */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold text-gray-700">PAGE URL:</span>
              <span className="ml-2 text-gray-600 font-semibold">{results.pageDetails?.url || analyzedUrl}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">PAGE TITLE:</span>
              <span className="ml-2 text-gray-600">{results.pageDetails?.title || 'Not Available'}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">PAGE TYPE:</span>
              <span className="ml-2 text-gray-600">{results.pageDetails?.pageType || 'Website'}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">ANALYSIS DATE:</span>
              <span className="ml-2 text-gray-600">
                {results.analyzedAt ? new Date(results.analyzedAt).toLocaleDateString() : new Date().toLocaleDateString()}
              </span>
              <span className="ml-2 text-xs text-green-600 font-medium">(Live Website Scraped)</span>
            </div>
            {results.pageDetails?.lastModified && (
              <div className="md:col-span-2">
                <span className="font-semibold text-gray-700">LAST MODIFIED:</span>
                <span className="ml-2 text-gray-600">{results.pageDetails.lastModified}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Lead Capture Form - Only show if not unlocked and has analysisId */}
        {!isReportUnlocked && analysisId && !hideExportButtons && (
          <div className="flex justify-end gap-2 mb-6">
            <LeadCaptureForm 
              analysisId={analysisId} 
              websiteUrl={analyzedUrl} 
              analysisResults={results}
              isUnlocked={isReportUnlocked}
              onSuccess={handleLeadCaptureSuccess}
            />
          </div>
        )}

        {/* LLM Visibility & AI Search Readiness Subsection */}
        <div className="text-center mb-4">
          <h3 className="text-lg font-bold text-gray-800 tracking-wide">LLM VISIBILITY & AI SEARCH READINESS</h3>
        </div>

        {/* Score Grid Layout - 2x3 with Overall Score in top-left */}
        <TooltipProvider>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Row 1 - Overall Score (prominent) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`${overallStatus.bgColor} ${overallStatus.borderColor} rounded-lg p-6 border text-center cursor-help hover:shadow-md transition-shadow`}>
                  <div className={`flex items-center gap-2 justify-center text-xl font-bold ${overallStatus.color} mb-2`}>
                    <overallStatus.icon size={24} />
                    {overallStatus.status}
                  </div>
                  <div className="text-lg text-black font-bold mb-1 flex items-center justify-center gap-1">
                    Overall Score
                    <HelpCircle size={14} className="text-gray-400" />
                  </div>
                  <div className="text-2xl text-black font-bold">{mappedResults.overallScore}/100</div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs p-3">
                <p className="text-sm">{scoreDescriptions.overall}</p>
              </TooltipContent>
            </Tooltip>

            {/* Row 1 - AI/LLM Visibility */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`${aiLlmVisibilityStatus.bgColor} ${aiLlmVisibilityStatus.borderColor} rounded-lg p-4 text-center border cursor-help hover:shadow-md transition-shadow`}>
                  <div className={`flex items-center gap-2 justify-center text-lg font-bold ${aiLlmVisibilityStatus.color} mb-1`}>
                    <aiLlmVisibilityStatus.icon size={18} />
                    {aiLlmVisibilityStatus.status}
                  </div>
                  <div className={`text-lg font-bold ${aiLlmVisibilityStatus.color} mb-1 flex items-center justify-center gap-1`}>
                    AI/LLM Visibility
                    <HelpCircle size={12} className="text-gray-400" />
                  </div>
                  <div className={`text-xl font-bold ${aiLlmVisibilityStatus.color}`}>{mappedResults.aiLlmVisibilityScore.toFixed(1)}%</div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs p-3">
                <p className="text-sm">{scoreDescriptions.aiLlmVisibility}</p>
              </TooltipContent>
            </Tooltip>

            {/* Row 1 - Technical Score */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`${techStatus.bgColor} ${techStatus.borderColor} rounded-lg p-4 text-center border cursor-help hover:shadow-md transition-shadow`}>
                  <div className={`flex items-center gap-2 justify-center text-lg font-bold ${techStatus.color} mb-1`}>
                    <techStatus.icon size={18} />
                    {techStatus.status}
                  </div>
                  <div className={`text-lg font-bold ${techStatus.color} mb-1 flex items-center justify-center gap-1`}>
                    Technical Score
                    <HelpCircle size={12} className="text-gray-400" />
                  </div>
                  <div className={`text-xl font-bold ${techStatus.color}`}>{mappedResults.techScore.toFixed(1)}%</div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs p-3">
                <p className="text-sm">{scoreDescriptions.technical}</p>
              </TooltipContent>
            </Tooltip>

            {/* Row 2 - Content Score */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`${contentStatus.bgColor} ${contentStatus.borderColor} rounded-lg p-4 text-center border cursor-help hover:shadow-md transition-shadow`}>
                  <div className={`flex items-center gap-2 justify-center text-lg font-bold ${contentStatus.color} mb-1`}>
                    <contentStatus.icon size={18} />
                    {contentStatus.status}
                  </div>
                  <div className={`text-lg font-bold ${contentStatus.color} mb-1 flex items-center justify-center gap-1`}>
                    Content Score
                    <HelpCircle size={12} className="text-gray-400" />
                  </div>
                  <div className={`text-xl font-bold ${contentStatus.color}`}>{mappedResults.contentScore.toFixed(1)}%</div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs p-3">
                <p className="text-sm">{scoreDescriptions.content}</p>
              </TooltipContent>
            </Tooltip>

            {/* Row 2 - Accessibility Score */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`${accessibilityStatus.bgColor} ${accessibilityStatus.borderColor} rounded-lg p-4 text-center border cursor-help hover:shadow-md transition-shadow`}>
                  <div className={`flex items-center gap-2 justify-center text-lg font-bold ${accessibilityStatus.color} mb-1`}>
                    <accessibilityStatus.icon size={18} />
                    {accessibilityStatus.status}
                  </div>
                  <div className={`text-lg font-bold ${accessibilityStatus.color} mb-1 flex items-center justify-center gap-1`}>
                    Accessibility Score
                    <HelpCircle size={12} className="text-gray-400" />
                  </div>
                  <div className={`text-xl font-bold ${accessibilityStatus.color}`}>{mappedResults.accessibilityScore.toFixed(1)}%</div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs p-3">
                <p className="text-sm">{scoreDescriptions.accessibility}</p>
              </TooltipContent>
            </Tooltip>

            {/* Row 2 - Authority Score */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`${authorityStatus.bgColor} ${authorityStatus.borderColor} rounded-lg p-4 text-center border cursor-help hover:shadow-md transition-shadow`}>
                  <div className={`flex items-center gap-2 justify-center text-lg font-bold ${authorityStatus.color} mb-1`}>
                    <authorityStatus.icon size={18} />
                    {authorityStatus.status}
                  </div>
                  <div className={`text-lg font-bold ${authorityStatus.color} mb-1 flex items-center justify-center gap-1`}>
                    Authority Score
                    <HelpCircle size={12} className="text-gray-400" />
                  </div>
                  <div className={`text-xl font-bold ${authorityStatus.color}`}>{mappedResults.authorityScore.toFixed(1)}%</div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs p-3">
                <p className="text-sm">{scoreDescriptions.authority}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>



      {/* Narrative Report Section - REMOVED to eliminate score inconsistencies */}
      {/* The AI-generated narrative text was causing display inconsistencies with mathematical scoring */}

      {/* Email Gate - Show lead capture form if report is not unlocked */}
      {!isReportUnlocked && !hideExportButtons && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <Lock className="mx-auto text-blue-600 mb-4" size={48} />
              <h3 className="text-2xl font-bold text-gray-800 mb-3">
                Unlock Your Full AI Visibility Report
              </h3>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                You've seen your scores and overview. Get the complete detailed analysis including:
              </p>
              
              {/* Preview of gated content */}
              <div className="bg-white rounded-lg p-4 my-6 max-w-lg mx-auto">
                <div className="grid grid-cols-1 gap-2 text-left text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-purple-600 font-semibold" />
                    <span className="font-semibold">Complete LLM Visibility Audit Report</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award size={16} className="text-purple-600" />
                    <span>Quick Fixes (Non-Technical)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Code size={16} className="text-purple-600" />
                    <span>Structured Data Analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-purple-600" />
                    <span>Metadata Analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye size={16} className="text-purple-600" />
                    <span>Content Visibility Assessment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-purple-600" />
                    <span>Actionable Recommendations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-600" />
                    <span>Critical AI Visibility Red Flags</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 max-w-md mx-auto">
              <p className="text-sm text-gray-600 mb-4">
                Enter your details below to unlock the complete analysis:
              </p>
              <LeadCaptureForm 
                analysisId={analysisId || 0} 
                websiteUrl={analyzedUrl}
                analysisResults={results}
                onSuccess={handleLeadCaptureSuccess}
                isUnlocked={false}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Results - Only show if report is unlocked */}
      {isReportUnlocked && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-green-800">
              <Unlock size={20} />
              <span className="font-semibold">Report Unlocked!</span>
            </div>
            <p className="text-green-700 mt-1">You now have access to the complete analysis and export options.</p>
            
            {/* Export Buttons - Now inside unlocked content */}
            <div className="flex justify-end gap-2 mt-4">
              <Button
                onClick={handleExportMarkdown}
                variant="outline"
                className="border-brand-indigo text-brand-indigo hover:bg-brand-indigo hover:text-white"
              >
                <FileText className="mr-2" size={16} />
                Export MD
              </Button>
              <Button
                onClick={handleExportJson}
                variant="outline"
                className="border-brand-indigo text-brand-indigo hover:bg-brand-indigo hover:text-white"
              >
                <Download className="mr-2" size={16} />
                Export JSON
              </Button>
              {analysisId && (
                <LeadCaptureForm 
                  analysisId={analysisId} 
                  websiteUrl={analyzedUrl} 
                  analysisResults={results}
                  isUnlocked={isReportUnlocked}
                  onSuccess={handleLeadCaptureSuccess}
                />
              )}
            </div>
          </div>

          {/* HTML Report Section - Now Gated */}
          <InlineHtmlReport 
            results={results}
            websiteUrl={analyzedUrl}
          />
          
          <Accordion type="multiple" defaultValue={["quick-fixes"]} className="w-full space-y-4">
          
          {/* Quick Fixes - Always Expanded */}
          {results.recommendations?.quickFixes && results.recommendations.quickFixes.length > 0 && (
            <AccordionItem value="quick-fixes" className="border border-[#25165C] rounded-lg overflow-hidden">
              <AccordionTrigger className="text-left font-semibold text-lg text-white hover:text-gray-100 bg-[#25165C] px-4 py-3 data-[state=open]:rounded-b-none">
                <div className="flex items-center gap-2">
                  <Award className="text-white" size={20} />
                  Quick Fixes (Non-Technical)
                </div>
              </AccordionTrigger>
              <AccordionContent className="border-t border-[#25165C]">
                <Card className="border-0 shadow-none">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {results.recommendations.quickFixes.map((fix: any, index: number) => (
                        <div key={index} className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <h4 className="font-semibold text-blue-700 mb-2">
                            {index + 1}. {fix.title}
                          </h4>
                          <p className="text-blue-700 mb-3">{fix.description}</p>
                          <div className="bg-white rounded-lg p-3 border border-blue-300">
                            <h5 className="font-medium text-blue-700 mb-2">Step-by-Step:</h5>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
                              {fix.stepByStep.map((step: any, stepIndex: number) => (
                                <li key={stepIndex}>{step}</li>
                              ))}
                            </ol>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>
          )}
          
          {/* Structured Data Section */}
          <AccordionItem value="structured-data" className="border border-[#25165C] rounded-lg overflow-hidden">
            <AccordionTrigger className="text-left font-semibold text-lg text-white hover:text-gray-100 bg-[#25165C] px-4 py-3 data-[state=open]:rounded-b-none">
              <div className="flex items-center gap-2">
                <Code className="text-white" size={20} />
                Structured Data Analysis
              </div>
            </AccordionTrigger>
            <AccordionContent className="border-t border-[#25165C]">
              <Card className="border-0 shadow-none">
                <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Schema Types Found</h4>
                <div className="space-y-2">
                  {results.structuredData.schemaTypes.map((type, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">{type}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-3">JSON-LD Implementation</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">
                      {results.structuredData.jsonLdFound ? 'Valid JSON-LD Found' : 'No JSON-LD Found'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {results.structuredData.jsonLdBlocks} structured data blocks detected
                  </p>
                </div>
              </div>
            </div>
            
            {results.structuredData.recommendations.length > 0 && (
              <div className="mt-6 bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">
                  <Info className="inline mr-2 text-blue-600" size={16} />
                  Recommendations
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  {results.structuredData.recommendations.map((rec, index) => (
                    <li key={index}>• {rec}</li>
                  ))}
                </ul>
              </div>
            )}
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

          {/* Metadata Section */}
          <AccordionItem value="metadata" className="border border-[#25165C] rounded-lg overflow-hidden">
            <AccordionTrigger className="text-left font-semibold text-lg text-white hover:text-gray-100 bg-[#25165C] px-4 py-3 data-[state=open]:rounded-b-none">
              <div className="flex items-center gap-2">
                <Tags className="text-white" size={20} />
                Metadata Analysis
              </div>
            </AccordionTrigger>
            <AccordionContent className="border-t border-[#25165C]">
              <Card className="border-0 shadow-none">
                <CardContent className="pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Meta Tags</h4>
                <div className="space-y-3">
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${
                        results.metadata.titleTag.status === 'optimal' ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></div>
                      <span className="text-sm font-medium">Title Tag</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Length: {results.metadata.titleTag.length} characters ({results.metadata.titleTag.status})
                    </p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${
                        results.metadata.metaDescription.status === 'optimal' ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></div>
                      <span className="text-sm font-medium">Meta Description</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Length: {results.metadata.metaDescription.length} characters ({results.metadata.metaDescription.status})
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Open Graph Tags</h4>
                <div className="space-y-3">
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${
                        results.metadata.openGraph.title ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span className="text-sm font-medium">og:title</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {results.metadata.openGraph.title ? 'Present and optimized' : 'Missing'}
                    </p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${
                        results.metadata.openGraph.image ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span className="text-sm font-medium">og:image</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {results.metadata.openGraph.image ? 
                        (results.metadata.openGraph.imageSize || 'Present') : 
                        'Missing'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

          {/* Content Visibility Section */}
          <AccordionItem value="content-visibility" className="border border-[#25165C] rounded-lg overflow-hidden">
            <AccordionTrigger className="text-left font-semibold text-lg text-white hover:text-gray-100 bg-[#25165C] px-4 py-3 data-[state=open]:rounded-b-none">
              <div className="flex items-center gap-2">
                <Eye className="text-white" size={20} />
                Content Visibility Assessment
              </div>
            </AccordionTrigger>
            <AccordionContent className="border-t border-[#25165C]">
              <Card className="border-0 shadow-none">
                <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Eye className="text-green-600" size={24} />
                </div>
                <h4 className="font-medium text-gray-900 mb-1">AI Crawlability</h4>
                <p className="text-sm text-gray-600">
                  {results.contentVisibility.aiCrawlability >= 90 ? 'Excellent' : 
                   results.contentVisibility.aiCrawlability >= 70 ? 'Good' : 'Needs Improvement'}
                </p>
                <Progress value={results.contentVisibility.aiCrawlability} className="mt-2" />
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Settings className="text-blue-600" size={24} />
                </div>
                <h4 className="font-medium text-gray-900 mb-1">Bot Access</h4>
                <p className="text-sm text-gray-600">
                  {results.contentVisibility.botAccess >= 90 ? 'Excellent' : 
                   results.contentVisibility.botAccess >= 70 ? 'Good' : 'Needs Improvement'}
                </p>
                <Progress value={results.contentVisibility.botAccess} className="mt-2" />
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Award className="text-purple-600" size={24} />
                </div>
                <h4 className="font-medium text-gray-900 mb-1">Content Quality</h4>
                <p className="text-sm text-gray-600">
                  {results.contentVisibility.contentQuality >= 90 ? 'Excellent' : 
                   results.contentVisibility.contentQuality >= 70 ? 'Good' : 'Needs Improvement'}
                </p>
                <Progress value={results.contentVisibility.contentQuality} className="mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Citation Potential Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="text-brand-purple" size={20} />
              Citation Potential Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-brand-purple rounded-full flex items-center justify-center">
                  <Award className="text-white" size={24} />
                </div>
                <div>
                  <h4 className="text-xl font-bold brand-gray">
                    {results.citationPotential.citationReadiness >= 80 ? 'High' : 
                     results.citationPotential.citationReadiness >= 60 ? 'Medium' : 'Low'} Citation Potential
                  </h4>
                  <p className="text-gray-600">Your content is well-positioned for AI citations</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold brand-purple">{results.citationPotential.relevanceScore}%</div>
                  <div className="text-sm text-gray-600">Relevance Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold brand-indigo">{results.citationPotential.authorityScore}%</div>
                  <div className="text-sm text-gray-600">Authority Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold brand-emerald">{results.citationPotential.citationReadiness}%</div>
                  <div className="text-sm text-gray-600">Citation Readiness</div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-2">Key Strengths</h5>
                <ul className="text-sm text-gray-700 space-y-1">
                  {results.citationPotential.keyStrengths.map((strength, index) => (
                    <li key={index}>• {strength}</li>
                  ))}
                </ul>
              </div>
            </div>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

          {/* Actionable Recommendations */}
          <AccordionItem value="recommendations" className="border border-[#25165C] rounded-lg overflow-hidden">
            <AccordionTrigger className="text-left font-semibold text-lg text-white hover:text-gray-100 bg-[#25165C] px-4 py-3 data-[state=open]:rounded-b-none">
              <div className="flex items-center gap-2">
                <AlertCircle className="text-white" size={20} />
                Actionable Recommendations
              </div>
            </AccordionTrigger>
            <AccordionContent className="border-t border-[#25165C]">
              <Card className="border-0 shadow-none">
                <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Quick Fixes */}
              {results.recommendations.quickFixes && results.recommendations.quickFixes.length > 0 && (
                <div>
                  <h4 className="font-medium text-blue-600 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Quick Fixes (Non-Technical)
                  </h4>
                  <div className="space-y-3">
                    {results.recommendations.quickFixes.map((fix, index) => (
                      <div key={index} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                        <h5 className="font-medium text-blue-900 mb-2">Quick Fix #{index + 1}: {fix.title}</h5>
                        <p className="text-sm text-blue-700 mb-3">{fix.description}</p>
                        {fix.stepByStep && fix.stepByStep.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-blue-800 mb-1">Step-by-step:</p>
                            <ol className="text-sm text-blue-700 space-y-1">
                              {fix.stepByStep.map((step, stepIndex) => (
                                <li key={stepIndex} className="flex items-start gap-2">
                                  <span className="font-medium text-blue-800">{stepIndex + 1}.</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* High Priority */}
              {results.recommendations.high.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-600 mb-3 flex items-center gap-2">
                    <AlertCircle size={16} />
                    High Priority
                  </h4>
                  <div className="space-y-3">
                    {results.recommendations.high.map((rec, index) => (
                      <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                        <h5 className="font-medium text-red-900 mb-1">{rec.title}</h5>
                        <p className="text-sm text-red-700">{rec.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Medium Priority */}
              {results.recommendations.medium.length > 0 && (
                <div>
                  <h4 className="font-medium text-yellow-600 mb-3 flex items-center gap-2">
                    <AlertTriangle size={16} />
                    Medium Priority
                  </h4>
                  <div className="space-y-3">
                    {results.recommendations.medium.map((rec, index) => (
                      <div key={index} className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                        <h5 className="font-medium text-yellow-900 mb-1">{rec.title}</h5>
                        <p className="text-sm text-yellow-700">{rec.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Low Priority */}
              {results.recommendations.low.length > 0 && (
                <div>
                  <h4 className="font-medium text-green-600 mb-3 flex items-center gap-2">
                    <Info size={16} />
                    Low Priority
                  </h4>
                  <div className="space-y-3">
                    {results.recommendations.low.map((rec, index) => (
                      <div key={index} className="border border-green-200 rounded-lg p-4 bg-green-50">
                        <h5 className="font-medium text-green-900 mb-1">{rec.title}</h5>
                        <p className="text-sm text-green-700">{rec.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

          {/* Red Flags Section - Bottom of report with red styling */}
          {results.redFlags && results.redFlags.length > 0 && (
            <AccordionItem value="red-flags" className="border border-red-500 rounded-lg overflow-hidden">
              <AccordionTrigger className="text-left font-semibold text-lg text-white hover:text-gray-100 bg-red-600 px-4 py-3 data-[state=open]:rounded-b-none">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-white" size={20} />
                  🚨 CRITICAL AI VISIBILITY RED FLAGS
                </div>
              </AccordionTrigger>
              <AccordionContent className="border-t border-red-500">
                <Card className="border-0 shadow-none">
                  <CardContent className="pt-6 bg-red-50">
                    <div className="space-y-4">
                      {results.redFlags.map((flag, index) => (
                        <div key={index} className="bg-white rounded-lg p-4 border border-red-200">
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-2 ${
                              flag.severity === 'critical' ? 'bg-red-600' : 
                              flag.severity === 'high' ? 'bg-orange-500' : 
                              'bg-yellow-500'
                            }`}></div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-red-900 mb-1">❌ {flag.title}</h4>
                              <p className="text-sm text-red-700 mb-2">{flag.description}</p>
                              <div className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                                <strong>Impact:</strong> {flag.impact}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-3 bg-red-100 rounded-lg">
                      <p className="text-sm text-red-800">
                        <strong>⚠️ Priority Action Required:</strong> These red flags are preventing AI systems like ChatGPT, Gemini, and Perplexity from discovering and citing your website content. Address these issues immediately to improve your AI visibility.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>
          )}
          </Accordion>
        </div>
      )}

      {/* FAQ Section - Always show */}
      {!hideExportButtons && (
        <FAQ 
          analysisResults={results} 
          analysisId={analysisId || 0} 
          websiteUrl={analyzedUrl}
        />
      )}

      {/* Send Report Form - Only show if report is unlocked */}
      {isReportUnlocked && !hideExportButtons && (
        <LeadCaptureForm 
          analysisId={analysisId || 0} 
          websiteUrl={analyzedUrl}
          analysisResults={results}
          isUnlocked={true}
        />
      )}

    </div>
  );
}
