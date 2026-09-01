import Papa from "papaparse";

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        resolve({
          headers: result.meta.fields ?? [],
          rows: result.data,
        });
      },
      error: (err: Error) => reject(err),
    });
  });
}

const DATE_HEADER_RE = /data|date|dia|competencia|vencimento/i;
const DESC_HEADER_RE = /descri|hist|memo|title|detalh|estabelecimento|lan[çc]amento/i;
const VALUE_HEADER_RE = /valor|amount|value|montante|preco|pre[çc]o/i;

const DATE_VALUE_RE = /^\d{1,4}[/\-.]\d{1,2}[/\-.]\d{1,4}$/;
const NUMERIC_VALUE_RE = /^-?\s*(r\$)?\s*-?\s*[\d.,]+\s*$/i;

export interface ColumnGuess {
  date: string | null;
  description: string | null;
  value: string | null;
}

export function detectColumns(headers: string[], rows: Record<string, string>[]): ColumnGuess {
  const sample = rows.slice(0, 10);

  function matchesFormat(header: string, re: RegExp) {
    const values = sample.map((r) => (r[header] ?? "").trim()).filter(Boolean);
    if (values.length === 0) return false;
    return values.every((v) => re.test(v));
  }

  const date =
    headers.find((h) => DATE_HEADER_RE.test(h)) ??
    headers.find((h) => matchesFormat(h, DATE_VALUE_RE)) ??
    null;

  const value =
    headers.find((h) => VALUE_HEADER_RE.test(h) && h !== date) ??
    headers.find((h) => h !== date && matchesFormat(h, NUMERIC_VALUE_RE)) ??
    null;

  const description =
    headers.find((h) => DESC_HEADER_RE.test(h) && h !== date && h !== value) ??
    headers.find((h) => h !== date && h !== value) ??
    null;

  return { date, description, value };
}

/** Parses common Brazilian and ISO date formats into YYYY-MM-DD. */
export function parseDateFlexible(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  const iso = s.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const br = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (br) {
    const [, d, m, yRaw] = br;
    const y = yRaw.length === 2 ? `20${yRaw}` : yRaw;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  return null;
}

/** Parses currency-like strings (R$ 1.234,56 / -50,00 / 50.00) into a signed number. */
export function parseValueFlexible(raw: string): number | null {
  let s = raw.trim().toLowerCase().replace(/r\$/g, "").trim();
  if (!s) return null;

  const negative = /^-/.test(s) || /^\(.*\)$/.test(s);
  s = s.replace(/[()]/g, "").replace(/^-/, "");

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    s = s.replace(",", ".");
  }

  const n = Number(s.replace(/[^\d.]/g, ""));
  if (Number.isNaN(n)) return null;
  return negative ? -n : n;
}
