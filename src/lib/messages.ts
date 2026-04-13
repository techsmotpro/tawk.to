import { sql } from "./db";
import { sendNewChatEmail, sendTranscriptEmail, sendTicketEmail } from "./email";

// Parse visitor info from message text (Name, Phone, Location)
function parseVisitorInfo(messageText?: string) {
  if (!messageText) return null;
  const nameMatch = messageText.match(/Name\s*:\s*([^\r\n]+)/i);
  const phoneMatch = messageText.match(/Phone\s*:\s*([^\r\n]+)/i);
  const locationMatch = messageText.match(/Location\s*:\s*([^\r\n]+)/i);
  return {
    name: nameMatch?.[1]?.trim() || null,
    phone: phoneMatch?.[1]?.trim() || null,
    location: locationMatch?.[1]?.trim() || null,
  };
}

// Types
interface Visitor {
  name: string;
  email?: string;
  city: string;
  country: string;
}

interface Message {
  sender: {
    t: string;
    n?: string;
    id?: string;
  };
  type: string;
  msg: string;
  time: string;
  attchs?: any[];
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

// In-memory store for quick access (backup)
const chatStore = {
  activeChats: new Map<string, any>(),
  transcripts: [] as any[],
  events: [] as WebhookEvent[],
};

// Handle chat start - save to DB and send email
export async function handleChatStart(data: any) {
  const { chatId, visitor, message, property, time } = data;

  // Parse visitor info from first message
  const visitorInfo = parseVisitorInfo(message?.text);

  // Save to database
  await sql`
    INSERT INTO chats (chat_id, visitor_name, visitor_email, visitor_phone, visitor_city, visitor_country, property_id, property_name, status, started_at)
    VALUES (${chatId}, ${visitor?.name}, ${visitor?.email}, ${visitorInfo?.phone || visitor?.phone || null}, ${visitor?.city}, ${visitor?.country}, ${property?.id}, ${property?.name}, 'active', ${time})
    ON CONFLICT (chat_id) DO UPDATE SET
      visitor_name = EXCLUDED.visitor_name,
      visitor_email = EXCLUDED.visitor_email,
      visitor_phone = COALESCE(EXCLUDED.visitor_phone, chats.visitor_phone),
      status = 'active'
  `;

  // Save first message
  if (message?.text) {
    await sql`
      INSERT INTO messages (chat_id, sender_type, sender_name, message_type, message_text, sent_at)
      VALUES (${chatId}, ${message.sender?.type || 'visitor'}, ${message.sender?.type === 'agent' ? message.sender?.name : visitor?.name}, ${message.type}, ${message.text}, ${time})
    `;
  }

  // Also update memory store
  chatStore.activeChats.set(chatId, {
    chatId,
    visitor,
    property,
    startTime: time,
    firstMessage: message,
  });

  addEvent(data);

  // Send email notification
  await sendNewChatEmail({
    visitorName: visitorInfo?.name || visitor?.name || "Unknown",
    visitorEmail: visitor?.email,
    visitorCity: visitor?.city || "Unknown",
    visitorCountry: visitor?.country || "Unknown",
    propertyName: property?.name || "Unknown",
    phone: visitorInfo?.phone || undefined,
    message: message?.text || undefined,
  });

  console.log(`✅ Chat saved to DB: ${chatId} - ${visitor?.name}`);
}

// Handle chat end - update DB
export async function handleChatEnd(data: any) {
  const { chatId, time } = data;

  await sql`
    UPDATE chats SET status = 'ended', ended_at = ${time}
    WHERE chat_id = ${chatId}
  `;

  chatStore.activeChats.delete(chatId);
  addEvent(data);

  console.log(`🏁 Chat ended in DB: ${chatId}`);
}

// Handle transcript - save all messages to DB and send email
export async function handleTranscriptCreated(data: any) {
  const { chat, time, property } = data;

  // Update chat status and phone
  const visitorInfo = parseVisitorInfo(chat.messages?.find((m: any) => m.sender?.t === "v")?.msg);
  await sql`
    UPDATE chats SET status = 'transcript',
      visitor_phone = COALESCE(${visitorInfo?.phone || null}, visitor_phone)
    WHERE chat_id = ${chat.id}
  `;

  // Clear existing messages for this chat (to avoid duplicates)
  await sql`DELETE FROM messages WHERE chat_id = ${chat.id}`;

  // Insert all messages
  for (const msg of chat.messages) {
    await sql`
      INSERT INTO messages (chat_id, sender_type, sender_name, message_type, message_text, sent_at)
      VALUES (${chat.id}, ${msg.sender?.t}, ${msg.sender?.n || chat.visitor?.name}, ${msg.type}, ${msg.msg}, ${msg.time})
    `;
  }

  const transcript = {
    chatId: chat.id,
    visitor: chat.visitor,
    messages: chat.messages,
    property,
    receivedAt: time,
  };

  chatStore.transcripts.unshift(transcript);
  if (chatStore.transcripts.length > 50) chatStore.transcripts.pop();

  addEvent(data);

  // Send transcript email
  await sendTranscriptEmail({
    visitorName: visitorInfo?.name || chat.visitor?.name || "Unknown",
    visitorEmail: chat.visitor?.email,
    visitorCity: chat.visitor?.city || "Unknown",
    visitorCountry: chat.visitor?.country || "Unknown",
    propertyName: property?.name || "Unknown",
    phone: visitorInfo?.phone || undefined,
    messages: chat.messages.map((m: any) => ({
      sender_type: m.sender?.t,
      sender_name: m.sender?.n,
      message_text: m.msg,
    })),
  });

  console.log(`📝 Transcript saved: ${chat.id} - ${chat.messages.length} messages`);
}

// Handle ticket created - save to DB and send email
export async function handleTicketCreated(data: any) {
  const { ticket, requester, property, time } = data;

  await sql`
    INSERT INTO tickets (ticket_id, ticket_human_id, subject, message, requester_name, requester_email, requester_type, property_id, property_name)
    VALUES (${ticket.id}, ${ticket.humanId}, ${ticket.subject}, ${ticket.message}, ${requester.name}, ${requester.email}, ${requester.type}, ${property?.id}, ${property?.name})
    ON CONFLICT (ticket_id) DO NOTHING
  `;

  addEvent(data);

  // Send ticket email
  await sendTicketEmail({
    ticketId: ticket.id,
    ticketHumanId: ticket.humanId,
    subject: ticket.subject,
    message: ticket.message,
    requesterName: requester.name,
    requesterEmail: requester.email,
    propertyName: property?.name || "Unknown",
  });

  console.log(`🎫 Ticket saved: #${ticket.humanId}`);
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
  if (chatStore.events.length > 100) chatStore.events.pop();
}

// Get all data from DB
export async function getData() {
  const activeChats = await sql`
    SELECT * FROM chats WHERE status = 'active' ORDER BY started_at DESC
  `;

  // Get messages for each active chat
  for (const chat of activeChats) {
    chat.messages = await sql`
      SELECT * FROM messages WHERE chat_id = ${chat.chat_id} ORDER BY sent_at ASC
    `;
  }

  const transcripts = await sql`
    SELECT c.*, COUNT(m.id) as message_count
    FROM chats c
    LEFT JOIN messages m ON c.chat_id = m.chat_id
    WHERE c.status IN ('transcript', 'ended')
    GROUP BY c.id
    ORDER BY c.ended_at DESC NULLS LAST
    LIMIT 50
  `;

  // Get messages for each transcript
  for (const t of transcripts) {
    t.messages = await sql`
      SELECT * FROM messages WHERE chat_id = ${t.chat_id} ORDER BY sent_at ASC
    `;
  }

  return {
    activeChats,
    transcripts,
  };
}

// Export memory store for backwards compatibility
export { chatStore };