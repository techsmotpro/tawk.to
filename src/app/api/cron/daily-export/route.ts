import { NextRequest, NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { getChatsForExport } from "@/lib/messages";
import { sendDailyCsvEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return req.headers.get("x-vercel-cron") !== null;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  if (req.nextUrl.searchParams.get("key") === secret) return true;
  return false;
}

function buildCsv(chats: any[]): string {
  const toIST = (iso: string) =>
    iso
      ? new Date(iso).toLocaleString("en-GB", {
          timeZone: "Asia/Kolkata",
          hour12: true,
        })
      : "";

  const toISTTime = (iso: string) =>
    iso
      ? new Date(iso).toLocaleTimeString("en-GB", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "";

  const parseInfo = (messages: any[]) => {
    if (!messages?.length) return { name: null, phone: null, location: null };
    const vis = messages.filter(
      (m) => m.sender_type === "v" || m.sender_type === "visitor"
    );
    const pool = vis.length > 0 ? vis : messages;
    const target =
      pool.find((m) => /Phone\s*:/i.test(m.message_text || "")) || pool[0];
    const text = target?.message_text || "";
    return {
      name: text.match(/Name\s*:\s*([^\r\n]+)/i)?.[1]?.trim() || null,
      phone: text.match(/Phone\s*:\s*([^\r\n]+)/i)?.[1]?.trim() || null,
      location:
        text.match(/Location\s*:\s*([^\r\n]+)/i)?.[1]?.trim() || null,
    };
  };

  const header = [
    "Property",
    "Date & Time",
    "Name",
    "Phone",
    "Email",
    "Location",
    "Visitor Location",
    "Sales Status",
    "Converted",
    "Premium Amount",
    "Premium Collected",
    "Updated in CRM",
    "Other Info",
    "Remarks",
    "Message Count",
    "Conversation",
  ];

  const rows = chats.map((c) => {
    const info = parseInfo(c.messages || []);
    const s = c.sales;
    const conversation = (c.messages || [])
      .map((m: any) => {
        const who =
          m.sender_type === "v" || m.sender_type === "visitor"
            ? "Visitor"
            : m.sender_name || "Agent";
        return `[${toISTTime(m.sent_at)}] ${who}: ${m.message_text}`;
      })
      .join(" | ");
    return [
      c.property_name || "",
      toIST(c.created_at),
      s?.edited_name || info.name || c.visitor_name || "",
      s?.edited_phone || info.phone || c.visitor_phone || "",
      c.visitor_email || "",
      `${c.visitor_city || ""}, ${c.visitor_country || ""}`,
      info.location || "",
      s?.status || "",
      s?.converted ? "Yes" : "No",
      s?.premium_amount != null ? s.premium_amount : "",
      s?.premium_collected ? "Yes" : "No",
      s?.updated_in_crm ? "Yes" : "No",
      s?.edited_info || "",
      s?.remarks || "",
      c.messages?.length || 0,
      conversation,
    ];
  });

  return [header, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureDbInit();

  try {
    // Default: yesterday IST. Override with ?date=YYYY-MM-DD for backfill.
    const dateParam = req.nextUrl.searchParams.get("date");
    let exportDate: string;
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      exportDate = dateParam;
    } else {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      exportDate = yesterday.toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
      });
    }

    const { chats, total } = await getChatsForExport(exportDate);

    if (total === 0) {
      return NextResponse.json({
        success: true,
        date: exportDate,
        total: 0,
        note: "No chats to export",
      });
    }

    const csv = buildCsv(chats as any[]);
    await sendDailyCsvEmail(csv, exportDate);

    return NextResponse.json({ success: true, date: exportDate, total });
  } catch (e) {
    console.error("Daily export error:", e);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
