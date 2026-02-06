/**
 * Queue Worker
 *
 * Processes background jobs using BullMQ. Handles job validation,
 * execution, retries, and error reporting.
 *
 * Usage:
 *   import { createQueue, enqueue } from '@vibeonrails/infra/queue';
 *
 *   const queue = createQueue([sendWelcomeEmail, processPayment]);
 *   await enqueue(sendWelcomeEmail, { userId: '123', email: 'test@test.com' });
 */

import { Queue, Worker, type Job } from 'bullmq';
import type { JobDefinition } from './job.js';
import type { z } from 'zod';

let redisConnection: { host: string; port: number } | undefined;

function getRedisConfig() {
  if (redisConnection) return redisConnection;

  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const parsed = new URL(url);

  redisConnection = {
    host: parsed.hostname,
    port: parseInt(parsed.port || '6379', 10),
  };
  return redisConnection;
}

const queues = new Map<string, Queue>();
const handlers = new Map<string, (data: unknown) => Promise<void>>();

/**
 * Initialize the queue system with job definitions.
 * Creates BullMQ queues and workers for each job type.
 *
 * @param jobs - Array of job definitions to register
 */
export function createQueueWorker(jobs: JobDefinition<z.ZodType>[]): void {
  const connection = getRedisConfig();

  for (const job of jobs) {
    // Create queue
    const queue = new Queue(job.name, { connection });
    queues.set(job.name, queue);

    // Register handler
    handlers.set(job.name, async (data: unknown) => {
      const parsed = job.schema.parse(data);
      await job.handler(parsed);
    });

    // Create worker
    new Worker(
      job.name,
      async (bullJob: Job) => {
        const handler = handlers.get(job.name);
        if (!handler) throw new Error(`No handler registered for job: ${job.name}`);
        await handler(bullJob.data);
      },
      {
        connection,
        concurrency: 5,
        ...(job.options?.retries && {
          settings: {
            backoffStrategy: (attemptsMade: number) => {
              const delay = job.options?.backoffDelay ?? 1000;
              return job.options?.backoff === 'exponential'
                ? delay * Math.pow(2, attemptsMade)
                : delay;
            },
          },
        }),
      },
    );
  }
}

/**
 * Enqueue a job for background processing.
 *
 * @param jobDef - The job definition (created with defineJob)
 * @param data - Job data matching the job's schema
 */
export async function enqueue<T extends z.ZodType>(
  jobDef: JobDefinition<T>,
  data: z.infer<T>,
): Promise<void> {
  const queue = queues.get(jobDef.name);
  if (!queue) {
    throw new Error(
      `[AOR] Queue "${jobDef.name}" not found. Did you call createQueueWorker() with this job?`,
    );
  }

  // Validate data before enqueuing
  jobDef.schema.parse(data);

  await queue.add(jobDef.name, data, {
    attempts: jobDef.options?.retries ?? 3,
    backoff: {
      type: jobDef.options?.backoff ?? 'exponential',
      delay: jobDef.options?.backoffDelay ?? 1000,
    },
  });
}
