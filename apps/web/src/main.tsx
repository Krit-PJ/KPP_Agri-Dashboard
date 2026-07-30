import React, {useEffect, useMemo, useRef, useState} from "react";
import {createRoot} from "react-dom/client";
import {init, use, type EChartsCoreOption} from "echarts/core";
import {BarChart, LineChart, PieChart} from "echarts/charts";
import {GridComponent, LegendComponent, TooltipComponent} from "echarts/components";
import {CanvasRenderer} from "echarts/renderers";
import {
  calculateCropShares,
  calculateKpis,
  cropColors,
  toggleYearSelection,
  yoy,
  type Kpis,
} from "@kpp/shared";
import {loadDashboardData, spreadsheetUrl, type DashboardData, type DashboardPayload} from "./dataSource";
import "./styles.css";

use([BarChart, LineChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

type Payload = DashboardPayload;
type Metric = "planted" | "harvested" | "production" | "weightedYield";
type YearSummary = {year: number; kpis: Kpis; issues: number};

const numberFormat = new Intl.NumberFormat("th-TH", {maximumFractionDigits: 0});
const decimalFormat = new Intl.NumberFormat("th-TH", {maximumFractionDigits: 1});
const percentFormat = new Intl.NumberFormat("th-TH", {style: "percent", maximumFractionDigits: 1});
const dateFormat = new Intl.DateTimeFormat("th-TH", {dateStyle: "medium", timeStyle: "short"});
const appVersion = "4.1.0";
const cropPalette = ["#16835e", "#2457c5", "#f2a33a", "#9a62c7", "#e05b72", "#6e7e45", "#d4b22c", "#4f92a6", "#e37d42"];
const cropCatalog: [string, string][] = [
  ["rice_offseason", "ข้าวนาปรัง"],
  ["rice_main", "ข้าวนาปี"],
  ["maize_1", "ข้าวโพดรุ่น 1"],
  ["maize_2", "ข้าวโพดรุ่น 2"],
  ["cassava", "มันสำปะหลัง"],
  ["oil_palm", "ปาล์มน้ำมัน"],
  ["rubber", "ยางพารา"],
  ["sugarcane", "อ้อย"],
  ["banana_egg", "กล้วยไข่"],
];

const metricMeta: Record<Metric, {label: string; unit: string}> = {
  planted: {label: "เนื้อที่เพาะปลูก", unit: "ไร่"},
  harvested: {label: "เนื้อที่เก็บเกี่ยว", unit: "ไร่"},
  production: {label: "ผลผลิต", unit: "ตัน"},
  weightedYield: {label: "ผลผลิตเฉลี่ย", unit: "กก./ไร่"},
};

const formatNumber = (value: number | null) => value === null ? "—" : numberFormat.format(value);
const compactNumber = (value: number) => value >= 1_000_000
  ? `${decimalFormat.format(value / 1_000_000)}M`
  : value >= 1_000 ? `${decimalFormat.format(value / 1_000)}K` : numberFormat.format(value);

function Chart({option, label, className = ""}: {option: EChartsCoreOption; label: string; className?: string}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = init(ref.current);
    chart.setOption(option);
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [option]);
  return <div ref={ref} className={`chart ${className}`} role="img" aria-label={label}/>;
}

function KpiCard({metric, value, detail, tone}: {
  metric: Metric;
  value: number | null;
  detail: string;
  tone: string;
}) {
  const meta = metricMeta[metric];
  return <article className={`kpi-card ${tone}`}>
    <div className="kpi-label"><span className="kpi-dot"/>{meta.label}</div>
    <div className="kpi-value">{formatNumber(value)}<small>{meta.unit}</small></div>
    <p>{detail}</p>
  </article>;
}

function App() {
  const [data, setData] = useState<Payload | null>(null);
  const [connection, setConnection] = useState<DashboardData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [crop, setCrop] = useState(cropCatalog[0][0]);
  const [district, setDistrict] = useState("all");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    loadDashboardData()
      .then(result => {
        setConnection(result);
        setData(result.payload);
      })
      .catch(error => setLoadError(error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูลได้"));
  }, []);

  const published = useMemo(
    () => data?.records.filter(record => record.data_status === "published") ?? [],
    [data],
  );
  const options = useMemo(() => data ? {
    years: [...new Set(published.map(record => record.year_be))].sort((a, b) => b - a),
    crops: cropCatalog.map(([id, fallbackName]) => [
      id,
      published.find(record => record.crop_id === id)?.crop_name || fallbackName,
    ] as [string, string]),
    districts: [...new Set(published.map(record => record.district_name))].sort((a, b) => a.localeCompare(b, "th")),
  } : null, [data, published]);

  useEffect(() => {
    if (options && selectedYears.length === 0) setSelectedYears(options.years.slice(0, 1));
  }, [options, selectedYears.length]);

  const context = useMemo(() => published.filter(record =>
    record.crop_id === crop
    && (district === "all" || record.district_name === district)
  ), [published, crop, district]);

  const selectedRecords = useMemo(
    () => context.filter(record => selectedYears.includes(record.year_be)),
    [context, selectedYears],
  );
  const selectedKpis = useMemo(() => calculateKpis(selectedRecords), [selectedRecords]);
  const selectedYearSet = useMemo(() => new Set(selectedYears), [selectedYears]);
  const selectedYearsAscending = useMemo(() => selectedYears.slice().sort((a, b) => a - b), [selectedYears]);

  const allYearly = useMemo(() => options?.years.slice().sort((a, b) => a - b).map(year => {
    const records = context.filter(record => record.year_be === year);
    return {
      year,
      kpis: calculateKpis(records),
      issues: records.filter(record => record.quality_status !== "pass").length,
    };
  }) ?? [], [context, options]);

  const selectedYearly = useMemo(
    () => allYearly.filter(item => selectedYearSet.has(item.year)),
    [allYearly, selectedYearSet],
  );

  const donutByYear = useMemo(() => selectedYearsAscending.map(year => {
    const yearRecords = published.filter(record =>
      record.year_be === year && (district === "all" || record.district_name === district)
    );
    const shares = calculateCropShares(yearRecords, options?.crops.map(([id]) => id) ?? []);
    return {
      year,
      data: options?.crops.map(([id, name], index) => ({
        name,
        value: shares.find(item => item.cropId === id)?.planted ?? 0,
        sharePercent: shares.find(item => item.cropId === id)?.percent ?? null,
        itemStyle: {color: cropColors[id] ?? cropPalette[index % cropPalette.length]},
        selected: crop === id,
      })).filter(item => item.value > 0) ?? [],
    };
  }), [selectedYearsAscending, published, district, options, crop]);

  if (loadError) return <main className="loading error-state">
    <strong>ไม่สามารถเปิด Dashboard ได้</strong><p>{loadError}</p>
    <button onClick={() => window.location.reload()}>ลองใหม่</button>
  </main>;
  if (!data || !options || !connection || selectedYears.length === 0) return <main className="loading">
    <span className="loader"/><p>กำลังเชื่อมต่อ Google Sheets…</p>
  </main>;

  const selectedCrop = options.crops.find(([id]) => id === crop)?.[1] ?? cropCatalog[0][1];
  const selectedDistrict = district === "all" ? "ทุกอำเภอ" : district;
  const yearLabel = selectedYearsAscending.length === 1
    ? `พ.ศ. ${selectedYearsAscending[0]}`
    : `พ.ศ. ${selectedYearsAscending.join(", ")}`;
  const hasFilters = selectedYears.length !== 1
    || selectedYears[0] !== options.years[0]
    || crop !== cropCatalog[0][0]
    || district !== "all";
  const warningCount = selectedRecords.filter(record => record.quality_status !== "pass").length;
  const freshness = dateFormat.format(new Date(connection.fetchedAt));

  const toggleYear = (year: number) => {
    setSelectedYears(current => toggleYearSelection(current, year));
  };
  const reset = () => {
    setSelectedYears(options.years.slice(0, 1));
    setCrop(cropCatalog[0][0]);
    setDistrict("all");
  };

  const commonAxis = {
    axisLine: {lineStyle: {color: "#dce4de"}},
    axisLabel: {color: "#68766e"},
    axisTick: {show: false},
  };
  const lineOption: EChartsCoreOption = {
    animationDuration: 650,
    tooltip: {trigger: "axis", valueFormatter: (value: unknown) => `${numberFormat.format(Number(value))} ไร่`},
    grid: {left: 64, right: 20, bottom: 38, top: 25},
    xAxis: {type: "category", data: selectedYearly.map(item => item.year), boundaryGap: false, ...commonAxis},
    yAxis: {
      type: "value",
      splitLine: {lineStyle: {color: "#edf1ee"}},
      axisLabel: {color: "#68766e", formatter: (value: number) => compactNumber(value)},
    },
    series: [{
      name: "เนื้อที่เพาะปลูก",
      type: "line",
      smooth: selectedYearly.length > 2 ? 0.25 : false,
      symbol: "circle",
      symbolSize: 9,
      data: selectedYearly.map(item => item.kpis.planted),
      lineStyle: {color: "#16835e", width: 3},
      itemStyle: {color: "#16835e", borderColor: "#fff", borderWidth: 2},
      areaStyle: {
        color: {
          type: "linear", x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{offset: 0, color: "#16835e38"}, {offset: 1, color: "#16835e00"}],
        },
      },
    }],
  };
  const barOption: EChartsCoreOption = {
    animationDuration: 650,
    tooltip: {trigger: "axis", axisPointer: {type: "shadow"}, valueFormatter: (value: unknown) => `${numberFormat.format(Number(value))} ตัน`},
    grid: {left: 64, right: 20, bottom: 38, top: 25},
    xAxis: {type: "category", data: selectedYearly.map(item => item.year), ...commonAxis},
    yAxis: {
      type: "value",
      splitLine: {lineStyle: {color: "#edf1ee"}},
      axisLabel: {color: "#68766e", formatter: (value: number) => compactNumber(value)},
    },
    series: [{
      name: "ผลผลิต",
      type: "bar",
      barMaxWidth: 44,
      data: selectedYearly.map(item => item.kpis.production),
      itemStyle: {color: "#e7a124", borderRadius: [7, 7, 0, 0]},
    }],
  };

  return <div className="app">
    <header className="topbar">
      <a className="brand" href="#overview" aria-label="กลับไปยังภาพรวม">
        <div className="mark">กพ</div>
        <div><strong>KPP Agri Data</strong><span>สำนักงานเกษตรจังหวัดกำแพงเพชร</span></div>
      </a>
      <button className="menu-toggle" onClick={() => setMenuOpen(open => !open)} aria-expanded={menuOpen} aria-label="เปิดเมนู">☰</button>
      <nav className={menuOpen ? "open" : ""} aria-label="เมนูหลัก">
        <a className="active" href="#overview" onClick={() => setMenuOpen(false)}>สถานการณ์</a>
        <a href="#charts" onClick={() => setMenuOpen(false)}>กราฟ</a>
        <a href="#summary" onClick={() => setMenuOpen(false)}>ตารางข้อมูล</a>
      </nav>
      <a className="admin-button" href={spreadsheetUrl} target="_blank" rel="noreferrer">จัดการข้อมูล <span>↗</span></a>
    </header>

    <main id="overview">
      <section className="year-filter-card" aria-label="ตัวกรองปี พ.ศ.">
        <div className="year-filter-copy">
          <p className="eyebrow">ตัวกรองข้อมูล</p>
          <h1>เลือกปี พ.ศ.</h1>
          <p>เลือกได้ทีละ 1 ปีหรือหลายปี โดยไม่จำเป็นต้องเรียงต่อกัน</p>
        </div>
        <div className="year-actions">
          <button type="button" onClick={() => setSelectedYears(options.years)}>เลือกทุกปี</button>
          <button type="button" onClick={() => setSelectedYears(options.years.slice(0, 1))}>เฉพาะปีล่าสุด</button>
        </div>
        <div className="year-options">
          {options.years.map(year => <button
            type="button"
            key={year}
            className={selectedYearSet.has(year) ? "selected" : ""}
            aria-pressed={selectedYearSet.has(year)}
            onClick={() => toggleYear(year)}
          ><span className="check">{selectedYearSet.has(year) ? "✓" : ""}</span>{year}</button>)}
        </div>
        <div className="filter-meta">
          <span>เลือกแล้ว <strong>{selectedYears.length}</strong> ปี</span>
          <span>{selectedCrop} · {selectedDistrict}</span>
          <span>อัปเดต {freshness}</span>
          <span className="version-badge">Dashboard v{appVersion}</span>
          <button type="button" onClick={reset} disabled={!hasFilters}>ล้างตัวกรองทั้งหมด</button>
        </div>
      </section>

      {connection.warning && <aside className="data-warning" role="status">
        <strong>กำลังใช้ {connection.sourceLabel}</strong><span>{connection.warning}</span>
        <button onClick={() => window.location.reload()}>เชื่อมต่อใหม่</button>
      </aside>}

      <div className="dashboard-layout">
        <aside className="crop-sidebar" aria-label="เลือกชนิดพืช">
          <div className="sidebar-head"><span>ชนิดพืช</span><small>9 ชนิด · เลือก 1</small></div>
          {options.crops.map(([id, name], index) => <button
            type="button"
            key={id}
            className={`crop-bullet ${crop === id ? "active" : ""}`}
            onClick={() => setCrop(id)}
          ><i style={{backgroundColor: cropColors[id] ?? cropPalette[index % cropPalette.length]}}/>{name}</button>)}
          <label className="district-filter">
            <span>พื้นที่</span>
            <select value={district} onChange={event => setDistrict(event.target.value)}>
              <option value="all">ทุกอำเภอ</option>
              {options.districts.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
        </aside>

        <div className="dashboard-content">
          <section className="section-block situation" aria-labelledby="situation-title">
            <div className="section-title">
              <div><span>ภาพรวมข้อมูล</span><h2 id="situation-title">สถานการณ์การผลิต</h2></div>
              <p>{yearLabel} · {numberFormat.format(selectedRecords.length)} ระเบียน</p>
            </div>
            <div className="kpis">
              <KpiCard metric="planted" value={selectedKpis.planted} detail={`รวม ${selectedYears.length} ปีที่เลือก`} tone="purple"/>
              <KpiCard metric="harvested" value={selectedKpis.harvested} detail={`คิดเป็น ${selectedKpis.harvestRate === null ? "—" : percentFormat.format(selectedKpis.harvestRate)} ของเนื้อที่ปลูก`} tone="blue"/>
              <KpiCard metric="production" value={selectedKpis.production} detail="ผลผลิตรวมภายใต้ตัวกรอง" tone="yellow"/>
              <KpiCard metric="weightedYield" value={selectedKpis.weightedYield} detail="คำนวณแบบถ่วงน้ำหนักจากพื้นที่เก็บเกี่ยว" tone="orange"/>
            </div>
          </section>

          <section className="chart-grid" id="charts">
            <article className="panel">
              <div className="panel-title">
                <div><span>LINE GRAPH</span><h2>เนื้อที่เพาะปลูก (ไร่) แยกตามปี พ.ศ.</h2></div>
              </div>
              <Chart label="กราฟเส้นเนื้อที่เพาะปลูกแยกตามปี พ.ศ." option={lineOption}/>
            </article>
            <article className="panel">
              <div className="panel-title">
                <div><span>BAR GRAPH</span><h2>ผลผลิต (ตัน) แยกตามปี พ.ศ.</h2></div>
              </div>
              <Chart label="กราฟแท่งผลผลิตแยกตามปี พ.ศ." option={barOption}/>
            </article>
          </section>

          <section className="panel donut-panel">
            <div className="panel-title">
              <div><span>DONUT GRAPH</span><h2>ร้อยละของเนื้อที่เพาะปลูก จำแนกตามชนิดพืชของแต่ละปี</h2></div>
              <div className="record-count">ฐานคำนวณ: พืชทุกชนิดในปีนั้น</div>
            </div>
            <div className="donut-grid">
              {donutByYear.map(item => <article className="donut-card" key={item.year}>
                <h3>พ.ศ. {item.year}</h3>
                {item.data.length ? <Chart className="donut-chart" label={`สัดส่วนเนื้อที่เพาะปลูก พ.ศ. ${item.year}`} option={{
                  animationDuration: 600,
                  tooltip: {
                    trigger: "item",
                    formatter: (params: unknown) => {
                      const item = params as {name: string; value: number; data: {sharePercent: number | null}};
                      const share = item.data.sharePercent === null ? "—" : percentFormat.format(item.data.sharePercent);
                      return `${item.name}<br/>${numberFormat.format(item.value)} ไร่ (${share})`;
                    },
                  },
                  legend: {bottom: 0, type: "scroll", itemWidth: 8, itemHeight: 8, textStyle: {color: "#637069", fontSize: 9}},
                  series: [{
                    type: "pie",
                    radius: ["48%", "70%"],
                    center: ["50%", "42%"],
                    minAngle: 2,
                    padAngle: 1.5,
                    selectedMode: "single",
                    selectedOffset: 5,
                    label: {show: false},
                    itemStyle: {borderRadius: 4, borderColor: "#fff", borderWidth: 2},
                    data: item.data,
                  }],
                }}/> : <div className="empty">ไม่มีข้อมูล</div>}
              </article>)}
            </div>
          </section>

          <section className="panel summary-panel" id="summary">
            <div className="panel-title">
              <div><span>ตารางข้อมูล</span><h2>สถานการณ์การผลิตรายปี</h2></div>
              <div className="record-count">{selectedYearly.length} ปีที่เลือก</div>
            </div>
            <div className="table-wrap summary-table"><table>
              <thead><tr>
                <th>ปี พ.ศ.</th>
                <th className="num">เนื้อที่ปลูก (ไร่)</th>
                <th className="num">เนื้อที่เก็บเกี่ยว (ไร่)</th>
                <th className="num">ผลผลิต (ตัน)</th>
                <th className="num">ผลผลิตเฉลี่ย (กก./ไร่)</th>
                <th className="num">เปรียบเทียบเนื้อที่ปลูก (ร้อยละ)</th>
                <th className="num">เปรียบเทียบผลผลิต (ร้อยละ)</th>
              </tr></thead>
              <tbody>{selectedYearly.slice().reverse().map(item => {
                const itemIndex = allYearly.findIndex(candidate => candidate.year === item.year);
                const previous = itemIndex > 0 ? allYearly[itemIndex - 1] : null;
                const plantedChange = previous ? yoy(item.kpis.planted, previous.kpis.planted) : null;
                const productionChange = previous ? yoy(item.kpis.production, previous.kpis.production) : null;
                return <tr key={item.year}>
                  <td><strong>{item.year}</strong></td>
                  <td className="num">{formatNumber(item.kpis.planted)}</td>
                  <td className="num">{formatNumber(item.kpis.harvested)}</td>
                  <td className="num">{formatNumber(item.kpis.production)}</td>
                  <td className="num">{formatNumber(item.kpis.weightedYield)}</td>
                  <td className={`num delta-cell ${(plantedChange ?? 0) > 0 ? "positive" : (plantedChange ?? 0) < 0 ? "negative" : ""}`}>
                    {plantedChange === null ? "—" : percentFormat.format(plantedChange)}
                  </td>
                  <td className={`num delta-cell ${(productionChange ?? 0) > 0 ? "positive" : (productionChange ?? 0) < 0 ? "negative" : ""}`}>
                    {productionChange === null ? "—" : percentFormat.format(productionChange)}
                  </td>
                </tr>;
              })}</tbody>
            </table></div>
            <p className="table-note">ร้อยละเปรียบเทียบคำนวณกับปีก่อนหน้าตามลำดับข้อมูลจริง แม้ไม่ได้เลือกปีก่อนหน้านั้นในตัวกรอง</p>
          </section>

          <section className="method">
            <div>
              <p className="eyebrow">ระเบียบวิธีและคุณภาพข้อมูล</p>
              <h2>ตัวเลขที่อธิบายได้<br/>และตรวจสอบย้อนกลับได้</h2>
              <p>ผลผลิตเฉลี่ยระดับรวมคำนวณจากผลผลิตรวม × 1,000 ÷ เนื้อที่เก็บเกี่ยวรวม ส่วน Donut ใช้เนื้อที่เพาะปลูกของพืชแต่ละชนิดหารด้วยเนื้อที่เพาะปลูกรวมทุกชนิดของปีเดียวกัน</p>
            </div>
            <div className="quality-card">
              <span>รายการที่ควรตรวจสอบภายใต้ตัวกรอง</span>
              <strong>{numberFormat.format(warningCount)}<small>ระเบียน</small></strong>
              <p>{warningCount ? "ควรตรวจข้อมูลพื้นที่ ผลผลิต หรือหมายเหตุคุณภาพใน Google Sheets" : "ข้อมูลภายใต้ตัวกรองผ่านเงื่อนไขคุณภาพทั้งหมด"}</p>
              <a href={spreadsheetUrl} target="_blank" rel="noreferrer">เปิดระบบจัดการข้อมูล <b>↗</b></a>
            </div>
          </section>
        </div>
      </div>
    </main>

    <footer>
      <div className="footer-brand"><div className="mark">กพ</div><div><strong>KPP Agri Data</strong><span>Dashboard สถานการณ์การผลิตพืช จังหวัดกำแพงเพชร</span></div></div>
      <p>Dashboard v{appVersion} · Frontend: GitHub Pages · Database: Google Sheets · แหล่งข้อมูล: {connection.sourceLabel}</p>
    </footer>
  </div>;
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
