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

export function yoy(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

export const cropColors: Record<string, string> = {
  rice_offseason:"#D4A72C", rice_main:"#1B7F5A", maize_1:"#E0A11A",
  maize_2:"#F0C24B", cassava:"#8A6842", oil_palm:"#3A8D44",
  rubber:"#687B5A", sugarcane:"#6AAE4F", banana_egg:"#E5B429",
};
