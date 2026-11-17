import { useId, useMemo, useState } from "react";
import { t as tr, useLocale } from "../i18n";
import { jobTimeBuckets, overviewSeries } from "./adminChartData";
import "./AdminAnalytics.css";

const countText = (number) => Number(number || 0).toLocaleString("vi-VN");
const percent = (part, whole) => (whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : "0%");

function chartScale(maxValue) {
  const value = Math.max(0, Number(maxValue) || 0);
  if (value === 0) return { step: 1, ceiling: 4 };
  const rough = value / 4;
  const base = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(1, [1, 2, 2.5, 5, 10].map((factor) => factor * base).find((n) => n >= rough) || 10 * base);
  return { step, ceiling: step * 4 };
}

function ChartTitle({ title, subtitle, aside }) {
  return (
    <header className="pbi-chart-heading">
      <div className="pbi-heading-copy">
        <h3>{tr(title)}</h3>
        <p>{tr(subtitle)}</p>
      </div>
      {aside ? <div className="pbi-heading-aside">{aside}</div> : null}
    </header>
  );
}

function SegmentedButtons({ options, value, onChange, label }) {
  return (
    <div className="pbi-segmented" role="group" aria-label={tr(label)}>
      {options.map(({ key, text }) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(key)}
        >
          {tr(text)}
        </button>
      ))}
    </div>
  );
}

function StatCards({ stats }) {
  const metrics = [
    { key: "users", label: "Người dùng", value: stats.total_users, color: "evergreen" },
    { key: "jobs", label: "Tin tuyển dụng", value: stats.total_jobs, color: "red" },
    { key: "pending", label: "Tin chờ duyệt", value: stats.pending_jobs, color: "gold" },
    { key: "interviews", label: "Buổi phỏng vấn", value: stats.total_interviews, color: "evergreen" },
  ];
  return (
    <div className="pbi-kpis" aria-label={tr("Các chỉ số tổng quan")}> 
      {metrics.map((metric) => (
        <article className={`pbi-kpi pbi-kpi-${metric.color}`} key={metric.key}>
          <span>{tr(metric.label)}</span>
          <strong>{countText(metric.value)}</strong>
          <div className="pbi-kpi-accent" aria-hidden="true" />
        </article>
      ))}
    </div>
  );
}

function DonutChart({ users, jobs }) {
  const [mode, setMode] = useState("users");
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const items = mode === "users" ? users : jobs;
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const activeKey = hovered ?? selected;
  const active = items.find((item) => item.key === activeKey) || null;
  const radius = 94;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const slices = items.map((item) => {
    const length = total ? (item.value / total) * circumference : 0;
    const result = { ...item, length, offset };
    offset += length;
    return result;
  });
  const toggle = (key) => setSelected((current) => (current === key ? null : key));

  return (
    <article className="panel pbi-card pbi-donut-card pbi-span-5">
      <ChartTitle
        title="Cơ cấu hệ thống"
        subtitle="Chọn trực tiếp một phần biểu đồ để xem tỷ trọng"
        aside={
          <SegmentedButtons
            label="Chọn nhóm thống kê"
            options={[{ key: "users", text: "Người dùng" }, { key: "jobs", text: "Tin tuyển dụng" }]}
            value={mode}
            onChange={(next) => { setMode(next); setSelected(null); setHovered(null); }}
          />
        }
      />
      <div className="pbi-donut-content">
        <div className="pbi-donut-stage">
          <svg
            className="pbi-donut-svg"
            viewBox="0 0 300 300"
            role="group"
            aria-label={`${tr("Biểu đồ tròn")}: ${items.map((item) => `${tr(item.label)} ${countText(item.value)}`).join(", ")}`}
          >
            <circle cx="150" cy="150" r={radius} fill="none" stroke="var(--pbi-track)" strokeWidth="36" />
            <g transform="rotate(-90 150 150)">
              {slices.filter((item) => item.length > 0).map((item) => {
                const gap = items.filter((entry) => entry.value > 0).length > 1 ? Math.min(4, item.length * 0.12) : 0;
                const shownLength = Math.max(0.05, item.length - gap);
                return (
                  <circle
                    key={item.key}
                    className={`pbi-donut-segment ${activeKey === item.key ? "is-active" : ""}`}
                    cx="150"
                    cy="150"
                    r={radius}
                    fill="none"
                    stroke={item.color}
                    strokeWidth={activeKey === item.key ? 43 : 36}
                    strokeLinecap="butt"
                    strokeDasharray={`${shownLength} ${circumference}`}
                    strokeDashoffset={-item.offset}
                    opacity={activeKey && activeKey !== item.key ? 0.48 : 1}
                    tabIndex={0}
                    role="button"
                    aria-label={`${tr(item.label)}: ${countText(item.value)} (${percent(item.value, total)})`}
                    onMouseEnter={() => setHovered(item.key)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(item.key)}
                    onBlur={() => setHovered(null)}
                    onClick={() => toggle(item.key)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault(); toggle(item.key);
                      }
                    }}
                  />
                );
              })}
            </g>
            <text x="150" y="139" textAnchor="middle" className="pbi-donut-number">{countText(active ? active.value : total)}</text>
            <text x="150" y="163" textAnchor="middle" className="pbi-donut-caption">{tr(active ? active.label : "Tổng cộng")}</text>
            <text x="150" y="184" textAnchor="middle" className="pbi-donut-percentage">{active ? percent(active.value, total) : tr("Toàn hệ thống")}</text>
          </svg>
        </div>
        <div className="pbi-donut-legend" aria-label={tr("Chú giải tương tác")}> 
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`pbi-legend-button ${activeKey === item.key ? "is-active" : ""}`}
              aria-pressed={selected === item.key}
              onMouseEnter={() => setHovered(item.key)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(item.key)}
              onBlur={() => setHovered(null)}
              onClick={() => toggle(item.key)}
            >
              <span className="pbi-legend-title"><i style={{ background: item.color }} aria-hidden="true" />{tr(item.label)}</span>
              <strong>{countText(item.value)}</strong>
              <small>{percent(item.value, total)}</small>
            </button>
          ))}
        </div>
      </div>
      <p className="pbi-chart-help" role="status">
        {active
          ? `${tr(active.label)}: ${countText(active.value)} · ${percent(active.value, total)}`
          : tr("Di chuột hoặc nhấn vào từng cung tròn để xem chi tiết.")}
      </p>
    </article>
  );
}

function ColumnChart({ items }) {
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const activeKey = hovered ?? selected;
  const active = items.find((item) => item.key === activeKey) || null;
  const W = 720;
  const H = 338;
  const left = 60;
  const top = 32;
  const plotWidth = 620;
  const plotHeight = 238;
  const bottom = top + plotHeight;
  const { step, ceiling } = chartScale(Math.max(0, ...items.map((item) => item.value)));
  const slot = plotWidth / Math.max(1, items.length);
  const barWidth = Math.min(92, slot * 0.46);
  const bars = items.map((item, index) => {
    const centerX = left + (index + 0.5) * slot;
    const barHeight = (item.value / ceiling) * plotHeight;
    const y = bottom - barHeight;
    return { ...item, centerX, x: centerX - barWidth / 2, y, barHeight };
  });
  const focused = bars.find((item) => item.key === activeKey) || null;
  const tooltipX = focused ? Math.min(W - 200, Math.max(5, focused.centerX - 100)) : 0;
  const tooltipY = focused ? Math.max(4, focused.y - 64) : 0;
  const toggle = (key) => setSelected((current) => current === key ? null : key);

  return (
    <article className="panel pbi-card pbi-column-card pbi-span-7">
      <ChartTitle
        title="Trạng thái tin tuyển dụng"
        subtitle="Biểu đồ cột so sánh số lượng theo trạng thái duyệt"
        aside={<span className="pbi-data-tag">{tr("Dữ liệu tổng từ API")}</span>}
      />
      <div className="pbi-plot-scroll">
        <svg viewBox={`0 0 ${W} ${H}`} className="pbi-plot-svg" role="group" aria-label={tr("Biểu đồ cột trạng thái tin tuyển dụng")}> 
          {Array.from({ length: 5 }, (_, i) => {
            const value = i * step;
            const y = bottom - (value / ceiling) * plotHeight;
            return (
              <g key={i}>
                <line x1={left} x2={left + plotWidth} y1={y} y2={y} className="pbi-gridline" />
                <text x={left - 16} y={y + 5} textAnchor="end" className="pbi-axis-label">{countText(value)}</text>
              </g>
            );
          })}
          <line x1={left} x2={left + plotWidth} y1={bottom} y2={bottom} className="pbi-baseline" />
          {bars.map((bar) => (
            <g key={bar.key}>
              <rect x={bar.x} y={top} width={barWidth} height={plotHeight} fill="transparent" />
              <rect
                x={bar.x}
                y={bar.y}
                width={barWidth}
                height={bar.barHeight}
                rx="8"
                fill={bar.color}
                opacity={activeKey && activeKey !== bar.key ? 0.4 : 1}
                className={`pbi-column-bar ${activeKey === bar.key ? "is-active" : ""}`}
              />
              <rect
                x={bar.centerX - slot * 0.4}
                y={top}
                width={slot * 0.8}
                height={plotHeight + 13}
                fill="transparent"
                className="pbi-plot-hitbox"
                role="button"
                tabIndex={0}
                aria-label={`${tr(bar.label)}: ${countText(bar.value)} tin`}
                onMouseEnter={() => setHovered(bar.key)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(bar.key)}
                onBlur={() => setHovered(null)}
                onClick={() => toggle(bar.key)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggle(bar.key); }
                }}
              />
              <text x={bar.centerX} y={Math.max(top + 2, bar.y - 10)} textAnchor="middle" className="pbi-bar-value">{countText(bar.value)}</text>
              <text x={bar.centerX} y={bottom + 30} textAnchor="middle" className="pbi-category-label">{tr(bar.label)}</text>
            </g>
          ))}
          {focused && (
            <g className="pbi-svg-tooltip" aria-hidden="true">
              <rect x={tooltipX} y={tooltipY} width="200" height="54" rx="11" />
              <text x={tooltipX + 13} y={tooltipY + 21} className="pbi-tooltip-title">{tr(focused.label)}</text>
              <text x={tooltipX + 13} y={tooltipY + 42} className="pbi-tooltip-value">{countText(focused.value)} {tr("tin tuyển dụng")}</text>
            </g>
          )}
        </svg>
      </div>
      <div className="pbi-chart-footer">
        <span>{tr("Tổng tin tuyển dụng")}: <strong>{countText(items.reduce((sum, item) => sum + item.value, 0))}</strong></span>
        <span role="status">{active ? `${tr(active.label)} · ${countText(active.value)}` : tr("Chọn một cột để xem chi tiết")}</span>
      </div>
    </article>
  );
}

function LineChart({ jobs, jobsError }) {
  const [period, setPeriod] = useState(30);
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const buckets = useMemo(() => jobTimeBuckets(jobs, period), [jobs, period]);
  const validDates = Array.isArray(jobs) && jobs.some((job) => job?.created_at && Number.isFinite(new Date(job.created_at).getTime()));
  const { step, ceiling } = chartScale(Math.max(0, ...buckets.map((bucket) => bucket.value)));
  const W = 960;
  const H = 340;
  const left = 64;
  const top = 30;
  const plotWidth = 866;
  const plotHeight = 238;
  const bottom = top + plotHeight;
  const points = buckets.map((bucket, index) => ({
    ...bucket,
    x: left + (buckets.length === 1 ? plotWidth / 2 : (index * plotWidth) / (buckets.length - 1)),
    y: bottom - (bucket.value / ceiling) * plotHeight,
  }));
  const path = points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
  const fillPath = points.length > 0 ? `${path} L ${points[points.length - 1].x} ${bottom} L ${points[0].x} ${bottom} Z` : "";
  const activeKey = hovered ?? selected;
  const activePoint = points.find((point) => point.key === activeKey) || null;
  const total = buckets.reduce((sum, bucket) => sum + bucket.value, 0);
  const chartId = useId().replace(/:/g, "");
  const toggle = (key) => setSelected((current) => current === key ? null : key);
  const tooltipX = activePoint ? Math.min(W - 210, Math.max(5, activePoint.x - 105)) : 0;
  const tooltipY = activePoint ? Math.max(0, activePoint.y - 68) : 0;
  return (
    <article className="panel pbi-card pbi-line-card pbi-span-8">
      <ChartTitle
        title="Xu hướng tin tuyển dụng"
        subtitle="Biểu đồ đường theo ngày tạo tin thực tế"
        aside={
          <SegmentedButtons
            label="Lọc thời gian biểu đồ đường"
            value={period}
            options={[7, 30, 90].map((days) => ({ key: days, text: `${days} ngày` }))}
            onChange={(days) => { setPeriod(days); setHovered(null); setSelected(null); }}
          />
        }
      />
      {jobsError ? (
        <div className="pbi-no-data" role="status">{tr("Không tải được dữ liệu tin tuyển dụng")}: {jobsError}</div>
      ) : !Array.isArray(jobs) ? (
        <div className="pbi-no-data" role="status">{tr("Đang tải dữ liệu biểu đồ.")}</div>
      ) : !validDates ? (
        <div className="pbi-no-data" role="status">{tr("Chưa có ngày tạo tin hợp lệ để hiển thị xu hướng.")}</div>
      ) : (
        <>
          <div className="pbi-plot-scroll">
            <svg viewBox={`0 0 ${W} ${H}`} className="pbi-plot-svg" role="group" aria-label={`${tr("Biểu đồ đường số tin đăng trong")} ${period} ${tr("ngày")}`}> 
              <defs>
                <linearGradient id={`pbi-area-${chartId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--admin-evergreen)" stopOpacity=".28" />
                  <stop offset="100%" stopColor="var(--admin-evergreen)" stopOpacity=".02" />
                </linearGradient>
              </defs>
              {Array.from({ length: 5 }, (_, index) => {
                const value = index * step;
                const y = bottom - (value / ceiling) * plotHeight;
                return (
                  <g key={index}>
                    <line x1={left} x2={left + plotWidth} y1={y} y2={y} className="pbi-gridline" />
                    <text x={left - 15} y={y + 4} textAnchor="end" className="pbi-axis-label">{countText(value)}</text>
                  </g>
                );
              })}
              <line x1={left} x2={left + plotWidth} y1={bottom} y2={bottom} className="pbi-baseline" />
              <path d={fillPath} fill={`url(#pbi-area-${chartId})`} />
              <path d={path} fill="none" className="pbi-line-stroke" />
              {activePoint && <line x1={activePoint.x} x2={activePoint.x} y1={top} y2={bottom} className="pbi-focus-line" />}
              {points.map((point) => (
                <g key={point.key}>
                  <circle cx={point.x} cy={point.y} r={activeKey === point.key ? 7 : 4.5} className={`pbi-line-dot ${activeKey === point.key ? "is-active" : ""}`} />
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="19"
                    fill="transparent"
                    className="pbi-plot-hitbox"
                    role="button"
                    tabIndex={0}
                    aria-label={`${point.label}: ${countText(point.value)} ${tr("tin tuyển dụng")}`}
                    onMouseEnter={() => setHovered(point.key)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(point.key)}
                    onBlur={() => setHovered(null)}
                    onClick={() => toggle(point.key)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggle(point.key); }
                    }}
                  />
                  <text x={point.x} y={bottom + 26} textAnchor="middle" className="pbi-axis-label pbi-x-label">{point.label}</text>
                </g>
              ))}
              {activePoint && (
                <g className="pbi-svg-tooltip" aria-hidden="true">
                  <rect x={tooltipX} y={tooltipY} width="210" height="56" rx="11" />
                  <text x={tooltipX + 13} y={tooltipY + 22} className="pbi-tooltip-title">{activePoint.label}</text>
                  <text x={tooltipX + 13} y={tooltipY + 43} className="pbi-tooltip-value">{countText(activePoint.value)} {tr("tin tuyển dụng")}</text>
                </g>
              )}
            </svg>
          </div>
          <div className="pbi-chart-footer">
            <span>{tr("Tổng tin tạo trong kỳ")}: <strong>{countText(total)}</strong></span>
            <span role="status">{activePoint ? `${activePoint.label}: ${countText(activePoint.value)} tin` : tr("Di chuột hoặc nhấn vào điểm trên đường để xem số liệu")}</span>
          </div>
        </>
      )}
    </article>
  );
}

function Insights({ stats, users, jobs }) {
  const topUser = users.reduce((best, item) => !best || item.value > best.value ? item : best, null);
  const jobsTotal = jobs.reduce((sum, item) => sum + item.value, 0);
  const topJob = jobs.reduce((best, item) => !best || item.value > best.value ? item : best, null);
  const facts = [
    { label: "Nhóm người dùng đông nhất", value: topUser ? tr(topUser.label) : "—", note: countText(topUser?.value) },
    { label: "Trạng thái tin nhiều nhất", value: topJob ? tr(topJob.label) : "—", note: countText(topJob?.value) },
    { label: "Tỷ trọng tin chờ duyệt", value: percent(stats.pending_jobs, jobsTotal), note: `${countText(stats.pending_jobs)} / ${countText(jobsTotal)}` },
    { label: "Hồ sơ ứng tuyển", value: countText(stats.total_applications), note: tr("Số liệu toàn thời gian") },
  ];
  return (
    <article className="panel pbi-card pbi-insights-card pbi-span-4">
      <ChartTitle
        title="Điểm nhấn dữ liệu"
        subtitle="Tóm tắt nhanh dựa trên số liệu đang có"
      />
      <div className="pbi-insights-list">
        {facts.map((fact) => (
          <div className="pbi-fact" key={fact.label}>
            <span>{tr(fact.label)}</span>
            <div><strong>{fact.value}</strong><small>{fact.note}</small></div>
          </div>
        ))}
      </div>
      <p className="pbi-insights-disclaimer">{tr("Các tổng số không bị thay đổi khi lọc biểu đồ đường theo ngày.")}</p>
    </article>
  );
}

export default function AdminAnalytics({ stats, jobs, jobsError = "" }) {
  useLocale();
  const series = useMemo(() => overviewSeries(stats), [stats]);
  if (!series) return null;
  return (
    <section className="admin-analytics pbi-dashboard" aria-label={tr("Báo cáo quản trị tương tác")}> 
      <div className="pbi-dashboard-title">
        <div>
          <h2>{tr("Báo cáo tổng quan")}</h2>
          <p>{tr("Khám phá số liệu ngay trên biểu đồ — hover, nhấn và lọc theo thời gian.")}</p>
        </div>
        <span className="pbi-api-label">{tr("Nguồn: API quản trị")}</span>
      </div>
      <StatCards stats={stats} />
      <div className="pbi-dashboard-grid">
        <DonutChart users={series.users} jobs={series.jobs} />
        <ColumnChart items={series.jobs} />
        <LineChart jobs={jobs} jobsError={jobsError} />
        <Insights stats={stats} users={series.users} jobs={series.jobs} />
      </div>
    </section>
  );
}
