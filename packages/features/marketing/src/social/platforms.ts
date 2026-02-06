export type Platform = 'twitter' | 'linkedin' | 'instagram';

export interface PlatformAdapter {
  post(content: string): Promise<{ id: string }>;
  delete(id: string): Promise<void>;
}

export function definePlatform(
  platform: Platform,
  adapter: PlatformAdapter,
): { platform: Platform; adapter: PlatformAdapter } {
  return { platform, adapter };
}
