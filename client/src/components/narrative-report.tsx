import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NarrativeReportProps {
  narrativeReport: string;
  websiteUrl: string;
}

export default function NarrativeReport({ narrativeReport, websiteUrl }: NarrativeReportProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async () => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(narrativeReport);
        setHasCopied(true);
        toast({
          title: "Report copied to clipboard",
          description: "The full narrative report has been copied to your clipboard.",
        });
        setTimeout(() => setHasCopied(false), 2000);
      } else {
        // Fallback to legacy method
        const textArea = document.createElement('textarea');
        textArea.value = narrativeReport;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          setHasCopied(true);
          toast({
            title: "Report copied to clipboard",
            description: "The full narrative report has been copied to your clipboard.",
          });
          setTimeout(() => setHasCopied(false), 2000);
        } else {
          throw new Error('Copy command failed');
        }
      }
    } catch (error) {
      console.error('Copy failed:', error);
      toast({
        title: "Failed to copy",
        description: "Could not copy the report to clipboard. Please try selecting and copying the text manually.",
        variant: "destructive",
      });
    }
  };

  const formatNarrative = (text: string) => {
    // Split into paragraphs and format
    const paragraphs = text.split('\n\n').filter(p => p.trim());
    
    return paragraphs.map((paragraph, index) => {
      // Check if it's a heading (contains emojis or is all caps)
      const isHeading = paragraph.match(/^[🔍📝⚙️🏆🎯📊]/);
      
      if (isHeading) {
        return (
          <h3 key={index} className="text-lg font-semibold text-purple-700 dark:text-purple-300 mt-6 mb-3">
            {paragraph}
          </h3>
        );
      }
      
      // Check if it's a list item
      if (paragraph.startsWith('- ') || paragraph.startsWith('• ')) {
        return (
          <ul key={index} className="ml-6 mb-4">
            <li className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              {paragraph.replace(/^[•-]\s/, '')}
            </li>
          </ul>
        );
      }
      
      // Regular paragraph
      return (
        <p key={index} className="text-sm text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
          {paragraph}
        </p>
      );
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-xl">Detailed Analysis Report</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="flex items-center space-x-1"
            >
              {hasCopied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span>{hasCopied ? "Copied!" : "Copy"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-1"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              <span>{isExpanded ? "Collapse" : "Expand"}</span>
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Comprehensive LLM visibility analysis for {websiteUrl}
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className={`w-full ${isExpanded ? 'h-96' : 'h-48'}`}>
          <div className="pr-4">
            {formatNarrative(narrativeReport)}
          </div>
        </ScrollArea>
        {!isExpanded && (
          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              onClick={() => setIsExpanded(true)}
              className="text-purple-600 hover:text-purple-700"
            >
              <ChevronDown className="h-4 w-4 mr-1" />
              Read Full Report
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}