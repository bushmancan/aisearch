import { useEffect, useState } from "react";
import { Globe, CheckCircle, Clock, X } from "lucide-react";

const steps = [
  { id: 'step1', label: 'Fetching website content', detail: 'Loading HTML, CSS, and metadata' },
  { id: 'step2', label: 'Validating data quality', detail: 'Checking content accessibility and structure' },
  { id: 'step3', label: 'Preparing AI analysis', detail: 'Organizing content for AI processing' },
  { id: 'step4', label: 'AI content analysis', detail: 'Analyzing SEO structure and technical elements' },
  { id: 'step5', label: 'AI visibility scoring', detail: 'Calculating LLM visibility and authority scores' },
  { id: 'step6', label: 'Generating recommendations', detail: 'Creating actionable improvement suggestions' },
  { id: 'step7', label: 'Finalizing report', detail: 'Compiling results and formatting output' },
];

interface LoadingSectionProps {
  onStop?: () => void;
}

export default function LoadingSection({ onStop }: LoadingSectionProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 2000); // Slightly slower progression for better readability

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Detect mobile for enhanced messaging
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 mb-8">
      <div className="text-center">
        <div className="relative inline-block">
          <div className="w-16 h-16 border-4 border-brand-purple border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Globe className="text-brand-purple text-xl" size={24} />
          </div>
        </div>
        <h3 className="text-xl font-semibold brand-gray mt-4 mb-2">Analyzing Your Website</h3>
        <p className="text-gray-600 mb-4">Performing comprehensive LLM visibility analysis...</p>
        
        {isMobile && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              📱 Mobile analysis may take 3-5 minutes. Keep your screen active for best results.
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Time elapsed: {Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}
            </p>
          </div>
        )}
        
        {/* Current Step Highlight */}
        <div className="max-w-lg mx-auto mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-center">
            <h4 className="font-semibold text-blue-800 mb-1">
              {steps[currentStep]?.label}
            </h4>
            <p className="text-sm text-blue-600">
              {steps[currentStep]?.detail}
            </p>
          </div>
        </div>
        
        {/* Progress Steps */}
        <div className="max-w-md mx-auto">
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center text-sm">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                  index < currentStep ? 'bg-green-500' : 
                  index === currentStep ? 'bg-blue-500' : 'bg-gray-300'
                }`}>
                  {index < currentStep ? (
                    <CheckCircle className="text-white" size={12} />
                  ) : index === currentStep ? (
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Clock className="text-gray-600" size={12} />
                  )}
                </div>
                <div className="flex-1">
                  <span className={`block font-medium ${index <= currentStep ? 'text-gray-700' : 'text-gray-500'}`}>
                    {step.label}
                  </span>
                  {index === currentStep && (
                    <span className="block text-xs text-blue-600 mt-1">
                      {step.detail}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm text-gray-600">{currentStep + 1} of {steps.length}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-in-out" 
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Stop Analysis Button */}
        {onStop && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={onStop}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-purple transition-colors"
            >
              <X className="w-4 h-4 mr-2" />
              Stop Analysis
            </button>
            <p className="mt-2 text-xs text-gray-500">
              You can safely stop the analysis at any time
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
