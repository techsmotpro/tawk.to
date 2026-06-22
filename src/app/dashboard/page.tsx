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
  offset: number;
  pageSize: number;
}

const SALES_STATUS_COLORS: Record<string, string> = {
  New: "bg-gray-100 text-gray-700",
  Contacted: "bg-blue-100 text-blue-700",
  "Follow-up": "bg-yellow-100 text-yellow-700",
  Converted: "bg-green-100 text-green-700",
  Lost: "bg-red-100 text-red-700",
  "Double Entry": "bg-orange-100 text-orange-700",
};

export default function Dashboard() {
  const [activeChats, setActiveChats] = useState<DbChat[]>([]);
  const [transcripts, setTranscripts] = useState<DbChat[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [lastUpdate, setLastUpdate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [historyOpenIds, setHistoryOpenIds] = useState<Set<string>>(new Set());
  const [historyCache, setHistoryCache] = useState<Record<string, LeadHistory[]>>({});

  const fetchData = useCallback(async (currentOffset = 0, append = false) => {
    try {
      const res = await fetch(`/api/webhooks/tawkto?offset=${currentOffset}`);
      const json: Data = await res.json();
      setActiveChats(json.activeChats || []);
      if (append) {
        setTranscripts((prev) => [...prev, ...(json.transcripts || [])]);
      } else {
        setTranscripts(json.transcripts || []);
      }
      setTotal(json.total);
      setOffset(currentOffset);
      setPageSize(json.pageSize);
      setLoading(false);
      setLoadingMore(false);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("Failed to fetch", e);
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchData(0, false);
    const interval = setInterval(() => fetchData(0, false), 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleLoadMore = () => {
    const nextOffset = offset + pageSize;
    setLoadingMore(true);
    fetchData(nextOffset, true);
  };

  const properties = useMemo(() => {
    const props = new Set<string>();
    (transcripts || []).forEach((t) => { if (t.property_name) props.add(t.property_name); });
    (activeChats || []).forEach((c) => { if (c.property_name) props.add(c.property_name); });
    return Array.from(props);
  }, [transcripts, activeChats]);

  const matchesFilters = useCallback(
    (t: DbChat) => {
      const searchMatch =
        searchQuery === "" ||
        t.visitor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.visitor_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.chat_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.messages?.some((m) =>
          m.message_text?.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const propertyMatch =
        selectedProperty === "all" || t.property_name === selectedProperty;

      // Single date filter (existing)
      const dateMatch =
        selectedDate === "" ||
        new Date(t.created_at).toLocaleDateString("en-GB") ===
          new Date(selectedDate).toLocaleDateString("en-GB");

      // Date range filter
      const chatDate = new Date(t.created_at);
      const fromMatch = dateFrom === "" || chatDate >= new Date(dateFrom);
      const toMatch = dateTo === "" || chatDate <= new Date(dateTo + "T23:59:59");

      return searchMatch && propertyMatch && dateMatch && fromMatch && toMatch;
    },
    [searchQuery, selectedProperty, selectedDate, dateFrom, dateTo]
  );

  const filteredTranscripts = useMemo(
    () => (transcripts || []).filter(matchesFilters),
    [transcripts, matchesFilters]
  );

  const formatTime = (time: string) => {
    if (!time) return "";
    return new Date(time).toLocaleString("en-GB", { hour12: true });
  };

  const formatDate = (time: string) => {
    if (!time) return "";
    return new Date(time).toLocaleDateString("en-GB");
  };

  const formatShortTime = (time: string) => {
    if (!time) return "";
    return new Date(time).toLocaleTimeString("en-GB", {
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

  const hasRangeFilter = dateFrom !== "" || dateTo !== "";
  const hasAnyFilter = searchQuery || selectedProperty !== "all" || selectedDate || hasRangeFilter;

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedProperty("all");
    setSelectedDate("");
    setDateFrom("");
    setDateTo("");
  };

  const buildCsv = (chats: DbChat[]) => {
    const rows = chats.map((t) => {
      const info = parseVisitorInfo(t.messages);
      const conversation = t.messages
        ?.map((m) => {
          const who = m.sender_type === "v" || m.sender_type === "visitor" ? "Visitor" : (m.sender_name || "Agent");
          return `[${formatShortTime(m.sent_at)}] ${who}: ${m.message_text}`;
        })
        .join(" | ") || "";
      const s = t.sales;
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
      "Sales Status", "Converted", "Premium Amount", "Premium Collected", "Updated in CRM", "Other Info", "Remarks",
      "Message Count", "Conversation",
    ];
    const csvContent = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const label = selectedDate ? selectedDate : dateFrom || dateTo ? `${dateFrom || "start"}_to_${dateTo || "end"}` : "all";
    a.href = url;
    a.download = `chats_${label}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcel = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await fetch("/api/export");
      if (!res.ok) throw new Error(`Export failed: ${res.status}`);
      const json: { transcripts: DbChat[] } = await res.json();
      const allFiltered = (json.transcripts || []).filter(matchesFilters);
      if (allFiltered.length === 0) {
        alert("No chats match the current filters.");
        return;
      }
      buildCsv(allFiltered);
    } catch (e) {
      console.error("Export failed", e);
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const fetchHistory = async (chatId: string) => {
    const res = await fetch(`/api/sales/history?chat_id=${chatId}`);
    const { history } = await res.json();
    setHistoryCache(prev => ({ ...prev, [chatId]: history }));
  };

  const toggleHistory = async (chatId: string) => {
    await fetchHistory(chatId);
    setHistoryOpenIds(prev => {
      const next = new Set(prev);
      if (next.has(chatId)) next.delete(chatId); else next.add(chatId);
      return next;
    });
  };

  const fmtSavedAt = (t: string) =>
    t ? new Date(t).toLocaleString("en-GB", { hour12: true }) : "";

  const renderLeadCard = (h: {
    status?: string; converted?: boolean; premium_collected?: boolean;
    updated_in_crm?: boolean; edited_name?: string | null;
    edited_phone?: string | null; edited_info?: string | null;
    premium_amount?: string | null; remarks?: string | null;
    updated_by?: string | null;
  }, label: string, id: number) => (
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
      {h.remarks && <div className="bg-white border border-gray-200 rounded px-2 py-1"><span className="text-black/50 block text-[10px]">Remarks</span><span className="text-black">{h.remarks}</span></div>}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-800">Loading dashboard...</p>
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
              <p className="text-sm text-gray-500 mt-1">Last updated: {lastUpdate}</p>
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
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
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

            {/* Single date */}
            <div className="min-w-40">
              <label className="block text-xs text-gray-500 mb-1">Single date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setDateFrom(""); setDateTo(""); }}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              />
            </div>

            {/* Date range: From */}
            <div className="min-w-36">
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setSelectedDate(""); }}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              />
            </div>

            {/* Date range: To */}
            <div className="min-w-36">
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setSelectedDate(""); }}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              />
            </div>

            {hasAnyFilter && (
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 text-gray-800 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕ Clear
              </button>
            )}
          </div>
        </div>

        {/* Active Chats */}
        {activeChats.length > 0 && (
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

                      {/* Lead info & history — read only */}
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
                            {(historyCache[chat.chat_id] || []).map(h =>
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
              Chat History ({hasAnyFilter ? `${filteredTranscripts.length} filtered` : `${transcripts.length} of ${total}`})
            </h2>
            {total > 0 && (
              <button
                onClick={downloadExcel}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-sm"
              >
                {exporting ? "⏳ Preparing…" : `⬇ Download Excel (all${hasAnyFilter ? " filtered" : ""})`}
              </button>
            )}
          </div>

          {filteredTranscripts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">📭</div>
              <p className="text-gray-800 text-lg">No chats found</p>
              <p className="text-gray-500 text-sm mt-1">
                {hasAnyFilter ? "Try adjusting your filters" : "Chats will appear here after they end"}
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
                        <div className="text-black font-semibold text-lg">{transcript.sales?.edited_name || visitorInfo?.name || transcript.visitor_name || "Not provided"}</div>
                      </div>
                      <div className="mb-3">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Phone</span>
                        <div className="text-black font-medium">{transcript.sales?.edited_phone || visitorInfo?.phone || transcript.visitor_phone || "Not provided"}</div>
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

                      {/* Lead info & history — read only */}
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
                            {(historyCache[transcript.chat_id] || []).map(h =>
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

          {/* Load More */}
          {!hasAnyFilter && transcripts.length < total && (
            <div className="text-center mt-8">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                {loadingMore ? "Loading..." : `Load More (${transcripts.length} of ${total})`}
              </button>
            </div>
          )}
        </section>
      </main>

      <div className="fixed bottom-4 right-4 bg-white shadow-lg border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800">
        Auto-refresh every 5s
      </div>
    </div>
  );
}
