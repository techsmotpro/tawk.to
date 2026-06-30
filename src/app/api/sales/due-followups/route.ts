import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";

export async function GET() {
  const cookieStore = await cookies();
  if (!cookieStore.get("dash_session")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Due = past the followup time but within last 24h (so stale ones don't keep ringing forever)
  const due = await sql`
    SELECT
      sl.chat_id,
      sl.followup_at,
      sl.status,
      COALESCE(sl.edited_name, c.visitor_name) AS name,
      COALESCE(sl.edited_phone, c.visitor_phone) AS phone,
      c.property_name
    FROM sales_leads sl
    JOIN chats c ON c.chat_id = sl.chat_id
    WHERE sl.followup_at IS NOT NULL
      AND sl.followup_at <= NOW()
      AND sl.followup_at >= NOW() - INTERVAL '24 hours'
    ORDER BY sl.followup_at ASC
  `;

  return NextResponse.json({ due });
}
