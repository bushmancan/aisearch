import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MessageCircle, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import type { AnalysisResults } from "@shared/schema";

interface FAQProps {
  analysisResults: AnalysisResults;
  analysisId: number;
  websiteUrl: string;
}

interface FAQItem {
  question: string;
  answer: string;
  recommendations?: string[];
}

export default function FAQ({ analysisResults, analysisId, websiteUrl }: FAQProps) {
  const [openItems, setOpenItems] = useState<number[]>([]);

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const faqItems: FAQItem[] = [
    {
      question: "But I Do Have an FAQ Page - Why Isn't the Analyzer Seeing It?",
      answer: "Great question! This analyzer mimics how AI search engines like ChatGPT, Gemini, and Perplexity actually work. When these AI systems crawl your website, they analyze only the specific page they're visiting - they don't automatically follow links to other pages. So if someone searches for your services and lands on your homepage, the AI only sees what's directly on that homepage, not your separate FAQ page. This is why having key Q&A content directly on important pages (like your homepage) is crucial for AI visibility.",
      recommendations: [
        "Add key FAQ content directly to your homepage or main service pages",
        "Create 'Quick Answers' sections on important pages with your most common questions",
        "Keep your dedicated FAQ page but also include FAQ snippets on relevant pages",
        "Use question-answer format in your main content, not just separate FAQ pages",
        "Consider which page visitors are most likely to land on and ensure it has FAQ content"
      ]
    },
    {
      question: "How can I improve my website's visibility to ChatGPT?",
      answer: "To improve visibility to ChatGPT and other AI search engines, focus on creating content that AI models can easily understand and cite. This includes implementing proper ***structured data*** markup, ensuring your content is accessible via ***server-side rendering***, and creating comprehensive, authoritative content that directly answers user questions.",
      recommendations: [
        "Add FAQ sections with ***FAQPage*** schema markup",
        "Ensure content is visible in HTML source without JavaScript",
        "Create detailed author bios with credentials and expertise",
        "Use clear heading hierarchy (***H1***, ***H2***, ***H3***)",
        "Include direct answers to common questions"
      ]
    },
    {
      question: "What specific technical changes should I prioritize first?",
      answer: "Priority technical changes for AI visibility include creating a ***robots.txt*** file that allows AI crawlers (***GPTBot***, ***ClaudeBot***, ***CCBot***), implementing ***server-side rendering*** for JavaScript-heavy sites, and optimizing page load speed to under 2.5 seconds. These changes directly impact whether AI crawlers can access and index your content.",
      recommendations: [
        "Create ***robots.txt*** with AI crawler permissions",
        "Implement ***canonical tags*** to prevent duplicate content",
        "Optimize ***TTFB*** (Time to First Byte) under 500ms",
        "Add ***structured data*** for your content type",
        "Ensure mobile responsiveness and ***HTTPS*** implementation"
      ]
    },
    {
      question: "How does my content quality affect AI search rankings?",
      answer: "Content quality is crucial for AI search visibility. AI models favor comprehensive, accurate, and well-structured content that demonstrates expertise. High-quality content for AI includes direct answers to questions, clear explanations, proper citations, and unique insights. Poor quality or thin content will be overlooked by AI systems in favor of more authoritative sources.",
      recommendations: [
        "Create in-depth, comprehensive content covering topics thoroughly",
        "Add ***'Key Takeaways'*** and ***'Summary'*** sections",
        "Include author expertise and credentials",
        "Use question-answer format for better AI comprehension",
        "Cite authoritative sources and studies"
      ]
    },
    {
      question: "What are the biggest opportunities for improvement?",
      answer: "The biggest opportunities typically include adding ***FAQ sections*** with structured data, improving content authority signals through author bios and credentials, implementing proper technical SEO for AI crawlers, and restructuring content into question-answer formats. These changes can significantly boost your citation potential in AI-generated responses.",
      recommendations: [
        "Add comprehensive ***FAQ sections*** with schema markup",
        "Include detailed author bios with expertise and credentials",
        "Create summary sections and key takeaways",
        "Implement proper structured data markup",
        "Optimize content for direct answer extraction"
      ]
    },
    {
      question: "How can I better optimize for voice search and AI assistants?",
      answer: "Voice search and AI assistant optimization requires content that can be easily spoken aloud and understood conversationally. This means creating content with natural language patterns, direct answers to questions, and local SEO elements. Focus on long-tail keywords and conversational phrases that people actually use when speaking.",
      recommendations: [
        "Create content in natural, conversational language",
        "Target long-tail, question-based keywords",
        "Include local SEO elements for location-based queries",
        "Structure content for featured snippet optimization",
        "Use schema markup for business information"
      ]
    },
    {
      question: "What structured data should I add to my website?",
      answer: "Essential structured data for AI visibility includes ***Organization*** schema for your business, ***WebPage*** schema for individual pages, ***Article*** schema for blog content, and ***FAQPage*** schema for FAQ sections. These help AI systems understand your content context and improve citation potential.",
      recommendations: [
        "Implement ***Organization*** schema with business details",
        "Add ***Article*** schema to blog posts and content pages",
        "Use ***FAQPage*** schema for question-answer sections",
        "Include ***BreadcrumbList*** schema for navigation",
        "Add ***LocalBusiness*** schema if applicable"
      ]
    }
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Frequently Asked Questions
        </CardTitle>
        <CardDescription>
          Common questions about LLM visibility optimization and how to implement improvements.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {faqItems.map((item, index) => (
            <Collapsible
              key={index}
              open={openItems.includes(index)}
              onOpenChange={() => toggleItem(index)}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-4 h-4 mt-1 text-blue-600 flex-shrink-0" />
                  <span className="font-medium text-sm">{item.question}</span>
                </div>
                {openItems.includes(index) ? (
                  <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4 pt-2">
                <div className="space-y-3">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {item.answer}
                  </p>
                  
                  {item.recommendations && item.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <div className="font-medium text-sm text-gray-800">
                        Action Items:
                      </div>
                      <ul className="space-y-1">
                        {item.recommendations.map((rec, recIndex) => (
                          <li key={recIndex} className="flex items-start gap-2 text-sm text-gray-600">
                            <span className="text-blue-500 mt-1 flex-shrink-0">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}