"use client";

import { useEffect, useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface AnalyticsData {
  totals: { total: number; today: number; this_week: number; this_month: number };
  revenue: { converted_count: number; total_revenue: string; collected_revenue: string };
  chatsPerDay: { date: string; count: number }[];
  chatsByHour: { hour: number; count: number }[];
  chatsByProperty: { property: string; count: number }[];
  statusBreakdown: { status: string; count: number }[];
  topCountries: { country: string; count: number }[];
}

interface DbChat {
  chat_id: string;
  visitor_name: string;
  visitor_email: string | null;
  visitor_phone: string | null;
  visitor_city: string;
  visitor_country: string;
  property_name: string | null;
  status: string;
  created_at: string;
  ended_at: string | null;
  messages?: { id: number; sender_type: string; sender_name: string | null; message_text: string; sent_at: string }[];
  sales?: {
    edited_name: string | null; edited_phone: string | null; edited_info: string | null;
    status: string; converted: boolean; premium_amount: string | null;
    premium_collected: boolean; updated_in_crm: boolean; remarks: string | null;
  } | null;
}

const STATUS_COLORS: Record<string, string> = {
  New: "#6b7280", Contacted: "#3b82f6", "Follow-up": "#f59e0b",
  Converted: "#10b981", Lost: "#ef4444", "Double Entry": "#f97316",
};

const SALES_STATUS_COLORS: Record<string, string> = {
  New: "bg-gray-100 text-gray-700", Contacted: "bg-blue-100 text-blue-700",
  "Follow-up": "bg-yellow-100 text-yellow-700", Converted: "bg-green-100 text-green-700",
  Lost: "bg-red-100 text-red-700", "Double Entry": "bg-orange-100 text-orange-700",
};

const CHART_COLORS = ["#6366f1","#06b6d4","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316","#84cc16"];

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

  // History browser state
  const [histSearch, setHistSearch] = useState("");
  const [histProperty, setHistProperty] = useState("all");
  const [histSingleDate, setHistSingleDate] = useState("");
  const [histDateFrom, setHistDateFrom] = useState("");
  const [histDateTo, setHistDateTo] = useState("");
  const [histChats, setHistChats] = useState<DbChat[]>([]);
  const [histTotal, setHistTotal] = useState(0);
  const [histOffset, setHistOffset] = useState(0);
  const [histPageSize, setHistPageSize] = useState(500);
  const [histLoading, setHistLoading] = useState(false);
  const [histLoaded, setHistLoaded] = useState(false);
  const [histError, setHistError] = useState("");

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => { if (!r.ok) throw new Error("Failed to load"); return r.json(); })
      .then(setData)
      .catch(() => setError("Could not load analytics data."))
      .finally(() => setLoading(false));
  }, []);

  const hourData = Array.from({ length: 24 }, (_, h) => ({
    hour: `${String(h).padStart(2, "0")}:00`,
    count: data?.chatsByHour.find((d) => d.hour === h)?.count ?? 0,
  }));

  const loadHistory = async (offset = 0, append = false) => {
    if (!histSingleDate && !histDateFrom && !histDateTo) {
      setHistError("Pick a date or date range first.");
      return;
    }
    setHistLoading(true);
    setHistError("");
    try {
      let url = `/api/webhooks/tawkto?offset=${offset}`;
      if (histSingleDate) {
        url += `&date=${histSingleDate}`;
      } else {
        if (histDateFrom) url += `&dateFrom=${histDateFrom}`;
        if (histDateTo) url += `&dateTo=${histDateTo}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      const chats = json.transcripts || [];
      if (append) {
        setHistChats((prev) => [...prev, ...chats]);
      } else {
        setHistChats(chats);
      }
      setHistTotal(json.total || 0);
      setHistOffset(offset);
      setHistPageSize(json.pageSize || 500);
      setHistLoaded(true);
    } catch {
      setHistError("Failed to load. Try again.");
    } finally {
      setHistLoading(false);
    }
  };

  const histProperties = useMemo(() => {
    const s = new Set<string>();
    histChats.forEach((c) => { if (c.property_name) s.add(c.property_name); });
    return Array.from(s);
  }, [histChats]);

  const filteredHistChats = useMemo(() => {
    const q = histSearch.toLowerCase();
    return histChats.filter((c) => {
      const matchSearch = q === "" ||
        c.visitor_name?.toLowerCase().includes(q) ||
        c.visitor_email?.toLowerCase().includes(q) ||
        c.visitor_phone?.toLowerCase().includes(q) ||
        c.messages?.some((m) => m.message_text?.toLowerCase().includes(q));
      const matchProp = histProperty === "all" || c.property_name === histProperty;
      return matchSearch && matchProp;
    });
  }, [histChats, histSearch, histProperty]);

  const fmtTime = (t: string) => t ? new Date(t).toLocaleString("en-GB", { timeZone: "Asia/Kolkata", hour12: true }) : "";
  const fmtShort = (t: string) => t ? new Date(t).toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true }) : "";
  const fmtDate = (t: string) => t ? new Date(t).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" }) : "";

  const parseInfo = (messages?: DbChat["messages"]) => {
    if (!messages?.length) return null;
    const vis = messages.filter((m) => m.sender_type === "v" || m.sender_type === "visitor");
    const pool = vis.length > 0 ? vis : messages;
    const target = pool.find((m) => /Phone\s*:/i.test(m.message_text || "")) || pool[0];
    const text = target?.message_text || "";
    return {
      name: text.match(/Name\s*:\s*([^\r\n]+)/i)?.[1]?.trim() || null,
      phone: text.match(/Phone\s*:\s*([^\r\n]+)/i)?.[1]?.trim() || null,
      location: text.match(/Location\s*:\s*([^\r\n]+)/i)?.[1]?.trim() || null,
    };
  };

  const getFlag = (c: string) => ({ IN:"🇮🇳",US:"🇺🇸",GB:"🇬🇧",UK:"🇬🇧",CA:"🇨🇦",AU:"🇦🇺",DE:"🇩🇪",FR:"🇫🇷" }[c] || "🌍");

  const downloadHistCsv = () => {
    const toExport = filteredHistChats;
    if (!toExport.length) { alert("No chats to export."); return; }
    const rows = toExport.map((c) => {
      const info = parseInfo(c.messages);
      const s = c.sales;
      const convo = (c.messages || []).map((m) => {
        const who = m.sender_type === "v" || m.sender_type === "visitor" ? "Visitor" : m.sender_name || "Agent";
        return `[${fmtShort(m.sent_at)}] ${who}: ${m.message_text}`;
      }).join(" | ");
      return [
        c.property_name || "", fmtTime(c.created_at),
        s?.edited_name || info?.name || c.visitor_name || "",
        s?.edited_phone || info?.phone || c.visitor_phone || "",
        c.visitor_email || "",
        `${c.visitor_city || ""}, ${c.visitor_country || ""}`,
        info?.location || "",
        s?.status || "", s?.converted ? "Yes" : "No",
        s?.premium_amount != null ? s.premium_amount : "",
        s?.premium_collected ? "Yes" : "No", s?.updated_in_crm ? "Yes" : "No",
        s?.edited_info || "", s?.remarks || "",
        c.messages?.length || 0, convo,
      ];
    });
    const header = ["Property","Date & Time","Name","Phone","Email","Location","Visitor Location","Sales Status","Converted","Premium Amount","Premium Collected","Updated in CRM","Other Info","Remarks","Message Count","Conversation"];
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const label = histSingleDate || (histDateFrom || histDateTo ? `${histDateFrom||"start"}_to_${histDateTo||"end"}` : "history");
    a.download = `chats-${label}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmtCurrency = (v: string) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(v));

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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-black">Analytics</h1>
          <p className="text-xs text-black/50 mt-0.5">Live chat & sales overview</p>
        </div>
        <a href="/dashboard" className="text-sm text-indigo-600 hover:underline">← Dashboard</a>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-10">
        {/* Stats */}
        <section>
          <SectionTitle>Overview</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Total Chats" value={data.totals.total.toLocaleString()} />
            <StatCard label="Today" value={data.totals.today} />
            <StatCard label="This Week" value={data.totals.this_week} />
            <StatCard label="This Month" value={data.totals.this_month} />
            <StatCard label="Converted" value={data.revenue.converted_count} sub="leads" />
            <StatCard label="Pipeline" value={fmtCurrency(data.revenue.total_revenue)} sub={`${fmtCurrency(data.revenue.collected_revenue)} collected`} />
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
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, color: "#000", border: "1px solid #000" }} labelStyle={{ color: "#000", fontWeight: 700 }} itemStyle={{ color: "#000" }} formatter={(v) => [v, "Chats"]} />
                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fill="url(#chatGrad)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Hour + Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section>
            <SectionTitle>Chats by Hour (when do people chat?)</SectionTitle>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={hourData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#000" }} interval={3} />
                  <YAxis tick={{ fontSize: 11, fill: "#000" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, color: "#000", border: "1px solid #000" }} labelStyle={{ color: "#000", fontWeight: 700 }} itemStyle={{ color: "#000" }} formatter={(v) => [v, "Chats"]} />
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
                  <Pie data={data.statusBreakdown} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2}>
                    {data.statusBreakdown.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.status] ?? CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, color: "#000", border: "1px solid #000" }} labelStyle={{ color: "#000", fontWeight: 700 }} itemStyle={{ color: "#000" }} formatter={(v) => [v, "Chats"]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {data.statusBreakdown.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[entry.status] ?? CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-black truncate">{entry.status}</span>
                    <span className="ml-auto font-bold text-black">{entry.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Property + Country */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section>
            <SectionTitle>Chats by Property</SectionTitle>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart layout="vertical" data={data.chatsByProperty} margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#000" }} allowDecimals={false} />
                  <YAxis type="category" dataKey="property" tick={{ fontSize: 11, fill: "#000" }} width={110} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, color: "#000", border: "1px solid #000" }} labelStyle={{ color: "#000", fontWeight: 700 }} itemStyle={{ color: "#000" }} formatter={(v) => [v, "Chats"]} />
                  <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                    {data.chatsByProperty.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section>
            <SectionTitle>Top Countries</SectionTitle>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart layout="vertical" data={data.topCountries} margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#000" }} allowDecimals={false} />
                  <YAxis type="category" dataKey="country" tick={{ fontSize: 11, fill: "#000" }} width={60} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, color: "#000", border: "1px solid #000" }} labelStyle={{ color: "#000", fontWeight: 700 }} itemStyle={{ color: "#000" }} formatter={(v) => [v, "Chats"]} />
                  <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                    {data.topCountries.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        {/* ── Browse History ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <SectionTitle>Browse History</SectionTitle>
            {histLoaded && filteredHistChats.length > 0 && (
              <button onClick={downloadHistCsv} className="text-sm px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
                ⬇ Download CSV
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
            <div className="flex flex-wrap gap-3 items-end">
              {/* Single date */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Single date</label>
                <input
                  type="date"
                  value={histSingleDate}
                  onChange={(e) => { setHistSingleDate(e.target.value); setHistDateFrom(""); setHistDateTo(""); }}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div className="text-gray-400 self-center pb-1 font-medium">or range</div>

              {/* From */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={histDateFrom}
                  onChange={(e) => { setHistDateFrom(e.target.value); setHistSingleDate(""); }}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {/* To */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={histDateTo}
                  onChange={(e) => { setHistDateTo(e.target.value); setHistSingleDate(""); }}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {/* Search */}
              <div className="flex-1 min-w-48">
                <label className="block text-xs text-gray-500 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Name, email, phone, message…"
                  value={histSearch}
                  onChange={(e) => setHistSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {/* Property */}
              {histLoaded && histProperties.length > 0 && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Property</label>
                  <select
                    value={histProperty}
                    onChange={(e) => setHistProperty(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-black focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="all">All Properties</option>
                    {histProperties.map((p) => (<option key={p} value={p}>{p}</option>))}
                  </select>
                </div>
              )}

              {/* Load button */}
              <button
                onClick={() => loadHistory(0, false)}
                disabled={histLoading}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
              >
                {histLoading ? "Loading…" : "Load"}
              </button>

              {histLoaded && (
                <button
                  onClick={() => { setHistChats([]); setHistLoaded(false); setHistSearch(""); setHistProperty("all"); setHistSingleDate(""); setHistDateFrom(""); setHistDateTo(""); }}
                  className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                >
                  ✕ Clear
                </button>
              )}
            </div>

            {histError && <p className="text-red-500 text-sm mt-2">{histError}</p>}
          </div>

          {/* Results */}
          {histLoaded && (
            <>
              <p className="text-sm text-gray-500 mb-4">
                {histSearch || histProperty !== "all"
                  ? `${filteredHistChats.length} of ${histTotal} chats`
                  : `${histTotal} chats`}
              </p>

              {filteredHistChats.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <div className="text-gray-400 text-5xl mb-3">📭</div>
                  <p className="text-gray-600">No chats found for the selected filters.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredHistChats.map((chat) => {
                    const info = parseInfo(chat.messages);
                    return (
                      <div key={chat.chat_id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3">
                          <div className="text-white font-bold text-lg">{chat.property_name || "Unknown Property"}</div>
                          <div className="text-white/80 text-xs mt-1">{fmtDate(chat.created_at)} • {fmtShort(chat.created_at)}</div>
                        </div>
                        <div className="p-4">
                          {chat.sales && (
                            <div className="mb-3 flex flex-wrap gap-1.5">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SALES_STATUS_COLORS[chat.sales.status] || SALES_STATUS_COLORS.New}`}>{chat.sales.status}</span>
                              {chat.sales.converted && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">✓ Converted</span>}
                              {chat.sales.premium_collected && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">💰 Collected</span>}
                              {chat.sales.updated_in_crm && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">CRM ✓</span>}
                              {chat.sales.premium_amount != null && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700">₹{chat.sales.premium_amount}</span>}
                            </div>
                          )}
                          <div className="mb-2">
                            <span className="text-xs text-gray-500 uppercase tracking-wide">Name</span>
                            <div className="text-black font-semibold text-base">{chat.sales?.edited_name || info?.name || chat.visitor_name || "Not provided"}</div>
                          </div>
                          <div className="mb-2">
                            <span className="text-xs text-gray-500 uppercase tracking-wide">Phone</span>
                            <div className="text-black font-medium">{chat.sales?.edited_phone || info?.phone || chat.visitor_phone || "Not provided"}</div>
                          </div>
                          <div className="mb-2">
                            <span className="text-xs text-gray-500 uppercase tracking-wide">Location</span>
                            <div className="text-black">{getFlag(chat.visitor_country)} {chat.visitor_city}, {chat.visitor_country}{info?.location && <span className="text-gray-500"> ({info.location})</span>}</div>
                          </div>
                          {chat.messages && chat.messages.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <span className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Messages ({chat.messages.length})</span>
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {chat.messages.map((msg) => {
                                  const isVisitor = msg.sender_type === "v" || msg.sender_type === "visitor";
                                  return (
                                    <div key={msg.id} className="bg-gray-50 rounded-lg p-2">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                                          {isVisitor ? "👤 Visitor" : `🧑‍💼 ${msg.sender_name || "Agent"}`}
                                        </span>
                                        <span className="text-xs text-gray-400">{fmtShort(msg.sent_at)}</span>
                                      </div>
                                      <p className="text-sm text-black whitespace-pre-wrap">{msg.message_text}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Load More */}
              {histChats.length < histTotal && (
                <div className="text-center mt-6">
                  <button
                    onClick={() => loadHistory(histOffset + histPageSize, true)}
                    disabled={histLoading}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
                  >
                    {histLoading ? "Loading…" : `Load More (${histChats.length} of ${histTotal})`}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
