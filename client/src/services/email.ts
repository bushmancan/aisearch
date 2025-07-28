import emailjs from '@emailjs/browser';

interface EmailTemplateParams {
  user_name: string;
  user_email: string;
  website_url: string;
  report_content: string;
  overall_score: number;
  company_name?: string;
}

export async function sendAnalysisReport(params: EmailTemplateParams): Promise<boolean> {
  try {
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
      console.error('EmailJS configuration missing');
      return false;
    }

    const templateParams = {
      to_name: params.user_name,
      to_email: params.user_email,
      website_url: params.website_url,
      report_content: params.report_content,
      overall_score: params.overall_score,
      company_name: params.company_name || 'your company',
      from_name: 'Revenue Experts AI',
    };

    const response = await emailjs.send(
      serviceId,
      templateId,
      templateParams,
      publicKey
    );

    console.log('Email sent successfully:', response);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
}