"use client";

import { useEffect, useState } from "react";

interface Message {
  id: string;
  timestamp: string;
  event: string;
  visitor?: {
    name?: string;
    email?: string;
  };
  message?: {
    text?: string;
  };
}

export default function RecentMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const fetchMessages = async () => {
    try {
      const res = await fetch("/api/messages");
      const data = await res.json();
      setMessages(data);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("Failed to fetch messages:", e);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Live Tawk.to Messages</h1>
          <div className="text-sm text-gray-400">
            Last update: {lastUpdate || "Loading..."}
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-20">
            <p className="text-xl">No messages yet</p>
            <p className="mt-2">Waiting for webhook from tawk.to...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="px-2 py-1 bg-green-600 rounded text-xs font-mono">
                    {msg.event}
                  </span>
                  <span className="text-gray-400 text-sm">
                    {new Date(msg.timestamp).toLocaleString()}
                  </span>
                </div>

                {msg.visitor && (
                  <div className="mb-2">
                    <span className="text-blue-400 font-semibold">
                      {msg.visitor.name || "Anonymous"}
                    </span>
                    {msg.visitor.email && (
                      <span className="text-gray-500 ml-2">
                        ({msg.visitor.email})
                      </span>
                    )}
                  </div>
                )}

                {msg.message?.text && (
                  <p className="text-white bg-gray-700 rounded p-3 mt-2">
                    {msg.message.text}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}