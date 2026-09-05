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
}

export interface SendEmailResponse {
  success: boolean;
  provider: 'resend' | 'smtp' | 'simulator';
  messageId?: string;
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

export const emailService = {
  async getStatus(): Promise<EmailStatusResponse> {
    try {
      const res = await fetch('/api/email/status');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      return {
        success: false,
        isResendConfigured: false,
        isSmtpConfigured: false,
        emailFrom: 'Personal Finance <onboarding@resend.dev>',
        defaultRecipient: 'datminh96@gmail.com',
        smtpHost: null,
        smtpUser: null,
        mode: 'Simulator / Local Preview',
      };
    }
  },

  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResponse> {
    const res = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  },

  async previewEmail(payload: { template: string; data?: Record<string, any>; customHtml?: string }): Promise<EmailPreviewResponse> {
    const res = await fetch('/api/email/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
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
