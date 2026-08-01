import {
  canonicalCropName,
  cropCatalog,
  normalizeCropId,
  normalizeDataStatus,
  normalizeQualityStatus,
  type CropRecord,
} from "@kpp/shared";

export type DashboardPayload = {
  meta: {
    generated_at: string;
    annual_record_count: number;
    quality_counts: Record<string, number>;
  };
  records: CropRecord[];
};

const REQUIRED_HEADERS = [
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
] as const;
const VALID_CROP_IDS = new Set(cropCatalog.map(([cropId]) => cropId));

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    if (quoted) {
      if (char === '"' && csv[index + 1] === '"') {
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

  if (quoted) throw new Error("รูปแบบ CSV ไม่ถูกต้อง: เครื่องหมายคำพูดปิดไม่ครบ");
  if (value.length || row.length) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}

function parseOptionalNumber(value: string, column: string, rowNumber: number): number | null {
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error(`ค่า ${column} ไม่ใช่ตัวเลข แถวที่ ${rowNumber}`);
  }
  if (parsed < 0) {
    throw new Error(`ค่า ${column} ต้องไม่ติดลบ แถวที่ ${rowNumber}`);
  }
  return parsed;
}

function isNonNegativeNumberOrNull(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0);
}

function isCropRecord(value: unknown): value is CropRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.record_id === "string" && record.record_id.length > 0
    && typeof record.district_code === "string" && record.district_code.length > 0
    && typeof record.district_name === "string" && record.district_name.length > 0
    && Number.isInteger(record.year_be) && Number(record.year_be) > 2400 && Number(record.year_be) < 3000
    && Number.isInteger(record.year_ce) && Number(record.year_ce) === Number(record.year_be) - 543
    && VALID_CROP_IDS.has(record.crop_id as typeof cropCatalog[number][0])
    && typeof record.crop_name === "string" && record.crop_name.length > 0
    && isNonNegativeNumberOrNull(record.planted_area_rai)
    && isNonNegativeNumberOrNull(record.harvested_area_rai)
    && isNonNegativeNumberOrNull(record.production_ton)
    && isNonNegativeNumberOrNull(record.calculated_yield_kg_rai)
    && ["pass", "warning", "error"].includes(String(record.quality_status))
    && Array.isArray(record.quality_notes) && record.quality_notes.every(note => typeof note === "string")
    && ["draft", "published", "archived"].includes(String(record.data_status))
    && typeof record.source_sheet === "string"
    && typeof record.source_row === "number" && Number.isInteger(record.source_row) && record.source_row >= 0;
}

export function isDashboardPayload(value: unknown): value is DashboardPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  if (!payload.meta || typeof payload.meta !== "object" || !Array.isArray(payload.records)) return false;
  const meta = payload.meta as Record<string, unknown>;
  if (typeof meta.generated_at !== "string" || Number.isNaN(Date.parse(meta.generated_at))) return false;
  if (!Number.isInteger(meta.annual_record_count) || meta.annual_record_count !== payload.records.length) return false;
  if (!meta.quality_counts || typeof meta.quality_counts !== "object" || Array.isArray(meta.quality_counts)) return false;
  const qualityCounts = Object.values(meta.quality_counts);
  if (!qualityCounts.every(count => typeof count === "number" && Number.isInteger(count) && count >= 0)) return false;
  if (qualityCounts.reduce((total, count) => total + Number(count), 0) !== payload.records.length) return false;
  if (!payload.records.every(isCropRecord)) return false;
  return new Set(payload.records.map(record => record.record_id)).size === payload.records.length;
}

export function recordsFromCsv(csv: string): CropRecord[] {
  const rows = parseCsv(csv);
  const headers = (rows.shift() ?? []).map((value, index) =>
    index === 0 ? value.replace(/^\uFEFF/, "").trim() : value.trim(),
  );
  const duplicateHeaders = headers.filter((header, index) => header && headers.indexOf(header) !== index);
  if (duplicateHeaders.length) {
    throw new Error(`หัวคอลัมน์ใน Google Sheet ซ้ำ: ${[...new Set(duplicateHeaders)].join(", ")}`);
  }
  const missing = REQUIRED_HEADERS.filter(header => !headers.includes(header));
  if (missing.length) {
    throw new Error(`หัวคอลัมน์ใน Google Sheet ไม่ครบ: ${missing.join(", ")}`);
  }

  const columnIndex = new Map(headers.map((header, index) => [header, index]));
  const at = (row: string[], key: string) => row[columnIndex.get(key) ?? -1]?.trim() ?? "";
  const seenRecordIds = new Set<string>();
  const records = rows.flatMap((row, rowIndex) => {
    const rowNumber = rowIndex + 2;
    const recordId = at(row, "record_id");
    if (!recordId && row.every(value => !value.trim())) return [];
    if (!recordId) throw new Error(`ไม่มี record_id แถวที่ ${rowNumber}`);
    if (seenRecordIds.has(recordId)) throw new Error(`record_id ซ้ำ "${recordId}" แถวที่ ${rowNumber}`);
    seenRecordIds.add(recordId);

    const yearBe = parseOptionalNumber(at(row, "year_be"), "year_be", rowNumber);
    if (yearBe === null || !Number.isInteger(yearBe) || yearBe <= 2400 || yearBe >= 3000) {
      throw new Error(`ค่า year_be ไม่ถูกต้อง แถวที่ ${rowNumber}`);
    }
    const districtCode = at(row, "district_code");
    const districtName = at(row, "district_name");
    if (!districtCode || !districtName) throw new Error(`ข้อมูลอำเภอไม่ครบ แถวที่ ${rowNumber}`);

    const sheetCropCode = at(row, "crop_code");
    const sheetCropName = at(row, "crop_name");
    const cropId = normalizeCropId(sheetCropCode, sheetCropName);
    if (!cropId) throw new Error(`ไม่รู้จักรหัสพืช "${sheetCropCode}" แถวที่ ${rowNumber}`);

    const yearCeValue = parseOptionalNumber(at(row, "year_ce"), "year_ce", rowNumber);
    if (yearCeValue !== null && (!Number.isInteger(yearCeValue) || yearCeValue !== yearBe - 543)) {
      throw new Error(`ค่า year_ce ไม่สอดคล้องกับ year_be แถวที่ ${rowNumber}`);
    }
    const sourceRowValue = parseOptionalNumber(at(row, "source_row"), "source_row", rowNumber);
    if (sourceRowValue !== null && !Number.isInteger(sourceRowValue)) {
      throw new Error(`ค่า source_row ต้องเป็นจำนวนเต็ม แถวที่ ${rowNumber}`);
    }
    const note = at(row, "quality_note");
    const record: CropRecord = {
      record_id: recordId,
      district_code: districtCode,
      district_name: districtName,
      year_be: yearBe,
      year_ce: yearCeValue ?? yearBe - 543,
      crop_id: cropId,
      crop_name: canonicalCropName(cropId),
      planted_area_rai: parseOptionalNumber(at(row, "planted_area_rai"), "planted_area_rai", rowNumber),
      harvested_area_rai: parseOptionalNumber(at(row, "harvested_area_rai"), "harvested_area_rai", rowNumber),
      production_ton: parseOptionalNumber(at(row, "production_ton"), "production_ton", rowNumber),
      calculated_yield_kg_rai: parseOptionalNumber(
        at(row, "calculated_yield_harvested_kg_per_rai"),
        "calculated_yield_harvested_kg_per_rai",
        rowNumber,
      ),
      quality_status: normalizeQualityStatus(at(row, "quality_status")),
      quality_notes: note ? note.split(";").map(item => item.trim()).filter(Boolean) : [],
      data_status: normalizeDataStatus(at(row, "record_status")),
      source_sheet: at(row, "source_sheet"),
      source_row: sourceRowValue ?? 0,
    };
    return [record];
  });

  const publishedCropIds = new Set(
    records.filter(record => record.data_status === "published").map(record => record.crop_id),
  );
  const missingCrops = cropCatalog.filter(([cropId]) => !publishedCropIds.has(cropId));
  if (missingCrops.length) {
    throw new Error(`Google Sheet ไม่มีข้อมูลเผยแพร่สำหรับ: ${missingCrops.map(([, name]) => name).join(", ")}`);
  }
  return records;
}
