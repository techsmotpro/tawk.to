"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
  updated_by: string | null;
  updated_at: string | null;
}

interface Lead {
  chat_id: string;
  visitor_name: string;
  visitor_phone: string | null;
  visitor_email: string | null;
  visitor_city: string;
  visitor_country: string;
  property_name: string | null;
  created_at: string;
  sales: SalesLead | null;
}

interface Data {
  transcripts: Lead[];
  total: number;
  offset: number;
  pageSize: number;
}

const STATUSES = ["New", "Contacted", "Follow-up", "Converted", "Lost"];

const STATUS_COLORS: Record<string, string> = {
  New: "bg-gray-100 text-gray-700",
  Contacted: "bg-blue-100 text-blue-700",
  "Follow-up": "bg-yellow-100 text-yellow-700",
  Converted: "bg-green-100 text-green-700",
  Lost: "bg-red-100 text-red-700",
};

interface FormState {
  edited_name: string;
  edited_phone: string;
  edited_info: string;
  status: string;
  converted: boolean;
  premium_amount: string;
  premium_collected: boolean;
  updated_in_crm: boolean;
  remarks: string;
}

function leadToForm(lead: Lead): FormState {
  const s = lead.sales;
  return {
    edited_name: s?.edited_name ?? lead.visitor_name ?? "",
    edited_phone: s?.edited_phone ?? lead.visitor_phone ?? "",
    edited_info: s?.edited_info ?? "",
    status: s?.status ?? "New",
    converted: s?.converted ?? false,
    premium_amount: s?.premium_amount != null ? String(s.premium_amount) : "",
    premium_collected: s?.premium_collected ?? false,
    updated_in_crm: s?.updated_in_crm ?? false,
    remarks: s?.remarks ?? "",
  };
}

export default function SalesAdmin() {
  const [transcripts, setTranscripts] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async (currentOffset = 0, append = false) => {
    try {
      const res = await fetch(`/api/webhooks/tawkto?offset=${currentOffset}`);
      const json: Data = await res.json();
      setTranscripts((prev) =>
        append ? [...prev, ...json.transcripts] : json.transcripts
      );
      setTotal(json.total);
      setOffset(currentOffset);
      setPageSize(json.pageSize);
    } catch (e) {
      console.error("Failed to fetch", e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchData(0, false);
  }, [fetchData]);

  const handleLoadMore = () => {
    setLoadingMore(true);
    fetchData(offset + pageSize, true);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return transcripts;
    const q = search.toLowerCase();
    return transcripts.filter((t) => {
      const name = t.sales?.edited_name || t.visitor_name || "";
      const phone = t.sales?.edited_phone || t.visitor_phone || "";
      return (
        name.toLowerCase().includes(q) ||
        phone.toLowerCase().includes(q) ||
        (t.visitor_email || "").toLowerCase().includes(q) ||
        (t.property_name || "").toLowerCase().includes(q)
      );
    });
  }, [transcripts, search]);

  const startEdit = (lead: Lead) => {
    setEditingId(lead.chat_id);
    setForm(leadToForm(lead));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(null);
  };

  const saveLead = async (chatId: string) => {
    if (!form) return;
    setSaving(true);
    try {
      const res = await fetch("/api/sales/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, ...form }),
      });
      if (res.status === 401) {
        window.location.href = "/sales/login";
        return;
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Save failed");
      setTranscripts((prev) =>
        prev.map((t) =>
          t.chat_id === chatId ? { ...t, sales: data.lead } : t
        )
      );
      cancelEdit();
    } catch (e) {
      console.error("Save failed", e);
      alert("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (time: string) =>
    time ? new Date(time).toLocaleString("en-GB", { hour12: true }) : "";

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-gray-500">Loading leads…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Sales Admin</h1>
            <p className="text-xs text-gray-500">{total} leads</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/dashboard"
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              Dashboard
            </a>
            <button
              onClick={async () => {
                await fetch("/api/sales-auth/logout", { method: "POST" });
                window.location.href = "/dashboard";
              }}
              className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
            >
              Lock
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, email, property…"
          className="w-full mb-4 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />

        <div className="space-y-3">
          {filtered.map((lead) => {
            const s = lead.sales;
            const displayName = s?.edited_name || lead.visitor_name || "Unknown";
            const displayPhone = s?.edited_phone || lead.visitor_phone || "—";
            const status = s?.status || "New";
            const isEditing = editingId === lead.chat_id;

            return (
              <div
                key={lead.chat_id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm"
              >
                <div className="p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{displayName}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[status] || STATUS_COLORS.New
                        }`}
                      >
                        {status}
                      </span>
                      {s?.converted && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          ✓ Converted
                        </span>
                      )}
                      {s?.premium_collected && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                          💰 Collected
                        </span>
                      )}
                      {s?.updated_in_crm && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          CRM ✓
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      📱 {displayPhone}
                      {lead.visitor_email ? ` · ✉ ${lead.visitor_email}` : ""}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {lead.property_name || "—"} · {fmtDate(lead.created_at)}
                      {s?.premium_amount != null ? ` · ₹${s.premium_amount}` : ""}
                    </div>
                    {s?.remarks && !isEditing && (
                      <div className="text-sm text-gray-700 mt-2 bg-gray-50 rounded-lg px-3 py-2">
                        {s.remarks}
                      </div>
                    )}
                  </div>
                  {!isEditing && (
                    <button
                      onClick={() => startEdit(lead)}
                      className="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {isEditing && form && (
                  <div className="border-t border-gray-100 p-4 bg-slate-50 rounded-b-xl">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-sm">
                        <span className="block text-gray-600 mb-1">Name</span>
                        <input
                          value={form.edited_name}
                          onChange={(e) => setForm({ ...form, edited_name: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900"
                        />
                      </label>
                      <label className="text-sm">
                        <span className="block text-gray-600 mb-1">Phone / Number</span>
                        <input
                          value={form.edited_phone}
                          onChange={(e) => setForm({ ...form, edited_phone: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900"
                        />
                      </label>
                      <label className="text-sm sm:col-span-2">
                        <span className="block text-gray-600 mb-1">Other info</span>
                        <input
                          value={form.edited_info}
                          onChange={(e) => setForm({ ...form, edited_info: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900"
                        />
                      </label>
                      <label className="text-sm">
                        <span className="block text-gray-600 mb-1">Status</span>
                        <select
                          value={form.status}
                          onChange={(e) => setForm({ ...form, status: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900"
                        >
                          {STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm">
                        <span className="block text-gray-600 mb-1">Premium amount (₹)</span>
                        <input
                          type="number"
                          value={form.premium_amount}
                          onChange={(e) => setForm({ ...form, premium_amount: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900"
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-4 mt-3">
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={form.converted}
                          onChange={(e) => setForm({ ...form, converted: e.target.checked })}
                          className="w-4 h-4"
                        />
                        Converted
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={form.premium_collected}
                          onChange={(e) => setForm({ ...form, premium_collected: e.target.checked })}
                          className="w-4 h-4"
                        />
                        Premium collected
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={form.updated_in_crm}
                          onChange={(e) => setForm({ ...form, updated_in_crm: e.target.checked })}
                          className="w-4 h-4"
                        />
                        Updated in CRM
                      </label>
                    </div>

                    <label className="text-sm block mt-3">
                      <span className="block text-gray-600 mb-1">Remarks / updates</span>
                      <textarea
                        value={form.remarks}
                        onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900"
                      />
                    </label>

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => saveLead(lead.chat_id)}
                        disabled={saving}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        {saving ? "Saving…" : "Save"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={saving}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center text-gray-400 py-12">No leads found.</div>
        )}

        {!search && transcripts.length < total && (
          <div className="text-center mt-6">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-6 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-60 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              {loadingMore ? "Loading…" : `Load more (${transcripts.length} of ${total})`}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
