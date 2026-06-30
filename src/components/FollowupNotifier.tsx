"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface DueLead {
  chat_id: string;
  followup_at: string;
  status: string;
  name: string;
  phone: string | null;
  property_name: string | null;
}

const STORAGE_KEY = "dismissed_followups";
const POLL_INTERVAL = 60_000;

function getDismissed(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveDismiss(chatId: string, followupAt: string) {
  const prev = getDismissed();
  prev[chatId] = followupAt;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prev));
}

function isDismissed(chatId: string, followupAt: string) {
  return getDismissed()[chatId] === followupAt;
}

function playChime() {
  try {
    const ctx = new AudioContext();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.4, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
      osc.start(start);
      osc.stop(start + 0.55);
    });
  } catch {
    // AudioContext not available
  }
}

export default function FollowupNotifier() {
  const [alerts, setAlerts] = useState<DueLead[]>([]);
  const shownIds = useRef<Set<string>>(new Set());
  const permissionRequested = useRef(false);

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/sales/due-followups");
      if (!res.ok) return;
      const { due }: { due: DueLead[] } = await res.json();

      const fresh = due.filter((d) => !isDismissed(d.chat_id, d.followup_at));
      if (fresh.length === 0) return;

      // Only act on ones we haven't shown yet this session
      const newOnes = fresh.filter((f) => !shownIds.current.has(f.chat_id));
      if (newOnes.length === 0) return;

      // Mark as shown before side effects
      newOnes.forEach((l) => shownIds.current.add(l.chat_id));

      // Sound
      playChime();

      // Browser notifications
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        newOnes.forEach((lead) => {
          new Notification("⏰ Follow-up Due!", {
            body: `${lead.name}${lead.phone ? " · " + lead.phone : ""}${lead.property_name ? "\n" + lead.property_name : ""}`,
            icon: "/favicon.ico",
          });
        });
      }

      // Show in-app banners
      setAlerts((prev) => [...prev, ...newOnes]);
    } catch {
      // network error — silent
    }
  }, []);

  useEffect(() => {
    // Request browser notification permission once
    if (
      !permissionRequested.current &&
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      permissionRequested.current = true;
      Notification.requestPermission();
    }

    check();
    const id = setInterval(check, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [check]);

  const dismissAlert = (lead: DueLead) => {
    saveDismiss(lead.chat_id, lead.followup_at);
    shownIds.current.delete(lead.chat_id);
    setAlerts((prev) => prev.filter((a) => a.chat_id !== lead.chat_id));
  };

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {alerts.map((lead) => (
        <div
          key={lead.chat_id}
          className="bg-white border-2 border-yellow-400 rounded-xl shadow-xl p-4 flex gap-3 items-start"
        >
          <span className="text-2xl shrink-0">⏰</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm">Follow-up Due!</p>
            <p className="text-gray-800 text-sm font-medium truncate">{lead.name}</p>
            {lead.phone && <p className="text-gray-500 text-xs">{lead.phone}</p>}
            {lead.property_name && <p className="text-gray-400 text-xs">{lead.property_name}</p>}
            <p className="text-yellow-600 text-xs mt-1 font-medium">
              {new Date(lead.followup_at).toLocaleString("en-GB", { hour12: true })}
            </p>
            <div className="flex gap-2 mt-2">
              <a
                href="/sales"
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Open Sales
              </a>
              <button
                onClick={() => dismissAlert(lead)}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
