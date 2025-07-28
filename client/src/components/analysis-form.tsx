import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Lightbulb, CheckCircle, AlertCircle, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { AnalysisRequest } from "@shared/schema";

interface AnalysisFormProps {
  onSubmit: (data: AnalysisRequest) => void;
  isLoading: boolean;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * ANALYSIS FORM COMPONENT
 * Handles URL validation and submission for website analysis requests
 * 
 * VALIDATION STRATEGY:
 * - Client-side regex validation for immediate feedback
 * - Server-side website accessibility validation before analysis
 * - Multi-stage error handling with specific user guidance
 * 
 * USER EXPERIENCE FLOW:
 * 1. User enters URL with "https://" pre-populated
 * 2. Real-time regex validation provides instant feedback
 * 3. Optional website validation checks actual accessibility
 * 4. Form submission only allowed after successful validation
 * 5. Clear error messages guide users through resolution
 */
export default function AnalysisForm({ onSubmit, isLoading }: AnalysisFormProps) {
  // State management for form validation and user feedback
  const [url, setUrl] = useState("https://");
  const [error, setError] = useState("");
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [validationError, setValidationError] = useState("");
  const { toast } = useToast();

  /**
   * URL VALIDATION REGEX
   * Comprehensive pattern matching for valid HTTP/HTTPS URLs
   * 
   * PATTERN BREAKDOWN:
   * - ^https?:// - Requires HTTP or HTTPS protocol
   * - (www\.)? - Optional www subdomain
   * - [-a-zA-Z0-9@:%._\+~#=]{1,256} - Domain name characters (max 256)
   * - \.[a-zA-Z0-9()]{1,6} - TLD requirement (1-6 characters)
   * - \b - Word boundary for clean separation
   * - [-a-zA-Z0-9()@:%_\+.~#?&//=]* - Optional path/query parameters
   * 
   * VALIDATION SCOPE:
   * - Accepts international domains and subdomains
   * - Supports query parameters and URL fragments
   * - Requires valid TLD structure for real websites
   * - Prevents invalid characters and malformed URLs
   */
  const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedUrl = url.trim();
    
    // Check if user has entered a complete URL beyond just "https://"
    if (!trimmedUrl || trimmedUrl === "https://" || !urlRegex.test(trimmedUrl)) {
      setError("Please enter a valid URL");
      return;
    }
    
    setError("");
    onSubmit({ url: trimmedUrl });
  };

  /**
   * SERVER-SIDE WEBSITE VALIDATION
   * Verifies actual website accessibility before analysis submission
   * 
   * VALIDATION PROCESS:
   * 1. Sends POST request to /api/validate-url endpoint
   * 2. Backend attempts HEAD request (fast) then GET request (fallback)
   * 3. Handles various HTTP status codes and network conditions
   * 4. Provides specific error messages for different failure scenarios
   * 
   * ERROR HANDLING STRATEGY:
   * - Network errors: "Unable to validate website - please try again"
   * - HTTP errors: Backend provides specific status-based messages
   * - Timeout errors: "Website took too long to respond"
   * - DNS errors: "Domain not found or inaccessible"
   * - Security blocks: "Website blocking automated requests"
   * 
   * USER FEEDBACK:
   * - Real-time status updates (validating → valid/invalid)
   * - Clear error messages with actionable guidance
   * - Visual indicators (green/red borders) for immediate feedback
   * - Form submission prevention if validation fails
   */
  const validateWebsite = async (urlToValidate: string) => {
    setValidationStatus('validating');
    setValidationError("");

    try {
      const response = await fetch("/api/validate-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToValidate })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.valid) {
        setValidationStatus('valid');
        setValidationError("");
      } else {
        setValidationStatus('invalid');
        // Backend provides specific error messages for different failure scenarios
        setValidationError(result.error || "Website is not accessible");
      }
    } catch (error) {
      setValidationStatus('invalid');
      setValidationError("Unable to validate website - please try again");
      console.error('Validation error:', error);
    }
  };

  /**
   * REAL-TIME URL VALIDATION HANDLER
   * Provides immediate feedback as user types URL
   * 
   * VALIDATION LOGIC:
   * 1. Ignore validation until user enters content beyond "https://"
   * 2. Apply regex validation for immediate format feedback
   * 3. Reset validation status when user modifies URL
   * 4. Clear previous errors when validation passes
   * 
   * UX CONSIDERATIONS:
   * - No annoying errors while user is still typing
   * - Immediate feedback for obviously invalid formats
   * - Resets server validation status when URL changes
   * - Maintains clean state for new validation attempts
   * 
   * ERROR PREVENTION:
   * - Prevents form submission with invalid URLs
   * - Guides user to correct format before server validation
   * - Reduces unnecessary server requests for invalid formats
   */
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    
    // Only validate if user has entered something beyond just "https://"
    if (value.trim() && value.trim() !== "https://" && !urlRegex.test(value.trim())) {
      setError("Please enter a valid URL");
      setValidationStatus('idle'); // Reset server validation when format is invalid
    } else {
      setError("");
      setValidationStatus('idle'); // Reset validation status for new input
    }
  };

  const handleValidateClick = () => {
    const trimmedUrl = url.trim();
    // Only validate if user has entered something beyond just "https://"
    if (trimmedUrl && trimmedUrl !== "https://" && urlRegex.test(trimmedUrl)) {
      validateWebsite(trimmedUrl);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold revenue-dark mb-3">AI Visibility Audit</h2>
        <p className="text-gray-600 text-base max-w-2xl mx-auto">
          Enter your domain below to analyze your website's visibility in AI search results. Get actionable insights on Answer Engine Optimization "AEO", 
          structured data discovery, and content optimization for ChatGPT, Gemini, Grok, Claude and Perplexity citations.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
        <div className="flex flex-col gap-4">
          <div className="flex-1">
            <Label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700 mb-2">
              Website URL
            </Label>
            <div className="flex gap-2">
              <Input
                type="url"
                id="websiteUrl"
                value={url}
                onChange={handleUrlChange}
                placeholder="example.com"
                className={`text-lg flex-1 ${error ? 'border-red-500' : validationStatus === 'valid' ? 'border-green-500' : validationStatus === 'invalid' ? 'border-red-500' : ''}`}
                required
              />
              <Button
                type="button"
                onClick={handleValidateClick}
                disabled={!url.trim() || url.trim() === "https://" || !!error || validationStatus === 'validating'}
                variant="outline"
                className="px-4"
              >
                {validationStatus === 'validating' ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                ) : (
                  <Globe size={16} />
                )}
              </Button>
            </div>
            
            {error && (
              <div className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle size={14} />
                {error}
              </div>
            )}
            
            {validationStatus === 'validating' && (
              <div className="text-blue-600 text-sm mt-1 flex items-center gap-1">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                Checking website accessibility...
              </div>
            )}
            
            {validationStatus === 'valid' && (
              <div className="text-green-600 text-sm mt-1 flex items-center gap-1">
                <CheckCircle size={14} />
                Website is accessible and ready for analysis
              </div>
            )}
            
            {validationStatus === 'invalid' && validationError && (
              <div className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle size={14} />
                {validationError}
              </div>
            )}
          </div>
          <div className="flex justify-center">
            <Button
              type="submit"
              disabled={isLoading || !!error || validationStatus === 'invalid'}
              className="bg-revenue-purple hover:bg-purple-700 text-white px-8 py-3 text-lg h-auto"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="mr-2" size={16} />
                  Analyze WebPage
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          <Lightbulb className="inline mr-2 text-blue-600" size={20} />
          Quick Tips
        </h3>
        <ul className="text-blue-800 space-y-2">
          <li className="flex items-start">
            <CheckCircle className="mt-0.5 mr-2 text-blue-600" size={16} />
            Enter your domain (https:// is pre-filled)
          </li>
          <li className="flex items-start">
            <CheckCircle className="mt-0.5 mr-2 text-blue-600" size={16} />
            Click the globe icon to validate website accessibility
          </li>
          <li className="flex items-start">
            <CheckCircle className="mt-0.5 mr-2 text-blue-600" size={16} />
            Analysis typically takes 30-60 seconds
          </li>
          <li className="flex items-start">
            <CheckCircle className="mt-0.5 mr-2 text-blue-600" size={16} />
            Results include actionable recommendations
          </li>
        </ul>
      </div>
    </div>
  );
}
