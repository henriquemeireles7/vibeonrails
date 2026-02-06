export interface SequenceStep {
  templateId: string;
  delayDays: number;
  subject: string;
  body?: string;
}

export interface EmailSequence {
  id: string;
  name: string;
  steps: SequenceStep[];
}

let nextId = 1;

function generateId(): string {
  return `seq_${nextId++}`;
}

export function defineSequence(config: { name: string; steps: SequenceStep[] }): EmailSequence {
  return {
    id: generateId(),
    name: config.name,
    steps: [...config.steps],
  };
}
