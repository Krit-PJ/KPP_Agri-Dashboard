import test from "node:test";
import assert from "node:assert/strict";
import {calculateCropShares, calculateKpis, toggleYearSelection, yoy} from "../dist/index.js";
const row=(harvested,production)=>({planted_area_rai:harvested,harvested_area_rai:harvested,production_ton:production});
test("weighted yield uses aggregate totals",()=>assert.equal(calculateKpis([row(100,50),row(900,900)]).weightedYield,950));
test("YoY is unavailable for missing or zero previous values",()=>{assert.equal(yoy(2,null),null);assert.equal(yoy(2,0),null)});
test("YoY uses absolute previous denominator",()=>assert.ok(Math.abs(yoy(120,100)-.2)<1e-10));
test("year selection supports non-contiguous years and always keeps one year",()=>{
  assert.deepEqual(toggleYearSelection([2566],2564),[2566,2564]);
  assert.deepEqual(toggleYearSelection([2566,2564],2566),[2564]);
  assert.deepEqual(toggleYearSelection([2564],2564),[2564]);
});
test("crop shares use the planted-area total from every crop in the year",()=>{
  const rows=[
    {crop_id:"rice",planted_area_rai:60,harvested_area_rai:0,production_ton:0},
    {crop_id:"maize",planted_area_rai:30,harvested_area_rai:0,production_ton:0},
    {crop_id:"cassava",planted_area_rai:10,harvested_area_rai:0,production_ton:0},
  ];
  const shares=calculateCropShares(rows,["rice","maize","cassava"]);
  assert.deepEqual(shares.map(item=>item.planted),[60,30,10]);
  assert.deepEqual(shares.map(item=>item.percent),[0.6,0.3,0.1]);
  assert.ok(Math.abs(shares.reduce((total,item)=>total+(item.percent??0),0)-1)<1e-12);
});
