export interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "agent" | "bot";
  timestamp: Date;
}

const messages: ChatMessage[] = [];

let nextId = 1;

function generateId(): string {
  return `msg_${nextId++}`;
}

export function sendMessage(
  content: string,
  sender: ChatMessage["sender"],
): ChatMessage {
  const message: ChatMessage = {
    id: generateId(),
    content,
    sender,
    timestamp: new Date(),
  };
  messages.push(message);
  return message;
}

export function getMessages(): ChatMessage[] {
  return [...messages];
}

export function clearChat(): void {
  messages.length = 0;
}
