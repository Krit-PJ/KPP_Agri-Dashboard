import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {createRoot} from "react-dom/client";
import {init, use as registerECharts, type EChartsCoreOption} from "echarts/core";
import {BarChart, LineChart} from "echarts/charts";
import {GridComponent, LegendComponent, TooltipComponent} from "echarts/components";
import {CanvasRenderer} from "echarts/renderers";
import {adminSpreadsheetUrl, economicCrops, officeDistricts, officeTopics, officeTotals, sourceSpreadsheetUrl, type DistrictOfficeRecord, type OfficeTopicId} from "./officeData";
import {bundledRegistration, loadRegistrationData, registrationCrops, type RegistrationMetric, type RegistrationRecord} from "./registrationData";
import "./styles.css";

registerECharts([BarChart, LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);
const nf = new Intl.NumberFormat("th-TH",{maximumFractionDigits:1});
const monthNames=["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

function Chart({option,label}:{option:EChartsCoreOption;label:string}){
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(!ref.current)return;const chart=init(ref.current);chart.setOption(option);const observer=new ResizeObserver(()=>chart.resize());observer.observe(ref.current);return()=>{observer.disconnect();chart.dispose();};},[option]);
  return <div ref={ref} className="chart" role="img" aria-label={label}/>;
}

type Kpi={label:string;value:number;unit:string;note?:string};
const sum=(rows:DistrictOfficeRecord[],key:keyof DistrictOfficeRecord)=>rows.reduce((total,row)=>total+Number(row[key]||0),0);

function App(){
  const [topic,setTopic]=useState<OfficeTopicId>("overview");
  const [year,setYear]=useState(2568);
  const [district,setDistrict]=useState("all");
  const [crop,setCrop]=useState("rice_main");
  const [economicCrop,setEconomicCrop]=useState<keyof DistrictOfficeRecord>("mainRice");
  const [metric,setMetric]=useState<RegistrationMetric>("planted");
  const [week,setWeek]=useState("all");
  const [registration,setRegistration]=useState<RegistrationRecord[]>(bundledRegistration);
  const [registrationLive,setRegistrationLive]=useState(false);
  useEffect(()=>{void loadRegistrationData().then(result=>{setRegistration(result.records);setRegistrationLive(result.live);});},[]);

  const rows=useMemo(()=>district==="all"?officeDistricts:officeDistricts.filter(row=>row.code===district),[district]);
  const selectedDistrict=officeDistricts.find(row=>row.code===district)?.name||"ทั้งจังหวัด";
  const selectedTopic=officeTopics.find(item=>item.id===topic)!;
  const registrationRows=useMemo(()=>registration.filter(row=>row.yearCe+543===year&&row.cropId===crop&&row.metric===metric&&(district==="all"||row.districtCode===district)&&(week==="all"||row.week===Number(week))),[registration,year,crop,metric,district,week]);
  const weeks=[...new Set(registration.filter(row=>row.yearCe+543===year&&row.cropId===crop&&row.metric===metric).map(row=>row.week))].sort((a,b)=>a-b);
  const officialTotal=useCallback((key:keyof DistrictOfficeRecord)=>district==="all"&&key in officeTotals?Number(officeTotals[key as keyof typeof officeTotals]):sum(rows,key),[district,rows]);

  const kpis=useMemo<Kpi[]>(()=>{
    if(topic==="crops")return[{label:"พื้นที่พืชที่เลือก",value:officialTotal(economicCrop),unit:"ไร่",note:selectedDistrict},{label:"ข้าวนาปี",value:officialTotal("mainRice"),unit:"ไร่"},{label:"ข้าวนาปรัง",value:officialTotal("offRice"),unit:"ไร่"},{label:"ข้าวโพด รุ่น 1–2",value:officialTotal("maize1")+officialTotal("maize2"),unit:"ไร่"}];
    if(topic==="learning")return[{label:"ศูนย์หลัก ศพก.",value:district==="all"?11:1,unit:"ศูนย์"},{label:"ศูนย์เครือข่าย",value:sum(rows,"learningNetworks"),unit:"ศูนย์"},{label:"อำเภอที่มีศูนย์หลัก",value:district==="all"?11:1,unit:"อำเภอ"},{label:"เครือข่ายเฉลี่ย",value:sum(rows,"learningNetworks")/rows.length,unit:"ศูนย์/อำเภอ"}];
    if(topic==="organizations")return[{label:"วิสาหกิจชุมชน",value:sum(rows,"communityEnterprises"),unit:"แห่ง"},{label:"สมาชิกวิสาหกิจชุมชน",value:sum(rows,"enterpriseMembers"),unit:"ราย"},{label:"Smart Farmer",value:district==="all"?officeTotals.smartFarmers:130,unit:"ราย"},{label:"Young Smart Farmer",value:district==="all"?officeTotals.youngSmartFarmers:0,unit:"ราย"}];
    if(topic==="largeplots")return[{label:"แปลงใหญ่",value:sum(rows,"largePlots"),unit:"แปลง"},{label:"อำเภอครอบคลุม",value:rows.filter(r=>r.largePlots>0).length,unit:"อำเภอ"},{label:"เฉลี่ยต่ออำเภอ",value:sum(rows,"largePlots")/rows.length,unit:"แปลง"},{label:"สัดส่วนสูงสุด",value:Math.max(...rows.map(r=>r.largePlots)),unit:"แปลง/อำเภอ"}];
    if(topic==="protection")return[{label:"ศูนย์จัดการศัตรูพืช",value:district==="all"?officeTotals.pestCenters:4,unit:"ศูนย์"},{label:"แปลงติดตามศัตรูพืช",value:sum(rows,"pestMonitoringPlots"),unit:"แปลง"},{label:"คลินิกพืช",value:district==="all"?11:1,unit:"จุด"},{label:"หมอพืชชุมชน",value:district==="all"?52:0,unit:"ราย"}];
    if(topic==="personnel")return[{label:"บุคลากรรวม",value:district==="all"?officeTotals.personnel:sum(rows,"personnel"),unit:"ราย"},{label:"สำนักงานเกษตรอำเภอ",value:district==="all"?11:1,unit:"แห่ง"},{label:"บุคลากรระดับจังหวัด",value:district==="all"?28:0,unit:"ราย"},{label:"บุคลากรระดับอำเภอ",value:district==="all"?74:sum(rows,"personnel"),unit:"ราย"}];
    if(topic==="projects")return[{label:"โครงการคลินิกเกษตรเคลื่อนที่",value:district==="all"?4:0,unit:"พื้นที่"},{label:"แปลงต้นแบบระบบน้ำ",value:district==="all"?2:0,unit:"แปลง"},{label:"อำเภอเป้าหมาย",value:district==="all"?4:0,unit:"อำเภอ"},{label:"ศูนย์เรียนรู้สนับสนุน",value:sum(rows,"learningNetworks"),unit:"ศูนย์"}];
    if(topic==="registration")return[{label:metric==="planted"?"เนื้อที่ปลูก":"เนื้อที่เก็บเกี่ยว",value:registrationRows.reduce((s,r)=>s+r.areaRai,0),unit:"ไร่"},{label:"ครัวเรือน",value:registrationRows.reduce((s,r)=>s+r.households,0),unit:"ครัวเรือน"},{label:"แปลง",value:registrationRows.reduce((s,r)=>s+r.plots,0),unit:"แปลง"},{label:"ช่วงข้อมูล",value:weeks.length,unit:"สัปดาห์"}];
    return[{label:"ครัวเรือนเกษตรกร",value:officialTotal("households"),unit:"ครัวเรือน"},{label:"พื้นที่ทำการเกษตร",value:officialTotal("agriculturalArea"),unit:"ไร่"},{label:"ศูนย์เครือข่าย ศพก.",value:officialTotal("learningNetworks"),unit:"ศูนย์"},{label:"แปลงใหญ่",value:officialTotal("largePlots"),unit:"แปลง"}];
  },[topic,rows,economicCrop,selectedDistrict,district,registrationRows,metric,weeks.length,officialTotal]);

  const chartMetric=topic==="crops"?economicCrop:topic==="learning"?"learningNetworks":topic==="organizations"?"communityEnterprises":topic==="largeplots"?"largePlots":topic==="protection"?"pestMonitoringPlots":topic==="personnel"?"personnel":"agriculturalArea";
  const districtChart=useMemo<EChartsCoreOption>(()=>({tooltip:{trigger:"axis",axisPointer:{type:"shadow"}},grid:{left:135,right:30,top:20,bottom:35},xAxis:{type:"value"},yAxis:{type:"category",data:officeDistricts.map(r=>r.name).reverse(),axisLabel:{fontSize:11}},series:[{type:"bar",data:officeDistricts.map(r=>Number(r[chartMetric])).reverse(),itemStyle:{color:"#1d7654",borderRadius:[0,6,6,0]}}]}),[chartMetric]);
  const weeklyChart=useMemo<EChartsCoreOption>(()=>({tooltip:{trigger:"axis"},grid:{left:65,right:25,top:30,bottom:40},xAxis:{type:"category",data:weeks.map(w=>`สัปดาห์ ${w}`)},yAxis:{type:"value",name:"ไร่"},series:[{type:"line",smooth:true,symbolSize:9,lineStyle:{width:4,color:"#d79a2b"},itemStyle:{color:"#d79a2b"},areaStyle:{color:"#f6e7c8"},data:weeks.map(w=>registration.filter(r=>r.yearCe+543===year&&r.cropId===crop&&r.metric===metric&&r.week===w&&(district==="all"||r.districtCode===district)).reduce((s,r)=>s+r.areaRai,0))}]}),[weeks,registration,year,crop,metric,district]);

  return <div className="site-shell">
    <header className="site-header"><div className="brand"><div className="brand-mark">กพ</div><div><small>สำนักงานเกษตรจังหวัดกำแพงเพชร</small><h1>ระบบข้อมูลสารสนเทศด้านการเกษตร</h1></div></div><div className="header-actions"><span className="data-status"><i/>Google Sheets · ข้อมูลเผยแพร่</span><button onClick={()=>setTopic("admin")}>เข้าสู่ระบบ Admin</button></div></header>
    <section className="filter-header"><div><span>มุมมองข้อมูล</span><strong>{selectedTopic.title}</strong></div><label>ปี พ.ศ.<select value={year} onChange={e=>setYear(Number(e.target.value))}><option value="2568">2568</option><option value="2569">2569</option></select></label><label>พื้นที่<select value={district} onChange={e=>setDistrict(e.target.value)}><option value="all">ทั้งจังหวัด</option>{officeDistricts.map(r=><option key={r.code} value={r.code}>{r.name}</option>)}</select></label><a href={sourceSpreadsheetUrl} target="_blank" rel="noreferrer">แหล่งข้อมูล ↗</a></section>

    <main className="page">
      <section className="intro"><div><p>AGRICULTURAL INFORMATION HUB</p><h2>ข้อมูลพื้นฐานจังหวัดกำแพงเพชร</h2><span>สรุปสถานการณ์สำคัญ ครอบคลุมเศรษฐกิจการเกษตร องค์กรเกษตรกร ศูนย์เรียนรู้ อารักขาพืช โครงการ และบุคลากร สามารถเลือกดูได้ทั้งระดับจังหวัดและ 11 อำเภอ</span></div><div className="year-stamp"><small>ปีข้อมูล</small><strong>{year}</strong><span>{selectedDistrict}</span></div></section>

      <section className="topic-grid" aria-label="เลือกประเด็นข้อมูล">{officeTopics.map(item=><button key={item.id} className={topic===item.id?"topic-card active":"topic-card"} onClick={()=>setTopic(item.id)}><span className="topic-icon">{item.icon}</span><strong>{item.title}</strong><small>{item.description}</small></button>)}</section>

      {topic==="admin"?<AdminPanel/>:<>
        <section className="content-heading"><div><small>{selectedTopic.icon} · ปี พ.ศ. {year}</small><h2>{selectedTopic.title}</h2><p>{selectedTopic.description} · {selectedDistrict}</p></div>{topic==="registration"&&<span className={registrationLive?"live-badge":"fallback-badge"}>{registrationLive?"ข้อมูลสดจาก Google Sheets":"กำลังใช้ข้อมูลสำรอง"}</span>}</section>
        {year===2569&&topic!=="registration"?<div className="data-note">ข้อมูลพื้นฐานจากต้นทางยังเป็นปี 2568 ระบบจึงแสดงค่าล่าสุดที่เผยแพร่และระบุปีต้นทางไว้เพื่อป้องกันการตีความคลาดเคลื่อน</div>:null}
        {topic==="crops"&&<div className="subfilters"><label>ชนิดพืช<select value={String(economicCrop)} onChange={e=>setEconomicCrop(e.target.value as keyof DistrictOfficeRecord)}>{economicCrops.map(([id,name])=><option value={id} key={id}>{name}</option>)}</select></label></div>}
        {topic==="registration"&&<div className="subfilters"><label>ชนิดพืช<select value={crop} onChange={e=>{setCrop(e.target.value);setWeek("all");}}>{registrationCrops.map(([id,name])=><option value={id} key={id}>{name}</option>)}</select></label><label>ตัวชี้วัด<select value={metric} onChange={e=>setMetric(e.target.value as RegistrationMetric)}><option value="planted">เนื้อที่ปลูก</option><option value="harvested">เนื้อที่เก็บเกี่ยว</option></select></label><label>สัปดาห์<select value={week} onChange={e=>setWeek(e.target.value)}><option value="all">ทุกสัปดาห์</option>{weeks.map(w=><option key={w} value={w}>สัปดาห์ {w} · {monthNames[new Date(Date.UTC(year-543,0,4+(w-1)*7)).getUTCMonth()]}</option>)}</select></label></div>}
        <section className="kpi-grid">{kpis.map((kpi,index)=><article key={kpi.label}><span>0{index+1}</span><small>{kpi.label}</small><strong>{nf.format(kpi.value)}</strong><p>{kpi.unit}{kpi.note?` · ${kpi.note}`:""}</p></article>)}</section>
        {topic==="registration"&&registrationRows.length===0?<section className="empty-state"><strong>ยังไม่มีข้อมูลตามตัวกรอง</strong><p>เลือกปี ชนิดพืช หรือประเภทพื้นที่ใหม่ หรือให้ผู้ดูแลนำเข้าข้อมูลผ่านระบบ Admin</p><button onClick={()=>setTopic("admin")}>ไปยังระบบ Admin</button></section>:<section className="analytics-grid"><article className="panel"><div className="panel-title"><small>{topic==="registration"?"แนวโน้มรายสัปดาห์":"เปรียบเทียบเชิงพื้นที่"}</small><h3>{topic==="registration"?"สถานการณ์การขึ้นทะเบียน":"ข้อมูลรายอำเภอ"}</h3></div><Chart option={topic==="registration"?weeklyChart:districtChart} label="กราฟข้อมูลการเกษตรรายอำเภอ"/></article><article className="panel insight"><div className="panel-title"><small>INSIGHT</small><h3>ข้อสังเกตเพื่อการบริหาร</h3></div><Insights rows={rows} kpis={kpis}/></article></section>}
      </>}
      <footer><span>สำนักงานเกษตรจังหวัดกำแพงเพชร · ข้อมูลจาก Google Sheets</span><span>Dashboard v5.1.0</span></footer>
    </main>
  </div>;
}

function Insights({rows,kpis}:{rows:DistrictOfficeRecord[];kpis:Kpi[]}){
  const top=[...rows].sort((a,b)=>b.agriculturalArea-a.agriculturalArea)[0];
  return <div className="insight-list"><div><span>01</span><p><strong>ขอบเขตข้อมูล</strong> แสดง {rows.length} อำเภอ ตามตัวกรองพื้นที่ที่เลือก</p></div><div><span>02</span><p><strong>ค่าหลักของประเด็น</strong> {kpis[0]?.label} รวม {nf.format(kpis[0]?.value||0)} {kpis[0]?.unit}</p></div><div><span>03</span><p><strong>พื้นที่เกษตรสูงสุดในมุมมอง</strong> {top?.name||"—"} {nf.format(top?.agriculturalArea||0)} ไร่</p></div><div><span>04</span><p><strong>การใช้งาน</strong> ใช้ประกอบการติดตามและวางแผน ควรตรวจวันที่ปรับปรุงในแหล่งข้อมูลก่อนอ้างอิงทางราชการ</p></div></div>;
}

function AdminPanel(){return <section className="admin-panel"><div className="admin-copy"><span className="secure-label">SECURE ADMIN WORKSPACE</span><h2>บริหารและนำเข้าข้อมูล</h2><p>ระบบ Admin ทำงานภายใน Google Sheets เพื่อยืนยันตัวตนด้วยบัญชี Google และป้องกันไม่ให้รหัสผ่านหรือสิทธิ์แก้ไขถูกเปิดเผยบน GitHub Pages</p><a className="admin-primary" href={adminSpreadsheetUrl} target="_blank" rel="noreferrer">เปิดระบบ Admin ใน Google Sheets ↗</a></div><div className="admin-actions"><article><span>01</span><h3>ข้อมูลเอกภาพ</h3><p>นำเข้าชุดข้อมูลปัจจุบันของพืชเศรษฐกิจ 9 ชนิด พร้อมตรวจสอบหัวคอลัมน์และข้อมูลซ้ำ</p></article><article><span>02</span><h3>ข้อมูลผลการขึ้นทะเบียน</h3><p>เลือกชนิดพืชและประเภทพื้นที่ปลูก/เก็บเกี่ยวก่อนนำเข้าเพื่อแสดงใน Dashboard</p></article><article><span>03</span><h3>สิทธิ์ผู้ช่วยดูแล</h3><p>ผู้ใช้ส่งคำขอผ่านบัญชี Google ผู้ดูแลหลักตรวจสอบและอนุมัติก่อนใช้งาน</p></article><article><span>04</span><h3>ตรวจสอบย้อนหลัง</h3><p>ทุกการนำเข้ามี Batch ID อีเมล เวลา และ Audit log สำหรับการตรวจสอบ</p></article></div><div className="security-note"><strong>ข้อกำหนดความปลอดภัย</strong><span>เว็บไซต์สาธารณะไม่มีแบบฟอร์ม username/password และไม่จัดเก็บรหัสผ่านใน source code</span></div></section>}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
