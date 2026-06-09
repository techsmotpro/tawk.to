import { NextResponse } from "next/server";
import { getAllTranscripts } from "@/lib/messages";
import { initDb } from "@/lib/db";

// Pulls from the DB at request time — never prerender at build.
export const dynamic = "force-dynamic";

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

// Returns ALL transcripts (no pagination) for full Excel/CSV export.
export async function GET() {
  await ensureDbInit();

  try {
    const data = await getAllTranscripts();
    return NextResponse.json(data);
  } catch (e) {
    console.error("Export error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
