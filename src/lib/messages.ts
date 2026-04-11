// Simple in-memory message store
interface Message {
  id: string;
  timestamp: string;
  event: string;
  visitor?: {
    name?: string;
    email?: string;
  };
  message?: {
    text?: string;
  };
  raw: any;
}

export const messages: Message[] = [];

export function addMessage(data: any) {
  const msg: Message = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    event: data.event || "unknown",
    visitor: data.visitor,
    message: data.message,
    raw: data,
  };
  messages.unshift(msg); // Add to beginning

  // Keep only last 50 messages
  if (messages.length > 50) {
    messages.pop();
  }

  return msg;
}

export function getMessages() {
  return messages;
}