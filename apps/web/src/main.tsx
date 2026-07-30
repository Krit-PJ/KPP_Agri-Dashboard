import React, {useEffect, useMemo, useRef, useState} from "react";
import {createRoot} from "react-dom/client";
import {init, use, type EChartsCoreOption} from "echarts/core";
import {BarChart, LineChart, PieChart} from "echarts/charts";
import {GridComponent, LegendComponent, TooltipComponent} from "echarts/components";
import {CanvasRenderer} from "echarts/renderers";
import {calculateKpis, cropColors, yoy, type CropRecord, type Kpis} from "@kpp/shared";
import {loadDashboardData, spreadsheetUrl, type DashboardData, type DashboardPayload} from "./dataSource";
import "./styles.css";

use([BarChart, LineChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

type Metric = "planted" | "harvested" | "production" | "weightedYield";
type Payload = DashboardPayload;

const numberFormat = new Intl.NumberFormat("th-TH", {maximumFractionDigits: 0});
const decimalFormat = new Intl.NumberFormat("th-TH", {maximumFractionDigits: 1});
const percentFormat = new Intl.NumberFormat("th-TH", {style: "percent", maximumFractionDigits: 1});
const dateFormat = new Intl.DateTimeFormat("th-TH", {dateStyle: "medium", timeStyle: "short"});
const cropPalette = ["#16835e", "#2457c5", "#f2a33a", "#9a62c7", "#e05b72", "#6e7e45", "#d4b22c", "#4f92a6", "#e37d42"];

const metricMeta: Record<Metric, {label: string; short: string; unit: string; color: string}> = {
  planted: {label: "เนื้อที่เพาะปลูก", short: "พื้นที่ปลูก", unit: "ไร่", color: "#16835e"},
  harvested: {label: "เนื้อที่เก็บเกี่ยว", short: "พื้นที่เก็บเกี่ยว", unit: "ไร่", color: "#2457c5"},
  production: {label: "ผลผลิตรวม", short: "ผลผลิต", unit: "ตัน", color: "#e7a124"},
  weightedYield: {label: "ผลผลิตเฉลี่ย", short: "ผลผลิตเฉลี่ย", unit: "กก./ไร่", color: "#e67e55"},
};

const formatNumber = (value: number | null) => value === null ? "—" : numberFormat.format(value);
const metricValue = (kpis: Kpis, metric: Metric) => kpis[metric];
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

function Change({value, previousYear}: {value: number | null; previousYear: number | null}) {
  if (value === null || previousYear === null) return <span className="change neutral">ไม่มีฐานเปรียบเทียบ</span>;
  const direction = value > 0 ? "up" : value < 0 ? "down" : "neutral";
  return <span className={`change ${direction}`}>
    <b>{value > 0 ? "▲" : value < 0 ? "▼" : "—"}</b> {percentFormat.format(Math.abs(value))} จากปี {previousYear}
  </span>;
}

function KpiCard({
  metric, value, change, previousYear, detail, tone,
}: {
  metric: Metric;
  value: number | null;
  change: number | null;
  previousYear: number | null;
  detail: string;
  tone: string;
}) {
  const meta = metricMeta[metric];
  return <article className={`kpi-card ${tone}`}>
    <div className="kpi-label"><span className="kpi-dot"/>{meta.label}</div>
    <div className="kpi-value">{formatNumber(value)}<small>{meta.unit}</small></div>
    <Change value={change} previousYear={previousYear}/>
    <p>{detail}</p>
  </article>;
}

function MetricButtons({
  value, onChange, metrics = ["planted", "production"],
}: {
  value: Metric;
  onChange: (metric: Metric) => void;
  metrics?: Metric[];
}) {
  return <div className="segmented" aria-label="เลือกตัวชี้วัด">
    {metrics.map(metric => <button
      key={metric}
      className={value === metric ? "active" : ""}
      onClick={() => onChange(metric)}
      type="button"
    >{metricMeta[metric].short}</button>)}
  </div>;
}

function App() {
  const [data, setData] = useState<Payload | null>(null);
  const [connection, setConnection] = useState<DashboardData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [year, setYear] = useState(0);
  const [crop, setCrop] = useState("all");
  const [district, setDistrict] = useState("all");
  const [trendMetric, setTrendMetric] = useState<Metric>("planted");
  const [districtMetric, setDistrictMetric] = useState<Metric>("planted");
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
    crops: [...new Map(published.map(record => [record.crop_id, record.crop_name])).entries()]
      .sort((a, b) => a[1].localeCompare(b[1], "th")),
    districts: [...new Set(published.map(record => record.district_name))].sort((a, b) => a.localeCompare(b, "th")),
  } : null, [data, published]);

  useEffect(() => {
    if (options && year === 0) setYear(options.years[0] ?? 0);
  }, [options, year]);

  const context = useMemo(() => published.filter(record =>
    (crop === "all" || record.crop_id === crop)
    && (district === "all" || record.district_name === district)
  ), [published, crop, district]);
  const current = useMemo(() => context.filter(record => record.year_be === year), [context, year]);
  const previousYear = useMemo(() => options?.years.find(candidate => candidate < year) ?? null, [options, year]);
  const previous = useMemo(
    () => previousYear === null ? [] : context.filter(record => record.year_be === previousYear),
    [context, previousYear],
  );
  const currentKpis = useMemo(() => calculateKpis(current), [current]);
  const previousKpis = useMemo(() => calculateKpis(previous), [previous]);
  const changes = useMemo(() => ({
    planted: yoy(currentKpis.planted, previous.length ? previousKpis.planted : null),
    harvested: yoy(currentKpis.harvested, previous.length ? previousKpis.harvested : null),
    production: yoy(currentKpis.production, previous.length ? previousKpis.production : null),
    weightedYield: yoy(currentKpis.weightedYield, previous.length ? previousKpis.weightedYield : null),
  }), [currentKpis, previousKpis, previous]);

  const yearly = useMemo(() => options?.years.slice().reverse().map(candidate => {
    const records = context.filter(record => record.year_be === candidate);
    return {
      year: candidate,
      records,
      kpis: calculateKpis(records),
      issues: records.filter(record => record.quality_status !== "pass").length,
    };
  }) ?? [], [context, options]);

  const districtComparison = useMemo(() => {
    const districts = district === "all" ? options?.districts ?? [] : [district];
    return districts.map(name => {
      const currentValue = metricValue(calculateKpis(current.filter(record => record.district_name === name)), districtMetric) ?? 0;
      const previousValue = metricValue(calculateKpis(previous.filter(record => record.district_name === name)), districtMetric) ?? 0;
      return {name, currentValue, previousValue};
    }).sort((a, b) => b.currentValue - a.currentValue);
  }, [current, previous, district, districtMetric, options]);

  const composition = useMemo(() => {
    const dimensions = crop === "all"
      ? options?.crops.map(([id, name]) => ({id, name, records: current.filter(record => record.crop_id === id)})) ?? []
      : (options?.districts ?? []).map(name => ({id: name, name, records: current.filter(record => record.district_name === name)}));
    return dimensions.map((item, index) => ({
      name: item.name,
      value: calculateKpis(item.records).planted,
      itemStyle: {color: crop === "all" ? cropColors[item.id] ?? cropPalette[index % cropPalette.length] : cropPalette[index % cropPalette.length]},
    })).filter(item => item.value > 0);
  }, [crop, current, options]);

  if (loadError) return <main className="loading error-state">
    <strong>ไม่สามารถเปิด Dashboard ได้</strong><p>{loadError}</p>
    <button onClick={() => window.location.reload()}>ลองใหม่</button>
  </main>;
  if (!data || !options || !connection || !year) return <main className="loading">
    <span className="loader"/><p>กำลังเชื่อมต่อ Google Sheets…</p>
  </main>;

  const selectedCrop = options.crops.find(([id]) => id === crop)?.[1] ?? "พืชทุกชนิด";
  const selectedDistrict = district === "all" ? "ทุกอำเภอ" : district;
  const hasFilters = year !== options.years[0] || crop !== "all" || district !== "all";
  const reset = () => {
    setYear(options.years[0]);
    setCrop("all");
    setDistrict("all");
  };
  const warningCount = current.filter(record => record.quality_status !== "pass").length;
  const freshness = dateFormat.format(new Date(connection.fetchedAt));
  const trendMeta = metricMeta[trendMetric];
  const districtMeta = metricMeta[districtMetric];

  const trendOption: EChartsCoreOption = {
    animationDuration: 650,
    tooltip: {
      trigger: "axis",
      valueFormatter: (value: unknown) => `${numberFormat.format(Number(value))} ${trendMeta.unit}`,
    },
    grid: {left: 64, right: 20, bottom: 38, top: 30},
    xAxis: {
      type: "category",
      data: yearly.map(item => item.year),
      boundaryGap: false,
      axisLine: {lineStyle: {color: "#dce4de"}},
      axisLabel: {color: "#68766e"},
    },
    yAxis: {
      type: "value",
      splitLine: {lineStyle: {color: "#edf1ee"}},
      axisLabel: {color: "#68766e", formatter: (value: number) => compactNumber(value)},
    },
    series: [{
      name: trendMeta.label,
      type: "line",
      smooth: 0.32,
      symbol: "circle",
      symbolSize: 8,
      data: yearly.map(item => metricValue(item.kpis, trendMetric)),
      lineStyle: {color: trendMeta.color, width: 3},
      itemStyle: {color: trendMeta.color, borderColor: "#fff", borderWidth: 2},
      areaStyle: {
        color: {
          type: "linear", x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{offset: 0, color: `${trendMeta.color}38`}, {offset: 1, color: `${trendMeta.color}00`}],
        },
      },
    }],
  };

  const districtOption: EChartsCoreOption = {
    animationDuration: 600,
    tooltip: {
      trigger: "axis",
      axisPointer: {type: "shadow"},
      valueFormatter: (value: unknown) => `${numberFormat.format(Number(value))} ${districtMeta.unit}`,
    },
    legend: {
      top: 0, right: 0, itemWidth: 12, itemHeight: 8,
      textStyle: {color: "#637069", fontSize: 11},
    },
    grid: {left: 120, right: 28, bottom: 28, top: 42},
    xAxis: {
      type: "value",
      splitLine: {lineStyle: {color: "#edf1ee"}},
      axisLabel: {color: "#68766e", formatter: (value: number) => compactNumber(value)},
    },
    yAxis: {
      type: "category",
      inverse: true,
      data: districtComparison.map(item => item.name),
      axisLine: {show: false},
      axisTick: {show: false},
      axisLabel: {color: "#3f4f46", fontSize: 11},
    },
    series: [
      {
        name: `พ.ศ. ${year}`,
        type: "bar",
        barWidth: 10,
        data: districtComparison.map(item => item.currentValue),
        itemStyle: {color: districtMeta.color, borderRadius: [0, 5, 5, 0]},
      },
      ...(previousYear === null ? [] : [{
        name: `พ.ศ. ${previousYear}`,
        type: "bar" as const,
        barWidth: 10,
        data: districtComparison.map(item => item.previousValue),
        itemStyle: {color: "#c8d6ce", borderRadius: [0, 5, 5, 0]},
      }]),
    ],
  };

  return <div className="app">
    <header className="topbar">
      <a className="brand" href="#overview" aria-label="กลับไปยังภาพรวม">
        <div className="mark">กพ</div>
        <div><strong>KPP Agri Data</strong><span>สำนักงานเกษตรจังหวัดกำแพงเพชร</span></div>
      </a>
      <button className="menu-toggle" onClick={() => setMenuOpen(open => !open)} aria-expanded={menuOpen} aria-label="เปิดเมนู">☰</button>
      <nav className={menuOpen ? "open" : ""} aria-label="เมนูหลัก">
        <a className="active" href="#overview" onClick={() => setMenuOpen(false)}>ภาพรวม</a>
        <a href="#trends" onClick={() => setMenuOpen(false)}>แนวโน้ม</a>
        <a href="#districts" onClick={() => setMenuOpen(false)}>รายอำเภอ</a>
        <a href="#summary" onClick={() => setMenuOpen(false)}>สรุปรายปี</a>
        <a href="#records" onClick={() => setMenuOpen(false)}>ข้อมูล</a>
      </nav>
      <a className="admin-button" href={spreadsheetUrl} target="_blank" rel="noreferrer">จัดการข้อมูล <span>↗</span></a>
    </header>

    <main>
      <section className="hero" id="overview">
        <div className="hero-copy">
          <div className={`status-pill ${connection.source !== "google-sheets" ? "fallback" : ""}`}>
            <i/> {connection.source === "google-sheets" ? "เชื่อมต่อข้อมูลล่าสุดแล้ว" : connection.sourceLabel}
          </div>
          <p className="eyebrow light">สถานการณ์การเพาะปลูก จังหวัดกำแพงเพชร</p>
          <h1>{selectedCrop}</h1>
          <p className="hero-lead">วิเคราะห์พื้นที่เพาะปลูก พื้นที่เก็บเกี่ยว ผลผลิต และประสิทธิภาพการผลิต พร้อมเปรียบเทียบรายปีและรายอำเภอ</p>
          <div className="coverage">
            <span><strong>{options.crops.length}</strong> ชนิดพืช</span>
            <span><strong>{options.districts.length}</strong> อำเภอ</span>
            <span><strong>{numberFormat.format(published.length)}</strong> ระเบียนเผยแพร่</span>
          </div>
        </div>
        <div className="hero-year" aria-label={`ปีข้อมูลที่เลือก ${year}`}>
          <span>ปีเพาะปลูก</span><strong>{year}</strong><small>พุทธศักราช</small>
          {previousYear !== null && <em>เทียบกับ พ.ศ. {previousYear}</em>}
        </div>
      </section>

      {connection.warning && <aside className="data-warning" role="status">
        <strong>กำลังใช้ {connection.sourceLabel}</strong><span>{connection.warning}</span>
        <button onClick={() => window.location.reload()}>เชื่อมต่อใหม่</button>
      </aside>}

      <section className="filter-shell" aria-label="ตัวกรองข้อมูล">
        <div className="filter-heading">
          <div><span>ตัวกรองรายงาน</span><small>{selectedCrop} · {selectedDistrict}</small></div>
          <div className="freshness">อัปเดต {freshness}</div>
        </div>
        <div className="filters">
          <label><span>ปี พ.ศ.</span><select value={year} onChange={event => setYear(Number(event.target.value))}>
            {options.years.map(candidate => <option key={candidate} value={candidate}>{candidate}</option>)}
          </select></label>
          <label><span>ชนิดพืช</span><select value={crop} onChange={event => setCrop(event.target.value)}>
            <option value="all">พืชทุกชนิด</option>
            {options.crops.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select></label>
          <label><span>อำเภอ</span><select value={district} onChange={event => setDistrict(event.target.value)}>
            <option value="all">ทุกอำเภอ</option>
            {options.districts.map(name => <option key={name} value={name}>{name}</option>)}
          </select></label>
          <button className="reset-button" onClick={reset} disabled={!hasFilters}>ล้างตัวกรอง</button>
        </div>
        <div className="crop-tabs" aria-label="เลือกชนิดพืชอย่างรวดเร็ว">
          <button className={crop === "all" ? "active" : ""} onClick={() => setCrop("all")}>ทั้งหมด</button>
          {options.crops.map(([id, name]) => <button
            key={id}
            className={crop === id ? "active" : ""}
            onClick={() => setCrop(id)}
          >{name}</button>)}
        </div>
      </section>

      <section className="section-block" aria-labelledby="kpi-title">
        <div className="section-title">
          <div><span>ภาพรวมสำคัญ</span><h2 id="kpi-title">ตัวชี้วัดการผลิต พ.ศ. {year}</h2></div>
          <p>{numberFormat.format(current.length)} ระเบียนภายใต้ตัวกรอง</p>
        </div>
        <div className="kpis">
          <KpiCard metric="planted" value={currentKpis.planted} change={changes.planted} previousYear={previousYear} detail="พื้นที่เพาะปลูกรวม" tone="purple"/>
          <KpiCard metric="harvested" value={currentKpis.harvested} change={changes.harvested} previousYear={previousYear} detail={`เก็บเกี่ยว ${currentKpis.harvestRate === null ? "—" : percentFormat.format(currentKpis.harvestRate)} ของพื้นที่ปลูก`} tone="blue"/>
          <KpiCard metric="production" value={currentKpis.production} change={changes.production} previousYear={previousYear} detail="ผลผลิตรวมจากพื้นที่เก็บเกี่ยว" tone="yellow"/>
          <KpiCard metric="weightedYield" value={currentKpis.weightedYield} change={changes.weightedYield} previousYear={previousYear} detail="คำนวณแบบถ่วงน้ำหนัก" tone="orange"/>
        </div>
      </section>

      <section className="dashboard-grid" id="trends">
        <article className="panel trend-panel">
          <div className="panel-title">
            <div><span>แนวโน้มระยะยาว</span><h2>{trendMeta.label} แยกตามปี พ.ศ.</h2></div>
            <MetricButtons value={trendMetric} onChange={setTrendMetric} metrics={["planted", "harvested", "production", "weightedYield"]}/>
          </div>
          {yearly.some(item => metricValue(item.kpis, trendMetric) !== null)
            ? <Chart label={`กราฟแนวโน้ม${trendMeta.label}รายปี`} option={trendOption}/>
            : <div className="empty">ไม่มีข้อมูลภายใต้ตัวกรองนี้</div>}
        </article>
        <article className="panel composition-panel">
          <div className="panel-title">
            <div><span>{crop === "all" ? "โครงสร้างพืช" : "การกระจายเชิงพื้นที่"}</span>
              <h2>สัดส่วนพื้นที่เพาะปลูก{crop === "all" ? "รายชนิดพืช" : "รายอำเภอ"}</h2></div>
          </div>
          {composition.length ? <Chart label="กราฟสัดส่วนพื้นที่เพาะปลูก" option={{
            animationDuration: 650,
            tooltip: {trigger: "item", formatter: "{b}<br/>{c} ไร่ ({d}%)"},
            legend: {bottom: 0, type: "scroll", itemWidth: 9, itemHeight: 9, textStyle: {color: "#637069", fontSize: 10}},
            series: [{
              type: "pie", radius: ["55%", "76%"], center: ["50%", "43%"], minAngle: 3,
              padAngle: 2, itemStyle: {borderRadius: 5}, label: {show: false}, data: composition,
            }],
          }}/> : <div className="empty">ไม่มีข้อมูลภายใต้ตัวกรองนี้</div>}
        </article>

        <article className="panel district-panel" id="districts">
          <div className="panel-title">
            <div><span>เปรียบเทียบเชิงพื้นที่</span><h2>{districtMeta.label}รายอำเภอ</h2></div>
            <MetricButtons value={districtMetric} onChange={setDistrictMetric} metrics={["planted", "production"]}/>
          </div>
          {districtComparison.some(item => item.currentValue > 0 || item.previousValue > 0)
            ? <Chart className="district-chart" label={`กราฟเปรียบเทียบ${districtMeta.label}รายอำเภอ`} option={districtOption}/>
            : <div className="empty">ไม่มีข้อมูลภายใต้ตัวกรองนี้</div>}
        </article>
      </section>

      <section className="panel summary-panel" id="summary">
        <div className="panel-title">
          <div><span>เปรียบเทียบรายปี</span><h2>ตารางสรุปสถานการณ์การผลิต</h2></div>
          <div className="record-count">{yearly.length} ปีข้อมูล</div>
        </div>
        <div className="table-wrap summary-table"><table>
          <thead><tr>
            <th>ปี พ.ศ.</th><th className="num">เพาะปลูก (ไร่)</th><th className="num">เก็บเกี่ยว (ไร่)</th>
            <th className="num">ผลผลิต (ตัน)</th><th className="num">เฉลี่ย (กก./ไร่)</th>
            <th className="num">พื้นที่ปลูกเทียบปีก่อน</th><th className="num">ผลผลิตเทียบปีก่อน</th><th className="num">รายการตรวจสอบ</th>
          </tr></thead>
          <tbody>{yearly.slice().reverse().map((item, index, rows) => {
            const older = rows[index + 1];
            const plantedChange = older ? yoy(item.kpis.planted, older.kpis.planted) : null;
            const productionChange = older ? yoy(item.kpis.production, older.kpis.production) : null;
            return <tr key={item.year} className={item.year === year ? "selected-row" : ""}>
              <td><button className="year-link" onClick={() => setYear(item.year)}>{item.year}</button></td>
              <td className="num">{formatNumber(item.kpis.planted)}</td>
              <td className="num">{formatNumber(item.kpis.harvested)}</td>
              <td className="num">{formatNumber(item.kpis.production)}</td>
              <td className="num">{formatNumber(item.kpis.weightedYield)}</td>
              <td className={`num delta-cell ${(plantedChange ?? 0) > 0 ? "positive" : (plantedChange ?? 0) < 0 ? "negative" : ""}`}>{plantedChange === null ? "—" : percentFormat.format(plantedChange)}</td>
              <td className={`num delta-cell ${(productionChange ?? 0) > 0 ? "positive" : (productionChange ?? 0) < 0 ? "negative" : ""}`}>{productionChange === null ? "—" : percentFormat.format(productionChange)}</td>
              <td className="num">{item.issues ? <span className="issue-count">{item.issues}</span> : <span className="pass-count">0</span>}</td>
            </tr>;
          })}</tbody>
        </table></div>
      </section>

      <section className="panel records-panel" id="records">
        <div className="panel-title">
          <div><span>ข้อมูลตรวจสอบย้อนกลับ</span><h2>รายการข้อมูล พ.ศ. {year}</h2></div>
          <div className="record-count">{numberFormat.format(current.length)} รายการ</div>
        </div>
        <div className="table-wrap detail-table"><table>
          <thead><tr>
            <th>อำเภอ</th><th>พืช</th><th className="num">เพาะปลูก (ไร่)</th><th className="num">เก็บเกี่ยว (ไร่)</th>
            <th className="num">ผลผลิต (ตัน)</th><th className="num">เฉลี่ย (กก./ไร่)</th><th>คุณภาพ</th>
          </tr></thead>
          <tbody>{current.slice(0, 150).map(record => <tr key={record.record_id}>
            <td>{record.district_name}</td><td>{record.crop_name}</td>
            <td className="num">{formatNumber(record.planted_area_rai)}</td>
            <td className="num">{formatNumber(record.harvested_area_rai)}</td>
            <td className="num">{formatNumber(record.production_ton)}</td>
            <td className="num">{formatNumber(record.calculated_yield_kg_rai)}</td>
            <td><span className={`badge ${record.quality_status}`}><i/>{record.quality_status === "pass" ? "ผ่าน" : record.quality_status === "warning" ? "ตรวจสอบ" : "ผิดพลาด"}</span></td>
          </tr>)}</tbody>
        </table></div>
        {current.length > 150 && <p className="table-note">แสดง 150 รายการแรกจาก {numberFormat.format(current.length)} รายการ</p>}
      </section>

      <section className="method" id="quality">
        <div>
          <p className="eyebrow">ระเบียบวิธีและคุณภาพข้อมูล</p>
          <h2>ตัวเลขที่อธิบายได้<br/>และตรวจสอบย้อนกลับได้</h2>
          <p>ผลผลิตเฉลี่ยระดับรวมคำนวณจากผลผลิตรวม × 1,000 ÷ พื้นที่เก็บเกี่ยวรวม ไม่ใช้ค่าเฉลี่ยรายแถว ค่าว่างยังคงเป็นค่าว่าง และระบบไม่เผยแพร่ข้อมูลสถานะฉบับร่างหรือเก็บถาวร</p>
        </div>
        <div className="quality-card">
          <span>รายการที่ควรตรวจสอบภายใต้ตัวกรอง</span>
          <strong>{numberFormat.format(warningCount)}<small>ระเบียน</small></strong>
          <p>{warningCount ? "ควรตรวจข้อมูลพื้นที่เก็บเกี่ยว ผลผลิต หรือหมายเหตุคุณภาพใน Google Sheets" : "ข้อมูลภายใต้ตัวกรองผ่านเงื่อนไขคุณภาพทั้งหมด"}</p>
          <a href={spreadsheetUrl} target="_blank" rel="noreferrer">เปิดระบบจัดการข้อมูล <b>↗</b></a>
        </div>
      </section>
    </main>

    <footer>
      <div className="footer-brand"><div className="mark">กพ</div><div><strong>KPP Agri Data</strong><span>Dashboard สถานการณ์การเพาะปลูกพืช จังหวัดกำแพงเพชร</span></div></div>
      <p>Frontend: GitHub Pages · Database: Google Sheets · แหล่งข้อมูล: {connection.sourceLabel}</p>
    </footer>
  </div>;
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
