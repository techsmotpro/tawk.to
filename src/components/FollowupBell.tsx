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
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
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
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.4, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  } catch {}
}

export default function FollowupBell() {
  const [alerts, setAlerts] = useState<DueLead[]>([]);
  const [open, setOpen] = useState(false);
  const shownIds = useRef<Set<string>>(new Set());
  const permissionRequested = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/sales/due-followups");
      if (!res.ok) return;
      const { due }: { due: DueLead[] } = await res.json();

      const fresh = due.filter((d) => !isDismissed(d.chat_id, d.followup_at));

      // Update alert list (keep dismissed ones removed)
      setAlerts(fresh);

      // Fire chime + browser notif only for truly new ones
      const newOnes = fresh.filter((f) => !shownIds.current.has(f.chat_id));
      if (newOnes.length === 0) return;

      newOnes.forEach((l) => shownIds.current.add(l.chat_id));
      playChime();
      setOpen(true); // auto-open dropdown when new ones arrive

      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        newOnes.forEach((lead) => {
          new Notification("⏰ Follow-up Due!", {
            body: `${lead.name}${lead.phone ? " · " + lead.phone : ""}${lead.property_name ? " — " + lead.property_name : ""}`,
            icon: "/favicon.ico",
          });
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!permissionRequested.current && typeof Notification !== "undefined" && Notification.permission === "default") {
      permissionRequested.current = true;
      Notification.requestPermission();
    }
    check();
    const id = setInterval(check, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [check]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const dismiss = (lead: DueLead) => {
    saveDismiss(lead.chat_id, lead.followup_at);
    shownIds.current.delete(lead.chat_id);
    setAlerts((prev) => prev.filter((a) => a.chat_id !== lead.chat_id));
  };

  const fmtTime = (t: string) =>
    new Date(t).toLocaleString("en-GB", { hour12: true, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        title="Follow-up reminders"
      >
        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {alerts.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5 leading-none">
            {alerts.length}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="font-semibold text-gray-900 text-sm">Follow-up Reminders</span>
            {alerts.length > 0 && (
              <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{alerts.length} due</span>
            )}
          </div>

          {alerts.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-400 text-sm">No pending follow-ups</div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
              {alerts.map((lead) => (
                <div key={lead.chat_id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{lead.name}</p>
                      {lead.phone && <p className="text-gray-500 text-xs">{lead.phone}</p>}
                      {lead.property_name && <p className="text-gray-400 text-xs truncate">{lead.property_name}</p>}
                    </div>
                    <span className="shrink-0 text-[10px] bg-yellow-100 text-yellow-700 font-semibold px-1.5 py-0.5 rounded-full">DUE</span>
                  </div>
                  <p className="text-yellow-600 text-xs mb-2">⏰ {fmtTime(lead.followup_at)}</p>
                  <div className="flex gap-2">
                    <a
                      href="/sales"
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      Open Sales
                    </a>
                    <button
                      onClick={() => dismiss(lead)}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium rounded-lg transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
