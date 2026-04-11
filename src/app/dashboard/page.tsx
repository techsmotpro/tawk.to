"use client";

import { useEffect, useState } from "react";

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
}

interface Data {
  activeChats: DbChat[];
  transcripts: DbChat[];
}

export default function Dashboard() {
  const [data, setData] = useState<Data>({ activeChats: [], transcripts: [] });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState("");

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
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (time: string) => {
    if (!time) return "";
    return new Date(time).toLocaleString();
  };

  const getSenderLabel = (senderType: string, senderName: string | null) => {
    if (senderType === "v" || senderType === "visitor") return "👤 Visitor";
    if (senderType === "a" || senderType === "agent") return `🧑‍💼 ${senderName || "Agent"}`;
    return `🤖 ${senderName || "System"}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">📊 Tawk.to Live Dashboard</h1>
          <div className="text-sm text-gray-400">
            Last update: {lastUpdate || "Loading..."}
          </div>
        </div>

        {/* Active Chats */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">
            🟢 Active Chats ({data.activeChats.length})
          </h2>
          {data.activeChats.length === 0 ? (
            <p className="text-gray-500">No active chats right now</p>
          ) : (
            <div className="grid gap-4">
              {data.activeChats.map((chat) => (
                <div
                  key={chat.chat_id}
                  className="bg-green-900/30 border border-green-600 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-lg">
                        👤 {chat.visitor_name}
                      </span>
                      {chat.visitor_email && (
                        <span className="text-gray-400 ml-2">
                          📧 {chat.visitor_email}
                        </span>
                      )}
                    </div>
                    <span className="text-gray-400 text-sm">
                      {formatTime(chat.started_at)}
                    </span>
                  </div>
                  <div className="mt-2 text-gray-400">
                    🌍 {chat.visitor_city}, {chat.visitor_country}
                    {chat.property_name && (
                      <span className="ml-4">
                        📍 {chat.property_name}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Chat Transcripts */}
        <section>
          <h2 className="text-xl font-semibold mb-4">
            📝 Chat Transcripts ({data.transcripts.length})
          </h2>
          {data.transcripts.length === 0 ? (
            <p className="text-gray-500">
              No transcripts yet. Chats will appear here after they end.
            </p>
          ) : (
            <div className="grid gap-6">
              {data.transcripts.map((transcript) => (
                <div
                  key={transcript.chat_id}
                  className="bg-gray-800 rounded-lg overflow-hidden"
                >
                  {/* Header */}
                  <div className="bg-gray-700 p-4 border-b border-gray-600">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold text-lg">
                          👤 {transcript.visitor_name}
                        </span>
                        {transcript.visitor_email && (
                          <span className="text-gray-400 ml-2">
                            📧 {transcript.visitor_email}
                          </span>
                        )}
                      </div>
                      <span className="text-gray-400 text-sm">
                        {formatTime(transcript.ended_at || transcript.started_at)}
                      </span>
                    </div>
                    <div className="mt-1 text-gray-400 text-sm">
                      🌍 {transcript.visitor_city}, {transcript.visitor_country}
                      {transcript.property_name && (
                        <>
                          <span className="mx-2">|</span>
                          📍 {transcript.property_name}
                        </>
                      )}
                      {transcript.messages && (
                        <>
                          <span className="mx-2">|</span>
                          💬 {transcript.messages.length} messages
                        </>
                      )}
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="p-4 space-y-3">
                    {transcript.messages?.map((msg) => (
                      <div
                        key={msg.id}
                        className={`pl-3 border-l-4 ${
                          msg.sender_type === "v" || msg.sender_type === "visitor"
                            ? "border-blue-500"
                            : "border-green-500"
                        }`}
                      >
                        <div className="text-xs text-gray-500 mb-1">
                          {getSenderLabel(msg.sender_type, msg.sender_name)} • {formatTime(msg.sent_at)}
                        </div>
                        <div className="whitespace-pre-wrap">{msg.message_text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Refresh indicator */}
        <div className="fixed bottom-4 right-4 bg-gray-700 text-white px-4 py-2 rounded-full text-sm">
          🔄 Auto-refresh every 3s
        </div>
      </div>
    </div>
  );
}