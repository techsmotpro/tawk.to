"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface AnalyticsData {
  totals: {
    total: number;
    today: number;
    this_week: number;
    this_month: number;
  };
  revenue: {
    converted_count: number;
    total_revenue: string;
    collected_revenue: string;
  };
  chatsPerDay: { date: string; count: number }[];
  chatsByHour: { hour: number; count: number }[];
  chatsByProperty: { property: string; count: number }[];
  statusBreakdown: { status: string; count: number }[];
  topCountries: { country: string; count: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  New: "#6b7280",
  Contacted: "#3b82f6",
  "Follow-up": "#f59e0b",
  Converted: "#10b981",
  Lost: "#ef4444",
  "Double Entry": "#f97316",
  "No Status": "#d1d5db",
};

const CHART_COLORS = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16"];

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <p className="text-xs font-semibold text-black uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-bold text-black">{value}</p>
      {sub && <p className="text-xs text-black/50 mt-1">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-bold text-black uppercase tracking-wide mb-3">{children}</h2>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then(setData)
      .catch(() => setError("Could not load analytics data."))
      .finally(() => setLoading(false));
  }, []);

  // Fill all 24 hours for the hour chart so gaps look intentional
  const hourData = Array.from({ length: 24 }, (_, h) => ({
    hour: `${String(h).padStart(2, "0")}:00`,
    count: data?.chatsByHour.find((d) => d.hour === h)?.count ?? 0,
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading analytics…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-500">{error ?? "No data"}</p>
      </div>
    );
  }

  const fmtCurrency = (v: string) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(v));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-black">Analytics</h1>
          <p className="text-xs text-black/50 mt-0.5">Live chat & sales overview</p>
        </div>
        <a
          href="/dashboard"
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Dashboard
        </a>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-10">
        {/* Stats row */}
        <section>
          <SectionTitle>Overview</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Total Chats" value={data.totals.total.toLocaleString()} />
            <StatCard label="Today" value={data.totals.today} />
            <StatCard label="This Week" value={data.totals.this_week} />
            <StatCard label="This Month" value={data.totals.this_month} />
            <StatCard
              label="Converted"
              value={data.revenue.converted_count}
              sub="leads"
            />
            <StatCard
              label="Revenue"
              value={fmtCurrency(data.revenue.total_revenue)}
              sub={`${fmtCurrency(data.revenue.collected_revenue)} collected`}
            />
          </div>
        </section>

        {/* Chats per day */}
        <section>
          <SectionTitle>Chats per Day — All Time</SectionTitle>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.chatsPerDay} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="chatGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#000" }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: "#000" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, color: "#000", border: "1px solid #000" }}
                  labelStyle={{ color: "#000", fontWeight: 700 }}
                  itemStyle={{ color: "#000" }}
                  formatter={(v) => [v, "Chats"]}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#chatGrad)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Hour + Status side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section>
            <SectionTitle>Chats by Hour (when do people chat?)</SectionTitle>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={hourData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#000" }} interval={3} />
                  <YAxis tick={{ fontSize: 11, fill: "#000" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, color: "#000", border: "1px solid #000" }}
                  labelStyle={{ color: "#000", fontWeight: 700 }}
                  itemStyle={{ color: "#000" }} formatter={(v) => [v, "Chats"]} />
                  <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section>
            <SectionTitle>Sales Status Breakdown</SectionTitle>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-6">
              <ResponsiveContainer width="55%" height={240}>
                <PieChart>
                  <Pie
                    data={data.statusBreakdown}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {data.statusBreakdown.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.status] ?? CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, color: "#000", border: "1px solid #000" }}
                  labelStyle={{ color: "#000", fontWeight: 700 }}
                  itemStyle={{ color: "#000" }} formatter={(v) => [v, "Chats"]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {data.statusBreakdown.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: STATUS_COLORS[entry.status] ?? CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="text-black truncate">{entry.status}</span>
                    <span className="ml-auto font-bold text-black">{entry.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Property + Country side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section>
            <SectionTitle>Chats by Property</SectionTitle>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  layout="vertical"
                  data={data.chatsByProperty}
                  margin={{ top: 4, right: 24, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#000" }} allowDecimals={false} />
                  <YAxis type="category" dataKey="property" tick={{ fontSize: 11, fill: "#000" }} width={110} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, color: "#000", border: "1px solid #000" }}
                  labelStyle={{ color: "#000", fontWeight: 700 }}
                  itemStyle={{ color: "#000" }} formatter={(v) => [v, "Chats"]} />
                  <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                    {data.chatsByProperty.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section>
            <SectionTitle>Top Countries</SectionTitle>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  layout="vertical"
                  data={data.topCountries}
                  margin={{ top: 4, right: 24, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#000" }} allowDecimals={false} />
                  <YAxis type="category" dataKey="country" tick={{ fontSize: 11, fill: "#000" }} width={60} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, color: "#000", border: "1px solid #000" }}
                  labelStyle={{ color: "#000", fontWeight: 700 }}
                  itemStyle={{ color: "#000" }} formatter={(v) => [v, "Chats"]} />
                  <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                    {data.topCountries.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
