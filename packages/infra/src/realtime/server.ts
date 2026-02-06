/**
 * WebSocket Server Setup
 *
 * Provides a channel-based WebSocket abstraction.
 */

export interface WebSocketClient {
  id: string;
  send: (data: string) => void;
  close: () => void;
}

export interface WebSocketMessage {
  type: string;
  channel?: string;
  payload?: unknown;
}

export type MessageHandler = (client: WebSocketClient, message: WebSocketMessage) => void | Promise<void>;

const clients = new Map<string, WebSocketClient>();
const handlers = new Map<string, MessageHandler>();

/**
 * Register a WebSocket client.
 */
export function registerClient(client: WebSocketClient): void {
  clients.set(client.id, client);
}

/**
 * Remove a WebSocket client.
 */
export function removeClient(clientId: string): void {
  clients.delete(clientId);
}

/**
 * Get a connected client by ID.
 */
export function getClient(clientId: string): WebSocketClient | undefined {
  return clients.get(clientId);
}

/**
 * Get all connected client IDs.
 */
export function getConnectedClients(): string[] {
  return Array.from(clients.keys());
}

/**
 * Register a message handler for a specific message type.
 */
export function onMessage(type: string, handler: MessageHandler): void {
  handlers.set(type, handler);
}

/**
 * Dispatch a message to the appropriate handler.
 */
export async function dispatchMessage(client: WebSocketClient, message: WebSocketMessage): Promise<void> {
  const handler = handlers.get(message.type);
  if (handler) {
    await handler(client, message);
  }
}

/**
 * Send a message to a specific client.
 */
export function sendToClient(clientId: string, data: WebSocketMessage): boolean {
  const client = clients.get(clientId);
  if (!client) return false;
  client.send(JSON.stringify(data));
  return true;
}

/**
 * Broadcast a message to all connected clients.
 */
export function broadcast(data: WebSocketMessage): void {
  const json = JSON.stringify(data);
  for (const client of clients.values()) {
    client.send(json);
  }
}

/**
 * Clear all clients and handlers (for testing).
 */
export function resetWebSocket(): void {
  clients.clear();
  handlers.clear();
}
