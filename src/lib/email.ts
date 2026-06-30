import nodemailer from "nodemailer";

// Gmail SMTP transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

const TO_EMAIL = `${process.env.NOTIFICATION_EMAIL || "kavitha@smotpro.com"}, syed@smotpro.com, tech.smotpro@gmail.com`;

interface ChatInfo {
  visitorName: string;
  visitorEmail?: string;
  visitorCity: string;
  visitorCountry: string;
  propertyName: string;
  phone?: string;
  message?: string;
}

export async function sendNewChatEmail(data: ChatInfo) {
  try {
    await transporter.sendMail({
      from: `"Tawk.to Notifications" <${process.env.SMTP_USER}>`,
      to: TO_EMAIL,
      subject: `🔔 New Chat on ${data.propertyName} - ${data.visitorName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">🔔 New Chat Started</h1>
          </div>

          <div style="padding: 20px; background: #f9f9f9;">
            <div style="background: white; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
              <h2 style="color: #333; margin-top: 0;">Visitor Information</h2>
              <table style="width: 100%;">
                <tr>
                  <td style="padding: 8px 0; color: #666;">👤 Name:</td>
                  <td style="padding: 8px 0; font-weight: bold;">${data.visitorName}</td>
                </tr>
                ${data.phone ? `
                <tr>
                  <td style="padding: 8px 0; color: #666;">📱 Phone:</td>
                  <td style="padding: 8px 0; font-weight: bold;">${data.phone}</td>
                </tr>
                ` : ''}
                ${data.visitorEmail ? `
                <tr>
                  <td style="padding: 8px 0; color: #666;">📧 Email:</td>
                  <td style="padding: 8px 0;">${data.visitorEmail}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; color: #666;">🌍 Location:</td>
                  <td style="padding: 8px 0;">${data.visitorCity}, ${data.visitorCountry}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">🏢 Property:</td>
                  <td style="padding: 8px 0;">${data.propertyName}</td>
                </tr>
              </table>
            </div>

            ${data.message ? `
            <div style="background: white; border-radius: 10px; padding: 20px;">
              <h3 style="color: #333; margin-top: 0;">💬 First Message</h3>
              <p style="background: #f0f0f0; padding: 15px; border-radius: 8px; white-space: pre-wrap;">${data.message}</p>
            </div>
            ` : ''}

            <div style="text-align: center; margin-top: 20px;">
              <a href="https://tawk-to-eta.vercel.app/dashboard"
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Dashboard
              </a>
            </div>
          </div>

          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            Powered by SmotPro Tawk.to Integration
          </div>
        </div>
      `,
    });
    console.log("✅ New chat email sent to", TO_EMAIL);
  } catch (error) {
    console.error("❌ Email error:", error);
  }
}

export async function sendTranscriptEmail(data: ChatInfo & { messages: any[] }) {
  const messagesHtml = data.messages
    .map((msg) => {
      const isVisitor = msg.sender_type === "v";
      return `
        <div style="margin: 10px 0; text-align: ${isVisitor ? "right" : "left"};">
          <div style="display: inline-block; background: ${isVisitor ? "#667eea" : "#f0f0f0"}; color: ${isVisitor ? "white" : "#333"}; padding: 10px 15px; border-radius: 15px; max-width: 80%;">
            <div style="font-size: 11px; opacity: 0.7; margin-bottom: 5px;">${msg.sender_name || (isVisitor ? "Visitor" : "Agent")}</div>
            <div style="white-space: pre-wrap;">${msg.message_text}</div>
          </div>
        </div>
      `;
    })
    .join("");

  try {
    await transporter.sendMail({
      from: `"Tawk.to Notifications" <${process.env.SMTP_USER}>`,
      to: TO_EMAIL,
      subject: `📝 Chat Ended on ${data.propertyName} - ${data.visitorName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">📝 Chat Ended</h1>
          </div>

          <div style="padding: 20px; background: #f9f9f9;">
            <div style="background: white; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
              <h2 style="color: #333; margin-top: 0;">Chat Summary</h2>
              <table style="width: 100%;">
                <tr>
                  <td style="padding: 8px 0; color: #666;">👤 Visitor:</td>
                  <td style="padding: 8px 0; font-weight: bold;">${data.visitorName}</td>
                </tr>
                ${data.phone ? `
                <tr>
                  <td style="padding: 8px 0; color: #666;">📱 Phone:</td>
                  <td style="padding: 8px 0; font-weight: bold;">${data.phone}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; color: #666;">🏢 Property:</td>
                  <td style="padding: 8px 0;">${data.propertyName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">💬 Messages:</td>
                  <td style="padding: 8px 0;">${data.messages.length}</td>
                </tr>
              </table>
            </div>

            <div style="background: white; border-radius: 10px; padding: 20px;">
              <h3 style="color: #333; margin-top: 0;">💬 Full Conversation</h3>
              ${messagesHtml}
            </div>

            <div style="text-align: center; margin-top: 20px;">
              <a href="https://tawk-to-eta.vercel.app/dashboard"
                 style="background: #11998e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Dashboard
              </a>
            </div>
          </div>

          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            Powered by SmotPro Tawk.to Integration
          </div>
        </div>
      `,
    });
    console.log("✅ Transcript email sent to", TO_EMAIL);
  } catch (error) {
    console.error("❌ Email error:", error);
  }
}

export async function sendOtpEmail(otp: string) {
  try {
    await transporter.sendMail({
      from: `"Tawk.to Dashboard" <${process.env.SMTP_USER}>`,
      to: TO_EMAIL,
      subject: `🔐 Dashboard Access OTP: ${otp}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">🔐 Dashboard Access Request</h1>
          </div>
          <div style="padding: 20px; background: #f9f9f9;">
            <div style="background: white; border-radius: 10px; padding: 20px; text-align: center;">
              <p style="color: #666; margin-bottom: 10px;">Someone requested access to the Tawk.to Dashboard.</p>
              <div style="background: #f0f0f0; border-radius: 10px; padding: 20px; margin: 20px 0;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #333;">${otp}</span>
              </div>
              <p style="color: #999; font-size: 14px;">This OTP expires in 10 minutes. Share it with the person you approve.</p>
            </div>
          </div>
          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            Powered by SmotPro Tawk.to Integration
          </div>
        </div>
      `,
    });
    console.log("✅ OTP email sent to", TO_EMAIL);
  } catch (error) {
    console.error("❌ OTP email error:", error);
  }
}

// Daily 9 AM leads report → goes to the report recipients (dm + tech by default).
const REPORT_EMAILS =
  process.env.REPORT_EMAILS || "dm@smotpro.com, tech.smotpro@gmail.com";

interface DailyReportData {
  start: string;
  end: string;
  totalChats: number;
  leadsWithContact: number;
  statusBreakdown: { status: string; count: number }[];
  convertedCount: number;
  premiumTotal: number;
  premiumCollectedTotal: number;
  perProperty: { property: string; count: number }[];
  leads: {
    name: string;
    phone: string;
    property: string;
    created_at: string;
    sales_status: string;
    converted: boolean;
    premium_amount: string | null;
    premium_collected: boolean;
    updated_in_crm: boolean;
    remarks: string | null;
  }[];
}

const IST = "Asia/Kolkata";
const istDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    timeZone: IST, day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
const istTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    timeZone: IST, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true,
  });
const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

export async function sendDailyReportEmail(
  report: DailyReportData,
  pdf: Buffer | null
) {
  const statusChips = report.statusBreakdown
    .map(
      (s) =>
        `<span style="display:inline-block;background:#eef2ff;color:#3730a3;border-radius:12px;padding:3px 10px;margin:2px;font-size:13px;">${s.status}: <b>${s.count}</b></span>`
    )
    .join(" ");

  const propRows = report.perProperty
    .map(
      (p) =>
        `<tr><td style="padding:4px 8px;border-bottom:1px solid #eee;">${p.property}</td><td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">${p.count}</td></tr>`
    )
    .join("");

  const leadRows = report.leads
    .map(
      (l) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;white-space:nowrap;">${istTime(l.created_at)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;">${l.name}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;">${l.phone || "-"}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;">${l.property}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;">${l.sales_status}${l.converted ? " ✓" : ""}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">${l.premium_amount != null ? inr(Number(l.premium_amount)) + (l.premium_collected ? " ✓" : "") : "-"}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;">${l.updated_in_crm ? "Yes" : "No"}</td>
      </tr>`
    )
    .join("");

  const card = (label: string, value: string, color: string) => `
    <td style="padding:6px;">
      <div style="background:${color};border-radius:10px;padding:14px;text-align:center;">
        <div style="font-size:26px;font-weight:bold;color:#111827;">${value}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:2px;">${label}</div>
      </div>
    </td>`;

  try {
    await transporter.sendMail({
      from: `"Daily Leads Report" <${process.env.SMTP_USER}>`,
      to: REPORT_EMAILS,
      subject: `📊 Daily Leads Report — ${report.totalChats} chats, ${report.leadsWithContact} leads (${istDateTime(report.end)})`,
      attachments: pdf
        ? [
            {
              filename: `leads-report-${report.end.slice(0, 10)}.pdf`,
              content: pdf,
              contentType: "application/pdf",
            },
          ]
        : [],
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 760px; margin: 0 auto; color:#111827;">
          <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 20px; text-align: center; border-radius:12px 12px 0 0;">
            <h1 style="color: white; margin: 0;">📊 Daily Leads Report</h1>
            <p style="color: #ffffffcc; margin:6px 0 0; font-size:13px;">${istDateTime(report.start)} → ${istDateTime(report.end)} (IST)</p>
          </div>

          <div style="padding: 16px; background:#f9fafb;">
            <table style="width:100%;border-collapse:collapse;"><tr>
              ${card("Total chats", String(report.totalChats), "#e0f2fe")}
              ${card("Leads w/ contact", String(report.leadsWithContact), "#dcfce7")}
              ${card("Converted", String(report.convertedCount), "#fef9c3")}
            </tr><tr>
              ${card("Premium total", inr(report.premiumTotal), "#ede9fe")}
              ${card("Premium collected", inr(report.premiumCollectedTotal), "#d1fae5")}
              ${card("Properties", String(report.perProperty.length), "#fee2e2")}
            </tr></table>

            <h3 style="margin:18px 0 8px;">Status breakdown</h3>
            <div>${statusChips || "No leads"}</div>

            ${
              propRows
                ? `<h3 style="margin:18px 0 8px;">By property</h3>
                   <table style="border-collapse:collapse;width:100%;background:#fff;border-radius:8px;overflow:hidden;">${propRows}</table>`
                : ""
            }

            <h3 style="margin:18px 0 8px;">Leads (${report.leads.length})</h3>
            <table style="border-collapse:collapse;width:100%;background:#fff;border-radius:8px;overflow:hidden;font-size:13px;">
              <thead>
                <tr style="background:#374151;color:#fff;text-align:left;">
                  <th style="padding:8px;">Time</th><th style="padding:8px;">Name</th>
                  <th style="padding:8px;">Phone</th><th style="padding:8px;">Property</th>
                  <th style="padding:8px;">Status</th><th style="padding:8px;text-align:right;">Premium</th>
                  <th style="padding:8px;text-align:center;">CRM</th>
                </tr>
              </thead>
              <tbody>${leadRows || `<tr><td colspan="7" style="padding:12px;text-align:center;color:#6b7280;">No leads in this cycle.</td></tr>`}</tbody>
            </table>

            <p style="color:#9ca3af;font-size:12px;margin-top:16px;">${pdf ? "A PDF copy is attached." : "PDF could not be generated this time; all figures are above."}</p>
          </div>

          <div style="text-align: center; padding: 16px; color: #9ca3af; font-size: 12px;">
            Powered by SmotPro Tawk.to Integration
          </div>
        </div>
      `,
    });
    console.log("✅ Daily report email sent to", REPORT_EMAILS);
  } catch (error) {
    console.error("❌ Daily report email error:", error);
    throw error;
  }
}

export async function sendDailyCsvEmail(csvContent: string, date: string) {
  const csvBuffer = Buffer.from("﻿" + csvContent, "utf-8");
  try {
    await transporter.sendMail({
      from: `"Tawk.to Daily Export" <${process.env.SMTP_USER}>`,
      to: REPORT_EMAILS,
      subject: `📋 Daily Chat Export — ${date}`,
      attachments: [
        {
          filename: `chats-${date}.csv`,
          content: csvBuffer,
          contentType: "text/csv",
        },
      ],
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0;">📋 Daily Chat Export</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">All chats for ${date} (IST)</p>
          </div>
          <div style="padding: 20px; background: #f9f9f9; text-align: center;">
            <p style="color: #555;">The CSV file is attached. Open it in Excel or Google Sheets to review all chats for this day.</p>
          </div>
          <div style="text-align: center; padding: 16px; color: #999; font-size: 12px;">
            Powered by SmotPro Tawk.to Integration
          </div>
        </div>
      `,
    });
    console.log(`✅ Daily CSV export sent for ${date}`);
  } catch (error) {
    console.error("❌ Daily CSV export email error:", error);
    throw error;
  }
}

export async function sendTicketEmail(data: {
  ticketId: string;
  ticketHumanId: number;
  subject: string;
  message: string;
  requesterName: string;
  requesterEmail: string;
  propertyName: string;
}) {
  try {
    await transporter.sendMail({
      from: `"Tawk.to Notifications" <${process.env.SMTP_USER}>`,
      to: TO_EMAIL,
      subject: `🎫 New Ticket #${data.ticketHumanId} - ${data.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">🎫 New Support Ticket</h1>
          </div>

          <div style="padding: 20px; background: #f9f9f9;">
            <div style="background: white; border-radius: 10px; padding: 20px;">
              <h2 style="color: #333; margin-top: 0;">Ticket #${data.ticketHumanId}</h2>
              <table style="width: 100%;">
                <tr>
                  <td style="padding: 8px 0; color: #666;">📋 Subject:</td>
                  <td style="padding: 8px 0; font-weight: bold;">${data.subject}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">👤 From:</td>
                  <td style="padding: 8px 0;">${data.requesterName} (${data.requesterEmail})</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">🏢 Property:</td>
                  <td style="padding: 8px 0;">${data.propertyName}</td>
                </tr>
              </table>
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
                <h4 style="color: #666;">Message:</h4>
                <p style="white-space: pre-wrap;">${data.message}</p>
              </div>
            </div>
          </div>

          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            Powered by SmotPro Tawk.to Integration
          </div>
        </div>
      `,
    });
    console.log("✅ Ticket email sent to", TO_EMAIL);
  } catch (error) {
    console.error("❌ Email error:", error);
  }
}