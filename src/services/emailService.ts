import { generateEmailHtml } from '../lib/emailTemplates';

export interface EmailStatusResponse {
  success: boolean;
  isResendConfigured: boolean;
  isSmtpConfigured: boolean;
  emailFrom: string;
  defaultRecipient: string;
  smtpHost: string | null;
  smtpUser: string | null;
  mode: string;
}

export interface SendEmailPayload {
  template:
    | 'account_verification'
    | 'password_recovery'
    | 'financial_summary'
    | 'backup_success'
    | 'budget_alert'
    | 'work_hours_statement'
    | 'security_alert'
    | 'custom';
  to?: string;
  subject?: string;
  data?: Record<string, any>;
  customHtml?: string;
  smtpConfig?: {
    host: string;
    port: number;
    user: string;
    pass: string;
  };
  resendApiKey?: string;
}

export interface SendEmailResponse {
  success: boolean;
  provider: 'resend' | 'smtp' | 'simulator';
  messageId?: string;
  id?: string;
  simulated?: boolean;
  message?: string;
  error?: string;
  subject: string;
  html: string;
}

export interface EmailPreviewResponse {
  success: boolean;
  subject: string;
  html: string;
  error?: string;
}

export interface EmailLog {
  id: string;
  to: string;
  subject: string;
  template: string;
  status: 'sent' | 'failed' | 'simulated';
  provider: 'resend' | 'smtp' | 'simulator';
  timestamp: string;
  error?: string;
}

const EMAIL_CONFIG_KEY = 'user_email_settings_v1';

export interface UserEmailConfig {
  provider: 'simulator' | 'gmail_smtp' | 'resend';
  gmailUser: string;
  gmailAppPassword: string; // 16-character App password
  resendApiKey: string;
}

export const getSavedEmailConfig = (): UserEmailConfig => {
  try {
    const raw = localStorage.getItem(EMAIL_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    provider: 'simulator',
    gmailUser: 'datminh96@gmail.com',
    gmailAppPassword: '',
    resendApiKey: '',
  };
};

export const saveEmailConfig = (config: UserEmailConfig) => {
  try {
    localStorage.setItem(EMAIL_CONFIG_KEY, JSON.stringify(config));
  } catch {}
};

export const emailService = {
  async getStatus(): Promise<EmailStatusResponse> {
    const localCfg = getSavedEmailConfig();
    try {
      const res = await fetch('/api/email/status');
      if (res.ok) {
        const data = await res.json();
        if (localCfg.provider === 'gmail_smtp' && localCfg.gmailAppPassword) {
          return {
            ...data,
            isSmtpConfigured: true,
            smtpHost: 'smtp.gmail.com',
            smtpUser: localCfg.gmailUser,
            mode: 'Gmail SMTP (Đã kích hoạt)',
          };
        }
        if (localCfg.provider === 'resend' && localCfg.resendApiKey) {
          return {
            ...data,
            isResendConfigured: true,
            mode: 'Resend Cloud API (Đã kích hoạt)',
          };
        }
        return data;
      }
    } catch {}

    const isSmtp = localCfg.provider === 'gmail_smtp' && !!localCfg.gmailAppPassword;
    const isResend = localCfg.provider === 'resend' && !!localCfg.resendApiKey;

    return {
      success: true,
      isResendConfigured: isResend,
      isSmtpConfigured: isSmtp,
      emailFrom: isSmtp ? localCfg.gmailUser : 'Personal Finance <onboarding@resend.dev>',
      defaultRecipient: 'datminh96@gmail.com',
      smtpHost: isSmtp ? 'smtp.gmail.com' : null,
      smtpUser: isSmtp ? localCfg.gmailUser : null,
      mode: isSmtp ? 'Gmail SMTP (Đã cấu hình)' : isResend ? 'Resend Cloud API' : 'Simulator / Live Preview',
    };
  },

  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResponse> {
    const localCfg = getSavedEmailConfig();
    
    // Inject local user SMTP / Resend config if present
    const finalPayload = { ...payload };
    if (!finalPayload.smtpConfig && localCfg.provider === 'gmail_smtp' && localCfg.gmailAppPassword) {
      finalPayload.smtpConfig = {
        host: 'smtp.gmail.com',
        port: 465,
        user: localCfg.gmailUser.trim(),
        pass: localCfg.gmailAppPassword.trim().replace(/\s+/g, ''),
      };
    }
    if (!finalPayload.resendApiKey && localCfg.provider === 'resend' && localCfg.resendApiKey) {
      finalPayload.resendApiKey = localCfg.resendApiKey.trim();
    }

    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload),
      });
      if (res.ok) {
        return await res.json();
      }
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    } catch (networkErr: any) {
      // If serverless endpoint is offline or failed, generate local template response
      const { subject, html } = generateEmailHtml(payload.template, payload.data);
      return {
        success: true,
        provider: 'simulator',
        simulated: true,
        subject,
        html,
        message: 'Đã tạo mẫu email thành công.',
      };
    }
  },

  async previewEmail(payload: { template: string; data?: Record<string, any>; customHtml?: string }): Promise<EmailPreviewResponse> {
    // Instant client-side template rendering for zero latency and guaranteed rendering
    const { subject, html } = generateEmailHtml(payload.template, payload.data);
    return {
      success: true,
      subject,
      html,
    };
  },

  async getLogs(): Promise<EmailLog[]> {
    try {
      const res = await fetch('/api/email/logs');
      if (!res.ok) return [];
      const json = await res.json();
      return json.logs || [];
    } catch {
      return [];
    }
  },
};
