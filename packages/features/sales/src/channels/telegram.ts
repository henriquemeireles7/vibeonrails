export interface TelegramConfig {
  botToken: string;
  webhookUrl?: string;
}

export function createTelegramChannel(config: TelegramConfig): TelegramConfig {
  return { ...config };
}
