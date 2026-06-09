import PDFDocument from "pdfkit";
import type { DailyReport } from "./report";

const IST = "Asia/Kolkata";

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// pdfkit's standard fonts only cover WinAnsi, so avoid the ₹ glyph here.
function inr(n: number): string {
  return "Rs " + n.toLocaleString("en-IN");
}

// Render the daily report as a PDF and return it as a Buffer.
export function buildReportPdf(report: DailyReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      // Header
      doc.fillColor("#111827").fontSize(20).font("Helvetica-Bold").text("Daily Leads Report");
      doc
        .moveDown(0.2)
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#6b7280")
        .text(`Cycle: ${fmtDateTime(report.start)}  to  ${fmtDateTime(report.end)} (IST)`);
      doc.moveDown(1);

      // Summary boxes
      const summary: [string, string][] = [
        ["Total chats", String(report.totalChats)],
        ["Leads with contact", String(report.leadsWithContact)],
        ["Converted", String(report.convertedCount)],
        ["Premium total", inr(report.premiumTotal)],
        ["Premium collected", inr(report.premiumCollectedTotal)],
      ];
      doc.fontSize(12).font("Helvetica-Bold").fillColor("#111827").text("Summary");
      doc.moveDown(0.4);
      doc.fontSize(10).font("Helvetica");
      for (const [label, value] of summary) {
        doc
          .fillColor("#6b7280")
          .text(`${label}: `, { continued: true })
          .fillColor("#111827")
          .font("Helvetica-Bold")
          .text(value)
          .font("Helvetica");
      }
      doc.moveDown(0.8);

      // Status breakdown
      doc.fontSize(12).font("Helvetica-Bold").fillColor("#111827").text("Status breakdown");
      doc.moveDown(0.3);
      doc.fontSize(10).font("Helvetica");
      const statusLine = report.statusBreakdown
        .map((s) => `${s.status}: ${s.count}`)
        .join("    |    ");
      doc.fillColor("#374151").text(statusLine || "No leads");
      doc.moveDown(0.8);

      // Per property
      if (report.perProperty.length) {
        doc.fontSize(12).font("Helvetica-Bold").fillColor("#111827").text("By property");
        doc.moveDown(0.3);
        doc.fontSize(10).font("Helvetica").fillColor("#374151");
        for (const p of report.perProperty) {
          doc.text(`${p.property}: ${p.count}`);
        }
        doc.moveDown(0.8);
      }

      // Leads table
      doc.fontSize(12).font("Helvetica-Bold").fillColor("#111827").text("Leads");
      doc.moveDown(0.4);

      const cols = [
        { key: "time", label: "Time", w: 0.16 },
        { key: "name", label: "Name", w: 0.17 },
        { key: "phone", label: "Phone", w: 0.15 },
        { key: "property", label: "Property", w: 0.18 },
        { key: "status", label: "Status", w: 0.12 },
        { key: "premium", label: "Premium", w: 0.12 },
        { key: "crm", label: "CRM", w: 0.1 },
      ];
      const x0 = doc.page.margins.left;
      const rowH = 16;

      const drawHeader = () => {
        let x = x0;
        doc.fontSize(8).font("Helvetica-Bold").fillColor("#ffffff");
        doc.rect(x0, doc.y, pageWidth, rowH).fill("#374151");
        const yy = doc.y + 4;
        doc.fillColor("#ffffff");
        for (const c of cols) {
          doc.text(c.label, x + 3, yy, { width: c.w * pageWidth - 6, ellipsis: true });
          x += c.w * pageWidth;
        }
        doc.y += rowH;
      };

      drawHeader();

      doc.fontSize(8).font("Helvetica");
      let zebra = false;
      for (const lead of report.leads) {
        if (doc.y + rowH > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
          drawHeader();
          doc.fontSize(8).font("Helvetica");
          zebra = false;
        }
        if (zebra) {
          doc.rect(x0, doc.y, pageWidth, rowH).fill("#f3f4f6");
        }
        zebra = !zebra;

        const values: Record<string, string> = {
          time: fmtTime(lead.created_at),
          name: lead.name,
          phone: lead.phone || "-",
          property: lead.property,
          status: lead.sales_status + (lead.converted ? " (conv)" : ""),
          premium:
            lead.premium_amount != null
              ? inr(Number(lead.premium_amount)) + (lead.premium_collected ? " (paid)" : "")
              : "-",
          crm: lead.updated_in_crm ? "Yes" : "No",
        };

        let x = x0;
        const yy = doc.y + 4;
        doc.fillColor("#111827");
        for (const c of cols) {
          doc.text(values[c.key] ?? "", x + 3, yy, {
            width: c.w * pageWidth - 6,
            ellipsis: true,
            lineBreak: false,
          });
          x += c.w * pageWidth;
        }
        doc.y += rowH;
      }

      if (report.leads.length === 0) {
        doc.moveDown(0.5).fillColor("#6b7280").text("No leads in this cycle.");
      }

      doc.end();
    } catch (e) {
      reject(e as Error);
    }
  });
}
