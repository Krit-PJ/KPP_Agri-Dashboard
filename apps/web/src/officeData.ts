export type OfficeTopicId = "overview" | "crops" | "learning" | "organizations" | "largeplots" | "protection" | "projects" | "personnel" | "registration" | "admin";

export type DistrictOfficeRecord = {
  code: string; name: string; households: number; agriculturalArea: number;
  mainRice: number; offRice: number; maize1: number; maize2: number;
  oilPalm: number; longan: number; durian: number; banana: number;
  learningNetworks: number; communityEnterprises: number; enterpriseMembers: number;
  largePlots: number; pestMonitoringPlots: number; personnel: number;
};

export const officeTopics: {id: OfficeTopicId; icon: string; title: string; description: string}[] = [
  {id:"overview",icon:"ภาพรวม",title:"ข้อมูลพื้นฐานจังหวัด",description:"ครัวเรือน พื้นที่เกษตร และตัวชี้วัดสำคัญ"},
  {id:"crops",icon:"พืช",title:"พืชเศรษฐกิจ",description:"พื้นที่เพาะปลูกพืชสำคัญรายอำเภอ"},
  {id:"learning",icon:"ศพก.",title:"ศูนย์เรียนรู้การเกษตร",description:"ศูนย์หลักและเครือข่าย ศพก."},
  {id:"organizations",icon:"องค์กร",title:"องค์กรเกษตรกร",description:"วิสาหกิจชุมชนและสมาชิก"},
  {id:"largeplots",icon:"แปลง",title:"ระบบส่งเสริมเกษตรแบบแปลงใหญ่",description:"จำนวนแปลงใหญ่ในแต่ละพื้นที่"},
  {id:"protection",icon:"อารักขา",title:"อารักขาพืช",description:"ศูนย์จัดการและแปลงติดตามศัตรูพืช"},
  {id:"projects",icon:"โครงการ",title:"โครงการส่งเสริมการเกษตร",description:"โครงการพระราชดำริและงานส่งเสริม"},
  {id:"personnel",icon:"บุคลากร",title:"บุคลากรและหน่วยงาน",description:"กำลังคนระดับจังหวัดและอำเภอ"},
  {id:"registration",icon:"ทะเบียน",title:"สถานการณ์ขึ้นทะเบียนเพาะปลูก",description:"พื้นที่ปลูกและเก็บเกี่ยวรายสัปดาห์"},
  {id:"admin",icon:"Admin",title:"ระบบบริหารข้อมูล",description:"นำเข้า ตรวจสอบ และอนุมัติสิทธิ์"},
];

const raw = [
 ["62-01","เมืองกำแพงเพชร",19163,316493,187951,96773,7632,12180,1751,3112,301,340,23,107,2027,17,12,11],
 ["62-02","ไทรงาม",7879,187225,150747,75838,1664,11457,327,367,0,47,16,33,824,7,6,6],
 ["62-03","คลองลาน",7929,75050,48924,20054,7475,4438,1026,1752,549,55,12,49,590,10,7,5],
 ["62-04","ขาณุวรลักษบุรี",14941,202386,200381,66675,12493,6279,820,366,75,3,18,28,887,9,8,10],
 ["62-05","คลองขลุง",8577,225985,174658,90748,1306,1742,392,26,239,99,21,38,1572,20,6,9],
 ["62-06","พรานกระต่าย",12223,177965,181047,99437,3485,1991,45,33,22,16,17,24,512,5,11,7],
 ["62-07","ลานกระบือ",5686,135841,114335,74074,3281,8723,48,55,66,24,21,26,700,7,6,6],
 ["62-08","ทรายทองวัฒนา",2764,61332,43000,16408,938,2537,16,30,122,5,18,24,350,2,8,5],
 ["62-09","ปางศิลาทอง",4935,77194,53454,17294,5901,9004,407,458,53,2,16,16,474,7,6,5],
 ["62-10","บึงสามัคคี",3773,99720,65134,36879,3536,8412,9,39,12,4,31,46,1093,15,10,5],
 ["62-11","โกสัมพีนคร",3280,19620,13342,5093,5346,414,429,3813,157,29,14,27,646,5,9,5],
] as const;

export const officeDistricts: DistrictOfficeRecord[] = raw.map(r=>({
  code:String(r[0]),name:String(r[1]),households:Number(r[2]),agriculturalArea:Number(r[3]),mainRice:Number(r[4]),offRice:Number(r[5]),
  maize1:Number(r[6]),maize2:Number(r[7]),oilPalm:Number(r[8]),longan:Number(r[9]),durian:Number(r[10]),banana:Number(r[11]),
  learningNetworks:Number(r[12]),communityEnterprises:Number(r[13]),enterpriseMembers:Number(r[14]),largePlots:Number(r[15]),
  pestMonitoringPlots:Number(r[16]),personnel:Number(r[17]),
}));

export const officeTotals = {
  households: 91150, agriculturalArea: 2811784, learningCenters: 11, learningNetworks: 207,
  communityEnterprises: 418, enterpriseMembers: 9675, largePlots: 104, pestCenters: 67,
  pestMonitoringPlots: 88, personnel: 102, smartFarmers: 1430, youngSmartFarmers: 325,
  mainRice: 1832246, offRice: 636603, maize1: 53057, maize2: 67177,
  oilPalm: 15321, longan: 11647, durian: 2220, banana: 624,
};

export const economicCrops = [
  ["mainRice","ข้าวนาปี"],["offRice","ข้าวนาปรัง"],["maize1","ข้าวโพดเลี้ยงสัตว์ รุ่น 1"],
  ["maize2","ข้าวโพดเลี้ยงสัตว์ รุ่น 2"],["oilPalm","ปาล์มน้ำมัน"],["longan","ลำไย"],
  ["durian","ทุเรียน"],["banana","กล้วยไข่"],
] as const;

export const sourceSpreadsheetUrl = "https://docs.google.com/spreadsheets/d/1717yqM4xIVxDzmP1ggMpMvEm2VfP0xE18lVMLOmnuto/edit#gid=1095307500";
export const adminSpreadsheetUrl = import.meta.env.VITE_ADMIN_SHEET_URL?.trim() || "https://docs.google.com/spreadsheets/d/1lxQ5rS9xHTq_LlFTSQehsJSk-lTk4HzhlS8hq_0t47U/edit";
