export interface WhatsAppConfig {
  phoneNumber: string;
  apiToken: string;
  webhookUrl?: string;
}

export function createWhatsAppChannel(config: WhatsAppConfig): WhatsAppConfig {
  return { ...config };
}
