import { sql } from "./db";
import { SALES_STATUSES } from "./sales";

export interface ReportLead {
  chat_id: string;
  name: string;
  phone: string;
  email: string;
  property: string;
  created_at: string;
  chat_status: string;
  sales_status: string;
  converted: boolean;
  premium_amount: string | null;
  premium_collected: boolean;
  updated_in_crm: boolean;
  remarks: string | null;
}

export interface DailyReport {
  start: string; // ISO
  end: string; // ISO
  totalChats: number;
  leadsWithContact: number;
  statusBreakdown: { status: string; count: number }[];
  convertedCount: number;
  premiumTotal: number;
  premiumCollectedTotal: number;
  perProperty: { property: string; count: number }[];
  leads: ReportLead[];
}

// Build the full daily report for the half-open window [start, end).
// Every count is computed in SQL against chats.created_at so totals are exact.
export async function getDailyReport(start: Date, end: Date): Promise<DailyReport> {
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const totalRow = await sql`
    SELECT COUNT(*)::int AS n
    FROM chats
    WHERE created_at >= ${startIso} AND created_at < ${endIso}
  `;
  const totalChats = totalRow[0]?.n ?? 0;

  // "Lead with contact" = a real phone or email was captured
  // (visitor's own, or one the sales team added).
  const contactRow = await sql`
    SELECT COUNT(*)::int AS n
    FROM chats c
    LEFT JOIN sales_leads s ON c.chat_id = s.chat_id
    WHERE c.created_at >= ${startIso} AND c.created_at < ${endIso}
      AND (
        NULLIF(TRIM(c.visitor_phone), '') IS NOT NULL OR
        NULLIF(TRIM(c.visitor_email), '') IS NOT NULL OR
        NULLIF(TRIM(s.edited_phone), '') IS NOT NULL
      )
  `;
  const leadsWithContact = contactRow[0]?.n ?? 0;

  const statusRows = await sql`
    SELECT COALESCE(NULLIF(TRIM(s.status), ''), 'New') AS status, COUNT(*)::int AS n
    FROM chats c
    LEFT JOIN sales_leads s ON c.chat_id = s.chat_id
    WHERE c.created_at >= ${startIso} AND c.created_at < ${endIso}
    GROUP BY COALESCE(NULLIF(TRIM(s.status), ''), 'New')
  `;
  const statusMap = new Map<string, number>();
  for (const r of statusRows) statusMap.set(r.status, r.n);
  // Keep a stable, known order; include zero-count statuses for clarity.
  const statusBreakdown: { status: string; count: number }[] = SALES_STATUSES.map(
    (status) => ({ status, count: statusMap.get(status) ?? 0 })
  );
  // Surface any unexpected/custom statuses too.
  for (const [status, count] of statusMap) {
    if (!SALES_STATUSES.includes(status as (typeof SALES_STATUSES)[number])) {
      statusBreakdown.push({ status, count });
    }
  }

  const aggRow = await sql`
    SELECT
      COUNT(*) FILTER (WHERE s.converted)::int AS converted_count,
      COALESCE(SUM(s.premium_amount), 0) AS premium_total,
      COALESCE(SUM(s.premium_amount) FILTER (WHERE s.premium_collected), 0) AS premium_collected_total
    FROM chats c
    LEFT JOIN sales_leads s ON c.chat_id = s.chat_id
    WHERE c.created_at >= ${startIso} AND c.created_at < ${endIso}
  `;
  const convertedCount = aggRow[0]?.converted_count ?? 0;
  const premiumTotal = Number(aggRow[0]?.premium_total ?? 0);
  const premiumCollectedTotal = Number(aggRow[0]?.premium_collected_total ?? 0);

  const propRows = await sql`
    SELECT COALESCE(NULLIF(TRIM(property_name), ''), 'Unknown') AS property, COUNT(*)::int AS n
    FROM chats
    WHERE created_at >= ${startIso} AND created_at < ${endIso}
    GROUP BY COALESCE(NULLIF(TRIM(property_name), ''), 'Unknown')
    ORDER BY n DESC
  `;
  const perProperty = propRows.map((r) => ({ property: r.property, count: r.n }));

  const leadRows = await sql`
    SELECT
      c.chat_id,
      COALESCE(NULLIF(TRIM(s.edited_name), ''), NULLIF(TRIM(c.visitor_name), ''), 'Unknown') AS name,
      COALESCE(NULLIF(TRIM(s.edited_phone), ''), NULLIF(TRIM(c.visitor_phone), ''), '') AS phone,
      COALESCE(NULLIF(TRIM(c.visitor_email), ''), '') AS email,
      COALESCE(NULLIF(TRIM(c.property_name), ''), 'Unknown') AS property,
      c.created_at,
      c.status AS chat_status,
      COALESCE(NULLIF(TRIM(s.status), ''), 'New') AS sales_status,
      COALESCE(s.converted, FALSE) AS converted,
      s.premium_amount,
      COALESCE(s.premium_collected, FALSE) AS premium_collected,
      COALESCE(s.updated_in_crm, FALSE) AS updated_in_crm,
      s.remarks
    FROM chats c
    LEFT JOIN sales_leads s ON c.chat_id = s.chat_id
    WHERE c.created_at >= ${startIso} AND c.created_at < ${endIso}
    ORDER BY c.created_at ASC
  `;

  return {
    start: startIso,
    end: endIso,
    totalChats,
    leadsWithContact,
    statusBreakdown,
    convertedCount,
    premiumTotal,
    premiumCollectedTotal,
    perProperty,
    leads: leadRows as ReportLead[],
  };
}

// Most recent 09:00 IST that has already passed, and the 24h window before it.
// IST is UTC+5:30, so 09:00 IST == 03:30 UTC.
export function getReportWindow(now = new Date()): { start: Date; end: Date } {
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 3, 30, 0, 0)
  );
  // If we're before today's 03:30 UTC boundary, the last cycle ended yesterday.
  if (end.getTime() > now.getTime()) {
    end.setUTCDate(end.getUTCDate() - 1);
  }
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 1);
  return { start, end };
}
