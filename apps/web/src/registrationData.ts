export type RegistrationMetric = "planted" | "harvested";

export type RegistrationRecord = {
  districtCode: string;
  districtName: string;
  yearCe: number;
  week: number;
  month: number;
  cropId: string;
  cropName: string;
  metric: RegistrationMetric;
  households: number;
  plots: number;
  areaRai: number;
};

export const registrationCrops = [
  ["rice_main", "ข้าวนาปี"],
  ["rice_off", "ข้าวนาปรัง"],
  ["maize_1", "ข้าวโพดเลี้ยงสัตว์ รุ่น 1"],
  ["maize_2", "ข้าวโพดเลี้ยงสัตว์ รุ่น 2"],
  ["cassava", "มันสำปะหลัง"],
  ["oil_palm", "ปาล์มน้ำมัน"],
  ["longan", "ลำไย"],
  ["durian", "ทุเรียน"],
  ["egg_banana", "กล้วยไข่"],
] as const;

export const districts = [
  ["62-01", "เมืองกำแพงเพชร"], ["62-02", "ไทรงาม"], ["62-03", "คลองลาน"],
  ["62-04", "ขาณุวรลักษบุรี"], ["62-05", "คลองขลุง"], ["62-06", "พรานกระต่าย"],
  ["62-07", "ลานกระบือ"], ["62-08", "ทรายทองวัฒนา"], ["62-09", "ปางศิลาทอง"],
  ["62-10", "บึงสามัคคี"], ["62-11", "โกสัมพีนคร"],
] as const;

const sourceRows = [
  ["62-01","เมืองกำแพงเพชร",202604,355,558,6152.58],["62-02","ไทรงาม",202604,293,392,6148.66],
  ["62-04","ขาณุวรลักษบุรี",202604,92,137,1751.22],["62-05","คลองขลุง",202604,354,634,7880.31],
  ["62-06","พรานกระต่าย",202604,74,104,1300.18],["62-07","ลานกระบือ",202604,223,348,3663.21],
  ["62-08","ทรายทองวัฒนา",202604,173,244,2886.25],["62-10","บึงสามัคคี",202604,6,8,102.5],
  ["62-11","โกสัมพีนคร",202604,20,39,268.75],["62-01","เมืองกำแพงเพชร",202605,4950,7587,91821.31],
  ["62-02","ไทรงาม",202605,4099,5688,81641.48],["62-03","คลองลาน",202605,698,933,8865.78],
  ["62-04","ขาณุวรลักษบุรี",202605,2700,4231,51187.71],["62-05","คลองขลุง",202605,3664,6523,83988.5],
  ["62-06","พรานกระต่าย",202605,3440,5741,66365.14],["62-07","ลานกระบือ",202605,2333,3957,43935.46],
  ["62-08","ทรายทองวัฒนา",202605,1401,2047,26185.59],["62-09","ปางศิลาทอง",202605,1348,1838,22254.78],
  ["62-10","บึงสามัคคี",202605,2339,3769,45541.15],["62-11","โกสัมพีนคร",202605,137,231,1460.27],
  ["62-01","เมืองกำแพงเพชร",202606,2513,3454,34976.32],["62-02","ไทรงาม",202606,1469,1849,28859],
  ["62-03","คลองลาน",202606,1869,2475,19312.32],["62-04","ขาณุวรลักษบุรี",202606,3617,5475,68215.31],
  ["62-05","คลองขลุง",202606,2090,3201,46224.36],["62-06","พรานกระต่าย",202606,2789,3925,38270.55],
  ["62-07","ลานกระบือ",202606,1377,2125,24012.13],["62-08","ทรายทองวัฒนา",202606,429,599,7538.94],
  ["62-09","ปางศิลาทอง",202606,1050,1392,14627.6],["62-10","บึงสามัคคี",202606,571,792,9200.18],
  ["62-11","โกสัมพีนคร",202606,232,321,2257.48],["62-01","เมืองกำแพงเพชร",202607,448,568,4365.01],
  ["62-02","ไทรงาม",202607,233,292,4395.08],["62-03","คลองลาน",202607,505,601,4147.04],
  ["62-04","ขาณุวรลักษบุรี",202607,355,472,6071.43],["62-05","คลองขลุง",202607,168,238,3260.64],
  ["62-06","พรานกระต่าย",202607,901,1211,10810.58],["62-07","ลานกระบือ",202607,282,391,4683.61],
  ["62-08","ทรายทองวัฒนา",202607,34,37,432.5],["62-09","ปางศิลาทอง",202607,196,236,1838.88],
  ["62-10","บึงสามัคคี",202607,37,41,452.33],["62-11","โกสัมพีนคร",202607,60,76,519.5],
] as const;

function isoWeekMonth(year: number, week: number) {
  const date = new Date(Date.UTC(year, 0, 4 + (week - 1) * 7));
  return date.getUTCMonth() + 1;
}

// The supplied workbook has no crop or metric column. It is bundled as the
// initial main-rice/planted-area import; future imports require both choices.
export const bundledRegistration: RegistrationRecord[] = sourceRows.map(row => {
  const period = Number(row[2]);
  const yearCe = Math.floor(period / 100);
  const week = period % 100;
  return {
    districtCode: String(row[0]), districtName: String(row[1]), yearCe, week,
    month: isoWeekMonth(yearCe, week), cropId: "rice_main", cropName: "ข้าวนาปี",
    metric: "planted", households: Number(row[3]), plots: Number(row[4]), areaRai: Number(row[5]),
  };
});

const registrationSheetId = import.meta.env.VITE_GOOGLE_SHEET_ID?.trim() || "1lxQ5rS9xHTq_LlFTSQehsJSk-lTk4HzhlS8hq_0t47U";
const registrationTab = import.meta.env.VITE_REGISTRATION_SHEET_TAB?.trim() || "Registration_Data";

function parseCsv(text: string) {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  for (let i=0;i<text.length;i++) { const c=text[i];
    if (quoted && c==='"' && text[i+1]==='"') { cell+='"'; i++; }
    else if (c==='"') quoted=!quoted;
    else if (c===',' && !quoted) { row.push(cell); cell=""; }
    else if (c==='\n' && !quoted) { row.push(cell); rows.push(row); row=[]; cell=""; }
    else if (c!=='\r') cell+=c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export async function loadRegistrationData(): Promise<{records: RegistrationRecord[]; live: boolean}> {
  const query = new URLSearchParams({tqx:"out:csv",sheet:registrationTab,tq:"select *"});
  try {
    const response = await fetch(`https://docs.google.com/spreadsheets/d/${registrationSheetId}/gviz/tq?${query}`, {cache:"no-store"});
    if (!response.ok) throw new Error(String(response.status));
    const rows=parseCsv(await response.text()); const headers=(rows.shift()||[]).map(x=>x.trim());
    const at=(row:string[],key:string)=>row[headers.indexOf(key)]?.trim()||"";
    const cropCodeMap: Record<string,string>={C01:"rice_main",C02:"rice_off",C03:"maize_1",C04:"maize_2",C05:"cassava",C06:"oil_palm",C07:"longan",C08:"durian",C09:"egg_banana"};
    const records=rows.filter(row=>at(row,"record_status")==="published").map(row=>({
      districtCode:at(row,"district_code"),districtName:at(row,"district_name"),yearCe:Number(at(row,"year_ce")),
      week:Number(at(row,"week_no")),month:Number(at(row,"month_no")),cropId:cropCodeMap[at(row,"crop_code")]||at(row,"crop_code"),cropName:at(row,"crop_name"),
      metric:at(row,"metric_type") as RegistrationMetric,households:Number(at(row,"households")),plots:Number(at(row,"plots")),areaRai:Number(at(row,"area_rai")),
    })).filter(row=>row.districtCode&&Number.isFinite(row.areaRai)&&registrationCrops.some(([id])=>id===row.cropId));
    if (!records.length) throw new Error("empty");
    return {records,live:true};
  } catch { return {records:bundledRegistration,live:false}; }
}

export const provinceOverview = {
  farmerHouseholds: 91150,
  agriculturalAreaRai: 2811784,
  learningCenters: 11,
  learningNetworks: 207,
  largePlots: 104,
  communityEnterprises: 418,
};
