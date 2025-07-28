import { Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PageProgress {
  url: string;
  path: string;
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
  score?: number;
  error?: string;
  loadTime?: number;
}

interface MultiPageProgressProps {
  domain: string;
  pages: PageProgress[];
  currentPageIndex: number;
  totalPages: number;
  completedPages: number;
  averageScore: number;
  isAnalyzing: boolean;
  currentStep?: string;
  currentStepDetails?: string;
  currentPageUrl?: string;
}

export default function MultiPageProgress({
  domain,
  pages,
  currentPageIndex,
  totalPages,
  completedPages,
  averageScore,
  isAnalyzing,
  currentStep,
  currentStepDetails,
  currentPageUrl
}: MultiPageProgressProps) {
  const overallProgress = (completedPages / totalPages) * 100;
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'analyzing':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 border-green-300';
      case 'failed':
        return 'bg-red-100 border-red-300';
      case 'analyzing':
        return 'bg-blue-100 border-blue-300';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Multi-Page Analysis Progress</span>
          <Badge variant="outline" className="text-sm">
            {completedPages}/{totalPages} pages
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Overall Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm text-gray-500">{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2 mb-2" />
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Domain: {domain}</span>
            {completedPages > 0 && (
              <span>Average Score: <span className={getScoreColor(averageScore)}>{averageScore}/100</span></span>
            )}
          </div>
        </div>

        {/* Current Analysis Status */}
        {isAnalyzing && currentPageIndex < totalPages && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              <span className="text-sm font-medium text-blue-800">
                Currently analyzing page {currentPageIndex + 1} of {totalPages}
              </span>
            </div>
            <div className="text-sm text-blue-700 mb-1">
              <span className="font-medium">URL:</span> {currentPageUrl || pages[currentPageIndex]?.url}
            </div>
            {currentStep && (
              <div className="text-sm text-blue-800 font-medium mb-1">
                {currentStep}
              </div>
            )}
            {currentStepDetails && (
              <div className="text-xs text-blue-600">
                {currentStepDetails}
              </div>
            )}
          </div>
        )}

        {/* Page Status List */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Page Analysis Status</h4>
          {pages.map((page, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(page.status)}`}
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(page.status)}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {page.path === '/' ? 'Home Page' : page.path}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {page.url}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {page.status === 'completed' && page.score !== undefined && (
                  <Badge variant="outline" className={`${getScoreColor(page.score)} text-xs`}>
                    {page.score}/100
                  </Badge>
                )}
                {page.status === 'failed' && page.error && (
                  <Badge variant="destructive" className="text-xs">
                    Error
                  </Badge>
                )}
                {page.status === 'analyzing' && (
                  <Badge variant="outline" className="text-blue-600 text-xs">
                    Analyzing...
                  </Badge>
                )}
                {page.loadTime && (
                  <span className="text-xs text-gray-500">
                    {Math.round(page.loadTime / 1000)}s
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Completion Summary */}
        {!isAnalyzing && completedPages === totalPages && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">
                Multi-page analysis completed successfully!
              </span>
            </div>
            <div className="text-sm text-green-700 mt-1">
              {completedPages} pages analyzed with an average score of {averageScore}/100
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}