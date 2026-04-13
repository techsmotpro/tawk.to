import nodemailer from "nodemailer";

// Gmail SMTP transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

const TO_EMAIL = process.env.NOTIFICATION_EMAIL || "kavitha@smotpro.com";

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
      to: `${TO_EMAIL}, tech.smotpro@gmail.com`,
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