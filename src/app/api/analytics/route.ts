import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";

export async function GET() {
  const cookieStore = await cookies();
  if (!cookieStore.get("dash_session")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    totals,
    chatsPerDay,
    chatsByHour,
    chatsByProperty,
    statusBreakdown,
    topCountries,
    revenueStats,
  ] = await Promise.all([
    // Total / today / week / month counts + converted
    sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE started_at >= NOW() - INTERVAL '1 day')::int AS today,
        COUNT(*) FILTER (WHERE started_at >= NOW() - INTERVAL '7 days')::int AS this_week,
        COUNT(*) FILTER (WHERE started_at >= NOW() - INTERVAL '30 days')::int AS this_month
      FROM chats
    `,

    // Chats per day — all time
    sql`
      SELECT
        TO_CHAR(started_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS date,
        COUNT(*)::int AS count
      FROM chats
      WHERE started_at IS NOT NULL
      GROUP BY 1
      ORDER BY 1
    `,

    // Chats by hour of day (IST)
    sql`
      SELECT
        EXTRACT(HOUR FROM started_at AT TIME ZONE 'Asia/Kolkata')::int AS hour,
        COUNT(*)::int AS count
      FROM chats
      WHERE started_at IS NOT NULL
      GROUP BY 1
      ORDER BY 1
    `,

    // Chats by property (top 10)
    sql`
      SELECT
        COALESCE(property_name, 'Unknown') AS property,
        COUNT(*)::int AS count
      FROM chats
      GROUP BY 1
      ORDER BY 2 DESC
      LIMIT 10
    `,

    // Sales status breakdown
    sql`
      SELECT
        COALESCE(sl.status, 'No Status') AS status,
        COUNT(*)::int AS count
      FROM chats c
      LEFT JOIN sales_leads sl ON c.chat_id = sl.chat_id
      GROUP BY 1
      ORDER BY 2 DESC
    `,

    // Top countries (top 10)
    sql`
      SELECT
        COALESCE(visitor_country, 'Unknown') AS country,
        COUNT(*)::int AS count
      FROM chats
      GROUP BY 1
      ORDER BY 2 DESC
      LIMIT 10
    `,

    // Revenue: converted leads + all pipeline + collected
    sql`
      SELECT
        COUNT(*) FILTER (WHERE converted = true)::int AS converted_count,
        COALESCE(SUM(premium_amount), 0)::numeric AS total_revenue,
        COALESCE(SUM(premium_amount) FILTER (WHERE premium_collected = true), 0)::numeric AS collected_revenue
      FROM sales_leads
    `,
  ]);

  return NextResponse.json({
    totals: totals[0],
    revenue: revenueStats[0],
    chatsPerDay,
    chatsByHour,
    chatsByProperty,
    statusBreakdown,
    topCountries,
  });
}
