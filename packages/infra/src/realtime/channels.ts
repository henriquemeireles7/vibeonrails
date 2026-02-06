/**
 * Channel Subscription Management
 *
 * Subscribe clients to channels, broadcast to channels, unsubscribe.
 */

const channels = new Map<string, Set<string>>(); // channel -> clientIds

/**
 * Subscribe a client to a channel.
 */
export function subscribe(channel: string, clientId: string): void {
  if (!channels.has(channel)) {
    channels.set(channel, new Set());
  }
  channels.get(channel)!.add(clientId);
}

/**
 * Unsubscribe a client from a channel.
 */
export function unsubscribe(channel: string, clientId: string): void {
  const subs = channels.get(channel);
  if (subs) {
    subs.delete(clientId);
    if (subs.size === 0) {
      channels.delete(channel);
    }
  }
}

/**
 * Unsubscribe a client from all channels (e.g., on disconnect).
 */
export function unsubscribeAll(clientId: string): void {
  for (const [channel, subs] of channels) {
    subs.delete(clientId);
    if (subs.size === 0) {
      channels.delete(channel);
    }
  }
}

/**
 * Get all client IDs subscribed to a channel.
 */
export function getSubscribers(channel: string): string[] {
  return Array.from(channels.get(channel) ?? []);
}

/**
 * Get all active channels.
 */
export function getChannels(): string[] {
  return Array.from(channels.keys());
}

/**
 * Clear all channel subscriptions (for testing).
 */
export function clearChannels(): void {
  channels.clear();
}
