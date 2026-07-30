import React, {useEffect, useMemo, useRef, useState} from "react";
import {createRoot} from "react-dom/client";
import {init, use, type EChartsCoreOption} from "echarts/core";
import {BarChart, LineChart, PieChart} from "echarts/charts";
import {GridComponent, LegendComponent, TooltipComponent} from "echarts/components";
import {CanvasRenderer} from "echarts/renderers";
import {calculateKpis, cropColors, type CropRecord} from "@kpp/shared";
import {loadDashboardData, spreadsheetUrl, type DashboardData, type DashboardPayload} from "./dataSource";
import "./styles.css";

use([BarChart, LineChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

type Payload=DashboardPayload;
type Metric="planted"|"production";

const nf=new Intl.NumberFormat("th-TH",{maximumFractionDigits:0});
const df=new Intl.NumberFormat("th-TH",{maximumFractionDigits:1});
const pct=new Intl.NumberFormat("th-TH",{style:"percent",maximumFractionDigits:1});
const fmt=(v:number|null)=>v===null?"—":nf.format(v);
const cropPalette=["#197b5a","#c7952d","#5e8f74","#e0b965","#356a58","#8b7143","#85a98f","#b7a37a","#528c64"];

function Chart({option,label}:{option:EChartsCoreOption;label:string}){
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!ref.current)return;
    const chart=init(ref.current);
    chart.setOption(option);
    const ro=new ResizeObserver(()=>chart.resize());
    ro.observe(ref.current);
    return()=>{ro.disconnect();chart.dispose()};
  },[option]);
  return <div ref={ref} className="chart" role="img" aria-label={label}/>;
}

function KpiCard({label,value,unit,detail,tone="green"}:{label:string;value:string;unit:string;detail:string;tone?:string}){
  return <article className={`kpi-card ${tone}`}>
    <div className="kpi-head"><span>{label}</span><i aria-hidden="true">↗</i></div>
    <div className="kpi-value">{value}<small>{unit}</small></div>
    <p>{detail}</p>
  </article>;
}

function App(){
  const [data,setData]=useState<Payload|null>(null);
  const [connection,setConnection]=useState<DashboardData|null>(null);
  const [loadError,setLoadError]=useState("");
  const [year,setYear]=useState<number|0>(0);
  const [crop,setCrop]=useState("all");
  const [district,setDistrict]=useState("all");
  const [metric,setMetric]=useState<Metric>("planted");
  const [menuOpen,setMenuOpen]=useState(false);

  useEffect(()=>{
    loadDashboardData()
      .then(result=>{setConnection(result);setData(result.payload)})
      .catch(error=>setLoadError(error instanceof Error?error.message:"ไม่สามารถโหลดข้อมูลได้"));
  },[]);
  const options=useMemo(()=>data?{
    years:[...new Set(data.records.map(r=>r.year_be))].sort((a,b)=>b-a),
    crops:[...new Map(data.records.map(r=>[r.crop_id,r.crop_name])).entries()],
    districts:[...new Set(data.records.map(r=>r.district_name))].sort(),
  }:null,[data]);
  useEffect(()=>{if(options&&!year)setYear(options.years[0])},[options,year]);

  const scoped=useMemo(()=>data?.records.filter(r=>
    r.data_status==="published"&&(year===0||r.year_be===year)&&
    (crop==="all"||r.crop_id===crop)&&(district==="all"||r.district_name===district)
  )??[],[data,year,crop,district]);
  const context=useMemo(()=>data?.records.filter(r=>
    r.data_status==="published"&&(crop==="all"||r.crop_id===crop)&&
    (district==="all"||r.district_name===district)
  )??[],[data,crop,district]);
  const kpis=calculateKpis(scoped);
  const trends=useMemo(()=>options?.years.slice().reverse().map(y=>({year:y,...calculateKpis(context.filter(r=>r.year_be===y))}))??[],[context,options]);
  const ranking=useMemo(()=>options?.districts.map(name=>{
    const values=calculateKpis(scoped.filter(r=>r.district_name===name));
    return {name,value:metric==="planted"?values.planted:values.production};
  }).sort((a,b)=>b.value-a.value)??[],[scoped,options,metric]);
  const composition=useMemo(()=>options?.crops.map(([id,name],index)=>({
    name,value:calculateKpis(scoped.filter(r=>r.crop_id===id)).planted,
    itemStyle:{color:cropColors[id]??cropPalette[index%cropPalette.length]}
  })).filter(x=>x.value>0)??[],[scoped,options]);

  if(loadError)return <main className="loading error-state"><strong>ไม่สามารถเปิด Dashboard ได้</strong><p>{loadError}</p><button onClick={()=>window.location.reload()}>ลองใหม่</button></main>;
  if(!data||!options||!connection)return <main className="loading"><span className="loader"/><p>กำลังเชื่อมต่อ Google Sheets…</p></main>;
  const reset=()=>{setYear(options.years[0]);setCrop("all");setDistrict("all")};
  const hasFilters=year!==options.years[0]||crop!=="all"||district!=="all";
  const selectedCrop=options.crops.find(([id])=>id===crop)?.[1]??"พืชทุกชนิด";
  const selectedDistrict=district==="all"?"ทุกอำเภอ":district;

  const trendOption:EChartsCoreOption={
    animationDuration:700,tooltip:{trigger:"axis"},legend:{top:0,right:0,itemWidth:10,itemHeight:10,textStyle:{color:"#637069"}},
    grid:{left:62,right:22,bottom:34,top:52},xAxis:{type:"category",data:trends.map(x=>x.year),axisLine:{lineStyle:{color:"#dce2dd"}},axisLabel:{color:"#738078"}},
    yAxis:{type:"value",splitLine:{lineStyle:{color:"#edf0ed"}},axisLabel:{color:"#738078",formatter:(v:number)=>v>=1_000_000?`${df.format(v/1_000_000)}M`:v>=1_000?`${df.format(v/1_000)}K`:v}},
    series:[
      {name:"พื้นที่เพาะปลูก (ไร่)",type:"line",smooth:.35,symbol:"circle",symbolSize:7,data:trends.map(x=>Math.round(x.planted)),lineStyle:{color:"#197b5a",width:3},itemStyle:{color:"#197b5a",borderColor:"#fff",borderWidth:2},areaStyle:{color:{type:"linear",x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:"rgba(25,123,90,.18)"},{offset:1,color:"rgba(25,123,90,0)"}]}}},
      {name:"ผลผลิต (ตัน)",type:"line",smooth:.35,symbol:"circle",symbolSize:7,data:trends.map(x=>Math.round(x.production)),lineStyle:{color:"#c7952d",width:3},itemStyle:{color:"#c7952d",borderColor:"#fff",borderWidth:2}}
    ]
  };

  return <div className="app">
    <header className="topbar">
      <a className="brand" href="#overview" aria-label="กลับไปยังภาพรวม">
        <div className="mark">กพ</div>
        <div><strong>KPP Agri Data</strong><span>สำนักงานเกษตรจังหวัดกำแพงเพชร</span></div>
      </a>
      <button className="menu-toggle" onClick={()=>setMenuOpen(v=>!v)} aria-expanded={menuOpen} aria-label="เปิดเมนู">☰</button>
      <nav className={menuOpen?"open":""} aria-label="เมนูหลัก">
        <a className="active" href="#overview" onClick={()=>setMenuOpen(false)}>ภาพรวม</a>
        <a href="#trends" onClick={()=>setMenuOpen(false)}>แนวโน้ม</a>
        <a href="#districts" onClick={()=>setMenuOpen(false)}>รายอำเภอ</a>
        <a href="#records" onClick={()=>setMenuOpen(false)}>ข้อมูล</a>
        <a href="#quality" onClick={()=>setMenuOpen(false)}>คุณภาพข้อมูล</a>
      </nav>
      <a className="admin-button" href={spreadsheetUrl} target="_blank" rel="noreferrer">จัดการข้อมูล <span>↗</span></a>
    </header>

    <main>
      <section className="intro" id="overview">
        <div className="intro-copy">
          <div className={`status-pill ${connection.source!=="google-sheets"?"fallback":""}`}><i/> {connection.source==="google-sheets"?"เชื่อมต่อ Google Sheets แล้ว":connection.sourceLabel}</div>
          <h1>ข้อมูลเกษตร<br/><em>ที่มองเห็นภาพรวม</em></h1>
          <p>สำรวจสถานการณ์การเพาะปลูกพืชเศรษฐกิจ จังหวัดกำแพงเพชร เปรียบเทียบแนวโน้ม พื้นที่ และผลผลิตจากข้อมูลที่ตรวจสอบย้อนกลับได้</p>
          <div className="coverage">
            <span><strong>9</strong> ชนิดพืช</span><span><strong>11</strong> อำเภอ</span>
            <span><strong>{nf.format(data.meta.annual_record_count)}</strong> ระเบียน</span>
          </div>
        </div>
        <div className="year-visual" aria-label={`ปีข้อมูลที่เลือก ${year||"ทุกปี"}`}>
          <span>ปีข้อมูลที่เลือก</span><strong>{year||"ทั้งหมด"}</strong><small>พุทธศักราช</small>
          <div className="orbit one"/><div className="orbit two"/>
        </div>
      </section>

      {connection.warning&&<aside className="data-warning" role="status"><strong>กำลังใช้ {connection.sourceLabel}</strong><span>{connection.warning}</span><button onClick={()=>window.location.reload()}>เชื่อมต่อใหม่</button></aside>}

      <section className="filter-shell" aria-label="ตัวกรองข้อมูล">
        <div className="filter-heading"><div><span>ตัวกรองข้อมูล</span><small>{selectedCrop} · {selectedDistrict}</small></div>{hasFilters&&<button className="text-button" onClick={reset}>คืนค่าเริ่มต้น</button>}</div>
        <div className="filters">
          <label><span>ปี พ.ศ.</span><select value={year} onChange={e=>setYear(Number(e.target.value))}><option value={0}>ทุกปี</option>{options.years.map(y=><option key={y}>{y}</option>)}</select></label>
          <label><span>ชนิดพืช</span><select value={crop} onChange={e=>setCrop(e.target.value)}><option value="all">พืชทุกชนิด</option>{options.crops.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
          <label><span>อำเภอ</span><select value={district} onChange={e=>setDistrict(e.target.value)}><option value="all">ทุกอำเภอ</option>{options.districts.map(d=><option key={d}>{d}</option>)}</select></label>
          <button className="reset-button" onClick={reset} disabled={!hasFilters}>ล้างตัวกรอง</button>
        </div>
      </section>

      <section className="section-block" aria-labelledby="kpi-title">
        <div className="section-title"><div><span>ภาพรวมสำคัญ</span><h2 id="kpi-title">ตัวชี้วัดการผลิต</h2></div><p>{scoped.length} ระเบียนภายใต้ตัวกรอง</p></div>
        <div className="kpis">
          <KpiCard label="พื้นที่เพาะปลูก" value={fmt(kpis.planted)} unit="ไร่" detail="พื้นที่ปลูกทั้งหมดในช่วงที่เลือก"/>
          <KpiCard label="พื้นที่เก็บเกี่ยว" value={fmt(kpis.harvested)} unit="ไร่" detail={`คิดเป็น ${kpis.harvestRate===null?"—":pct.format(kpis.harvestRate)} ของพื้นที่เพาะปลูก`} tone="sage"/>
          <KpiCard label="ผลผลิตรวม" value={fmt(kpis.production)} unit="ตัน" detail="ผลผลิตรวมจากพื้นที่เก็บเกี่ยว" tone="gold"/>
          <KpiCard label="ผลผลิตเฉลี่ย" value={fmt(kpis.weightedYield)} unit="กก./ไร่" detail="คำนวณแบบถ่วงน้ำหนักอย่างถูกต้อง" tone="dark"/>
        </div>
      </section>

      <section className="dashboard-grid" id="trends">
        <article className="panel trend-panel">
          <div className="panel-title"><div><span>แนวโน้มระยะยาว</span><h2>พื้นที่เพาะปลูกและผลผลิต</h2></div><div className="legend-note">พ.ศ. {Math.min(...options.years)}–{Math.max(...options.years)}</div></div>
          <Chart label="กราฟแนวโน้มพื้นที่เพาะปลูกและผลผลิตรายปี" option={trendOption}/>
        </article>
        <article className="panel composition-panel">
          <div className="panel-title"><div><span>โครงสร้างพืช</span><h2>สัดส่วนพื้นที่เพาะปลูก</h2></div></div>
          {composition.length?<Chart label="กราฟสัดส่วนพื้นที่เพาะปลูกรายพืช" option={{
            animationDuration:700,tooltip:{trigger:"item",valueFormatter:(v:unknown)=>`${nf.format(Number(v))} ไร่`},
            legend:{bottom:0,type:"scroll",itemWidth:9,itemHeight:9,textStyle:{color:"#637069",fontSize:11}},
            series:[{type:"pie",radius:["58%","78%"],center:["50%","43%"],padAngle:2,itemStyle:{borderRadius:6},label:{show:false},data:composition}]
          }}/>:<div className="empty">ไม่มีข้อมูลภายใต้ตัวกรองนี้</div>}
        </article>
        <article className="panel ranking-panel" id="districts">
          <div className="panel-title"><div><span>เปรียบเทียบพื้นที่</span><h2>อันดับอำเภอ</h2></div><div className="segmented" aria-label="เลือกตัวชี้วัด"><button className={metric==="planted"?"active":""} onClick={()=>setMetric("planted")}>พื้นที่ปลูก</button><button className={metric==="production"?"active":""} onClick={()=>setMetric("production")}>ผลผลิต</button></div></div>
          <Chart label={`กราฟอันดับอำเภอตาม${metric==="planted"?"พื้นที่เพาะปลูก":"ผลผลิต"}`} option={{
            animationDuration:600,tooltip:{trigger:"axis",axisPointer:{type:"shadow"},valueFormatter:(v:unknown)=>`${nf.format(Number(v))} ${metric==="planted"?"ไร่":"ตัน"}`},
            grid:{left:112,right:28,bottom:28,top:18},xAxis:{type:"value",splitLine:{lineStyle:{color:"#edf0ed"}},axisLabel:{color:"#738078",formatter:(v:number)=>v>=1_000_000?`${df.format(v/1_000_000)}M`:v>=1_000?`${df.format(v/1_000)}K`:v}},
            yAxis:{type:"category",inverse:true,data:ranking.map(x=>x.name),axisLine:{show:false},axisTick:{show:false},axisLabel:{color:"#435148",fontWeight:500}},
            series:[{type:"bar",barWidth:16,data:ranking.map((x,index)=>({value:x.value,itemStyle:{color:index===0?"#197b5a":"#a9cbbb",borderRadius:[0,6,6,0]}}))}]
          }}/>
        </article>
      </section>

      <section className="panel records" id="records">
        <div className="panel-title"><div><span>ข้อมูลตรวจสอบย้อนกลับ</span><h2>รายการข้อมูลภายใต้ตัวกรอง</h2></div><div className="record-count">{nf.format(scoped.length)} รายการ</div></div>
        <div className="table-wrap"><table><thead><tr><th>ปี</th><th>อำเภอ</th><th>พืช</th><th className="num">เพาะปลูก (ไร่)</th><th className="num">เก็บเกี่ยว (ไร่)</th><th className="num">ผลผลิต (ตัน)</th><th>สถานะ</th></tr></thead><tbody>{scoped.slice(0,100).map(r=><tr key={r.record_id}><td>{r.year_be}</td><td>{r.district_name}</td><td>{r.crop_name}</td><td className="num">{fmt(r.planted_area_rai)}</td><td className="num">{fmt(r.harvested_area_rai)}</td><td className="num">{fmt(r.production_ton)}</td><td><span className={`badge ${r.quality_status}`}><i/>{r.quality_status==="pass"?"ผ่าน":"ตรวจสอบ"}</span></td></tr>)}</tbody></table></div>
        {scoped.length>100&&<p className="table-note">แสดง 100 รายการแรกจาก {nf.format(scoped.length)} รายการ</p>}
      </section>

      <section className="method" id="quality">
        <div><p className="eyebrow">ระเบียบวิธี</p><h2>ตัวเลขที่อธิบายได้<br/>และตรวจสอบย้อนกลับได้</h2><p>ผลผลิตเฉลี่ยระดับรวมคำนวณจากผลผลิตรวม × 1,000 ÷ พื้นที่เก็บเกี่ยวรวม ไม่ใช้ค่าเฉลี่ยรายแถว และค่าไม่มีข้อมูลจะไม่ถูกแทนด้วยศูนย์</p></div>
        <div className="quality-card"><span>รายการที่ควรตรวจสอบ</span><strong>{data.meta.quality_counts.warning??0}<small>ระเบียน</small></strong><p>ระบบติดธงคำเตือนและเก็บที่มาถึงชีตและแถวต้นทาง</p><a href="#records">ดูรายการข้อมูล <b>→</b></a></div>
      </section>
    </main>
    <footer><div className="footer-brand"><div className="mark">กพ</div><div><strong>KPP Agri Data</strong><span>Dashboard สถานการณ์การเพาะปลูกพืช จังหวัดกำแพงเพชร</span></div></div><p>Frontend: GitHub Pages · Database: Google Sheets · {connection.sourceLabel}</p></footer>
  </div>;
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
