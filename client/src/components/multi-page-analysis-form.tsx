import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, Plus, Trash2, Globe, FileText, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { MultiPageAnalysisRequest } from "@shared/schema";

interface MultiPageAnalysisFormProps {
  onSubmit: (data: MultiPageAnalysisRequest) => void;
  isLoading: boolean;
}

interface ValidationResult {
  url: string;
  path: string;
  status: 'pending' | 'valid' | 'invalid';
  error?: string;
}

export default function MultiPageAnalysisForm({ onSubmit, isLoading }: MultiPageAnalysisFormProps) {
  const [domain, setDomain] = useState("");
  const [paths, setPaths] = useState(["/", "/about", "/services", "/contact"]);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  const domainRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}$/;

  const validateSingleUrl = async (url: string): Promise<{ valid: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/validate-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      const result = await response.json();
      return { valid: result.valid, error: result.error };
    } catch (error) {
      return { valid: false, error: 'Network error during validation' };
    }
  };

  const validateAllUrls = async () => {
    const trimmedDomain = domain.trim();
    const filteredPaths = paths.filter(path => path.trim() !== "");
    
    if (!trimmedDomain || !domainRegex.test(trimmedDomain)) {
      setError("Please enter a valid domain (e.g., https://example.com)");
      return false;
    }
    
    if (filteredPaths.length === 0) {
      setError("Please add at least one path to analyze");
      return false;
    }

    setIsValidating(true);
    setError("");
    
    const fullUrls = filteredPaths.map(path => {
      const cleanDomain = trimmedDomain.replace(/\/$/, "");
      const cleanPath = path.startsWith("/") ? path : `/${path}`;
      return `${cleanDomain}${cleanPath}`;
    });

    const results: ValidationResult[] = fullUrls.map((url, index) => ({
      url,
      path: filteredPaths[index],
      status: 'pending'
    }));

    setValidationResults(results);

    // Validate each URL
    const validationPromises = fullUrls.map(async (url, index) => {
      const validation = await validateSingleUrl(url);
      return {
        url,
        path: filteredPaths[index],
        status: validation.valid ? 'valid' as const : 'invalid' as const,
        error: validation.error
      };
    });

    const validatedResults = await Promise.all(validationPromises);
    setValidationResults(validatedResults);
    setIsValidating(false);

    const invalidUrls = validatedResults.filter(result => result.status === 'invalid');
    if (invalidUrls.length > 0) {
      setError(`${invalidUrls.length} URL(s) could not be accessed. Please check the URLs and try again.`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password first
    if (password.trim() !== "GeoSeo") {
      setError("Invalid password. Please contact support for access to multi-page analysis.");
      return;
    }
    
    // Check if URLs have been validated
    const hasValidatedUrls = validationResults.length > 0 && validationResults.every(r => r.status !== 'pending');
    if (!hasValidatedUrls) {
      setError("Please validate URLs first by clicking 'Validate URLs First' button before starting analysis.");
      return;
    }
    
    // Check if all URLs are valid
    const hasInvalidUrls = validationResults.some(r => r.status === 'invalid');
    if (hasInvalidUrls) {
      setError("Some URLs are invalid. Please fix them before starting analysis.");
      return;
    }
    
    const trimmedDomain = domain.trim();
    const filteredPaths = paths.filter(path => path.trim() !== "");
    
    onSubmit({ 
      domain: trimmedDomain, 
      paths: filteredPaths,
      analysisType: "multi-page",
      password: password.trim()
    });
  };

  const handleDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDomain(value);
    
    if (value.trim() && !domainRegex.test(value.trim())) {
      setError("Please enter a valid domain (e.g., https://example.com)");
    } else {
      setError("");
    }
  };

  const handlePathChange = (index: number, value: string) => {
    const newPaths = [...paths];
    newPaths[index] = value;
    setPaths(newPaths);
  };

  const addPath = () => {
    if (paths.length < 5) {
      setPaths([...paths, ""]);
    }
  };

  const removePath = (index: number) => {
    if (paths.length > 1) {
      const newPaths = paths.filter((_, i) => i !== index);
      setPaths(newPaths);
    }
  };

  const getFullUrl = (path: string) => {
    if (!domain || !path) return "";
    const cleanDomain = domain.replace(/\/$/, "");
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${cleanDomain}${cleanPath}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-3">
          <FileText className="w-8 h-8 text-blue-600" />
          <h2 className="text-2xl font-bold revenue-dark">Multi-Page AI Visibility Audit</h2>
        </div>
        <p className="text-gray-600 text-base max-w-2xl mx-auto">
          Analyze multiple pages from your website to get comprehensive insights on AI visibility, 
          content optimization, and domain-wide recommendations. Maximum 5 pages per analysis.
        </p>
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-2xl mx-auto">
          <p className="text-sm text-blue-800 font-medium mb-2">📝 Steps to Complete:</p>
          <div className="text-sm text-blue-800 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">1)</span>
              <span>Enter base domain</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">2)</span>
              <span>Enter access password</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">3)</span>
              <span>Add pages to analyze</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">4)</span>
              <span>Validate URLs</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">5)</span>
              <span>Start analysis</span>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
        {/* Step 1: Domain Input */}
        <div className="mb-6">
          <Label htmlFor="domain" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center gap-2">
              {domain.trim() && domainRegex.test(domain.trim()) ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
              )}
              <span className="font-bold">Step 1:</span>
            </div>
            <Globe className="w-4 h-4" />
            Base Domain
          </Label>
          <Input
            type="url"
            id="domain"
            value={domain}
            onChange={handleDomainChange}
            placeholder="https://example.com"
            className="text-lg"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Enter your website's domain (without paths)
          </p>
        </div>

        {/* Step 2: Password Input */}
        <div className="mb-6">
          <Label htmlFor="password" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center gap-2">
              {password.trim() === "GeoSeoAnalyzer" ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
              )}
              <span className="font-bold">Step 2:</span>
            </div>
            <CheckCircle className="w-4 h-4" />
            Access Password
          </Label>
          <Input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password for multi-page analysis"
            className="text-lg"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Multi-page analysis requires a password for access
          </p>
        </div>

        {/* Step 3: Paths Input */}
        <div className="mb-6">
          <Label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <div className="flex items-center gap-2">
              {paths.filter(p => p.trim()).length > 0 ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
              )}
              <span className="font-bold">Step 3:</span>
            </div>
            <Search className="w-4 h-4" />
            Pages to Analyze ({paths.filter(p => p.trim()).length}/5)
          </Label>
          
          <div className="space-y-3">
            {paths.map((path, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="flex">
                    <span className="inline-flex items-center px-3 py-2 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      {domain || "https://example.com"}
                    </span>
                    <Input
                      type="text"
                      value={path}
                      onChange={(e) => handlePathChange(index, e.target.value)}
                      placeholder={index === 0 ? "/" : "/page-name"}
                      className="rounded-l-none"
                    />
                  </div>
                  {path && domain && (
                    <p className="text-xs text-gray-500 mt-1">
                      Will analyze: {getFullUrl(path)}
                    </p>
                  )}
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removePath(index)}
                  disabled={paths.length <= 1}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          
          {paths.length < 5 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPath}
              className="mt-3 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Page
            </Button>
          )}
        </div>

        {error && (
          <Alert className="mb-4" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>{error}</p>
                {error.toLowerCase().includes('network') || error.toLowerCase().includes('connection') && (
                  <div className="text-sm">
                    <p className="font-medium">Troubleshooting suggestions:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Check your internet connection</li>
                      <li>Try reducing the number of pages to analyze</li>
                      <li>If on mobile, try switching between WiFi and cellular</li>
                      <li>Wait a few minutes and try again</li>
                    </ul>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* URL Validation Results */}
        {validationResults.length > 0 && (
          <div className="mb-6 space-y-2">
            <h3 className="text-sm font-medium text-gray-700">URL Validation Results</h3>
            {validationResults.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div className="flex items-center gap-2">
                  {result.status === 'pending' && <AlertCircle className="w-4 h-4 text-gray-500 animate-pulse" />}
                  {result.status === 'valid' && <CheckCircle className="w-4 h-4 text-green-500" />}
                  {result.status === 'invalid' && <XCircle className="w-4 h-4 text-red-500" />}
                  <span className="text-sm font-medium">{result.path}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 truncate max-w-xs">{result.url}</div>
                  {result.error && (
                    <div className="text-xs text-red-500 mt-1">{result.error}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 4: Validation */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <div className="flex items-center gap-2">
              {validationResults.length > 0 && validationResults.every(r => r.status === 'valid') ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
              )}
              <span className="font-bold">Step 4:</span>
            </div>
            <span>Validate URLs</span>
          </div>
          
          <Button
            type="button"
            onClick={validateAllUrls}
            disabled={isLoading || isValidating || !domain || paths.filter(p => p.trim()).length === 0}
            variant="outline"
            className="w-full px-6 py-3 text-lg font-medium rounded-lg transition-colors"
          >
            {isValidating ? (
              <>
                <AlertCircle className="w-5 h-5 mr-2 animate-spin" />
                Validating URLs...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Validate URLs First
              </>
            )}
          </Button>
        </div>

        {/* Step 5: Analysis */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
              <span className="font-bold">Step 5:</span>
            </div>
            <span>Start Analysis</span>
          </div>
          
          <Button
            type="submit"
            disabled={isLoading || isValidating || validationResults.length === 0 || validationResults.some(r => r.status === 'invalid')}
            className="w-full px-8 py-3 text-lg bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Search className="w-5 h-5 mr-2 animate-spin" />
                Analyzing Pages...
              </>
            ) : (
              <>
                <Search className="w-5 h-5 mr-2" />
                Start Multi-Page Analysis
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}