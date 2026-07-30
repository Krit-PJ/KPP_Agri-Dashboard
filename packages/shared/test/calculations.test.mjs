import test from "node:test";
import assert from "node:assert/strict";
import {calculateKpis, yoy} from "../dist/index.js";
const row=(harvested,production)=>({planted_area_rai:harvested,harvested_area_rai:harvested,production_ton:production});
test("weighted yield uses aggregate totals",()=>assert.equal(calculateKpis([row(100,50),row(900,900)]).weightedYield,950));
test("YoY is unavailable for missing or zero previous values",()=>{assert.equal(yoy(2,null),null);assert.equal(yoy(2,0),null)});
test("YoY uses absolute previous denominator",()=>assert.ok(Math.abs(yoy(120,100)-.2)<1e-10));
