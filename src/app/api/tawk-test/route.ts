import { NextRequest, NextResponse } from "next/server";
import { addMessage, getMessages } from "@/lib/messages";

export async function GET() {
  return NextResponse.json({
    status: "Webhook endpoint is live!",
    messageCount: getMessages().length,
    messages: getMessages(),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  console.log("LIVE TAWK DATA:", body);

  const saved = addMessage(body);

  return NextResponse.json({
    success: true,
    received: body,
    saved: saved,
  });
}