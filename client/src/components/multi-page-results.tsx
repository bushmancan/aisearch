import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ExternalLink, TrendingUp, TrendingDown, CheckCircle, XCircle, Clock, Globe } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import ResultsSection from "./results-section";
import LeadCaptureForm from "./email-report-form";

interface MultiPageResultsProps {
  results: {
    domain: string;
    paths: string[];
    results: Array<{
      url: string;
      path: string;
      analysis?: any;
      score: number;
      error?: string;
      cached?: boolean;
      loadTime?: number;
    }>;
    domainInsights: {
      totalPages: number;
      completedPages: number;
      averageScore: number;
      bestPage: any;
      worstPage: any;
      commonIssues: string[];
      recommendations: string[];
    };
    status: string;
    analysisType: string;
  };
}

export default function MultiPageResults({ results }: MultiPageResultsProps) {
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  
  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 75) return "default";
    if (score >= 40) return "secondary";
    return "destructive";
  };

  const selectedPage = results.results[selectedPageIndex];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Globe className="w-8 h-8 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Multi-Page Analysis Results</h2>
        </div>
        <p className="text-gray-600">
          Comprehensive analysis of {results.domainInsights.totalPages} pages from {results.domain}
        </p>
      </div>

      {/* Domain Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Domain Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{results.domainInsights.totalPages}</div>
              <div className="text-sm text-gray-500">Total Pages</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{results.domainInsights.completedPages}</div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getScoreColor(results.domainInsights.averageScore)}`}>
                {results.domainInsights.averageScore}/100
              </div>
              <div className="text-sm text-gray-500">Average Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round((results.domainInsights.completedPages / results.domainInsights.totalPages) * 100)}%
              </div>
              <div className="text-sm text-gray-500">Success Rate</div>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Overall Progress</span>
              <span>{results.domainInsights.completedPages}/{results.domainInsights.totalPages}</span>
            </div>
            <Progress 
              value={(results.domainInsights.completedPages / results.domainInsights.totalPages) * 100} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Page Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {results.results.map((page, index) => (
          <Card 
            key={index} 
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedPageIndex === index ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedPageIndex(index)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {page.path}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {page.url}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {page.cached && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      Cached
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(page.url, '_blank');
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {page.error ? (
                    <XCircle className="w-4 h-4 text-red-500" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  <span className="text-sm">
                    {page.error ? 'Failed' : 'Completed'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getScoreBadgeVariant(page.score)}>
                    {page.score}/100
                  </Badge>
                </div>
              </div>
              
              {page.error && (
                <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
                  {page.error}
                </div>
              )}
              
              {page.loadTime && (
                <div className="mt-2 text-xs text-gray-500">
                  Load time: {(page.loadTime / 1000).toFixed(1)}s
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Best and Worst Pages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <TrendingUp className="w-5 h-5" />
              Best Performing Page
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{results.domainInsights.bestPage?.path}</div>
                <div className="text-sm text-gray-500 truncate">{results.domainInsights.bestPage?.url}</div>
              </div>
              <Badge variant="default" className="bg-green-100 text-green-800">
                {results.domainInsights.bestPage?.score}/100
              </Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <TrendingDown className="w-5 h-5" />
              Needs Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{results.domainInsights.worstPage?.path}</div>
                <div className="text-sm text-gray-500 truncate">{results.domainInsights.worstPage?.url}</div>
              </div>
              <Badge variant="destructive">
                {results.domainInsights.worstPage?.score}/100
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Email Report Form */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <LeadCaptureForm 
            analysisId={0} // Multi-page analysis uses 0 as placeholder
            websiteUrl={results.domain}
            analysisResults={results}
          />
        </CardContent>
      </Card>

      {/* Detailed Page Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Page Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedPageIndex.toString()} onValueChange={(value) => setSelectedPageIndex(parseInt(value))}>
            <TabsList className="grid w-full grid-cols-auto overflow-x-auto">
              {results.results.map((page, index) => (
                <TabsTrigger key={index} value={index.toString()} className="text-xs">
                  {page.path}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {results.results.map((page, index) => (
              <TabsContent key={index} value={index.toString()}>
                {page.analysis && !page.error ? (
                  <ResultsSection 
                    results={page.analysis}
                    analyzedUrl={page.url}
                    analysisId={null}
                    hideExportButtons={true}
                  />
                ) : page.error ? (
                  <div className="text-center py-8">
                    <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis Failed</h3>
                    <p className="text-gray-600">{page.error}</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis Pending</h3>
                    <p className="text-gray-600">This page is being analyzed...</p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}