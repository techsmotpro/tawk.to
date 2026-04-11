import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import {
  handleChatStart,
  handleChatEnd,
  handleTranscriptCreated,
  handleTicketCreated,
  getData,
} from "@/lib/messages";
import { initDb } from "@/lib/db";

const WEBHOOK_SECRET = process.env.TAWKTO_WEBHOOK_SECRET;

// Initialize DB on first request
let dbInitialized = false;

async function ensureDbInit() {
  if (!dbInitialized) {
    try {
      await initDb();
      dbInitialized = true;
    } catch (e) {
      console.error("DB init error:", e);
    }
  }
}

function verifySignature(body: string, signature: string): boolean {
  if (!WEBHOOK_SECRET || !signature) return false;

  const digest = createHmac("sha1", WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  return signature === digest;
}

export async function GET() {
  await ensureDbInit();

  try {
    const data = await getData();
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await ensureDbInit();

  // Get raw body for signature verification
  const rawBody = await req.text();
  const signature = req.headers.get("x-tawk-signature") || "";

  // Verify signature
  if (!verifySignature(rawBody, signature)) {
    console.log("❌ Webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Parse payload
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    console.log("❌ Invalid JSON payload");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event } = payload;

  console.log(`\n📨 Webhook received: ${event}`);

  // Handle different events
  try {
    switch (event) {
      case "chat:start":
        await handleChatStart(payload);
        console.log(`🔔 NEW CHAT: ${payload.visitor?.name} from ${payload.visitor?.city}, ${payload.visitor?.country}`);
        break;

      case "chat:end":
        await handleChatEnd(payload);
        console.log(`🏁 CHAT ENDED: ${payload.chatId}`);
        break;

      case "chat:transcript_created":
        await handleTranscriptCreated(payload);
        console.log(`📝 TRANSCRIPT: ${payload.chat?.visitor?.name} - ${payload.chat?.messages?.length} messages`);
        break;

      case "ticket:create":
        await handleTicketCreated(payload);
        console.log(`🎫 NEW TICKET: #${payload.ticket?.humanId}`);
        break;

      default:
        console.log(`📌 Unknown event: ${event}`);
    }
  } catch (e) {
    console.error("Handler error:", e);
  }

  return NextResponse.json({ received: true, event });
}