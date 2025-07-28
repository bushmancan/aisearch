import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    
    try {
      const text = await res.text();
      if (text) {
        // Try to parse JSON error response
        try {
          const errorData = JSON.parse(text);
          // For rate limit errors, combine message and advice for better user experience
          if (errorData.advice) {
            errorMessage = `${errorData.message} ${errorData.advice}`;
          } else {
            errorMessage = errorData.message || errorData.error || text;
          }
        } catch {
          // If not JSON, use the raw text
          errorMessage = text;
        }
      }
    } catch {
      // If we can't read the response, use status text
      errorMessage = res.statusText || 'Unknown error';
    }
    
    throw new Error(errorMessage);
  }
}

export async function apiRequest<T = any>(
  url: string,
  options?: {
    method?: string;
    body?: unknown;
    signal?: AbortSignal;
  }
): Promise<T> {
  const method = options?.method || 'GET';
  const data = options?.body;
  
  // Set extended timeouts for mobile devices to handle connection issues
  const isAnalysisRequest = url.includes('/api/analyze');
  const isMultiPageAnalysis = url.includes('/api/analyze-multi-page');
  const isValidationRequest = url.includes('/api/validate-url');
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isTablet = /iPad/.test(navigator.userAgent);
  
  // Smart device and connection-aware timeouts
  // Tablets on WiFi should behave like desktop, mobile phones need extended timeouts
  const isMobilePhone = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && !isTablet;
  
  const timeout = isMultiPageAnalysis ? 
    (isMobilePhone ? 1200000 : 720000) : // 20min mobile phone, 12min tablet/desktop multi-page
    isAnalysisRequest ? 
      (isMobilePhone ? 900000 : 360000) : // 15min mobile phone, 6min tablet/desktop single-page
      isValidationRequest ? 
        (isMobilePhone ? 120000 : 60000) : // 2 minutes mobile phone validation, 1 minute tablet/desktop
        (isMobilePhone ? 60000 : 30000); // 1 minute mobile phone other requests, 30 seconds tablet/desktop
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);
  
  // If a signal is provided, also listen for it
  if (options?.signal) {
    options.signal.addEventListener('abort', () => {
      controller.abort();
    });
  }

  try {
    // Enhanced mobile request configuration
    const headers: Record<string, string> = {
      ...(data ? { "Content-Type": "application/json" } : {}),
    };
    
    // Add device-specific headers for better connectivity
    if (isMobile) {
      headers['X-Mobile-Client'] = 'true';
      headers['X-Device-Type'] = isTablet ? 'tablet' : isMobilePhone ? 'mobile-phone' : 'mobile';
      headers['X-Mobile-OS'] = isIOS ? 'iOS' : 'Android';
      // Only add no-cache for mobile phones, tablets can use normal caching
      if (isMobilePhone) {
        headers['Cache-Control'] = 'no-cache';
      }
    }
    
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      signal: controller.signal,
      // Add mobile-specific fetch options
      ...(isMobile ? {
        keepalive: true, // Keep connection alive for mobile
        mode: 'cors' as RequestMode,
      } : {}),
    });

    clearTimeout(timeoutId);
    await throwIfResNotOk(res);
    return await res.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Detailed production logging for troubleshooting
    if (error instanceof Error) {
      const logContext = {
        timestamp: new Date().toISOString(),
        errorName: error.name,
        errorMessage: error.message,
        requestUrl: url,
        requestMethod: method,
        requestTimeout: timeout,
        userAgent: navigator.userAgent,
        isMobile: isMobile,
        isIframe: window !== window.top,
        origin: window.location.origin,
        referer: document.referrer
      };
      
      console.error('🚨 PRODUCTION ERROR CONTEXT:', JSON.stringify(logContext, null, 2));
      console.error('🚨 Full Error Stack:', error.stack);
      
      // User-friendly error messages with actionable guidance
      if (error.name === 'AbortError') {
        // Smart device-aware timeout messages
        const deviceType = isTablet ? 'tablet' : isMobilePhone ? 'mobile phone' : 'device';
        
        if (isMultiPageAnalysis) {
          throw new Error(`Multi-page analysis timed out on your ${deviceType}. This sometimes happens with complex websites${isMobilePhone ? ' or slower mobile connections' : ''}. The analysis may have completed in the background - try refreshing or checking your results.`);
        } else if (isValidationRequest) {
          throw new Error('Website validation timed out, but the site may still work for analysis. You can proceed with the analysis.');
        } else {
          throw new Error(`Analysis timed out on your ${deviceType}. The analysis may have completed successfully in the background. Try clicking "Analyze Website" again to see if results appear immediately, or contact support if this continues.`);
        }
      }
      
      if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        // Log network error details for debugging
        console.error('🚨 NETWORK ERROR DETAILS:', {
          errorType: 'NetworkError/Failed to fetch',
          url: url,
          method: method,
          timeout: timeout,
          isAnalysisRequest: isAnalysisRequest,
          deviceType: isTablet ? 'tablet' : isMobilePhone ? 'mobile-phone' : 'desktop',
          timestamp: new Date().toISOString()
        });
        
        const deviceType = isTablet ? 'tablet' : isMobilePhone ? 'mobile phone' : 'device';
        
        if (isMobilePhone) {
          throw new Error(`${deviceType} connection issue detected. If this was an analysis request, the analysis may have completed successfully in the background. Try the analysis again - if results appear immediately, it worked. Otherwise, try switching between WiFi and cellular data.`);
        } else if (isTablet) {
          throw new Error(`${deviceType} connection issue detected. If this was an analysis request, the analysis may have completed successfully in the background. Try the analysis again - if results appear immediately, it worked. Check your WiFi connection if this continues.`);
        } else {
          throw new Error('Unable to connect to our analysis service. Please check your internet connection and try again.');
        }
      }
      
      if (error.message.includes('Load failed')) {
        // Log additional context for "Load failed" errors
        console.error('🚨 LOAD FAILED ERROR DETAILS:', {
          fullError: error,
          url: url,
          method: method,
          timeout: timeout,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        });
        
        if (isMobile) {
          throw new Error('Mobile connection interrupted. Please ensure you have a stable connection and try again. Consider using WiFi for better connectivity.');
        } else {
          // For desktop, provide more specific guidance
          throw new Error('Network connection interrupted during analysis. This can happen with slow connections or network instability. Please try again.');
        }
      }
      
      // Check for rate limiting or server errors
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        throw new Error('Too many requests. Please wait a moment and try again.');
      }
      
      if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
        throw new Error('Our analysis service is temporarily unavailable. Please try again in a few minutes.');
      }
      
      if (error.message.includes('503') || error.message.includes('Service Unavailable')) {
        throw new Error('Analysis service is temporarily busy. Please try again in a moment.');
      }
    }
    
    // Log unknown errors for investigation
    console.error('🚨 UNKNOWN ERROR TYPE:', error);
    console.error('🚨 UNKNOWN ERROR CONTEXT:', {
      url: url,
      method: method,
      timeout: timeout,
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // For unknown errors during analysis, provide helpful fallback message
    if (isAnalysisRequest && error instanceof Error) {
      throw new Error(`Analysis request failed: ${error.message}. Please try again, or contact support if the issue persists.`);
    }
    
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 0, // Force fresh data on mobile to avoid cache issues
      retry: (failureCount, error) => {
        // Enhanced mobile retry logic
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile && failureCount < 2) {
          return true; // Retry once on mobile for connection issues
        }
        return false;
      },
    },
    mutations: {
      retry: (failureCount, error) => {
        // Mobile-specific retry for mutations
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile && failureCount < 1 && 
            (error.message.includes('fetch') || error.message.includes('network'))) {
          return true; // One retry for mobile network issues
        }
        return false;
      },
    },
  },
});