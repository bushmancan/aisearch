import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, User, Building, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { trackLeadCaptured, trackAnalysisUnlocked, trackReportEmailed } from "@/lib/hubspot-tracking";
// Email sending is now handled by the backend

const emailFormSchema = z.object({
  email: z.string().min(1, "Email is required").refine((val) => {
    // Support multiple emails separated by commas
    const emails = val.split(',').map(email => email.trim());
    return emails.every(email => z.string().email().safeParse(email).success);
  }, "Please enter valid email addresses separated by commas"),
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
  marketingOptIn: z.boolean().optional(),
});

type EmailFormData = z.infer<typeof emailFormSchema>;

interface LeadCaptureFormProps {
  analysisId: number;
  websiteUrl: string;
  analysisResults?: any;
  onSuccess?: () => void; // Optional callback for when lead capture succeeds
  isUnlocked?: boolean; // New prop to determine if we're in unlock mode or send report mode
}

export default function LeadCaptureForm({ analysisId, websiteUrl, analysisResults, onSuccess, isUnlocked = false }: LeadCaptureFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      email: "",
      name: "",
      company: "",
      marketingOptIn: false,
    },
  });

  const onSubmit = async (data: EmailFormData) => {
    setIsLoading(true);
    try {
      if (!isUnlocked) {
        // STEP 1: Unlock Mode - Capture lead and unlock analysis
        const response = await apiRequest(
          "/api/capture-lead",
          {
            method: "POST",
            body: {
              ...data,
              analysisId,
            }
          }
        );

        // Track analysis unlock in HubSpot (non-blocking)
        try {
          if (typeof trackAnalysisUnlocked === 'function') {
            const score = analysisResults?.overallScore || 0;
            trackAnalysisUnlocked(data.email, websiteUrl, score);
          }
        } catch (trackError) {
          console.warn("HubSpot tracking failed:", trackError);
        }

        toast({
          title: "Analysis Unlocked Successfully!",
          description: "Your detailed analysis is now available below. Scroll down to view all sections.",
        });
        
        // Call onSuccess callback to unlock the report
        if (onSuccess) {
          onSuccess();
        }
      } else {
        // STEP 2: Send Report Mode - Send email report only 
        const emailResult = await apiRequest(
          "/api/send-report",
          {
            method: "POST",
            body: {
              ...data,
              analysisId,
              websiteUrl: websiteUrl,
              analysisResults: analysisResults,
            }
          }
        );
        
        // Track email report in HubSpot (non-blocking)
        try {
          if (typeof trackReportEmailed === 'function') {
            const score = analysisResults?.overallScore || 0;
            trackReportEmailed(data.email, websiteUrl, score);
          }
        } catch (trackError) {
          console.warn("HubSpot tracking failed:", trackError);
        }

        if (emailResult.emailSent) {
          toast({
            title: "Report Sent Successfully!",
            description: "The detailed analysis report has been emailed to you.",
          });
        } else {
          toast({
            title: "Information captured successfully!",
            description: "Your details have been saved. We'll follow up with the detailed report shortly.",
          });
        }
      }

      setIsOpen(false);
      form.reset();
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        title: isUnlocked ? "Failed to send report" : "Failed to unlock analysis",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-[#2f2657] hover:bg-[#252043] text-white font-semibold py-3 px-6 text-lg">
          {isUnlocked ? (
            <>
              <Mail className="mr-2 h-5 w-5" />
              Send Me the Report
            </>
          ) : (
            <>
              <Lock className="mr-2 h-5 w-5" />
              Unlock Full Analysis
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] p-0">
        <div className="max-h-[85vh] overflow-y-auto">
          <div className="p-6 pb-0">
            <DialogHeader>
              <DialogTitle>
                {isUnlocked ? "Send Report via Email" : "Unlock Your Complete AI Visibility Analysis"}
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="p-6 pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {isUnlocked ? "Email Your Analysis Report" : "Unlock Your Detailed Analysis"}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {isUnlocked 
                    ? `Send the complete analysis report for ${websiteUrl} to your email for future reference and sharing with your team.`
                    : `Instantly access the complete detailed analysis with specific recommendations and step-by-step guidance for ${websiteUrl}.`
                  }
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address(es)</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    placeholder="your.email@company.com, colleague@company.com"
                    className="pl-10"
                    {...form.register("email")}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 You can enter multiple email addresses separated by commas
                </p>
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="John Smith"
                    className="pl-10"
                    {...form.register("name")}
                  />
                </div>
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company (Optional)</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="company"
                    placeholder="Your Company Name"
                    className="pl-10"
                    {...form.register("company")}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="marketingOptIn"
                    checked={form.watch("marketingOptIn")}
                    onCheckedChange={(checked) => form.setValue("marketingOptIn", checked as boolean)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="marketingOptIn"
                      className="text-sm font-normal leading-snug cursor-pointer"
                    >
                      {isUnlocked 
                        ? "Yes! Email me my Revenue Experts AI Search Assessment and Email me your Monthly Revenue Playbook. Unsubscribe anytime."
                        : "Yes! Unlock my report & Email me Revenue Experts' monthly Revenue Playbook. Unsubscribe anytime."
                      }
                    </Label>
                  </div>
                </div>
              </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (isUnlocked ? "Sending..." : "Unlocking...") : (isUnlocked ? "Send Report" : "Unlock Analysis")}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}