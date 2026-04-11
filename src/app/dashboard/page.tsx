"use client";

import { useEffect, useState } from "react";

interface Visitor {
  name: string;
  email?: string;
  city: string;
  country: string;
}

interface Message {
  sender: {
    t: string;
    n?: string;
    id?: string;
  };
  type: string;
  msg: string;
  time: string;
  attchs?: {
    type: string;
    content: {
      file: {
        url: string;
        name: string;
        mimeType: string;
        size: number;
      };
    };
  }[];
}

interface Chat {
  chatId: string;
  visitor: Visitor;
  startTime: string;
  property?: { id: string; name: string };
  firstMessage?: { text: string };
}

interface Transcript {
  chatId: string;
  visitor: Visitor;
  messages: Message[];
  property: { id: string; name: string };
  receivedAt: string;
}

interface Data {
  activeChats: Chat[];
  transcripts: Transcript[];
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

  const formatTime = (time: string) => new Date(time).toLocaleString();

  const getSenderLabel = (sender: Message["sender"]) => {
    if (sender.t === "v") return "👤 Visitor";
    if (sender.t === "a") return `🧑‍💼 ${sender.n || "Agent"}`;
    return `🤖 ${sender.n || "System"}`;
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
                  key={chat.chatId}
                  className="bg-green-900/30 border border-green-600 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-lg">
                        👤 {chat.visitor.name}
                      </span>
                      {chat.visitor.email && (
                        <span className="text-gray-400 ml-2">
                          📧 {chat.visitor.email}
                        </span>
                      )}
                    </div>
                    <span className="text-gray-400 text-sm">
                      {formatTime(chat.startTime)}
                    </span>
                  </div>
                  <div className="mt-2 text-gray-400">
                    🌍 {chat.visitor.city}, {chat.visitor.country}
                    {chat.property && (
                      <span className="ml-4">
                        📍 {chat.property.name}
                      </span>
                    )}
                  </div>
                  {chat.firstMessage && (
                    <div className="mt-3 bg-gray-800 rounded p-3 italic">
                      "{chat.firstMessage.text}"
                    </div>
                  )}
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
                  key={transcript.chatId}
                  className="bg-gray-800 rounded-lg overflow-hidden"
                >
                  {/* Header */}
                  <div className="bg-gray-700 p-4 border-b border-gray-600">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold text-lg">
                          👤 {transcript.visitor.name}
                        </span>
                        {transcript.visitor.email && (
                          <span className="text-gray-400 ml-2">
                            📧 {transcript.visitor.email}
                          </span>
                        )}
                      </div>
                      <span className="text-gray-400 text-sm">
                        {formatTime(transcript.receivedAt)}
                      </span>
                    </div>
                    <div className="mt-1 text-gray-400 text-sm">
                      🌍 {transcript.visitor.city}, {transcript.visitor.country}
                      <span className="mx-2">|</span>
                      📍 {transcript.property.name}
                      <span className="mx-2">|</span>
                      💬 {transcript.messages.length} messages
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="p-4 space-y-3">
                    {transcript.messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`pl-3 border-l-3 ${
                          msg.sender.t === "v"
                            ? "border-blue-500"
                            : "border-green-500"
                        }`}
                      >
                        <div className="text-xs text-gray-500 mb-1">
                          {getSenderLabel(msg.sender)} • {formatTime(msg.time)}
                        </div>
                        <div className="whitespace-pre-wrap">{msg.msg}</div>
                        {msg.attchs?.map((att, i) => (
                          <div key={i} className="mt-2 text-sm">
                            📎{" "}
                            <a
                              href={att.content.file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-400 hover:underline"
                            >
                              {att.content.file.name}
                            </a>
                          </div>
                        ))}
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