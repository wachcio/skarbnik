import path from "node:path";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import type { Response } from "express";
import type { SemesterSummary } from "./reports.service";
import type { ArrearsRow } from "./reports.service";
import type { MonthlyExpensesReport } from "./reports.service";
import type { ChildFullReport } from "./childLedger.service";
import { formatWarsawDateTime, warsawTimestampForFilename } from "../lib/time";

const currency = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });
const shortDate = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeZone: "Europe/Warsaw" });

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
  /** Indeks wiersza (od 0) traktowanego jako podsumowanie — pogrubiony
   * i podświetlony tłem zamiast zwykłej zebry (np. wiersz "Razem"
   * zamykający zaległości jednego dziecka). */
  boldRowIndex?: number;
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

    const isBoldRow = rowIndex === options.boldRowIndex;
    if (isBoldRow) {
      doc.rect(startX, y, tableWidth, rowHeight).fill(BRAND_SOFT);
    } else if (rowIndex % 2 === 1) {
      doc.rect(startX, y, tableWidth, rowHeight).fill(ZEBRA);
    }

    let x = startX;
    row.forEach((cell, colIndex) => {
      const isHighlight = colIndex === options.highlightColumnIndex;
      doc.font(isBoldRow || isHighlight ? "Body-Bold" : "Body").fillColor(isHighlight ? (options.highlightColor ?? DANGER) : INK);
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
      { header: "Kategoria", width: 190 },
      { header: "Zebrano", width: 90, align: "right" },
      { header: "Plan", width: 90, align: "right" },
      { header: "Wydano", width: 110, align: "right" },
    ],
    summary.byCategory.map((c) => [
      c.name + (c.archived ? " (zarchiwizowana)" : ""),
      currency.format(c.collected),
      currency.format(c.target),
      currency.format(c.spent),
    ])
  );

  // Karta podsumowania — ten sam motyw co statystyki w appce. Współrzędne
  // liczone jawnie od lewego marginesu (nie od doc.x) i z odstępem
  // starczającym na dużą, pogrubioną linię z procentem — inaczej trzy
  // linie tekstu nachodzą na siebie.
  const boxX = doc.page.margins.left;
  const boxY = doc.y;
  const boxWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const boxHeight = 88;
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
    .text(`Wydano w tym semestrze: ${currency.format(summary.spentTotal)}`, boxX + 16, boxY + 54);

  doc
    .fillColor(INK_MUTED)
    .font("Body")
    .fontSize(9)
    .text(`Liczba dzieci w grupie: ${summary.childCount}`, boxX + 16, boxY + 70);

  doc.fillColor(INK);
  doc.x = boxX;
  doc.y = boxY + boxHeight + 14;

  doc.end();
}

/** Grupuje wiersze zaległości po dziecku, zachowując kolejność z
 * `getArrears` (dzieci już posortowane, kategorie idą jedna po drugiej
 * dla tego samego dziecka — bez dodatkowego sortowania). */
function groupArrearsByChild(rows: ArrearsRow[]): Array<{ childId: string; childName: string; rows: ArrearsRow[] }> {
  const groups: Array<{ childId: string; childName: string; rows: ArrearsRow[] }> = [];
  for (const row of rows) {
    const current = groups[groups.length - 1];
    if (current && current.childId === row.childId) {
      current.rows.push(row);
    } else {
      groups.push({ childId: row.childId, childName: row.childName, rows: [row] });
    }
  }
  return groups;
}

export function sendArrearsPdf(res: Response, rows: ArrearsRow[], semesterLabel: string) {
  const doc = startPdf(res, reportFilename("zaleglosci", semesterLabel));
  pdfHeader(doc, "Zestawienie zaległości", semesterLabel);

  if (rows.length === 0) {
    doc.fillColor(SUCCESS).font("Body-Bold").text("Brak zaległości — wszystko opłacone.");
    doc.fillColor(INK);
  } else {
    const columns: PdfColumn[] = [
      { header: "Kategoria", width: 190 },
      { header: "Plan", width: 90, align: "right" },
      { header: "Wpłacono", width: 90, align: "right" },
      { header: "Brakuje", width: 106, align: "right" },
    ];

    // Osobna mini-tabela na dziecko (jak karty na ekranie), z pogrubionym
    // wierszem "Razem" zamykającym jego zaległości — żeby dało się od razu
    // odczytać, ile w sumie brakuje na jedno dziecko, bez liczenia ręcznie.
    for (const group of groupArrearsByChild(rows)) {
      const sumTarget = group.rows.reduce((sum, r) => sum + r.target, 0);
      const sumPaid = group.rows.reduce((sum, r) => sum + r.paid, 0);
      const sumRemaining = group.rows.reduce((sum, r) => sum + r.remaining, 0);
      const tableRows = [
        ...group.rows.map((r) => [r.categoryName, currency.format(r.target), currency.format(r.paid), currency.format(r.remaining)]),
        ["Razem", currency.format(sumTarget), currency.format(sumPaid), currency.format(sumRemaining)],
      ];

      // Nagłówek dziecka i jego tabela nie mogą się rozjechać na złamaniu
      // strony — jeśli nie starczy miejsca choćby na nagłówek + jeden
      // wiersz, od razu nowa strona.
      if (doc.y > doc.page.height - doc.page.margins.bottom - 90) {
        doc.addPage();
      }

      doc.font("Body-Bold").fontSize(12).fillColor(INK).text(group.childName);
      doc.moveDown(0.3);
      pdfTable(doc, columns, tableRows, {
        highlightColumnIndex: 3,
        highlightColor: DANGER,
        boldRowIndex: tableRows.length - 1,
      });
      doc.moveDown(0.6);
    }
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
    { header: "Wydano", key: "spent", width: 16, style: { numFmt: PLN_FORMAT } },
  ];
  styleHeaderRow(sheet.getRow(1));
  sheet.autoFilter = { from: "A1", to: "E1" };

  for (const c of summary.byCategory) {
    sheet.addRow({ name: c.name, archived: c.archived ? "tak" : "nie", collected: c.collected, target: c.target, spent: c.spent });
  }
  const lastDataRow = sheet.rowCount;
  zebraStripe(sheet, 2, lastDataRow);

  sheet.addRow({});
  const totalsRow = sheet.addRow({
    name: "RAZEM",
    collected: summary.collectedTotal,
    target: summary.targetTotal,
    spent: summary.spentTotal,
  });
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

  // Wiersze pogrupowane po dziecku (kolejność z `getArrears`), z pogrubionym
  // podsumowującym wierszem "Razem" po każdym dziecku — żeby dało się od
  // razu odczytać jego łączną zaległość bez liczenia ręcznie w arkuszu.
  // Interleaving z wierszami "Razem" wyklucza tu zwykłą zebrę (nie miałaby
  // czytelnego wzoru), więc odróżnienie niesie samo podświetlenie podsumowań.
  for (const group of groupArrearsByChild(rows)) {
    for (const row of group.rows) sheet.addRow(row);

    const subtotalRow = sheet.addRow({
      childName: group.childName,
      categoryName: "Razem",
      target: group.rows.reduce((sum, r) => sum + r.target, 0),
      paid: group.rows.reduce((sum, r) => sum + r.paid, 0),
      remaining: group.rows.reduce((sum, r) => sum + r.remaining, 0),
    });
    subtotalRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB_BRAND_SOFT } };
    });
  }
  const lastDataRow = sheet.rowCount;

  // Kolumna "Brakuje" dodatkowo na czerwono w każdym wierszu (w tym w
  // wierszach "Razem", gdzie fill+bold powyżej już oznaczył podsumowanie)
  // — ten sam sygnał co czerwone odznaki w appce.
  for (let r = 2; r <= lastDataRow; r++) {
    const cell = sheet.getRow(r).getCell(5);
    cell.font = { bold: true, color: { argb: ARGB_DANGER } };
  }

  sheet.addRow({});
  const noteRow = sheet.addRow([`Wygenerowano: ${formatWarsawDateTime()}`]);
  noteRow.font = { italic: true, color: { argb: ARGB_MUTED }, size: 9 };

  await sendWorkbook(res, workbook, reportFilename("zaleglosci", semesterLabel));
}

export function sendExpensesByMonthPdf(res: Response, report: MonthlyExpensesReport, semesterLabel: string) {
  const doc = startPdf(res, reportFilename("wydatki-wg-miesiecy", semesterLabel));
  pdfHeader(doc, "Wydatki wg miesięcy", semesterLabel);

  if (report.months.length === 0) {
    doc.fillColor(INK_MUTED).font("Body").text("Brak wydatków w tym semestrze.");
    doc.fillColor(INK);
  } else {
    const columns: PdfColumn[] = [
      { header: "Kategoria", width: 130 },
      { header: "Data", width: 75 },
      { header: "Opis", width: 130 },
      { header: "Kwota", width: 61, align: "right" },
    ];

    // Osobna mini-tabela na miesiąc (jak przy zaległościach per dziecko),
    // zamknięta pogrubionym wierszem "Razem" z sumą tego miesiąca.
    for (const month of report.months) {
      const tableRows = [
        ...month.expenses.map((e) => [
          e.categoryName + (e.categoryArchived ? " (zarchiwizowana)" : ""),
          shortDate.format(new Date(e.spentAt)),
          e.description ?? "—",
          currency.format(e.amount),
        ]),
        ["Razem", "", "", currency.format(month.total)],
      ];

      if (doc.y > doc.page.height - doc.page.margins.bottom - 90) {
        doc.addPage();
      }

      doc.font("Body-Bold").fontSize(12).fillColor(INK).text(month.monthLabel);
      doc.moveDown(0.3);
      pdfTable(doc, columns, tableRows, { boldRowIndex: tableRows.length - 1 });
      doc.moveDown(0.6);
    }

    if (doc.y > doc.page.height - doc.page.margins.bottom - 40) {
      doc.addPage();
    }
    doc
      .font("Body-Bold")
      .fontSize(11)
      .fillColor(BRAND)
      .text(`Razem za cały semestr: ${currency.format(report.total)}`);
    doc.fillColor(INK);
  }

  doc.end();
}

export async function sendExpensesByMonthXlsx(res: Response, report: MonthlyExpensesReport, semesterLabel: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Skarbnik Przedszkolny";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(`Wydatki wg miesięcy ${semesterLabel}`.slice(0, 31), {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = [
    { header: "Miesiąc", key: "month", width: 18 },
    { header: "Kategoria", key: "category", width: 26 },
    { header: "Data", key: "date", width: 14 },
    { header: "Opis", key: "description", width: 32 },
    { header: "Kwota", key: "amount", width: 14, style: { numFmt: PLN_FORMAT } },
  ];
  styleHeaderRow(sheet.getRow(1));
  sheet.autoFilter = { from: "A1", to: "E1" };

  // Wiersze pogrupowane wg miesiąca, z pogrubionym wierszem "Razem" po
  // każdym — ten sam wzorzec co w eksporcie zaległości per dziecko.
  for (const month of report.months) {
    for (const expense of month.expenses) {
      sheet.addRow({
        month: month.monthLabel,
        category: expense.categoryName + (expense.categoryArchived ? " (zarchiwizowana)" : ""),
        date: shortDate.format(new Date(expense.spentAt)),
        description: expense.description ?? "",
        amount: expense.amount,
      });
    }

    const subtotalRow = sheet.addRow({ month: month.monthLabel, category: "Razem", amount: month.total });
    subtotalRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB_BRAND_SOFT } };
    });
  }

  sheet.addRow({});
  const totalRow = sheet.addRow({ category: "RAZEM ZA CAŁY SEMESTR", amount: report.total });
  totalRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: ARGB_BRAND } };
  });

  const generatedRow = sheet.addRow({ month: `Wygenerowano: ${formatWarsawDateTime()}` });
  generatedRow.font = { italic: true, color: { argb: ARGB_MUTED }, size: 9 };

  await sendWorkbook(res, workbook, reportFilename("wydatki-wg-miesiecy", semesterLabel));
}

export function sendChildReportPdf(res: Response, report: ChildFullReport) {
  const childName = `${report.child.firstName} ${report.child.lastName}`;
  const doc = startPdf(res, reportFilename("karta-dziecka", childName));
  pdfHeader(doc, `Karta dziecka — ${childName}`, "Dane i składki za oba semestry");

  doc.font("Body").fontSize(10).fillColor(INK_MUTED);
  doc.text(`E-mail rodzica: ${report.child.parentContactEmail || "—"}`);
  doc.text(`Telefon: ${report.child.parentContactPhone || "—"}`);
  doc.text(`Notatki: ${report.child.notes || "—"}`);
  doc.fillColor(INK);
  doc.moveDown(0.8);

  const summaryColumns: PdfColumn[] = [
    { header: "Kategoria", width: 190 },
    { header: "Plan", width: 90, align: "right" },
    { header: "Wpłacono", width: 90, align: "right" },
    { header: "Brakuje", width: 106, align: "right" },
  ];
  const paymentColumns: PdfColumn[] = [
    { header: "Data", width: 80 },
    { header: "Kategoria", width: 170 },
    { header: "Opis", width: 130 },
    { header: "Kwota", width: 96, align: "right" },
  ];

  for (const semester of report.semesters) {
    if (doc.y > doc.page.height - doc.page.margins.bottom - 100) doc.addPage();

    doc.font("Body-Bold").fontSize(13).fillColor(INK).text(semester.semesterLabel);
    doc.moveDown(0.3);

    if (semester.ledger.length === 0) {
      doc.font("Body").fontSize(10).fillColor(INK_MUTED).text("Brak kategorii z ustaloną kwotą w tym semestrze.");
      doc.fillColor(INK);
      doc.moveDown(0.8);
      continue;
    }

    const summaryRows = [
      ...semester.ledger.map((row) => [
        row.categoryName + (row.archived ? " (zarchiwizowana)" : ""),
        currency.format(row.target),
        currency.format(row.paid),
        currency.format(row.remaining),
      ]),
      [
        "Razem",
        currency.format(semester.totalTarget),
        currency.format(semester.totalPaid),
        currency.format(semester.totalRemaining),
      ],
    ];
    pdfTable(doc, summaryColumns, summaryRows, {
      highlightColumnIndex: 3,
      highlightColor: DANGER,
      boldRowIndex: summaryRows.length - 1,
    });
    doc.moveDown(0.5);

    // Płaska, chronologiczna historia wpłat pod tabelą kategorii — to samo
    // co widać na ekranie dziecka (patrz ChildPayments.tsx), tylko za
    // wszystkie kategorie naraz zamiast osobno pod każdą z nich.
    const payments = semester.ledger
      .flatMap((row) => row.payments.map((p) => ({ ...p, categoryName: row.categoryName })))
      .sort((a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime());

    if (payments.length > 0) {
      if (doc.y > doc.page.height - doc.page.margins.bottom - 60) doc.addPage();
      doc.font("Body-Bold").fontSize(10).fillColor(INK_MUTED).text("Historia wpłat");
      doc.fillColor(INK);
      doc.moveDown(0.2);
      pdfTable(
        doc,
        paymentColumns,
        payments.map((p) => [
          shortDate.format(new Date(p.paidAt)),
          p.categoryName,
          p.description ?? "—",
          currency.format(p.amount),
        ])
      );
    }

    doc.moveDown(0.8);
  }

  if (doc.y > doc.page.height - doc.page.margins.bottom - 90) doc.addPage();
  const boxX = doc.page.margins.left;
  const boxY = doc.y;
  const boxWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const boxHeight = 60;
  doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 8).fill(BRAND_SOFT);
  doc.fillColor(INK_MUTED).font("Body").fontSize(9).text("RAZEM ZA OBA SEMESTRY", boxX + 16, boxY + 12);
  const percent = report.grandTotalTarget > 0 ? Math.round((report.grandTotalPaid / report.grandTotalTarget) * 100) : 0;
  doc
    .fillColor(percent >= 100 ? SUCCESS : BRAND)
    .font("Body-Bold")
    .fontSize(15)
    .text(
      `${currency.format(report.grandTotalPaid)} / ${currency.format(report.grandTotalTarget)} · ${percent}%`,
      boxX + 16,
      boxY + 27
    );
  doc.fillColor(INK);
  doc.x = boxX;
  doc.y = boxY + boxHeight + 14;

  doc.end();
}

export async function sendChildReportXlsx(res: Response, report: ChildFullReport) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Skarbnik Przedszkolny";
  workbook.created = new Date();

  const childName = `${report.child.firstName} ${report.child.lastName}`;
  const sheet = workbook.addWorksheet(`Karta ${childName}`.slice(0, 31));
  sheet.columns = [{ width: 28 }, { width: 26 }, { width: 16 }, { width: 16 }];

  function sectionHeader(text: string) {
    const row = sheet.addRow([text]);
    row.font = { bold: true, size: 12 };
    sheet.mergeCells(`A${row.number}:D${row.number}`);
  }

  function moneyRow(cells: [string, number, number, number], bold = false) {
    const row = sheet.addRow(cells);
    row.getCell(2).numFmt = PLN_FORMAT;
    row.getCell(3).numFmt = PLN_FORMAT;
    row.getCell(4).numFmt = PLN_FORMAT;
    if (bold) {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { bold: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB_BRAND_SOFT } };
      });
    }
    return row;
  }

  sectionHeader(`Karta dziecka — ${childName}`);
  sheet.addRow(["E-mail rodzica", report.child.parentContactEmail || "—"]);
  sheet.addRow(["Telefon", report.child.parentContactPhone || "—"]);
  sheet.addRow(["Notatki", report.child.notes || "—"]);
  sheet.addRow([]);

  for (const semester of report.semesters) {
    sectionHeader(semester.semesterLabel);

    if (semester.ledger.length === 0) {
      sheet.addRow(["Brak kategorii z ustaloną kwotą w tym semestrze."]);
      sheet.addRow([]);
      continue;
    }

    styleHeaderRow(sheet.addRow(["Kategoria", "Plan", "Wpłacono", "Brakuje"]));
    for (const row of semester.ledger) {
      moneyRow([row.categoryName + (row.archived ? " (zarchiwizowana)" : ""), row.target, row.paid, row.remaining]);
    }
    moneyRow(["Razem", semester.totalTarget, semester.totalPaid, semester.totalRemaining], true);
    sheet.addRow([]);

    const payments = semester.ledger
      .flatMap((row) => row.payments.map((p) => ({ ...p, categoryName: row.categoryName })))
      .sort((a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime());

    if (payments.length > 0) {
      styleHeaderRow(sheet.addRow(["Data", "Kategoria", "Opis", "Kwota"]));
      for (const p of payments) {
        const row = sheet.addRow([shortDate.format(new Date(p.paidAt)), p.categoryName, p.description || "", p.amount]);
        row.getCell(4).numFmt = PLN_FORMAT;
      }
      sheet.addRow([]);
    }
  }

  sectionHeader("Razem za oba semestry");
  styleHeaderRow(sheet.addRow(["", "Plan", "Wpłacono", ""]));
  const grandRow = sheet.addRow(["", report.grandTotalTarget, report.grandTotalPaid, ""]);
  grandRow.getCell(2).numFmt = PLN_FORMAT;
  grandRow.getCell(3).numFmt = PLN_FORMAT;
  grandRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB_BRAND_SOFT } };
  });
  sheet.addRow([]);

  const generatedRow = sheet.addRow([`Wygenerowano: ${formatWarsawDateTime()}`]);
  generatedRow.font = { italic: true, color: { argb: ARGB_MUTED }, size: 9 };

  await sendWorkbook(res, workbook, reportFilename("karta-dziecka", childName));
}
