import type {CropRecord} from "@kpp/shared";

export type DashboardPayload = {
  meta: {
    generated_at: string;
    annual_record_count: number;
    quality_counts: Record<string, number>;
  };
  records: CropRecord[];
};

export type DataSourceKind = "google-sheets" | "cache" | "snapshot";

export type DashboardData = {
  payload: DashboardPayload;
  source: DataSourceKind;
  sourceLabel: string;
  fetchedAt: string;
  warning?: string;
};

const DEFAULT_SHEET_ID = "1lxQ5rS9xHTq_LlFTSQehsJSk-lTk4HzhlS8hq_0t47U";
const DEFAULT_SHEET_NAME = "Annual_Data";
const CACHE_KEY = "kpp-dashboard:annual-data:v2";
const REQUEST_TIMEOUT_MS = 15_000;

export const sheetId = import.meta.env.VITE_GOOGLE_SHEET_ID?.trim() || DEFAULT_SHEET_ID;
export const sheetName = import.meta.env.VITE_GOOGLE_SHEET_TAB?.trim() || DEFAULT_SHEET_NAME;
export const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;

const csvUrl = () => {
  const query = new URLSearchParams({
    tqx: "out:csv",
    sheet: sheetName,
    tq: "select *",
  });
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?${query}`;
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") {
      value += char;
    }
  }

  if (value.length || row.length) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}

const asNumber = (value: string | undefined): number | null => {
  const normalized = value?.replace(/,/g, "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

function recordsFromCsv(csv: string): CropRecord[] {
  const rows = parseCsv(csv);
  const headers = (rows.shift() ?? []).map((value, index) =>
    index === 0 ? value.replace(/^\uFEFF/, "").trim() : value.trim(),
  );
  const required = [
    "record_id",
    "district_code",
    "district_name",
    "year_be",
    "crop_code",
    "crop_name",
    "planted_area_rai",
    "harvested_area_rai",
    "production_ton",
    "quality_status",
    "record_status",
  ];
  const missing = required.filter(header => !headers.includes(header));
  if (missing.length) {
    throw new Error(`หัวคอลัมน์ใน Google Sheet ไม่ครบ: ${missing.join(", ")}`);
  }

  const at = (row: string[], key: string) => row[headers.indexOf(key)]?.trim() ?? "";
  return rows.flatMap(row => {
    const recordId = at(row, "record_id");
    const yearBe = asNumber(at(row, "year_be"));
    if (!recordId || yearBe === null) return [];

    const qualityValue = at(row, "quality_status").toLowerCase();
    const recordValue = at(row, "record_status").toLowerCase();
    const note = at(row, "quality_note");
    const sourceRow = asNumber(at(row, "source_row"));

    const record: CropRecord = {
      record_id: recordId,
      district_code: at(row, "district_code"),
      district_name: at(row, "district_name"),
      year_be: yearBe,
      year_ce: asNumber(at(row, "year_ce")) ?? yearBe - 543,
      crop_id: at(row, "crop_code"),
      crop_name: at(row, "crop_name"),
      planted_area_rai: asNumber(at(row, "planted_area_rai")),
      harvested_area_rai: asNumber(at(row, "harvested_area_rai")),
      production_ton: asNumber(at(row, "production_ton")),
      calculated_yield_kg_rai: asNumber(at(row, "calculated_yield_harvested_kg_per_rai")),
      quality_status: qualityValue === "warning" ? "warning" : qualityValue === "error" ? "error" : "pass",
      quality_notes: note ? note.split(";").map(item => item.trim()).filter(Boolean) : [],
      data_status: recordValue === "archived" ? "archived" : recordValue === "draft" ? "draft" : "published",
      source_sheet: at(row, "source_sheet"),
      source_row: sourceRow ?? 0,
    };
    return [record];
  });
}

function createPayload(records: CropRecord[], generatedAt = new Date().toISOString()): DashboardPayload {
  const qualityCounts = records.reduce<Record<string, number>>((counts, row) => {
    counts[row.quality_status] = (counts[row.quality_status] ?? 0) + 1;
    return counts;
  }, {});
  return {
    meta: {
      generated_at: generatedAt,
      annual_record_count: records.length,
      quality_counts: qualityCounts,
    },
    records,
  };
}

function readCache(): DashboardPayload | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) as DashboardPayload : null;
  } catch {
    return null;
  }
}

function writeCache(payload: DashboardPayload) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Storage can be disabled or full; live data remains usable without it.
  }
}

async function loadSnapshot(): Promise<DashboardPayload> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/crop-annual.json`);
  if (!response.ok) throw new Error(`ไม่สามารถโหลดชุดข้อมูลสำรอง (${response.status})`);
  return response.json() as Promise<DashboardPayload>;
}

export async function loadDashboardData(): Promise<DashboardData> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(csvUrl(), {
      signal: controller.signal,
      cache: "no-store",
      headers: {"Accept": "text/csv"},
    });
    if (!response.ok) throw new Error(`Google Sheets ตอบกลับ ${response.status}`);
    const records = recordsFromCsv(await response.text());
    if (!records.length) throw new Error("ไม่พบข้อมูลใน Annual_Data");
    const payload = createPayload(records);
    writeCache(payload);
    return {
      payload,
      source: "google-sheets",
      sourceLabel: "Google Sheets",
      fetchedAt: payload.meta.generated_at,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "ไม่ทราบสาเหตุ";
    const cached = readCache();
    if (cached?.records.length) {
      return {
        payload: cached,
        source: "cache",
        sourceLabel: "ข้อมูลล่าสุดในอุปกรณ์",
        fetchedAt: cached.meta.generated_at,
        warning: `เชื่อมต่อ Google Sheets ไม่สำเร็จ: ${reason}`,
      };
    }
    const snapshot = await loadSnapshot();
    return {
      payload: snapshot,
      source: "snapshot",
      sourceLabel: "ชุดข้อมูลสำรอง",
      fetchedAt: snapshot.meta.generated_at,
      warning: `เชื่อมต่อ Google Sheets ไม่สำเร็จ: ${reason}`,
    };
  } finally {
    window.clearTimeout(timeout);
  }
}
