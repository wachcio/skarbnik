import path from "node:path";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import type { Response } from "express";
import type { SemesterSummary } from "./reports.service";
import type { ArrearsRow } from "./reports.service";

const currency = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });

// Ścieżka względem process.cwd() — działa identycznie w `npm run dev`
// (tsx, cwd = backend/) i w obrazie Docker (WORKDIR /app, patrz
// Dockerfile: COPY --from=build /app/assets ./assets).
const FONTS_DIR = path.join(process.cwd(), "assets", "fonts");
const FONT_REGULAR = path.join(FONTS_DIR, "PTSans-Regular.ttf");
const FONT_BOLD = path.join(FONTS_DIR, "PTSans-Bold.ttf");

const COMBINING_DIACRITICS = new RegExp("[" + String.fromCharCode(0x0300) + "-" + String.fromCharCode(0x036f) + "]", "g");

function slugify(label: string): string {
  return label
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function attachmentHeaders(res: Response, contentType: string, filenameBase: string, extension: string) {
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${filenameBase}.${extension}"`);
}

// ---- PDF ----
// Standardowe fonty PDF (Helvetica itp.) nie mają polskich znaków
// diakrytycznych (WinAnsiEncoding) — stąd osadzony font PT Sans (OFL),
// który je obsługuje.

function startPdf(res: Response, filenameBase: string): PDFKit.PDFDocument {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  attachmentHeaders(res, "application/pdf", filenameBase, "pdf");
  doc.registerFont("Body", FONT_REGULAR);
  doc.registerFont("Body-Bold", FONT_BOLD);
  doc.font("Body");
  doc.pipe(res);
  return doc;
}

function pdfHeader(doc: PDFKit.PDFDocument, title: string, subtitle: string) {
  doc.font("Body-Bold").fontSize(18).text(title);
  doc
    .font("Body")
    .fontSize(10)
    .fillColor("#555555")
    .text(`${subtitle} · wygenerowano ${new Date().toLocaleString("pl-PL")}`);
  doc.fillColor("#000000").moveDown(1);
}

interface PdfColumn {
  header: string;
  width: number;
}

function pdfTable(doc: PDFKit.PDFDocument, columns: PdfColumn[], rows: string[][]) {
  const startX = doc.x;
  const tableWidth = columns.reduce((sum, c) => sum + c.width, 0);
  let y = doc.y;

  const drawHeader = () => {
    doc.font("Body-Bold").fontSize(10);
    let x = startX;
    for (const col of columns) {
      doc.text(col.header, x, y, { width: col.width });
      x += col.width;
    }
    y += 16;
    doc
      .moveTo(startX, y - 3)
      .lineTo(startX + tableWidth, y - 3)
      .strokeColor("#cccccc")
      .stroke();
    doc.font("Body").fontSize(10);
  };

  drawHeader();

  for (const row of rows) {
    if (y > doc.page.height - doc.page.margins.bottom - 20) {
      doc.addPage();
      y = doc.y;
      drawHeader();
    }
    let x = startX;
    for (let i = 0; i < row.length; i++) {
      doc.text(row[i], x, y, { width: columns[i].width });
      x += columns[i].width;
    }
    y += 16;
  }

  doc.y = y;
}

export function sendSummaryPdf(res: Response, summary: SemesterSummary, semesterLabel: string) {
  const doc = startPdf(res, `zestawienie-${slugify(semesterLabel)}`);
  pdfHeader(doc, "Zestawienie zbiorcze składek", semesterLabel);

  pdfTable(
    doc,
    [
      { header: "Kategoria", width: 260 },
      { header: "Zebrano", width: 120 },
      { header: "Plan", width: 120 },
    ],
    summary.byCategory.map((c) => [
      c.name + (c.archived ? " (zarchiwizowana)" : ""),
      currency.format(c.collected),
      currency.format(c.target),
    ])
  );

  doc.moveDown(1);
  doc
    .font("Body-Bold")
    .fontSize(11)
    .text(`Razem: ${currency.format(summary.collectedTotal)} / ${currency.format(summary.targetTotal)}`);
  doc.font("Body").fontSize(10).text(`Liczba dzieci w grupie: ${summary.childCount}`);

  doc.end();
}

export function sendArrearsPdf(res: Response, rows: ArrearsRow[], semesterLabel: string) {
  const doc = startPdf(res, `zaleglosci-${slugify(semesterLabel)}`);
  pdfHeader(doc, "Zestawienie zaległości", semesterLabel);

  if (rows.length === 0) {
    doc.text("Brak zaległości — wszystko opłacone.");
  } else {
    pdfTable(
      doc,
      [
        { header: "Dziecko", width: 140 },
        { header: "Kategoria", width: 150 },
        { header: "Plan", width: 80 },
        { header: "Wpłacono", width: 80 },
        { header: "Brakuje", width: 80 },
      ],
      rows.map((r) => [r.childName, r.categoryName, currency.format(r.target), currency.format(r.paid), currency.format(r.remaining)])
    );
  }

  doc.end();
}

// ---- Excel ----

async function sendWorkbook(res: Response, workbook: ExcelJS.Workbook, filenameBase: string) {
  attachmentHeaders(
    res,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    filenameBase,
    "xlsx"
  );
  await workbook.xlsx.write(res);
  res.end();
}

export async function sendSummaryXlsx(res: Response, summary: SemesterSummary, semesterLabel: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Skarbnik Przedszkolny";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(`Zestawienie ${semesterLabel}`.slice(0, 31));
  sheet.columns = [
    { header: "Kategoria", key: "name", width: 32 },
    { header: "Zarchiwizowana", key: "archived", width: 16 },
    { header: "Zebrano (zł)", key: "collected", width: 16 },
    { header: "Plan (zł)", key: "target", width: 16 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const c of summary.byCategory) {
    sheet.addRow({ name: c.name, archived: c.archived ? "tak" : "nie", collected: c.collected, target: c.target });
  }

  sheet.addRow({});
  const totalsRow = sheet.addRow({ name: "RAZEM", collected: summary.collectedTotal, target: summary.targetTotal });
  totalsRow.font = { bold: true };
  sheet.addRow({ name: "Liczba dzieci w grupie", archived: String(summary.childCount) });

  await sendWorkbook(res, workbook, `zestawienie-${slugify(semesterLabel)}`);
}

export async function sendArrearsXlsx(res: Response, rows: ArrearsRow[], semesterLabel: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Skarbnik Przedszkolny";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(`Zaległości ${semesterLabel}`.slice(0, 31));
  sheet.columns = [
    { header: "Dziecko", key: "childName", width: 26 },
    { header: "Kategoria", key: "categoryName", width: 26 },
    { header: "Plan (zł)", key: "target", width: 14 },
    { header: "Wpłacono (zł)", key: "paid", width: 14 },
    { header: "Brakuje (zł)", key: "remaining", width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) sheet.addRow(row);

  await sendWorkbook(res, workbook, `zaleglosci-${slugify(semesterLabel)}`);
}
