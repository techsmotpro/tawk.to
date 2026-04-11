// In-memory store for Tawk.to webhooks
interface Visitor {
  name: string;
  email?: string;
  city: string;
  country: string;
}

interface Message {
  sender: {
    t: string; // 'v' = visitor, 'a' = agent, 's' = system
    n?: string; // name
    id?: string;
  };
  type: string;
  msg: string;
  time: string;
  attchs?: any[];
}

interface Chat {
  chatId: string;
  visitor: Visitor;
  startTime: string;
  property?: { id: string; name: string };
  firstMessage?: { text: string; type: string };
}

interface Transcript {
  chatId: string;
  visitor: Visitor;
  messages: Message[];
  property: { id: string; name: string };
  receivedAt: string;
}

interface WebhookEvent {
  id: string;
  timestamp: string;
  event: string;
  chatId?: string;
  visitor?: Visitor;
  property?: { id: string; name: string };
  message?: { text: string; type: string };
  messages?: Message[];
  raw: any;
}

export const chatStore = {
  activeChats: new Map<string, Chat>(),
  transcripts: [] as Transcript[],
  events: [] as WebhookEvent[],
};

export function handleChatStart(data: any) {
  const { chatId, visitor, message, property, time } = data;

  chatStore.activeChats.set(chatId, {
    chatId,
    visitor,
    property,
    startTime: time,
    firstMessage: message,
  });

  addEvent(data);
}

export function handleChatEnd(data: any) {
  const { chatId } = data;
  chatStore.activeChats.delete(chatId);
  addEvent(data);
}

export function handleTranscriptCreated(data: any) {
  const { chat, time, property } = data;

  chatStore.transcripts.unshift({
    chatId: chat.id,
    visitor: chat.visitor,
    messages: chat.messages,
    property,
    receivedAt: time,
  });

  // Keep last 50 transcripts
  if (chatStore.transcripts.length > 50) {
    chatStore.transcripts.pop();
  }

  addEvent(data);
}

export function handleTicketCreated(data: any) {
  addEvent(data);
}

function addEvent(data: any) {
  const event: WebhookEvent = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    event: data.event,
    chatId: data.chatId || data.chat?.id,
    visitor: data.visitor || data.chat?.visitor || data.requester,
    property: data.property,
    message: data.message,
    messages: data.chat?.messages,
    raw: data,
  };

  chatStore.events.unshift(event);

  // Keep last 100 events
  if (chatStore.events.length > 100) {
    chatStore.events.pop();
  }
}

export function getData() {
  return {
    activeChats: Array.from(chatStore.activeChats.values()),
    transcripts: chatStore.transcripts,
    events: chatStore.events,
  };
}

export function getEvents() {
  return chatStore.events;
}