import { t as tr, useLocale as useUiLanguage } from "../i18n";
import { useEffect, useState } from "react";
import { careerApi } from "../services/api";
import {
  Empty,
  ErrorNotice,
  Icon,
  PageHead,
  Tags,
  errorText,
  skillList,
} from "./UI";
function Radar({ data }) {
  useUiLanguage();
  const n = data.length,
    point = (i, score, radius = 96) => {
      const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
      return [
        170 + (Math.cos(angle) * radius * score) / 100,
        145 + (Math.sin(angle) * radius * score) / 100,
      ];
    };
  if (n < 3) return null;
  return (
    <svg
      className="radar"
      viewBox="0 0 340 290"
      role="img"
      aria-label={tr(
        "Biểu đồ radar năng lực; số liệu chi tiết ở bảng bên dưới",
      )}
    >
      <title>{tr("Năng lực hiện tại và yêu cầu công việc")}</title>
      {[25, 50, 75, 100].map((v) => (
        <polygon
          key={v}
          points={data.map((_, i) => point(i, v).join(",")).join(" ")}
          fill="none"
          stroke="var(--ux-line)"
        />
      ))}
      {data.map((d, i) => (
        <g key={d.category_name}>
          <line
            x1="170"
            y1="145"
            x2={point(i, 100)[0]}
            y2={point(i, 100)[1]}
            stroke="var(--ux-line)"
          />
          <text
            x={point(i, 100, 123)[0]}
            y={point(i, 100, 123)[1]}
            textAnchor="middle"
            fontSize="10"
            fill="var(--ux-ink-2)"
          >
            {tr(d.category_name)}
          </text>
        </g>
      ))}
      <polygon
        className="radar-required"
        points={data
          .map((d, i) => point(i, d.job_requirement_score).join(","))
          .join(" ")}
        fill="none"
        stroke="var(--ux-ink-2)"
        strokeDasharray="5 4"
      />
      <polygon
        className="radar-current"
        points={data
          .map((d, i) => point(i, d.candidate_score).join(","))
          .join(" ")}
        fill="var(--ux-accent-soft)"
        stroke="var(--ux-accent)"
        strokeWidth="2"
      />
    </svg>
  );
}
export default function MatchingTab({ cvData }) {
  useUiLanguage();
  const [jobTitle, setTitle] = useState(""),
    [jobDescription, setDescription] = useState(""),
    [skills, setSkills] = useState(""),
    [result, setResult] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (cvData) {
      setSkills((cvData.skills || []).map((s) => s.name).join(", "));
      setResult(null);
    }
  }, [cvData]);
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    if (!jobTitle.trim() || !skillList(skills).length) {
      setError("Hãy nhập vị trí mục tiêu và ít nhất một kỹ năng.");
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(
        await careerApi.matchSkills({
          jobTitle: jobTitle.trim(),
          jobDescription,
          candidateSkills: skillList(skills),
        }),
      );
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHead
        visual="matching"
        eyebrow={tr("BIẾT ĐÍCH ĐẾN · RÕ LỘ TRÌNH")}
        title={tr("Bạn cách công việc mơ ước bao xa?")}
      >
        {tr(
          "So sánh kỹ năng với vị trí mục tiêu và tìm học phần giúp bạn tiến gần hơn.",
        )}
      </PageHead>
      <div className="content-grid">
        <form className="panel" onSubmit={submit}>
          <div className="panel-heading">
            <h2>{tr("Vị trí mục tiêu")}</h2>
            <Icon name="target" />
          </div>
          <label>
            {tr("Vị trí bạn muốn ứng tuyển")}
            <input
              required
              value={jobTitle}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={tr("Ví dụ: Junior Data Analyst")}
            />
          </label>
          <label>
            {tr("Mô tả công việc ")}
            <span className="optional">{tr("· Không bắt buộc")}</span>
            <textarea
              rows="5"
              value={jobDescription}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={tr("Dán mô tả và yêu cầu của công việc tại đây…")}
            />
          </label>
          <label>
            {tr("Kỹ năng hiện có")}
            <textarea
              required
              rows="3"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder={tr("SQL, Excel, Python, giao tiếp…")}
            />
          </label>
          <p className="helper">
            {tr(
              "Ngăn cách bằng dấu phẩy hoặc xuống dòng. Kỹ năng từ CV được điền tự động và có thể chỉnh sửa.",
            )}
          </p>
          <ErrorNotice message={error} />
          <button className="button primary full" disabled={busy}>
            {tr(busy ? "Đang so khớp…" : "Khám phá độ phù hợp")}
            <Icon name="arrow" size={18} />
          </button>
        </form>
        <section className="panel" aria-live="polite">
          <h2>{tr("Mức độ phù hợp")}</h2>
          {!result ? (
            <Empty icon="target" title={tr("Mỗi mục tiêu có một lộ trình")}>
              {tr(
                "Nhập vị trí và kỹ năng để xem điểm phù hợp. Kết quả là thông tin tham khảo để bạn chuẩn bị tốt hơn.",
              )}
            </Empty>
          ) : (
            <>
              <div className="match-score">
                <strong>
                  {tr(Math.round(result.overall_match_percentage))}
                  <span>{tr("%")}</span>
                </strong>
                <p>{tr("độ phù hợp kỹ năng")}</p>
              </div>
              <p className="helper">
                {tr("Theo")}
                {tr(" ")}
                {tr(
                  result.requirements_source === "job_description"
                    ? "mô tả công việc bạn cung cấp"
                    : "bộ yêu cầu có sẵn của vị trí",
                )}
                {tr(".")}
              </p>
              <Radar data={result.radar_chart_data || []} />
              <div className="chart-legend">
                <span className="legend-current">
                  <i aria-hidden="true" />
                  {tr("Kỹ năng hiện tại")}
                </span>
                <span className="legend-required">
                  <i aria-hidden="true" />
                  {tr("Yêu cầu công việc")}
                </span>
              </div>
              <div className="table-wrap">
                <table>
                  <caption className="sr-only">
                    {tr("Chi tiết năng lực theo nhóm")}
                  </caption>
                  <thead>
                    <tr>
                      <th>{tr("Nhóm năng lực")}</th>
                      <th>{tr("Hiện tại")}</th>
                      <th>{tr("Yêu cầu")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tr(
                      result.radar_chart_data?.map((d) => (
                        <tr key={d.category_name}>
                          <td>{tr(d.category_name)}</td>
                          <td>
                            {tr(d.candidate_score)}
                            {tr("%")}
                          </td>
                          <td>
                            {tr(d.job_requirement_score)}
                            {tr("%")}
                          </td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
      {tr(
        result && (
          <>
            <div className="result-columns panels-row">
              <section className="panel">
                <h2>{tr("Kỹ năng đã phù hợp")}</h2>
                <Tags items={result.matched_skills} tone="green" />
                {tr(
                  !result.matched_skills.length && (
                    <p>{tr("Chưa có kỹ năng trùng khớp.")}</p>
                  ),
                )}
                <h3>{tr("Kỹ năng cần bổ sung")}</h3>
                <Tags items={result.missing_skills} tone="amber" />
                {tr(
                  !result.missing_skills.length && (
                    <p>{tr("Bạn đã đáp ứng các kỹ năng được nhận diện.")}</p>
                  ),
                )}
                {tr(
                  result.unrecognized_skills?.length > 0 && (
                    <div className="notice">
                      {tr("Chưa tính điểm cho: ")}
                      {tr(result.unrecognized_skills.join(", "))}
                      {tr(".")}
                    </div>
                  ),
                )}
              </section>
              <section className="panel advice">
                <Icon name="spark" />
                <h2>{tr("Gợi ý cho bước tiếp theo")}</h2>
                <p>{tr(result.general_advice)}</p>
                <a href="#interview" className="text-link">
                  {tr("Thử sức với phỏng vấn STAR ")}
                  <Icon name="arrow" size={17} />
                </a>
              </section>
            </div>
            <section className="panel">
              <div className="panel-heading">
                <h2>{tr("Học phần gợi ý cho bạn")}</h2>
                <a href="#courses" className="text-link">
                  {tr("Xem danh mục")}
                </a>
              </div>
              {result.recommended_neu_courses?.length ? (
                <div className="course-grid">
                  {result.recommended_neu_courses.map((c) => (
                    <article className="course-card" key={c.course_code}>
                      <span className="eyebrow">
                        {tr(c.course_code)}
                        {tr(" · ")}
                        {tr(c.credits)}
                        {tr(" TÍN CHỈ")}
                      </span>
                      <h3>{tr(c.course_name)}</h3>
                      <p>{tr(c.reason)}</p>
                      <Tags items={c.skills_covered} />
                    </article>
                  ))}
                </div>
              ) : (
                <p>{tr("Chưa có học phần gợi ý cho nhóm kỹ năng này.")}</p>
              )}
            </section>
          </>
        ),
      )}
    </>
  );
}
