import test from "node:test";
import assert from "node:assert/strict";
import {
  aggregateDistrictYearMetric,
  calculateCropShares,
  calculateKpis,
  canonicalCropName,
  normalizeCropId,
  normalizeDataStatus,
  normalizeQualityStatus,
  selectYearFromChart,
  toggleYearSelection,
  yoy,
} from "../dist/index.js";
const row=(harvested,production)=>({planted_area_rai:harvested,harvested_area_rai:harvested,production_ton:production});
test("weighted yield uses aggregate totals",()=>assert.equal(calculateKpis([row(100,50),row(900,900)]).weightedYield,950));
test("YoY is unavailable for missing or zero previous values",()=>{assert.equal(yoy(2,null),null);assert.equal(yoy(2,0),null)});
test("YoY uses absolute previous denominator",()=>assert.ok(Math.abs(yoy(120,100)-.2)<1e-10));
test("year selection supports non-contiguous years and always keeps one year",()=>{
  assert.deepEqual(toggleYearSelection([2566],2564),[2566,2564]);
  assert.deepEqual(toggleYearSelection([2566,2564],2566),[2564]);
  assert.deepEqual(toggleYearSelection([2564],2564),[2564]);
});
test("clicking a bar activates only the selected year",()=>{
  assert.deepEqual(selectYearFromChart(2565),[2565]);
  assert.deepEqual(selectYearFromChart(Number.NaN),[]);
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
test("Google Sheet crop codes C01-C09 map to the dashboard crop IDs",()=>{
  const expected=[
    "rice_offseason","rice_main","maize_1","maize_2","cassava",
    "oil_palm","rubber","sugarcane","banana_egg",
  ];
  assert.deepEqual(expected.map((_,index)=>normalizeCropId(`C0${index+1}`)),expected);
  assert.equal(normalizeCropId("unknown","ข้าวโพด รุ่น 1"),"maize_1");
  assert.equal(canonicalCropName("maize_1"),"ข้าวโพดรุ่น 1");
});
test("Google Sheet status values map to the dashboard contract",()=>{
  assert.equal(normalizeDataStatus("active"),"published");
  assert.equal(normalizeDataStatus("archived"),"archived");
  assert.equal(normalizeDataStatus("unexpected"),"draft");
  assert.equal(normalizeQualityStatus("valid"),"pass");
  assert.equal(normalizeQualityStatus("warning"),"warning");
  assert.equal(normalizeQualityStatus("invalid"),"error");
});
test("district-year aggregation creates one grouped bar series per selected year",()=>{
  const records=[
    {year_be:2565,district_name:"เมือง",planted_area_rai:100,production_ton:40},
    {year_be:2565,district_name:"คลองลาน",planted_area_rai:80,production_ton:30},
    {year_be:2566,district_name:"เมือง",planted_area_rai:120,production_ton:50},
    {year_be:2566,district_name:"เมือง",planted_area_rai:30,production_ton:10},
  ];
  assert.deepEqual(
    aggregateDistrictYearMetric(records,["เมือง","คลองลาน"],[2565,2566],"planted_area_rai"),
    [
      {year:2565,values:[100,80]},
      {year:2566,values:[150,0]},
    ],
  );
  assert.deepEqual(
    aggregateDistrictYearMetric(records,["เมือง"],[2566],"production_ton"),
    [{year:2566,values:[60]}],
  );
});
