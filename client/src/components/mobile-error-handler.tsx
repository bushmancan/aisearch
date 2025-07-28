import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface MobileErrorHandlerProps {
  error: Error | null;
  onRetry: () => void;
  isLoading: boolean;
}

export default function MobileErrorHandler({ error, onRetry, isLoading }: MobileErrorHandlerProps) {
  const { toast } = useToast();

  useEffect(() => {
    if (error) {
      // Device detection for appropriate error handling
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // For desktop users, only handle specific mobile-related errors, not all network errors
      if (!isMobile) {
        // Desktop users should only see this handler for actual mobile-specific issues
        // Most network errors on desktop should be handled by the main error system
        if (!error.message.includes('Mobile') && !error.message.includes('mobile')) {
          return; // Let main error handler deal with desktop network issues
        }
      }
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      let errorMessage = error.message;
      let actionMessage = 'Please try again';
      
      // Handle specific mobile errors with enhanced guidance
      if (error.message.includes('timeout') || error.message.includes('taking longer than expected')) {
        errorMessage = isMobile ? 
          'Mobile analysis timeout. Complex websites can take 3-5 minutes on mobile devices.' :
          'Analysis timeout - please try again';
        actionMessage = isMobile ? 
          'Keep your screen active and wait longer, or try a simpler website. Mobile analysis needs more time.' : 
          'Try again with a simpler website or check your connection';
      } else if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('Load failed') || error.message.includes('connection')) {
        errorMessage = isMobile ? 'Mobile connection issue detected' : 'Connection issue detected';
        actionMessage = isMobile ? 
          'Switch between WiFi and cellular data. Ensure strong signal strength. Close other apps to free up bandwidth.' : 
          'Check your internet connection';
      } else if (error.message.includes('No content found') && isMobile) {
        errorMessage = 'Cached error displayed - analysis may have actually completed successfully';
        actionMessage = 'This is a known mobile display issue. Please refresh the page and try analyzing again. The backend analysis often completes successfully despite this error message.';
      } else if (error.message.includes('failed') && error.message.includes('Analysis') && isMobile) {
        errorMessage = 'Mobile analysis display error detected';
        actionMessage = 'Try refreshing the page and submit the analysis again. Mobile devices sometimes show cached error messages even when the analysis succeeds.';
      } else if (error.message.includes('memory') || error.message.includes('resource')) {
        errorMessage = 'Device resources are limited';
        actionMessage = isMobile ? 
          'Close other apps and try again' : 
          'Try refreshing the page';
      } else if (error.message.includes('AbortError') || error.message.includes('aborted')) {
        errorMessage = 'Request was cancelled';
        actionMessage = isMobile ? 
          'Mobile analysis was interrupted. Please try again.' : 
          'Please try again';
      }
      
      // Show mobile-optimized error toast
      toast({
        title: isMobile ? 'Mobile Analysis Error' : 'Analysis Error',
        description: `${errorMessage}. ${actionMessage}`,
        variant: 'destructive',
        duration: 8000, // Longer duration for mobile users to read
      });
      
      // Log mobile-specific information for debugging
      if (isMobile) {
        console.error('Mobile Error Details:', {
          userAgent: navigator.userAgent,
          isIOS,
          connectionType: (navigator as any).connection?.effectiveType,
          error: error.message,
          stack: error.stack
        });
      }
    }
  }, [error, toast]);

  // Don't render anything - this is just for error handling
  return null;
}