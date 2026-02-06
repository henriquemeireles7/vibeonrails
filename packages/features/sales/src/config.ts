export interface SalesAgentConfig {
  name: string;
  tone: string;
  channels: string[];
  qualificationQuestions: string[];
}

export function defineSalesAgent(config: SalesAgentConfig): SalesAgentConfig {
  return { ...config };
}
