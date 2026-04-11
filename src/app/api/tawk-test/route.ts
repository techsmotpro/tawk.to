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
  // Verify the request is from Tawk.to
  const authToken = req.headers.get("Authorization");
  const expectedToken = process.env.TAWK_API_TOKEN;

  if (!authToken || !expectedToken || authToken !== `Bearer ${expectedToken}`) {
    return NextResponse.json({
      success: false,
      error: "Unauthorized",
    }, { status: 401 });
  }

  const body = await req.json();

  console.log("LIVE TAWK DATA:", body);

  const saved = addMessage(body);

  return NextResponse.json({
    success: true,
    received: body,
    saved: saved,
  });
}
