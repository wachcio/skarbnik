import path from "node:path";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import type { Response } from "express";
import type { SemesterSummary } from "./reports.service";
import type { ArrearsRow } from "./reports.service";
import { formatWarsawDateTime, warsawTimestampForFilename } from "../lib/time";

const currency = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });

// Ścieżka względem process.cwd() — działa identycznie w `npm run dev`
// (tsx, cwd = backend/) i w obrazie Docker (WORKDIR /app, patrz
// Dockerfile: COPY --from=build /app/assets ./assets).
const FONTS_DIR = path.join(process.cwd(), "assets", "fonts");
const FONT_REGULAR = path.join(FONTS_DIR, "PTSans-Regular.ttf");
const FONT_BOLD = path.join(FONTS_DIR, "PTSans-Bold.ttf");

// Kolory marki appki (paleta jasnego motywu — wydruk/plik zawsze na
// jasnym tle, niezależnie od tego, w jakim motywie pracuje admin).
const BRAND = "#2955a3";
const BRAND_SOFT = "#eaf0fb";
const INK = "#131b2c";
const INK_MUTED = "#57647f";
const DANGER = "#c23054";
const SUCCESS = "#178a46";
const ZEBRA = "#f4f6fb";

const ARGB_BRAND = "FF2955A3";
const ARGB_BRAND_SOFT = "FFEAF0FB";
const ARGB_WHITE = "FFFFFFFF";
const ARGB_ZEBRA = "FFF4F6FB";
const ARGB_DANGER = "FFC23054";
const ARGB_MUTED = "FF57647F";

function slugify(label: string): string {
  const COMBINING_DIACRITICS = new RegExp("[" + String.fromCharCode(0x0300) + "-" + String.fromCharCode(0x036f) + "]", "g");
  return label
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

/** Nazwa pliku ze znacznikiem daty i godziny wygenerowania (czas polski),
 * żeby dało się od razu odróżnić dwa raporty z tego samego semestru. */
function reportFilename(base: string, semesterLabel: string): string {
  return `${base}-${slugify(semesterLabel)}-${warsawTimestampForFilename()}`;
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
  const doc = new PDFDocument({ margin: 44, size: "A4" });
  attachmentHeaders(res, "application/pdf", filenameBase, "pdf");
  doc.registerFont("Body", FONT_REGULAR);
  doc.registerFont("Body-Bold", FONT_BOLD);
  doc.font("Body");
  doc.pipe(res);
  return doc;
}

function pdfHeader(doc: PDFKit.PDFDocument, title: string, subtitle: string) {
  // Pasek marki u góry strony.
  doc.rect(0, 0, doc.page.width, 6).fill(BRAND);
  doc.fillColor(INK);

  doc.y = 44;
  doc.font("Body-Bold").fontSize(19).text(title);
  doc
    .font("Body")
    .fontSize(9.5)
    .fillColor(INK_MUTED)
    .text(`${subtitle} · wygenerowano ${formatWarsawDateTime()}`);

  doc.moveDown(0.6);
  const ruleY = doc.y;
  doc
    .moveTo(doc.x, ruleY)
    .lineTo(doc.page.width - doc.page.margins.right, ruleY)
    .lineWidth(1.5)
    .strokeColor(BRAND)
    .stroke();
  doc.moveDown(0.9);
  doc.fillColor(INK).lineWidth(1);
}

interface PdfColumn {
  header: string;
  width: number;
  align?: "left" | "right";
}

interface PdfTableOptions {
  /** Indeks kolumny podświetlanej kolorem semantycznym (np. "Brakuje"). */
  highlightColumnIndex?: number;
  highlightColor?: string;
}

function pdfTable(doc: PDFKit.PDFDocument, columns: PdfColumn[], rows: string[][], options: PdfTableOptions = {}) {
  const startX = doc.x;
  const tableWidth = columns.reduce((sum, c) => sum + c.width, 0);
  const rowHeight = 22;
  let y = doc.y;

  const drawHeader = () => {
    doc.rect(startX, y, tableWidth, rowHeight).fill(BRAND);
    doc.font("Body-Bold").fontSize(9).fillColor("#ffffff");
    let x = startX;
    for (const col of columns) {
      doc.text(col.header.toUpperCase(), x + 8, y + 7, {
        width: col.width - 12,
        align: col.align ?? "left",
      });
      x += col.width;
    }
    y += rowHeight;
    doc.font("Body").fontSize(9.5).fillColor(INK);
  };

  drawHeader();

  rows.forEach((row, rowIndex) => {
    if (y > doc.page.height - doc.page.margins.bottom - rowHeight) {
      doc.addPage();
      y = doc.page.margins.top;
      drawHeader();
    }

    if (rowIndex % 2 === 1) {
      doc.rect(startX, y, tableWidth, rowHeight).fill(ZEBRA);
    }

    let x = startX;
    row.forEach((cell, colIndex) => {
      const isHighlight = colIndex === options.highlightColumnIndex;
      doc.font(isHighlight ? "Body-Bold" : "Body").fillColor(isHighlight ? (options.highlightColor ?? DANGER) : INK);
      doc.text(cell, x + 8, y + 6, { width: columns[colIndex].width - 12, align: columns[colIndex].align ?? "left" });
      x += columns[colIndex].width;
    });

    doc.fillColor(INK).font("Body");
    y += rowHeight;
  });

  // pdfkit przesuwa doc.x do miejsca ostatniego .text() (czyli gdzieś
  // w prawej kolumnie) — bez tego resetu kolejne elementy rysowane
  // względem doc.x lądowałyby w złym miejscu i nakładały się na siebie.
  doc.x = startX;
  doc.y = y + 6;
}

export function sendSummaryPdf(res: Response, summary: SemesterSummary, semesterLabel: string) {
  const doc = startPdf(res, reportFilename("zestawienie", semesterLabel));
  pdfHeader(doc, "Zestawienie zbiorcze składek", semesterLabel);

  pdfTable(
    doc,
    [
      { header: "Kategoria", width: 250 },
      { header: "Zebrano", width: 115, align: "right" },
      { header: "Plan", width: 115, align: "right" },
    ],
    summary.byCategory.map((c) => [
      c.name + (c.archived ? " (zarchiwizowana)" : ""),
      currency.format(c.collected),
      currency.format(c.target),
    ])
  );

  // Karta podsumowania — ten sam motyw co statystyki w appce. Współrzędne
  // liczone jawnie od lewego marginesu (nie od doc.x) i z odstępem
  // starczającym na dużą, pogrubioną linię z procentem — inaczej trzy
  // linie tekstu nachodzą na siebie.
  const boxX = doc.page.margins.left;
  const boxY = doc.y;
  const boxWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const boxHeight = 70;
  doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 8).fill(BRAND_SOFT);

  doc.fillColor(INK_MUTED).font("Body").fontSize(9).text("RAZEM ZEBRANO / ZAPLANOWANO", boxX + 16, boxY + 12);

  const percent = summary.targetTotal > 0 ? Math.round((summary.collectedTotal / summary.targetTotal) * 100) : 0;
  doc
    .fillColor(percent >= 100 ? SUCCESS : BRAND)
    .font("Body-Bold")
    .fontSize(17)
    .text(`${currency.format(summary.collectedTotal)} / ${currency.format(summary.targetTotal)} · ${percent}%`, boxX + 16, boxY + 27);

  doc
    .fillColor(INK_MUTED)
    .font("Body")
    .fontSize(9)
    .text(`Liczba dzieci w grupie: ${summary.childCount}`, boxX + 16, boxY + 54);

  doc.fillColor(INK);
  doc.x = boxX;
  doc.y = boxY + boxHeight + 14;

  doc.end();
}

export function sendArrearsPdf(res: Response, rows: ArrearsRow[], semesterLabel: string) {
  const doc = startPdf(res, reportFilename("zaleglosci", semesterLabel));
  pdfHeader(doc, "Zestawienie zaległości", semesterLabel);

  if (rows.length === 0) {
    doc.fillColor(SUCCESS).font("Body-Bold").text("Brak zaległości — wszystko opłacone.");
    doc.fillColor(INK);
  } else {
    pdfTable(
      doc,
      [
        { header: "Dziecko", width: 140 },
        { header: "Kategoria", width: 150 },
        { header: "Plan", width: 75, align: "right" },
        { header: "Wpłacono", width: 75, align: "right" },
        { header: "Brakuje", width: 80, align: "right" },
      ],
      rows.map((r) => [r.childName, r.categoryName, currency.format(r.target), currency.format(r.paid), currency.format(r.remaining)]),
      { highlightColumnIndex: 4, highlightColor: DANGER }
    );
  }

  doc.end();
}

// ---- Excel ----

const HEADER_ROW_HEIGHT = 20;

function styleHeaderRow(row: ExcelJS.Row) {
  row.height = HEADER_ROW_HEIGHT;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: ARGB_WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB_BRAND } };
    cell.alignment = { vertical: "middle" };
  });
}

function zebraStripe(sheet: ExcelJS.Worksheet, firstDataRow: number, lastDataRow: number) {
  for (let r = firstDataRow; r <= lastDataRow; r++) {
    if ((r - firstDataRow) % 2 === 1) {
      sheet.getRow(r).eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB_ZEBRA } };
      });
    }
  }
}

const PLN_FORMAT = '#,##0.00 "zł"';

async function sendWorkbook(res: Response, workbook: ExcelJS.Workbook, filenameBase: string) {
  attachmentHeaders(res, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filenameBase, "xlsx");
  await workbook.xlsx.write(res);
  res.end();
}

export async function sendSummaryXlsx(res: Response, summary: SemesterSummary, semesterLabel: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Skarbnik Przedszkolny";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(`Zestawienie ${semesterLabel}`.slice(0, 31), {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = [
    { header: "Kategoria", key: "name", width: 32 },
    { header: "Zarchiwizowana", key: "archived", width: 16 },
    { header: "Zebrano", key: "collected", width: 16, style: { numFmt: PLN_FORMAT } },
    { header: "Plan", key: "target", width: 16, style: { numFmt: PLN_FORMAT } },
  ];
  styleHeaderRow(sheet.getRow(1));
  sheet.autoFilter = { from: "A1", to: "D1" };

  for (const c of summary.byCategory) {
    sheet.addRow({ name: c.name, archived: c.archived ? "tak" : "nie", collected: c.collected, target: c.target });
  }
  const lastDataRow = sheet.rowCount;
  zebraStripe(sheet, 2, lastDataRow);

  sheet.addRow({});
  const totalsRow = sheet.addRow({ name: "RAZEM", collected: summary.collectedTotal, target: summary.targetTotal });
  totalsRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB_BRAND_SOFT } };
  });
  sheet.addRow({ name: "Liczba dzieci w grupie", archived: String(summary.childCount) });

  const generatedRow = sheet.addRow({ name: `Wygenerowano: ${formatWarsawDateTime()}` });
  generatedRow.font = { italic: true, color: { argb: ARGB_MUTED }, size: 9 };

  await sendWorkbook(res, workbook, reportFilename("zestawienie", semesterLabel));
}

export async function sendArrearsXlsx(res: Response, rows: ArrearsRow[], semesterLabel: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Skarbnik Przedszkolny";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(`Zaległości ${semesterLabel}`.slice(0, 31), {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = [
    { header: "Dziecko", key: "childName", width: 26 },
    { header: "Kategoria", key: "categoryName", width: 26 },
    { header: "Plan", key: "target", width: 14, style: { numFmt: PLN_FORMAT } },
    { header: "Wpłacono", key: "paid", width: 14, style: { numFmt: PLN_FORMAT } },
    { header: "Brakuje", key: "remaining", width: 14, style: { numFmt: PLN_FORMAT } },
  ];
  styleHeaderRow(sheet.getRow(1));
  sheet.autoFilter = { from: "A1", to: "E1" };

  for (const row of rows) sheet.addRow(row);
  const lastDataRow = sheet.rowCount;
  zebraStripe(sheet, 2, lastDataRow);

  // Kolumna "Brakuje" pogrubiona i na czerwono — ten sam sygnał co
  // czerwone odznaki w appce.
  for (let r = 2; r <= lastDataRow; r++) {
    const cell = sheet.getRow(r).getCell(5);
    cell.font = { bold: true, color: { argb: ARGB_DANGER } };
  }

  sheet.addRow({});
  const noteRow = sheet.addRow([`Wygenerowano: ${formatWarsawDateTime()}`]);
  noteRow.font = { italic: true, color: { argb: ARGB_MUTED }, size: 9 };

  await sendWorkbook(res, workbook, reportFilename("zaleglosci", semesterLabel));
}
