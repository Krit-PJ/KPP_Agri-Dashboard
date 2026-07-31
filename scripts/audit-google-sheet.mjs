import {
  canonicalCropName,
  cropCatalog,
  normalizeCropId,
  normalizeDataStatus,
  normalizeQualityStatus,
} from "../packages/shared/dist/index.js";

const sheetId = process.env.VITE_GOOGLE_SHEET_ID || "1lxQ5rS9xHTq_LlFTSQehsJSk-lTk4HzhlS8hq_0t47U";
const sheetName = process.env.VITE_GOOGLE_SHEET_TAB || "Annual_Data";
const params = new URLSearchParams({tqx: "out:csv", sheet: sheetName, tq: "select *"});
const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?${params}`;

function parseCsv(text) {
  const rows = [];
  let row = [];
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

const response = await fetch(url, {headers: {Accept: "text/csv"}, cache: "no-store"});
if (!response.ok) throw new Error(`Google Sheets returned ${response.status}`);

const rows = parseCsv(await response.text());
const headers = (rows.shift() ?? []).map(value => value.replace(/^\uFEFF/, "").trim());
const requiredHeaders = [
  "record_id", "district_code", "district_name", "year_be", "crop_code", "crop_name",
  "planted_area_rai", "harvested_area_rai", "production_ton", "quality_status", "record_status",
];
const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
if (missingHeaders.length) throw new Error(`Missing headers: ${missingHeaders.join(", ")}`);

const at = (row, key) => row[headers.indexOf(key)]?.trim() ?? "";
const records = rows.filter(row => at(row, "record_id") && at(row, "year_be")).map((row, index) => {
  const cropId = normalizeCropId(at(row, "crop_code"), at(row, "crop_name"));
  if (!cropId) throw new Error(`Unknown crop at CSV row ${index + 2}: ${at(row, "crop_code")}`);
  return {
    cropId,
    cropName: canonicalCropName(cropId),
    year: Number(at(row, "year_be")),
    dataStatus: normalizeDataStatus(at(row, "record_status")),
    qualityStatus: normalizeQualityStatus(at(row, "quality_status")),
  };
});

const cropIds = [...new Set(records.map(record => record.cropId))].sort();
const years = [...new Set(records.map(record => record.year))].sort((a, b) => a - b);
const expectedCropIds = cropCatalog.map(([cropId]) => cropId).slice().sort();
if (JSON.stringify(cropIds) !== JSON.stringify(expectedCropIds)) {
  throw new Error(`Crop contract mismatch. Found: ${cropIds.join(", ")}`);
}
if (!records.some(record => record.dataStatus === "published")) {
  throw new Error("No published records after status normalization");
}

const qualityCounts = records.reduce((counts, record) => {
  counts[record.qualityStatus] = (counts[record.qualityStatus] ?? 0) + 1;
  return counts;
}, {});
console.log(JSON.stringify({
  connected: true,
  sheet: sheetName,
  records: records.length,
  yearRange: [years[0], years.at(-1)],
  crops: cropCatalog.map(([cropId, cropName]) => ({
    sheetCode: `C${String(cropCatalog.findIndex(([id]) => id === cropId) + 1).padStart(2, "0")}`,
    cropId,
    cropName,
    records: records.filter(record => record.cropId === cropId).length,
  })),
  publishedRecords: records.filter(record => record.dataStatus === "published").length,
  qualityCounts,
}, null, 2));
