"use client";

import { useEffect, useState, useMemo } from "react";

interface DbChat {
  id: number;
  chat_id: string;
  visitor_name: string;
  visitor_email: string | null;
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

interface Data {
  activeChats: DbChat[];
  transcripts: DbChat[];
}

export default function Dashboard() {
  const [data, setData] = useState<Data>({ activeChats: [], transcripts: [] });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [expandedChat, setExpandedChat] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/webhooks/tawkto");
        const json = await res.json();
        setData(json);
        setLoading(false);
        setLastUpdate(new Date().toLocaleTimeString());
      } catch (e) {
        console.error("Failed to fetch", e);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Get unique properties for filter
  const properties = useMemo(() => {
    const props = new Set<string>();
    data.transcripts.forEach((t) => {
      if (t.property_name) props.add(t.property_name);
    });
    data.activeChats.forEach((c) => {
      if (c.property_name) props.add(c.property_name);
    });
    return Array.from(props);
  }, [data]);

  // Filter transcripts
  const filteredTranscripts = useMemo(() => {
    return data.transcripts.filter((t) => {
      // Search filter
      const searchMatch =
        searchQuery === "" ||
        t.visitor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.visitor_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.chat_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.messages?.some((m) =>
          m.message_text?.toLowerCase().includes(searchQuery.toLowerCase())
        );

      // Property filter
      const propertyMatch =
        selectedProperty === "all" || t.property_name === selectedProperty;

      // Date filter
      const dateMatch =
        selectedDate === "" ||
        new Date(t.created_at).toLocaleDateString() ===
          new Date(selectedDate).toLocaleDateString();

      return searchMatch && propertyMatch && dateMatch;
    });
  }, [data.transcripts, searchQuery, selectedProperty, selectedDate]);

  const formatTime = (time: string) => {
    if (!time) return "";
    return new Date(time).toLocaleString();
  };

  const formatDate = (time: string) => {
    if (!time) return "";
    return new Date(time).toLocaleDateString();
  };

  const formatShortTime = (time: string) => {
    if (!time) return "";
    return new Date(time).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSenderLabel = (senderType: string, senderName: string | null) => {
    if (senderType === "v" || senderType === "visitor")
      return { label: "Visitor", color: "bg-blue-100 text-blue-700", icon: "👤" };
    if (senderType === "a" || senderType === "agent")
      return { label: senderName || "Agent", color: "bg-green-100 text-green-700", icon: "🧑‍💼" };
    return { label: senderName || "System", color: "bg-gray-100 text-gray-700", icon: "🤖" };
  };

  const getCountryFlag = (country: string) => {
    const flags: Record<string, string> = {
      IN: "🇮🇳",
      US: "🇺🇸",
      UK: "🇬🇧",
      GB: "🇬🇧",
      CA: "🇨🇦",
      AU: "🇦🇺",
      DE: "🇩🇪",
      FR: "🇫🇷",
    };
    return flags[country] || "🌍";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
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
              <h1 className="text-2xl font-bold text-gray-800">
                💬 Tawk.to Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {lastUpdate}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                🟢 {data.activeChats.length} Active
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                📝 {data.transcripts.length} Chats
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search by name, email, message..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Property Filter */}
            <div className="min-w-40">
              <select
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">All Properties</option>
                {properties.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Picker */}
            <div className="min-w-40">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Clear Filters */}
            {(searchQuery || selectedProperty !== "all" || selectedDate) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedProperty("all");
                  setSelectedDate("");
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕ Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Active Chats */}
        {data.activeChats.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
              Active Chats ({data.activeChats.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.activeChats.map((chat) => (
                <div
                  key={chat.chat_id}
                  className="bg-white rounded-xl shadow-sm border border-green-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-3">
                    <div className="flex items-center justify-between text-white">
                      <span className="font-semibold">
                        👤 {chat.visitor_name || "Anonymous"}
                      </span>
                      <span className="text-sm opacity-90">
                        {getCountryFlag(chat.visitor_country)}{" "}
                        {chat.visitor_country}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <span>📍</span>
                        <span>
                          {chat.visitor_city}, {chat.visitor_country}
                        </span>
                      </div>
                      {chat.visitor_email && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <span>📧</span>
                          <span>{chat.visitor_email}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-600">
                        <span>🏢</span>
                        <span>{chat.property_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <span>🕐</span>
                        <span>{formatTime(chat.started_at)}</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                        Currently chatting
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Chat Transcripts */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            📝 Chat History ({filteredTranscripts.length})
          </h2>

          {filteredTranscripts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">📭</div>
              <p className="text-gray-600 text-lg">No chats found</p>
              <p className="text-gray-400 text-sm mt-1">
                {searchQuery || selectedProperty !== "all" || selectedDate
                  ? "Try adjusting your filters"
                  : "Chats will appear here after they end"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTranscripts.map((transcript) => (
                <div
                  key={transcript.chat_id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Card Header */}
                  <div
                    className="px-6 py-4 cursor-pointer"
                    onClick={() =>
                      setExpandedChat(
                        expandedChat === transcript.chat_id
                          ? null
                          : transcript.chat_id
                      )
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {transcript.visitor_name?.charAt(0).toUpperCase() ||
                            "?"}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            {transcript.visitor_name || "Anonymous"}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                            <span>
                              {getCountryFlag(transcript.visitor_country)}{" "}
                              {transcript.visitor_city},{" "}
                              {transcript.visitor_country}
                            </span>
                            {transcript.visitor_email && (
                              <>
                                <span>•</span>
                                <span>{transcript.visitor_email}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">
                          {formatDate(transcript.created_at)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatShortTime(transcript.created_at)}
                        </div>
                        <div className="flex items-center gap-2 mt-2 justify-end">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                            💬 {transcript.messages?.length || transcript.message_count || 0} messages
                          </span>
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                            🏢 {transcript.property_name}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Messages */}
                  {expandedChat === transcript.chat_id &&
                    transcript.messages &&
                    transcript.messages.length > 0 && (
                      <div className="border-t border-gray-100 bg-gray-50 p-4">
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {transcript.messages.map((msg) => {
                            const sender = getSenderLabel(
                              msg.sender_type,
                              msg.sender_name
                            );
                            return (
                              <div
                                key={msg.id}
                                className={`flex gap-3 ${
                                  msg.sender_type === "v"
                                    ? "flex-row-reverse"
                                    : ""
                                }`}
                              >
                                <div
                                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                    msg.sender_type === "v"
                                      ? "bg-blue-500"
                                      : msg.sender_type === "a"
                                      ? "bg-green-500"
                                      : "bg-gray-400"
                                  } text-white text-sm`}
                                >
                                  {sender.icon}
                                </div>
                                <div
                                  className={`flex-grow max-w-[70%] ${
                                    msg.sender_type === "v"
                                      ? "text-right"
                                      : ""
                                  }`}
                                >
                                  <div
                                    className={`inline-block px-4 py-2 rounded-2xl ${
                                      msg.sender_type === "v"
                                        ? "bg-blue-500 text-white rounded-tr-sm"
                                        : msg.sender_type === "a"
                                        ? "bg-white border border-gray-200 rounded-tl-sm"
                                        : "bg-gray-200 rounded-tl-sm"
                                    }`}
                                  >
                                    <p className="text-sm whitespace-pre-wrap">
                                      {msg.message_text}
                                    </p>
                                  </div>
                                  <div className="text-xs text-gray-400 mt-1 px-2">
                                    {sender.label} •{" "}
                                    {formatShortTime(msg.sent_at)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Auto-refresh indicator */}
      <div className="fixed bottom-4 right-4 bg-white shadow-lg border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-600">
        🔄 Auto-refresh every 5s
      </div>
    </div>
  );
}