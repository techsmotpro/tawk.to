import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { upsertSalesLead } from "@/lib/sales";
import { initDb } from "@/lib/db";

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

export async function POST(req: Request) {
  // Only the sales admin (extra OTP gate) may write
  const cookieStore = await cookies();
  if (cookieStore.get("sales_session")?.value !== "true") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureDbInit();

  try {
    const body = await req.json();
    if (!body.chat_id) {
      return NextResponse.json({ error: "chat_id is required" }, { status: 400 });
    }

    const premiumRaw = body.premium_amount;
    const premium_amount =
      premiumRaw === "" || premiumRaw === null || premiumRaw === undefined
        ? null
        : Number(premiumRaw);

    const lead = await upsertSalesLead({
      chat_id: String(body.chat_id),
      edited_name: body.edited_name ?? null,
      edited_phone: body.edited_phone ?? null,
      edited_info: body.edited_info ?? null,
      status: body.status || "New",
      converted: Boolean(body.converted),
      premium_amount:
        premium_amount !== null && !Number.isNaN(premium_amount)
          ? premium_amount
          : null,
      premium_collected: Boolean(body.premium_collected),
      updated_in_crm: Boolean(body.updated_in_crm),
      remarks: body.remarks ?? null,
      updated_by: body.updated_by ?? null,
    });

    return NextResponse.json({ success: true, lead });
  } catch (e) {
    console.error("Sales lead save error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
