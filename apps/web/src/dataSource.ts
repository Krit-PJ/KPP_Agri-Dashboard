import type {CropRecord} from "@kpp/shared";
import bundledSnapshotJson from "../public/data/crop-annual.json";
import {isDashboardPayload, recordsFromCsv, type DashboardPayload} from "./dashboardData";

export {recordsFromCsv, type DashboardPayload} from "./dashboardData";

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
const CACHE_KEY = "kpp-dashboard:annual-data:v3";
const REQUEST_TIMEOUT_MS = 15_000;

// Bundle the verified snapshot with the app so rendering does not depend on a
// hosting path, Google Sheets availability, or browser storage.
if (!isDashboardPayload(bundledSnapshotJson)) {
  throw new Error("ชุดข้อมูลสำรองไม่ผ่าน data contract");
}
export const bundledSnapshot: DashboardPayload = bundledSnapshotJson;

export const sheetId = import.meta.env.VITE_GOOGLE_SHEET_ID?.trim() || DEFAULT_SHEET_ID;
export const sheetName = import.meta.env.VITE_GOOGLE_SHEET_TAB?.trim() || DEFAULT_SHEET_NAME;
export const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;

export const csvUrl = () => {
  const query = new URLSearchParams({
    tqx: "out:csv",
    sheet: sheetName,
    tq: "select *",
  });
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?${query}`;
};

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
    const payload: unknown = cached ? JSON.parse(cached) : null;
    return isDashboardPayload(payload) && payload.records.length ? payload : null;
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
  return bundledSnapshot;
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
