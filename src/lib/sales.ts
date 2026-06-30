import { sql } from "./db";

export const SALES_STATUSES = [
  "New",
  "Contacted",
  "Follow-up",
  "Converted",
  "Lost",
  "Double Entry",
] as const;

export type SalesStatus = (typeof SALES_STATUSES)[number];

export interface SalesLead {
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
  followup_at: string | null;
}

// Attach the sales_leads row (if any) to each chat as `chat.sales`.
// Uses a single query for all chats so it scales for the full export.
export async function attachSalesLeads<T extends Record<string, unknown>>(
  chats: T[]
): Promise<(T & { sales: SalesLead | null })[]> {
  if (chats.length === 0) return chats as (T & { sales: SalesLead | null })[];

  const chatIds = chats.map((c) => c.chat_id as string);
  const leads = await sql`
    SELECT * FROM sales_leads WHERE chat_id = ANY(${chatIds})
  `;

  const byChat = new Map<string, SalesLead>();
  for (const lead of leads) {
    byChat.set(lead.chat_id, lead as SalesLead);
  }

  return chats.map((c) => ({
    ...c,
    sales: byChat.get(c.chat_id as string) ?? null,
  }));
}

interface SalesLeadInput {
  chat_id: string;
  edited_name?: string | null;
  edited_phone?: string | null;
  edited_info?: string | null;
  status?: string;
  converted?: boolean;
  premium_amount?: number | null;
  premium_collected?: boolean;
  updated_in_crm?: boolean;
  remarks?: string | null;
  updated_by?: string | null;
  followup_at?: string | null;
}

// Insert or update the sales lead for a chat.
export async function upsertSalesLead(input: SalesLeadInput) {
  const {
    chat_id,
    edited_name = null,
    edited_phone = null,
    edited_info = null,
    status = "New",
    converted = false,
    premium_amount = null,
    premium_collected = false,
    updated_in_crm = false,
    remarks = null,
    updated_by = null,
    followup_at = null,
  } = input;

  // Snapshot the current row into history before overwriting
  const existing = await sql`SELECT * FROM sales_leads WHERE chat_id = ${chat_id}`;
  if (existing.length > 0) {
    const prev = existing[0];
    await sql`
      INSERT INTO sales_lead_history
        (chat_id, edited_name, edited_phone, edited_info, status, converted,
         premium_amount, premium_collected, updated_in_crm, remarks, updated_by, saved_at)
      VALUES
        (${prev.chat_id}, ${prev.edited_name}, ${prev.edited_phone}, ${prev.edited_info},
         ${prev.status}, ${prev.converted}, ${prev.premium_amount}, ${prev.premium_collected},
         ${prev.updated_in_crm}, ${prev.remarks}, ${prev.updated_by}, ${prev.updated_at ?? new Date()})
    `;
  }

  const rows = await sql`
    INSERT INTO sales_leads (
      chat_id, edited_name, edited_phone, edited_info, status,
      converted, premium_amount, premium_collected, updated_in_crm,
      remarks, updated_by, updated_at, followup_at
    ) VALUES (
      ${chat_id}, ${edited_name}, ${edited_phone}, ${edited_info}, ${status},
      ${converted}, ${premium_amount}, ${premium_collected}, ${updated_in_crm},
      ${remarks}, ${updated_by}, NOW(), ${followup_at}
    )
    ON CONFLICT (chat_id) DO UPDATE SET
      edited_name = EXCLUDED.edited_name,
      edited_phone = EXCLUDED.edited_phone,
      edited_info = EXCLUDED.edited_info,
      status = EXCLUDED.status,
      converted = EXCLUDED.converted,
      premium_amount = EXCLUDED.premium_amount,
      premium_collected = EXCLUDED.premium_collected,
      updated_in_crm = EXCLUDED.updated_in_crm,
      remarks = EXCLUDED.remarks,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW(),
      followup_at = EXCLUDED.followup_at
    RETURNING *
  `;

  return rows[0] as SalesLead;
}
