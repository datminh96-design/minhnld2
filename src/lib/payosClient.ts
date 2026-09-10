export interface PayOSCreateLinkRequest {
  amount: number;
  description?: string;
  orderCode?: number;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  buyerAddress?: string;
  items?: Array<{ name: string; quantity: number; price: number }>;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PayOSPaymentLinkData {
  bin: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  description: string;
  orderCode: number;
  currency: string;
  paymentLinkId: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED';
  checkoutUrl: string;
  qrCode: string;
}

export interface PayOSStatusResponse {
  success: boolean;
  clientId: string;
  apiKey: string;
  checksumKey: string;
  isConfigured: boolean;
}

export const payosClient = {
  async getStatus(): Promise<PayOSStatusResponse> {
    const res = await fetch('/api/payos/status');
    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}`);
    }
    return res.json();
  },

  async updateConfig(config: { clientId?: string; apiKey?: string; checksumKey?: string }) {
    const res = await fetch('/api/payos/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Không thể lưu cấu hình PayOS');
    }
    return data;
  },

  async createPaymentLink(payload: PayOSCreateLinkRequest): Promise<{
    success: boolean;
    data: PayOSPaymentLinkData;
    orderCode: number;
    amount: number;
    description: string;
  }> {
    const res = await fetch('/api/payos/create-payment-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Không thể tạo mã thanh toán VietQR từ PayOS');
    }
    return data;
  },

  async getOrderInfo(orderCodeOrId: string | number): Promise<any> {
    const res = await fetch(`/api/payos/payment-link/${orderCodeOrId}`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Không thể lấy thông tin đơn hàng PayOS');
    }
    return data.data;
  },

  async cancelPaymentLink(orderCodeOrId: string | number, reason?: string): Promise<any> {
    const res = await fetch(`/api/payos/cancel-payment-link/${orderCodeOrId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancellationReason: reason }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Không thể hủy link thanh toán');
    }
    return data;
  },

  async confirmWebhook(webhookUrl: string): Promise<any> {
    const res = await fetch('/api/payos/confirm-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Không thể xác nhận webhook');
    }
    return data;
  },
};
