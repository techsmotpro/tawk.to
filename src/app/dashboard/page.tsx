"use client";

import { useEffect, useState, useMemo } from "react";

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

  const filteredTranscripts = useMemo(() => {
    return data.transcripts.filter((t) => {
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
      return { label: "Visitor", color: "bg-blue-100 text-blue-800", icon: "👤" };
    if (senderType === "a" || senderType === "agent")
      return { label: senderName || "Agent", color: "bg-green-100 text-green-800", icon: "🧑‍💼" };
    return { label: senderName || "System", color: "bg-gray-100 text-gray-800", icon: "🤖" };
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

  // Parse visitor info from message text
  const parseVisitorInfo = (messages: DbMessage[] | undefined) => {
    const visitorMsg = messages?.find((m) => m.sender_type === "v");
    if (!visitorMsg?.message_text) return null;

    const text = visitorMsg.message_text;
    const nameMatch = text.match(/Name\s*:\s*([^\r\n]+)/i);
    const phoneMatch = text.match(/Phone\s*:\s*([^\r\n]+)/i);
    const locationMatch = text.match(/Location\s*:\s*([^\r\n]+)/i);

    return {
      name: nameMatch?.[1]?.trim() || null,
      phone: phoneMatch?.[1]?.trim() || null,
      location: locationMatch?.[1]?.trim() || null,
    };
  };

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
              <h1 className="text-2xl font-bold text-black">
                Tawk.to Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {lastUpdate}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                {data.activeChats.length} Active
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {data.transcripts.length} Chats
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search by name, email, phone, message..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                />
              </div>
            </div>

            <div className="min-w-40">
              <select
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
              >
                <option value="all">All Properties</option>
                {properties.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-40">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              />
            </div>

            {(searchQuery || selectedProperty !== "all" || selectedDate) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedProperty("all");
                  setSelectedDate("");
                }}
                className="px-4 py-2 text-gray-800 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕ Clear
              </button>
            )}
          </div>
        </div>

        {/* Active Chats */}
        {data.activeChats.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
              Active Chats ({data.activeChats.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.activeChats.map((chat) => {
                const visitorInfo = parseVisitorInfo(chat.messages);
                return (
                  <div
                    key={chat.chat_id}
                    className="bg-white rounded-xl shadow-sm border-2 border-green-300 overflow-hidden"
                  >
                    <div className="bg-green-500 px-4 py-2">
                      <span className="text-white font-semibold flex items-center gap-2">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        LIVE
                      </span>
                    </div>
                    <div className="p-4">
                      {/* Property - Most Important */}
                      <div className="mb-3 pb-3 border-b border-gray-200">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Property / Website</span>
                        <div className="text-lg font-bold text-black mt-1">
                          {chat.property_name || "Unknown"}
                        </div>
                      </div>

                      {/* Name */}
                      <div className="mb-2">
                        <span className="text-xs text-gray-500">Name</span>
                        <div className="text-black font-medium">
                          {visitorInfo?.name || chat.visitor_name || "Not provided"}
                        </div>
                      </div>

                      {/* Phone */}
                      {(visitorInfo?.phone || chat.visitor_phone) && (
                        <div className="mb-2">
                          <span className="text-xs text-gray-500">Phone</span>
                          <div className="text-black font-medium">{visitorInfo?.phone || chat.visitor_phone}</div>
                        </div>
                      )}

                      {/* Location */}
                      <div className="mb-2">
                        <span className="text-xs text-gray-500">Location</span>
                        <div className="text-black">
                          {getCountryFlag(chat.visitor_country)} {chat.visitor_city}, {chat.visitor_country}
                          {visitorInfo?.location && ` (${visitorInfo.location})`}
                        </div>
                      </div>

                      {/* Time */}
                      <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                        Started: {formatTime(chat.started_at)}
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
          <h2 className="text-lg font-semibold text-black mb-4">
            Chat History ({filteredTranscripts.length})
          </h2>

          {filteredTranscripts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">📭</div>
              <p className="text-gray-800 text-lg">No chats found</p>
              <p className="text-gray-500 text-sm mt-1">
                {searchQuery || selectedProperty !== "all" || selectedDate
                  ? "Try adjusting your filters"
                  : "Chats will appear here after they end"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTranscripts.map((transcript) => {
                const visitorInfo = parseVisitorInfo(transcript.messages);
                return (
                  <div
                    key={transcript.chat_id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                  >
                    {/* Header with Property */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3">
                      <div className="text-white font-bold text-lg">
                        {transcript.property_name || "Unknown Property"}
                      </div>
                      <div className="text-white/80 text-xs mt-1">
                        {formatDate(transcript.created_at)} • {formatShortTime(transcript.created_at)}
                      </div>
                    </div>

                    <div className="p-4">
                      {/* Name */}
                      <div className="mb-3">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Name</span>
                        <div className="text-black font-semibold text-lg">
                          {visitorInfo?.name || transcript.visitor_name || "Not provided"}
                        </div>
                      </div>

                      {/* Phone */}
                      {(visitorInfo?.phone || transcript.visitor_phone) && (
                        <div className="mb-3">
                          <span className="text-xs text-gray-500 uppercase tracking-wide">Phone</span>
                          <div className="text-black font-medium">{visitorInfo?.phone || transcript.visitor_phone}</div>
                        </div>
                      )}

                      {/* Location */}
                      <div className="mb-3">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Location</span>
                        <div className="text-black">
                          {getCountryFlag(transcript.visitor_country)} {transcript.visitor_city}, {transcript.visitor_country}
                          {visitorInfo?.location && (
                            <span className="text-gray-600"> ({visitorInfo.location})</span>
                          )}
                        </div>
                      </div>

                      {/* Messages */}
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
                                    <span className="text-xs text-gray-400">
                                      {formatShortTime(msg.sent_at)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-black whitespace-pre-wrap">
                                    {msg.message_text}
                                  </p>
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
        </section>
      </main>

      {/* Auto-refresh indicator */}
      <div className="fixed bottom-4 right-4 bg-white shadow-lg border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800">
        Auto-refresh every 5s
      </div>
    </div>
  );
}