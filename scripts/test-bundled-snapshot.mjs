import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const snapshotUrl = new URL("../apps/web/public/data/crop-annual.json", import.meta.url);
const snapshot = JSON.parse(await readFile(snapshotUrl, "utf8"));
const published = snapshot.records.filter(record => record.data_status === "published");
const years = [...new Set(published.map(record => record.year_be))].sort((a, b) => a - b);
const crops = new Set(published.map(record => record.crop_id));
const districts = new Set(published.map(record => record.district_name));

assert.equal(snapshot.meta.annual_record_count, 792, "snapshot metadata must report 792 annual records");
assert.equal(snapshot.records.length, 792, "snapshot must contain 792 annual records");
assert.equal(published.length, 792, "all snapshot records must be published");
assert.deepEqual(years, [2556, 2557, 2558, 2559, 2560, 2561, 2562, 2563, 2564, 2565, 2566]);
assert.equal(crops.size, 9, "snapshot must contain all 9 crops");
assert.equal(districts.size, 11, "snapshot must contain all 11 districts");

console.log("Bundled snapshot validation passed (792 records, 11 years, 9 crops, 11 districts)");
