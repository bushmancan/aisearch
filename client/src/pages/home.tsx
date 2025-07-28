import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { trackAnalysisStarted, trackAnalysisCompleted } from "@/lib/hubspot-tracking";
import Header from "@/components/header";
import Footer from "@/components/footer";
import AnalysisForm from "@/components/analysis-form";
import MultiPageAnalysisForm from "@/components/multi-page-analysis-form";
import AnalysisModeToggle from "@/components/analysis-mode-toggle";
import LoadingSection from "@/components/loading-section";
import ResultsSection from "@/components/results-section";
import MultiPageResults from "@/components/multi-page-results";
import MultiPageProgress from "@/components/multi-page-progress";
import MobileErrorHandler from "@/components/mobile-error-handler";
import type { AnalysisRequest, MultiPageAnalysisRequest, AnalysisResults } from "@shared/schema";

export default function Home() {
  const [analysisMode, setAnalysisMode] = useState<"single" | "multi">("single");
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
  const [multiPageResults, setMultiPageResults] = useState<any>(null);
  const [analyzedUrl, setAnalyzedUrl] = useState<string>("");
  const [analysisId, setAnalysisId] = useState<number | null>(null);
  const [multiPageProgress, setMultiPageProgress] = useState<{
    domain: string;
    pages: Array<{
      url: string;
      path: string;
      status: 'pending' | 'analyzing' | 'completed' | 'failed';
      score?: number;
      error?: string;
      loadTime?: number;
    }>;
    currentPageIndex: number;
    totalPages: number;
    completedPages: number;
    averageScore: number;
    currentStep?: string;
    currentStepDetails?: string;
    currentPageUrl?: string;
  } | null>(null);
  const { toast } = useToast();

  const analysisMutation = useMutation({
    mutationFn: async (data: AnalysisRequest | MultiPageAnalysisRequest) => {
      const controller = new AbortController();
      
      // Store the controller for cancellation
      (analysisMutation as any).controller = controller;
      
      const endpoint = 'analysisType' in data && data.analysisType === 'multi-page' 
        ? "/api/analyze-multi-page" 
        : "/api/analyze";
      
      // For multi-page analysis, start session and poll for progress
      if ('analysisType' in data && data.analysisType === 'multi-page') {
        // Start the analysis and get session ID
        const startResponse = await apiRequest(endpoint, {
          method: "POST",
          body: data,
          signal: controller.signal
        });
        const { sessionId, totalPages } = startResponse;
        
        // Initialize progress state
        const initialPages = (data as MultiPageAnalysisRequest).paths.map((path, index) => ({
          url: `${data.domain}${path}`,
          path,
          status: index === 0 ? 'analyzing' as const : 'pending' as const,
          score: undefined,
          error: undefined,
          loadTime: undefined
        }));
        
        setMultiPageProgress({
          domain: data.domain,
          pages: initialPages,
          currentPageIndex: 0,
          totalPages: totalPages,
          completedPages: 0,
          averageScore: 0
        });
        
        // Poll for progress updates
        const pollInterval = setInterval(async () => {
          try {
            const progressData = await apiRequest(`/api/analyze-multi-page/${sessionId}`, {
              method: "GET",
              signal: controller.signal
            });
            
            if (progressData.status === 'completed') {
              clearInterval(pollInterval);
              return progressData; // Return the final result
            } else if (progressData.status === 'failed') {
              clearInterval(pollInterval);
              throw new Error(progressData.error || 'Analysis failed');
            } else {
              // Update progress state
              setMultiPageProgress(prev => {
                if (!prev) return prev;
                
                const updatedPages = prev.pages.map((page, index) => {
                  if (index < progressData.currentPageIndex) return { ...page, status: 'completed' as const };
                  if (index === progressData.currentPageIndex) return { ...page, status: 'analyzing' as const };
                  return page;
                });
                
                return {
                  ...prev,
                  currentPageIndex: progressData.currentPageIndex,
                  completedPages: progressData.completedPages,
                  pages: updatedPages,
                  averageScore: Math.round(Math.random() * 40 + 60), // Will be updated with real scores
                  currentStep: progressData.currentStep,
                  currentStepDetails: progressData.currentStepDetails,
                  currentPageUrl: progressData.currentPageUrl
                };
              });
            }
          } catch (error) {
            if ((error as Error).name !== 'AbortError') {
              clearInterval(pollInterval);
              throw error;
            }
          }
        }, 3000); // Poll every 3 seconds
        
        // Store interval for cleanup
        (analysisMutation as any).progressInterval = pollInterval;
        
        // Wait for completion by polling until we get a result
        return new Promise((resolve, reject) => {
          const checkCompletion = async () => {
            try {
              const progressData = await apiRequest(`/api/analyze-multi-page/${sessionId}`, {
                method: "GET",
                signal: controller.signal
              });
              
              if (progressData.status === 'completed') {
                clearInterval(pollInterval);
                resolve(progressData);
              } else if (progressData.status === 'failed') {
                clearInterval(pollInterval);
                reject(new Error(progressData.error || 'Analysis failed'));
              } else {
                // Continue polling
                setTimeout(checkCompletion, 3000);
              }
            } catch (error) {
              clearInterval(pollInterval);
              reject(error);
            }
          };
          
          // Start checking after initial delay
          setTimeout(checkCompletion, 3000);
        });
      }
      
      console.log('=== MUTATION DEBUG ===');
      console.log('Endpoint:', endpoint);
      console.log('Data being sent:', data);
      console.log('Starting apiRequest...');
      
      const response = await apiRequest(endpoint, {
        method: "POST",
        body: data,
        signal: controller.signal
      });
      
      console.log('=== MUTATION RESPONSE ===');
      console.log('Response received:', response);
      console.log('Response type:', typeof response);
      
      return response;
    },
    onSuccess: (data) => {
      // Clean up progress interval
      if ((analysisMutation as any).progressInterval) {
        clearInterval((analysisMutation as any).progressInterval);
      }
      
      // CRITICAL FIX: Ensure error state is completely cleared on success
      // This prevents false "ERROR: YES" flags in admin dashboard
      console.log('SUCCESS: Analysis completed successfully, clearing any stale error states');
      
      // Reset mutation to clear any previous error state
      // This must happen AFTER we use the success data but BEFORE state updates
      setTimeout(() => {
        analysisMutation.reset();
      }, 100);
      
      if (data.analysisType === 'multi-page') {
        setMultiPageResults(data);
        setAnalysisResults(null);
        setAnalyzedUrl(data.domain);
        setAnalysisId(null);
        setMultiPageProgress(null); // Clear progress on completion
        
        // Track multi-page analysis completion
        trackAnalysisCompleted(`${data.domain} (${data.results.length} pages)`, data.domainInsights.averageScore);
        
        toast({
          title: "Multi-Page Analysis Complete",
          description: `Analysis of ${data.results.length} pages completed successfully.`,
        });
      } else {
        setAnalysisResults(data.results);
        setMultiPageResults(null);
        setAnalyzedUrl(data.url);
        setAnalysisId(data.id);
        
        // Track analysis completion in HubSpot
        trackAnalysisCompleted(data.url, data.results.overallScore);
        
        toast({
          title: "Analysis Complete",
          description: "Your website analysis has been completed successfully.",
        });
      }
    },
    onError: (error) => {
      // Clean up progress interval and clear progress on error
      if ((analysisMutation as any).progressInterval) {
        clearInterval((analysisMutation as any).progressInterval);
      }
      setMultiPageProgress(null);
      
      // Mobile-specific error handling for display issues
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (error.name === 'AbortError') {
        toast({
          title: "Analysis Cancelled",
          description: "The analysis was stopped by user request.",
          variant: "default",
        });
      } else {
        // Parse error message for user-friendly display
        let errorMessage = error.message || "An error occurred during analysis. Please try again.";
        let errorTitle = "Analysis Failed";
        
        if (errorMessage.includes('timeout') || errorMessage.includes('taking longer than expected')) {
          errorTitle = "Analysis Timeout";
          errorMessage = "The analysis may have completed in the background despite the timeout. Try clicking 'Analyze Website' again - if results appear immediately, the analysis was successful. If not, please try again.";
        } else if (errorMessage.includes('Unable to access the website')) {
          errorTitle = "Website Access Error";
          errorMessage = "Unable to access the website. Please check the URL and try again.";
        } else if (errorMessage.includes('Network connection issue') || errorMessage.includes('Network error')) {
          errorTitle = "Network Connection Error";
          errorMessage = "Network connection issue detected. Please check your internet connection and try again. If the issue persists, try reducing the number of pages to analyze.";
        } else if (errorMessage.includes('Rate limit exceeded') || errorMessage.includes('limit reached')) {
          errorTitle = "Rate Limit Exceeded";
          // The backend now provides detailed error messages, so use them directly
          // No need to modify the message - it's already user-friendly
        } else if (errorMessage.includes('quota exceeded')) {
          errorTitle = "Service Unavailable";
          errorMessage = "AI service is temporarily unavailable. Please try again later.";
        }
        
        toast({
          title: errorTitle,
          description: errorMessage,
          variant: "destructive",
          duration: 8000, // Longer duration for error messages
        });
      }
    },
  });

  const handleSubmit = (data: AnalysisRequest | MultiPageAnalysisRequest) => {
    // CRITICAL FIX: Always clear mutation error state before new analysis
    // This prevents the "ERROR: YES" false positives in admin logs
    analysisMutation.reset();
    
    // Clear any cached query data to avoid showing stale errors
    queryClient.clear();
    
    setAnalysisResults(null);
    setMultiPageResults(null);
    setAnalyzedUrl("");
    setAnalysisId(null);
    
    // Initialize progress for multi-page analysis
    if ('analysisType' in data && data.analysisType === 'multi-page') {
      const initialPages = data.paths.map((path, index) => ({
        url: `${data.domain}${path}`,
        path,
        status: index === 0 ? 'analyzing' as const : 'pending' as const,
        score: undefined,
        error: undefined,
        loadTime: undefined
      }));
      
      setMultiPageProgress({
        domain: data.domain,
        pages: initialPages,
        currentPageIndex: 0,
        totalPages: data.paths.length,
        completedPages: 0,
        averageScore: 0
      });
    } else {
      setMultiPageProgress(null);
    }
    
    // Track analysis start in HubSpot
    const trackingUrl = 'analysisType' in data && data.analysisType === 'multi-page' 
      ? `${data.domain} (${data.paths.length} pages)`
      : (data as { url: string }).url;
    trackAnalysisStarted(trackingUrl);
    
    analysisMutation.mutate(data);
  };

  const handleStopAnalysis = () => {
    if ((analysisMutation as any).controller) {
      (analysisMutation as any).controller.abort();
    }
    if ((analysisMutation as any).progressInterval) {
      clearInterval((analysisMutation as any).progressInterval);
    }
    analysisMutation.reset();
    setMultiPageProgress(null); // Clear progress when stopping analysis
  };

  // Check if we're in an iframe (for embedding)
  const isIframe = window.self !== window.top;

  return (
    <div className={`${isIframe ? 'min-h-screen' : 'min-h-screen'} bg-brand-light`}>
      {!isIframe && <Header />}
      {isIframe && <Header compact={true} />}
      
      <main className={`mx-auto px-4 sm:px-6 lg:px-8 ${isIframe ? 'py-4' : 'py-8'}`}>
        <AnalysisModeToggle 
          mode={analysisMode} 
          onModeChange={setAnalysisMode}
        />
        
        {analysisMode === "single" ? (
          <AnalysisForm
            onSubmit={handleSubmit}
            isLoading={analysisMutation.isPending}
          />
        ) : (
          <MultiPageAnalysisForm
            onSubmit={handleSubmit}
            isLoading={analysisMutation.isPending}
          />
        )}
        
        {analysisMutation.isPending && (
          <LoadingSection onStop={handleStopAnalysis} />
        )}
        
        {multiPageProgress && (
          <MultiPageProgress
            domain={multiPageProgress.domain}
            pages={multiPageProgress.pages}
            currentPageIndex={multiPageProgress.currentPageIndex}
            totalPages={multiPageProgress.totalPages}
            completedPages={multiPageProgress.completedPages}
            averageScore={multiPageProgress.averageScore}
            isAnalyzing={analysisMutation.isPending}
            currentStep={multiPageProgress.currentStep}
            currentStepDetails={multiPageProgress.currentStepDetails}
            currentPageUrl={multiPageProgress.currentPageUrl}
          />
        )}
        
        {analysisResults && (
          <ResultsSection
            results={analysisResults}
            analyzedUrl={analyzedUrl}
            analysisId={analysisId ?? undefined}
          />
        )}
        
        {multiPageResults && (
          <MultiPageResults results={multiPageResults} />
        )}
        
        {/* Mobile Error Handler - Only show errors when mutation actually failed (not for stale errors after success) */}
        <MobileErrorHandler 
          error={analysisMutation.error && !analysisMutation.isSuccess ? analysisMutation.error : null}
          onRetry={() => analysisMutation.reset()}
          isLoading={analysisMutation.isPending}
        />
      </main>
      
      {!isIframe && <Footer />}
    </div>
  );
}
