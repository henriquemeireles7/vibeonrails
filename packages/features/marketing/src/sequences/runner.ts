import type { EmailSequence } from './define.js';

export type SequenceStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed';

export interface SequenceRun {
  sequenceId: string;
  status: SequenceStatus;
  currentStep: number;
  startedAt: Date;
}

/**
 * Starts running an email sequence.
 * Stub implementation -- replace with real email sending logic.
 */
export function runSequence(sequence: EmailSequence): SequenceRun {
  return {
    sequenceId: sequence.id,
    status: 'pending',
    currentStep: 0,
    startedAt: new Date(),
  };
}
