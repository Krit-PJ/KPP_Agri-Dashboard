import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../google-apps-script/Code.gs", import.meta.url), "utf8");
const context = {
  console,
  Number,
  String,
  Object,
  Array,
  JSON,
  Date,
  Math,
};
vm.createContext(context);
vm.runInContext(source, context);

assert.equal(context.normalizeType_("annual"), "annual");
assert.equal(context.normalizeType_("monthly"), "monthly");
assert.equal(context.toNumberOrNull_("1,234.5"), 1234.5);
assert.equal(context.toNumberOrNull_(""), null);
assert.equal(
  context.businessKey_("annual", {year_be: 2567, crop_code: "C01", district_code: "D01"}),
  "2567|C01|D01",
);
assert.deepEqual(
  JSON.parse(JSON.stringify(context.summarizeStatuses_(["active", "active", "draft", "archived", "unexpected"]))),
  {total: 5, active: 2, draft: 1, archived: 1},
);
assert.match(source, /VERSION: '1\.1\.0'/);
assert.equal(
  context.businessKey_("monthly", {year_be: 2567, crop_code: "C01", district_code: "D01", month_number: 2}),
  "2567|C01|D01|2",
);

const annual = context.buildRecord_.toString();
assert.match(annual, /calculated_yield_harvested_kg_per_rai/);
assert.match(annual, /monthly_record_id/);

console.log("Apps Script pure-function tests passed");
