import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  if (!cookieStore.get("dash_session")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chatId = req.nextUrl.searchParams.get("chat_id");
  if (!chatId) return NextResponse.json({ error: "chat_id required" }, { status: 400 });

  const history = await sql`
    SELECT * FROM sales_lead_history
    WHERE chat_id = ${chatId}
    ORDER BY saved_at DESC
  `;

  return NextResponse.json({ history });
}
