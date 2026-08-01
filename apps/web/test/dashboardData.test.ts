import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {cropCatalog} from "@kpp/shared";
import {isDashboardPayload, recordsFromCsv} from "../src/dashboardData";

const headers = [
  "record_id",
  "district_code",
  "district_name",
  "year_be",
  "year_ce",
  "crop_code",
  "crop_name",
  "planted_area_rai",
  "harvested_area_rai",
  "production_ton",
  "calculated_yield_harvested_kg_per_rai",
  "quality_status",
  "quality_note",
  "record_status",
  "source_sheet",
  "source_row",
];

function csvWithRows(rows: string[][]): string {
  return [headers, ...rows].map(row => row.map(value => {
    const escaped = value.replaceAll('"', '""');
    return /[",\n]/.test(value) ? `"${escaped}"` : escaped;
  }).join(",")).join("\n");
}

function validRows(): string[][] {
  return cropCatalog.map(([, cropName], index) => [
    `R${index + 1}`,
    `D${String(index + 1).padStart(2, "0")}`,
    index === 0 ? "เมือง, กำแพงเพชร" : `อำเภอ ${index + 1}`,
    "2566",
    "2023",
    `C${String(index + 1).padStart(2, "0")}`,
    cropName,
    "1,000",
    "900",
    "450",
    "500",
    "valid",
    "",
    "active",
    "Annual_Data",
    String(index + 2),
  ]);
}

test("CSV parser handles quoted commas and maps all crop codes", () => {
  const records = recordsFromCsv(csvWithRows(validRows()));
  assert.equal(records.length, 9);
  assert.equal(records[0].district_name, "เมือง, กำแพงเพชร");
  assert.equal(records[0].planted_area_rai, 1_000);
  assert.deepEqual(records.map(record => record.crop_id), cropCatalog.map(([cropId]) => cropId));
});

test("CSV parser rejects malformed and unsafe numeric data", () => {
  assert.throws(() => recordsFromCsv('"record_id,district_code'), /เครื่องหมายคำพูดปิดไม่ครบ/);
  const invalidNumber = validRows();
  invalidNumber[0][7] = "not-a-number";
  assert.throws(() => recordsFromCsv(csvWithRows(invalidNumber)), /planted_area_rai ไม่ใช่ตัวเลข/);
  const negative = validRows();
  negative[0][9] = "-1";
  assert.throws(() => recordsFromCsv(csvWithRows(negative)), /production_ton ต้องไม่ติดลบ/);
});

test("CSV parser rejects duplicate record IDs and inconsistent years", () => {
  const duplicate = validRows();
  duplicate[1][0] = duplicate[0][0];
  assert.throws(() => recordsFromCsv(csvWithRows(duplicate)), /record_id ซ้ำ/);
  const inconsistentYear = validRows();
  inconsistentYear[0][4] = "2022";
  assert.throws(() => recordsFromCsv(csvWithRows(inconsistentYear)), /year_ce ไม่สอดคล้อง/);
});

test("cache payload validator rejects malformed or tampered payloads", () => {
  const records = recordsFromCsv(csvWithRows(validRows()));
  const payload = {
    meta: {
      generated_at: "2026-07-31T00:00:00.000Z",
      annual_record_count: records.length,
      quality_counts: {pass: records.length},
    },
    records,
  };
  assert.equal(isDashboardPayload(payload), true);
  assert.equal(isDashboardPayload({...payload, meta: {...payload.meta, annual_record_count: 999}}), false);
  assert.equal(isDashboardPayload({...payload, records: [{...records[0], production_ton: -1}]}), false);
  assert.equal(isDashboardPayload({...payload, meta: {...payload.meta, generated_at: "invalid"}}), false);
});

test("bundled production snapshot satisfies the runtime data contract", async () => {
  const snapshot = JSON.parse(await readFile(
    new URL("../public/data/crop-annual.json", import.meta.url),
    "utf8",
  )) as unknown;
  assert.equal(isDashboardPayload(snapshot), true);
});
