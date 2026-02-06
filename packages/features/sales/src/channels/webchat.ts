export interface WebchatConfig {
  name: string;
  welcomeMessage: string;
  primaryColor?: string;
  position?: 'bottom-right' | 'bottom-left';
}

export function createWebchatChannel(config: WebchatConfig): WebchatConfig {
  return {
    position: 'bottom-right',
    ...config,
  };
}
