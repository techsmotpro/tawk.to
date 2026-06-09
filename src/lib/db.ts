import { neon } from "neon-serverless";

const sql = neon(process.env.DATABASE_URL!);

// Create tables if they don't exist
export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS chats (
      id SERIAL PRIMARY KEY,
      chat_id VARCHAR(255) UNIQUE NOT NULL,
      visitor_name VARCHAR(255),
      visitor_email VARCHAR(255),
      visitor_phone VARCHAR(50),
      visitor_city VARCHAR(255),
      visitor_country VARCHAR(10),
      property_id VARCHAR(255),
      property_name VARCHAR(255),
      status VARCHAR(50) DEFAULT 'active',
      started_at TIMESTAMP WITH TIME ZONE,
      ended_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      chat_id VARCHAR(255) REFERENCES chats(chat_id),
      sender_type VARCHAR(10),
      sender_name VARCHAR(255),
      message_type VARCHAR(50),
      message_text TEXT,
      sent_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tickets (
      id SERIAL PRIMARY KEY,
      ticket_id VARCHAR(255) UNIQUE NOT NULL,
      ticket_human_id INTEGER,
      subject VARCHAR(500),
      message TEXT,
      requester_name VARCHAR(255),
      requester_email VARCHAR(255),
      requester_type VARCHAR(50),
      property_id VARCHAR(255),
      property_name VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  // Sales leads: one row per chat, edited by the Sales Admin
  await sql`
    CREATE TABLE IF NOT EXISTS sales_leads (
      id SERIAL PRIMARY KEY,
      chat_id VARCHAR(255) UNIQUE NOT NULL REFERENCES chats(chat_id),
      edited_name VARCHAR(255),
      edited_phone VARCHAR(50),
      edited_info TEXT,
      status VARCHAR(50) DEFAULT 'New',
      converted BOOLEAN DEFAULT FALSE,
      premium_amount NUMERIC(12, 2),
      premium_collected BOOLEAN DEFAULT FALSE,
      updated_in_crm BOOLEAN DEFAULT FALSE,
      remarks TEXT,
      updated_by VARCHAR(255),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  // Add visitor_phone column if it doesn't exist (migration for existing DBs)
  try {
    await sql`ALTER TABLE chats ADD COLUMN IF NOT EXISTS visitor_phone VARCHAR(50)`;
  } catch (e) {
    // Column may already exist, ignore
  }

  console.log("✅ Database tables initialized");
}

export { sql };