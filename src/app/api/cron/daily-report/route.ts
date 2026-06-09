import { NextRequest, NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { getDailyReport, getReportWindow } from "@/lib/report";
import { buildReportPdf } from "@/lib/report-pdf";
import { sendDailyReportEmail } from "@/lib/email";

// Runs at request time only (cron-triggered); never prerender.
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
  // If no secret configured, fall back to Vercel's cron header.
  if (!secret) return req.headers.get("x-vercel-cron") !== null;

  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  // Allow manual/testing trigger with ?key=<secret>
  if (req.nextUrl.searchParams.get("key") === secret) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureDbInit();

  try {
    // Optional override for backfill/testing: ?date=YYYY-MM-DD
    // = the morning (09:00 IST) that ENDS the window.
    const dateParam = req.nextUrl.searchParams.get("date");
    let start: Date, end: Date;
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      end = new Date(`${dateParam}T03:30:00.000Z`); // 09:00 IST
      start = new Date(end);
      start.setUTCDate(start.getUTCDate() - 1);
    } else {
      ({ start, end } = getReportWindow());
    }

    const report = await getDailyReport(start, end);

    // PDF is best-effort: if it fails, still send the email with all numbers.
    let pdf: Buffer | null = null;
    try {
      pdf = await buildReportPdf(report);
    } catch (e) {
      console.error("PDF generation failed (sending email without it):", e);
    }

    await sendDailyReportEmail(report, pdf);

    return NextResponse.json({
      success: true,
      window: { start: report.start, end: report.end },
      totalChats: report.totalChats,
      leadsWithContact: report.leadsWithContact,
      pdf: pdf !== null,
    });
  } catch (e) {
    console.error("Daily report error:", e);
    return NextResponse.json({ error: "Report failed" }, { status: 500 });
  }
}
