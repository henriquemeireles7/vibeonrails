import type { Platform } from './platforms.js';

export interface ScheduledPost {
  id: string;
  platform: Platform;
  content: string;
  scheduledAt: Date;
  publishedAt?: Date;
}

const scheduledPosts: ScheduledPost[] = [];

let nextId = 1;

function generateId(): string {
  return `post_${nextId++}`;
}

export function schedulePost(
  platform: Platform,
  content: string,
  scheduledAt: Date,
): ScheduledPost {
  const post: ScheduledPost = {
    id: generateId(),
    platform,
    content,
    scheduledAt,
  };
  scheduledPosts.push(post);
  return post;
}

export function getScheduledPosts(): ScheduledPost[] {
  return [...scheduledPosts];
}
