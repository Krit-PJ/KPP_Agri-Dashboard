export type CropRecord = {
  record_id: string; district_code: string; district_name: string;
  year_be: number; year_ce: number; crop_id: string; crop_name: string;
  planted_area_rai: number | null; harvested_area_rai: number | null;
  production_ton: number | null; calculated_yield_kg_rai: number | null;
  quality_status: "pass" | "warning" | "error"; quality_notes: string[];
  data_status: "draft" | "published" | "archived"; source_sheet: string; source_row: number;
};

export type Kpis = {
  planted: number; harvested: number; production: number;
  weightedYield: number | null; harvestRate: number | null;
};

export type CropShare = {
  cropId: string;
  planted: number;
  percent: number | null;
};

export type DistrictYearSeries = {
  year: number;
  values: number[];
};

export const cropCatalog = [
  ["rice_offseason", "ข้าวนาปรัง"],
  ["rice_main", "ข้าวนาปี"],
  ["maize_1", "ข้าวโพดรุ่น 1"],
  ["maize_2", "ข้าวโพดรุ่น 2"],
  ["cassava", "มันสำปะหลัง"],
  ["oil_palm", "ปาล์มน้ำมัน"],
  ["rubber", "ยางพารา"],
  ["sugarcane", "อ้อย"],
  ["banana_egg", "กล้วยไข่"],
] as const;

export type CropId = typeof cropCatalog[number][0];

const cropIdBySheetCode: Record<string, CropId> = {
  C01: "rice_offseason",
  C02: "rice_main",
  C03: "maize_1",
  C04: "maize_2",
  C05: "cassava",
  C06: "oil_palm",
  C07: "rubber",
  C08: "sugarcane",
  C09: "banana_egg",
};

const cropIdByName: Record<string, CropId> = {
  ข้าวนาปรัง: "rice_offseason",
  ข้าวนาปี: "rice_main",
  ข้าวโพดรุ่น1: "maize_1",
  ข้าวโพดรุ่น2: "maize_2",
  มันสำปะหลัง: "cassava",
  ปาล์มน้ำมัน: "oil_palm",
  ยางพารา: "rubber",
  อ้อย: "sugarcane",
  กล้วยไข่: "banana_egg",
};

const compactText = (value: string) => value.trim().replace(/\s+/g, "");

export function normalizeCropId(sheetCode: string, cropName = ""): CropId | null {
  const code = sheetCode.trim();
  if (cropCatalog.some(([cropId]) => cropId === code)) return code as CropId;
  return cropIdBySheetCode[code.toUpperCase()] ?? cropIdByName[compactText(cropName)] ?? null;
}

export function canonicalCropName(cropId: CropId): string {
  return cropCatalog.find(([id]) => id === cropId)?.[1] ?? cropId;
}

export function normalizeQualityStatus(value: string): CropRecord["quality_status"] {
  const status = value.trim().toLowerCase();
  if (["pass", "valid", "ผ่าน"].includes(status)) return "pass";
  if (["warning", "warn", "คำเตือน"].includes(status)) return "warning";
  if (["error", "invalid", "fail", "ไม่ผ่าน"].includes(status)) return "error";
  return "warning";
}

export function normalizeDataStatus(value: string): CropRecord["data_status"] {
  const status = value.trim().toLowerCase();
  if (["active", "published", "เผยแพร่"].includes(status)) return "published";
  if (["archived", "inactive", "deleted", "ยกเลิก"].includes(status)) return "archived";
  return "draft";
}

export function calculateKpis(records: CropRecord[]): Kpis {
  const sum = (key: "planted_area_rai" | "harvested_area_rai" | "production_ton") =>
    records.reduce((total, row) => total + (row[key] ?? 0), 0);
  const planted = sum("planted_area_rai");
  const harvested = sum("harvested_area_rai");
  const production = sum("production_ton");
  return {
    planted, harvested, production,
    weightedYield: harvested > 0 ? production * 1000 / harvested : null,
    harvestRate: planted > 0 ? harvested / planted : null,
  };
}

export function toggleYearSelection(selectedYears: number[], year: number): number[] {
  if (!selectedYears.includes(year)) return [...selectedYears, year];
  return selectedYears.length === 1
    ? selectedYears
    : selectedYears.filter(selectedYear => selectedYear !== year);
}

export function selectYearFromChart(year: number): number[] {
  return Number.isInteger(year) ? [year] : [];
}

export function availableYearsForCrop(
  records: Array<Pick<CropRecord, "crop_id" | "year_be">>,
  cropId: string,
): number[] {
  return [...new Set(records
    .filter(record => record.crop_id === cropId)
    .map(record => record.year_be))]
    .sort((a, b) => b - a);
}

export function reconcileYearSelection(selectedYears: number[], availableYears: number[]): number[] {
  const available = new Set(availableYears);
  const validSelection = selectedYears.filter(year => available.has(year));
  return validSelection.length ? validSelection : availableYears.slice(0, 1);
}

export function calculateCropShares(records: CropRecord[], cropIds: string[]): CropShare[] {
  const plantedByCrop = cropIds.map(cropId => ({
    cropId,
    planted: calculateKpis(records.filter(record => record.crop_id === cropId)).planted,
  }));
  const totalPlanted = plantedByCrop.reduce((total, crop) => total + crop.planted, 0);
  return plantedByCrop.map(crop => ({
    ...crop,
    percent: totalPlanted > 0 ? crop.planted / totalPlanted : null,
  }));
}

export function aggregateDistrictYearMetric(
  records: CropRecord[],
  districts: string[],
  years: number[],
  metric: "planted_area_rai" | "production_ton",
): DistrictYearSeries[] {
  return years.map(year => ({
    year,
    values: districts.map(district => records.reduce((total, record) => {
      if (record.year_be !== year || record.district_name !== district) return total;
      return total + (record[metric] ?? 0);
    }, 0)),
  }));
}

export function yoy(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

export const cropColors: Record<string, string> = {
  rice_offseason:"#D4A72C", rice_main:"#1B7F5A", maize_1:"#E0A11A",
  maize_2:"#F0C24B", cassava:"#8A6842", oil_palm:"#3A8D44",
  rubber:"#687B5A", sugarcane:"#6AAE4F", banana_egg:"#E5B429",
};
