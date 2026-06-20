import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const chatId = req.nextUrl.searchParams.get("chat_id");
  if (!chatId) return NextResponse.json({ error: "chat_id required" }, { status: 400 });

  const notes = await sql`
    SELECT * FROM chat_notes
    WHERE chat_id = ${chatId}
    ORDER BY created_at ASC
  `;
  return NextResponse.json({ notes });
}

export async function POST(req: NextRequest) {
  const { chat_id, note_type, amount, note } = await req.json();
  if (!chat_id || !note?.trim()) {
    return NextResponse.json({ error: "chat_id and note required" }, { status: 400 });
  }

  const [newNote] = await sql`
    INSERT INTO chat_notes (chat_id, note_type, amount, note)
    VALUES (${chat_id}, ${note_type || "info"}, ${amount || null}, ${note.trim()})
    RETURNING *
  `;
  return NextResponse.json({ note: newNote });
}
