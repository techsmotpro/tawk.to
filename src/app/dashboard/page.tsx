"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import FollowupBell from "@/components/FollowupBell";

interface DbChat {
  id: number;
  chat_id: string;
  visitor_name: string;
  visitor_email: string | null;
  visitor_phone: string | null;
  visitor_city: string;
  visitor_country: string;
  property_id: string | null;
  property_name: string | null;
  status: string;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  message_count?: string;
  messages?: DbMessage[];
  sales?: SalesLead | null;
}

interface SalesLead {
  chat_id: string;
  edited_name: string | null;
  edited_phone: string | null;
  edited_info: string | null;
  status: string;
  converted: boolean;
  premium_amount: string | null;
  premium_collected: boolean;
  updated_in_crm: boolean;
  remarks: string | null;
  updated_by?: string | null;
  updated_at?: string | null;
}

interface DbMessage {
  id: number;
  chat_id: string;
  sender_type: string;
  sender_name: string | null;
  message_type: string;
  message_text: string;
  sent_at: string;
  created_at: string;
}

interface LeadHistory {
  id: number;
  chat_id: string;
  edited_name: string | null;
  edited_phone: string | null;
  edited_info: string | null;
  status: string;
  converted: boolean;
  premium_amount: string | null;
  premium_collected: boolean;
  updated_in_crm: boolean;
  remarks: string | null;
  updated_by: string | null;
  saved_at: string;
}

interface Data {
  activeChats: DbChat[];
  transcripts: DbChat[];
  total: number;
  date: string;
}

const SALES_STATUS_COLORS: Record<string, string> = {
  New: "bg-gray-100 text-gray-700",
  Contacted: "bg-blue-100 text-blue-700",
  "Follow-up": "bg-yellow-100 text-yellow-700",
  Converted: "bg-green-100 text-green-700",
  Lost: "bg-red-100 text-red-700",
  "Double Entry": "bg-orange-100 text-orange-700",
};

function getTodayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function shiftDay(dateStr: string, delta: number): string {
  const d = new Date(dateStr + "T12:00:00+05:30");
  d.setDate(d.getDate() + delta);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function displayDate(dateStr: string): string {
  const today = getTodayIST();
  if (dateStr === today) return "Today";
  if (dateStr === shiftDay(today, -1)) return "Yesterday";
  return new Date(dateStr + "T12:00:00+05:30").toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function Dashboard() {
  const [activeChats, setActiveChats] = useState<DbChat[]>([]);
  const [transcripts, setTranscripts] = useState<DbChat[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [viewDate, setViewDate] = useState<string>(getTodayIST());
  const [historyOpenIds, setHistoryOpenIds] = useState<Set<string>>(new Set());
  const [historyCache, setHistoryCache] = useState<Record<string, LeadHistory[]>>({});

  const isToday = viewDate === getTodayIST();

  const fetchData = useCallback(async (date: string) => {
    try {
      const res = await fetch(`/api/webhooks/tawkto?date=${date}`);
      const json: Data = await res.json();
      setActiveChats(json.activeChats || []);
      setTranscripts(json.transcripts || []);
      setTotal(json.total || 0);
      setLoading(false);
      setLastUpdate(
        new Date().toLocaleTimeString("en-GB", {
          timeZone: "Asia/Kolkata",
          hour12: true,
        })
      );
    } catch (e) {
      console.error("Failed to fetch", e);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setTranscripts([]);
    setActiveChats([]);
    fetchData(viewDate);

    if (viewDate === getTodayIST()) {
      const interval = setInterval(() => fetchData(viewDate), 5000);
      return () => clearInterval(interval);
    }
  }, [fetchData, viewDate]);

  const properties = useMemo(() => {
    const props = new Set<string>();
    transcripts.forEach((t) => { if (t.property_name) props.add(t.property_name); });
    activeChats.forEach((c) => { if (c.property_name) props.add(c.property_name); });
    return Array.from(props);
  }, [transcripts, activeChats]);

  const filteredTranscripts = useMemo(
    () =>
      transcripts.filter((t) => {
        const q = searchQuery.toLowerCase();
        const matchSearch =
          q === "" ||
          t.visitor_name?.toLowerCase().includes(q) ||
          t.visitor_email?.toLowerCase().includes(q) ||
          t.chat_id?.toLowerCase().includes(q) ||
          t.messages?.some((m) => m.message_text?.toLowerCase().includes(q));
        const matchProp =
          selectedProperty === "all" || t.property_name === selectedProperty;
        return matchSearch && matchProp;
      }),
    [transcripts, searchQuery, selectedProperty]
  );

  const formatTime = (time: string) => {
    if (!time) return "";
    return new Date(time).toLocaleString("en-GB", {
      timeZone: "Asia/Kolkata",
      hour12: true,
    });
  };

  const formatDate = (time: string) => {
    if (!time) return "";
    return new Date(time).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" });
  };

  const formatShortTime = (time: string) => {
    if (!time) return "";
    return new Date(time).toLocaleTimeString("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getSenderLabel = (senderType: string, senderName: string | null) => {
    if (senderType === "v" || senderType === "visitor")
      return { label: "Visitor", color: "bg-blue-100 text-blue-800", icon: "👤" };
    if (senderType === "a" || senderType === "agent")
      return { label: senderName || "Agent", color: "bg-green-100 text-green-800", icon: "🧑‍💼" };
    return { label: senderName || "System", color: "bg-gray-100 text-gray-800", icon: "🤖" };
  };

  const getCountryFlag = (country: string) => {
    const flags: Record<string, string> = {
      IN: "🇮🇳", US: "🇺🇸", UK: "🇬🇧", GB: "🇬🇧",
      CA: "🇨🇦", AU: "🇦🇺", DE: "🇩🇪", FR: "🇫🇷",
    };
    return flags[country] || "🌍";
  };

  const parseVisitorInfo = (messages: DbMessage[] | undefined) => {
    if (!messages || messages.length === 0) return null;
    const visitorMsgs = messages.filter((m) => m.sender_type === "v" || m.sender_type === "visitor");
    const allMsgs = visitorMsgs.length > 0 ? visitorMsgs : messages;
    const phoneMsg = allMsgs.find((m) => /Phone\s*:/i.test(m.message_text || ""));
    const targetMsg = phoneMsg || allMsgs[0];
    if (!targetMsg?.message_text) return null;
    const text = targetMsg.message_text;
    return {
      name: text.match(/Name\s*:\s*([^\r\n]+)/i)?.[1]?.trim() || null,
      phone: text.match(/Phone\s*:\s*([^\r\n]+)/i)?.[1]?.trim() || null,
      location: text.match(/Location\s*:\s*([^\r\n]+)/i)?.[1]?.trim() || null,
    };
  };

  const fetchHistory = async (chatId: string) => {
    const res = await fetch(`/api/sales/history?chat_id=${chatId}`);
    const { history } = await res.json();
    setHistoryCache((prev) => ({ ...prev, [chatId]: history }));
  };

  const toggleHistory = async (chatId: string) => {
    await fetchHistory(chatId);
    setHistoryOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) next.delete(chatId); else next.add(chatId);
      return next;
    });
  };

  const fmtSavedAt = (t: string) =>
    t ? new Date(t).toLocaleString("en-GB", { timeZone: "Asia/Kolkata", hour12: true }) : "";

  const renderLeadCard = (
    h: {
      status?: string; converted?: boolean; premium_collected?: boolean;
      updated_in_crm?: boolean; edited_name?: string | null;
      edited_phone?: string | null; edited_info?: string | null;
      premium_amount?: string | null; remarks?: string | null;
      updated_by?: string | null;
    },
    label: string,
    id: number
  ) => (
    <div key={id} className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-black">{label}</span>
        {h.updated_by && <span className="text-black/50">by {h.updated_by}</span>}
      </div>
      <div className="flex flex-wrap gap-1">
        {h.status && <span className={`px-2 py-0.5 rounded-full font-medium text-[10px] ${SALES_STATUS_COLORS[h.status] || SALES_STATUS_COLORS.New}`}>{h.status}</span>}
        {h.converted && <span className="px-2 py-0.5 rounded-full font-medium text-[10px] bg-green-100 text-green-700">✓ Converted</span>}
        {h.premium_collected && <span className="px-2 py-0.5 rounded-full font-medium text-[10px] bg-emerald-100 text-emerald-700">💰 Collected</span>}
        {h.updated_in_crm && <span className="px-2 py-0.5 rounded-full font-medium text-[10px] bg-blue-100 text-blue-700">CRM ✓</span>}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        {h.edited_name && <><span className="text-black/50">Name</span><span className="text-black font-medium">{h.edited_name}</span></>}
        {h.edited_phone && <><span className="text-black/50">Phone</span><span className="text-black">{h.edited_phone}</span></>}
        {h.edited_info && <><span className="text-black/50">Info</span><span className="text-black">{h.edited_info}</span></>}
        {h.premium_amount != null && <><span className="text-black/50">Premium</span><span className="text-black font-semibold">₹{h.premium_amount}</span></>}
      </div>
      {h.remarks && (
        <div className="bg-white border border-gray-200 rounded px-2 py-1">
          <span className="text-black/50 block text-[10px]">Remarks</span>
          <span className="text-black">{h.remarks}</span>
        </div>
      )}
    </div>
  );

  const downloadExcel = () => {
    const toExport = searchQuery || selectedProperty !== "all" ? filteredTranscripts : transcripts;
    if (toExport.length === 0) {
      alert("No chats to export.");
      return;
    }
    const rows = toExport.map((t) => {
      const info = parseVisitorInfo(t.messages);
      const s = t.sales;
      const conversation =
        t.messages
          ?.map((m) => {
            const who = m.sender_type === "v" || m.sender_type === "visitor" ? "Visitor" : m.sender_name || "Agent";
            return `[${formatShortTime(m.sent_at)}] ${who}: ${m.message_text}`;
          })
          .join(" | ") || "";
      return [
        t.property_name || "",
        formatTime(t.created_at),
        s?.edited_name || info?.name || t.visitor_name || "",
        s?.edited_phone || info?.phone || t.visitor_phone || "",
        t.visitor_email || "",
        `${t.visitor_city || ""}, ${t.visitor_country || ""}`,
        info?.location || "",
        s?.status || "",
        s?.converted ? "Yes" : "No",
        s?.premium_amount != null ? s.premium_amount : "",
        s?.premium_collected ? "Yes" : "No",
        s?.updated_in_crm ? "Yes" : "No",
        s?.edited_info || "",
        s?.remarks || "",
        t.messages?.length || 0,
        conversation,
      ];
    });
    const header = [
      "Property", "Date & Time", "Name", "Phone", "Email", "Location", "Visitor Location",
      "Sales Status", "Converted", "Premium Amount", "Premium Collected", "Updated in CRM",
      "Other Info", "Remarks", "Message Count", "Conversation",
    ];
    const csvContent = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chats-${viewDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-800">Loading {displayDate(viewDate)}'s chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-black">Tawk.to Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">
                {isToday
                  ? `Last updated: ${lastUpdate} · Auto-refresh every 5s`
                  : `Viewing ${displayDate(viewDate)} · No auto-refresh`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                {activeChats.length} Active
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {total} Chats
              </span>
              <FollowupBell />
              <a
                href="/analytics"
                className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium hover:bg-indigo-200 transition-colors cursor-pointer"
              >
                Analytics
              </a>
              <a
                href="/sales"
                className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium hover:bg-emerald-200 transition-colors cursor-pointer"
              >
                Sales Admin
              </a>
              <button
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/login";
                }}
                className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium hover:bg-red-200 transition-colors cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Date Navigation + Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Day navigator */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewDate((d) => shiftDay(d, -1))}
                className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition-colors"
              >
                ← Prev
              </button>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={viewDate}
                  max={getTodayIST()}
                  onChange={(e) => e.target.value && setViewDate(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                />
                <span className="text-sm font-semibold text-gray-700 min-w-20">
                  {displayDate(viewDate)}
                </span>
              </div>
              <button
                onClick={() => {
                  const next = shiftDay(viewDate, 1);
                  if (next <= getTodayIST()) setViewDate(next);
                }}
                disabled={viewDate >= getTodayIST()}
                className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
              {!isToday && (
                <button
                  onClick={() => setViewDate(getTodayIST())}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors text-sm"
                >
                  Back to Today
                </button>
              )}
            </div>

            {/* Search */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                <input
                  type="text"
                  placeholder="Search by name, email, phone, message..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                />
              </div>
            </div>

            {/* Property */}
            <div className="min-w-40">
              <select
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
              >
                <option value="all">All Properties</option>
                {properties.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {(searchQuery || selectedProperty !== "all") && (
              <button
                onClick={() => { setSearchQuery(""); setSelectedProperty("all"); }}
                className="px-4 py-2 text-gray-800 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕ Clear
              </button>
            )}
          </div>
        </div>

        {/* Active Chats (today only) */}
        {isToday && activeChats.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
              Active Chats ({activeChats.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeChats.map((chat) => {
                const visitorInfo = parseVisitorInfo(chat.messages);
                return (
                  <div key={chat.chat_id} className="bg-white rounded-xl shadow-sm border-2 border-green-300 overflow-hidden">
                    <div className="bg-green-500 px-4 py-2">
                      <span className="text-white font-semibold flex items-center gap-2">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        LIVE
                      </span>
                    </div>
                    <div className="p-4">
                      <div className="mb-3 pb-3 border-b border-gray-200">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Property / Website</span>
                        <div className="text-lg font-bold text-black mt-1">{chat.property_name || "Unknown"}</div>
                      </div>
                      <div className="mb-2">
                        <span className="text-xs text-gray-500">Name</span>
                        <div className="text-black font-medium">{visitorInfo?.name || chat.visitor_name || "Not provided"}</div>
                      </div>
                      <div className="mb-2">
                        <span className="text-xs text-gray-500">Phone</span>
                        <div className="text-black font-medium">{visitorInfo?.phone || chat.visitor_phone || "Not provided"}</div>
                      </div>
                      <div className="mb-2">
                        <span className="text-xs text-gray-500">Location</span>
                        <div className="text-black">
                          {getCountryFlag(chat.visitor_country)} {chat.visitor_city}, {chat.visitor_country}
                          {visitorInfo?.location && ` (${visitorInfo.location})`}
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                        Started: {formatTime(chat.started_at)}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <button
                          onClick={() => toggleHistory(chat.chat_id)}
                          className="text-xs text-black font-semibold flex items-center gap-1 hover:underline"
                        >
                          📋 Lead Info{historyCache[chat.chat_id]?.length ? ` · ${historyCache[chat.chat_id].length} prev` : ""}
                        </button>
                        {historyOpenIds.has(chat.chat_id) && (
                          <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                            {chat.sales
                              ? renderLeadCard(chat.sales, `Current · ${fmtSavedAt(chat.sales.updated_at || "")}`, 0)
                              : <p className="text-xs text-black/50 text-center py-2">No sales info yet</p>
                            }
                            {(historyCache[chat.chat_id] || []).map((h) =>
                              renderLeadCard(h, fmtSavedAt(h.saved_at), h.id)
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Chat Transcripts */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-black">
              {displayDate(viewDate)} Chats
              {searchQuery || selectedProperty !== "all"
                ? ` (${filteredTranscripts.length} filtered)`
                : ` (${total})`}
            </h2>
            {transcripts.length > 0 && (
              <button
                onClick={downloadExcel}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors text-sm"
              >
                ⬇ Download CSV
              </button>
            )}
          </div>

          {filteredTranscripts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">📭</div>
              <p className="text-gray-800 text-lg">No chats for {displayDate(viewDate)}</p>
              <p className="text-gray-500 text-sm mt-1">
                {searchQuery || selectedProperty !== "all"
                  ? "Try adjusting your filters"
                  : isToday
                  ? "Chats will appear here after they end"
                  : "No chats were recorded on this day"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTranscripts.map((transcript) => {
                const visitorInfo = parseVisitorInfo(transcript.messages);
                return (
                  <div key={transcript.chat_id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3">
                      <div className="text-white font-bold text-lg">{transcript.property_name || "Unknown Property"}</div>
                      <div className="text-white/80 text-xs mt-1">
                        {formatDate(transcript.created_at)} • {formatShortTime(transcript.created_at)}
                      </div>
                    </div>
                    <div className="p-4">
                      {transcript.sales && (
                        <div className="mb-3 flex flex-wrap gap-1.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SALES_STATUS_COLORS[transcript.sales.status] || SALES_STATUS_COLORS.New}`}>
                            {transcript.sales.status}
                          </span>
                          {transcript.sales.converted && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">✓ Converted</span>
                          )}
                          {transcript.sales.premium_collected && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">💰 Collected</span>
                          )}
                          {transcript.sales.updated_in_crm && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">CRM ✓</span>
                          )}
                          {transcript.sales.premium_amount != null && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700">₹{transcript.sales.premium_amount}</span>
                          )}
                        </div>
                      )}
                      <div className="mb-3">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Name</span>
                        <div className="text-black font-semibold text-lg">
                          {transcript.sales?.edited_name || visitorInfo?.name || transcript.visitor_name || "Not provided"}
                        </div>
                      </div>
                      <div className="mb-3">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Phone</span>
                        <div className="text-black font-medium">
                          {transcript.sales?.edited_phone || visitorInfo?.phone || transcript.visitor_phone || "Not provided"}
                        </div>
                      </div>
                      <div className="mb-3">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Location</span>
                        <div className="text-black">
                          {getCountryFlag(transcript.visitor_country)} {transcript.visitor_city}, {transcript.visitor_country}
                          {visitorInfo?.location && <span className="text-gray-600"> ({visitorInfo.location})</span>}
                        </div>
                      </div>
                      {transcript.messages && transcript.messages.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <span className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">
                            Messages ({transcript.messages.length})
                          </span>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {transcript.messages.map((msg) => {
                              const sender = getSenderLabel(msg.sender_type, msg.sender_name);
                              return (
                                <div key={msg.id} className="bg-gray-50 rounded-lg p-2">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                                      {sender.icon} {sender.label}
                                    </span>
                                    <span className="text-xs text-gray-400">{formatShortTime(msg.sent_at)}</span>
                                  </div>
                                  <p className="text-sm text-black whitespace-pre-wrap">{msg.message_text}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <button
                          onClick={() => toggleHistory(transcript.chat_id)}
                          className="text-xs text-black font-semibold flex items-center gap-1 hover:underline"
                        >
                          📋 Lead Info{historyCache[transcript.chat_id]?.length ? ` · ${historyCache[transcript.chat_id].length} prev` : ""}
                        </button>
                        {historyOpenIds.has(transcript.chat_id) && (
                          <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                            {transcript.sales
                              ? renderLeadCard(transcript.sales, `Current · ${fmtSavedAt(transcript.sales.updated_at || "")}`, 0)
                              : <p className="text-xs text-black/50 text-center py-2">No sales info yet</p>
                            }
                            {(historyCache[transcript.chat_id] || []).map((h) =>
                              renderLeadCard(h, fmtSavedAt(h.saved_at), h.id)
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {isToday && (
        <div className="fixed bottom-4 right-4 bg-white shadow-lg border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800">
          Auto-refresh every 5s
        </div>
      )}
    </div>
  );
}
