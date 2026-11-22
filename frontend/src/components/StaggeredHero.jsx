import { t as tr, useLocale as useUiLanguage } from "../i18n";
// Landing motion adapted from the user-provided Melli animation specification.

import { Icon } from "./UI";
import "./StaggeredHero.css";
const lines = [
  ["Phân", "tích", "CV."],
  ["So", "khớp", "kỹ", "năng."],
  ["Luyện", "phỏng", "vấn."],
];
export default function StaggeredHero({ header, paused, onToggleMotion }) {
  useUiLanguage();
  return (
    <div className="u216 is-in">
      <div className="u216-nav">{tr(header)}</div>
      <section className="u216-body" aria-labelledby="career-headline">
        <h1
          className="u216-h"
          id="career-headline"
          aria-label={tr(lines.map((l) => l.join(" ")).join(" "))}
        >
          {lines.map((line, i) => (
            <span className="u216-ln" key={i} aria-hidden="true">
              <span
                className="neu-rise-line"
                style={{
                  "--line-delay": `${i * 0.12}s`,
                }}
              >
                {tr(line.join(" "))}
              </span>
            </span>
          ))}
        </h1>
        <p className="u216-p">
          {tr("Đối chiếu kỹ năng trong CV với vị trí bạn muốn ứng tuyển.")}
          <br />
          {tr("Tìm học phần còn thiếu và luyện trả lời phỏng vấn theo STAR.")}
        </p>
        <div className="u216-ct">
          <a className="landing-button pink" href="#register">
            {tr("Tạo tài khoản ")}
            <Icon name="arrow" />
          </a>
          <a className="landing-button outline" href="#cv">
            {tr("Phân tích CV")}
          </a>
        </div>
        <div className="u216-sc" data-motion-speed="-0.06" data-motion-rot="0">
          <div className="u216-screen-heading">
            <span>{tr("NEU Career AI")}</span>
            <span>{tr("CV / Kỹ năng / Phỏng vấn")}</span>
          </div>
          <div className="neu-route">
            <div className="neu-route-title">
              <span>{tr("CHUẨN BỊ ỨNG TUYỂN")}</span>
              <strong>{tr("Bắt đầu từ điều bạn đã có.")}</strong>
            </div>
            <ol>
              <li>
                <span>{tr("01")}</span>
                <div>
                  <strong>{tr("Hồ sơ & kỹ năng")}</strong>
                  <p>{tr("Trích xuất thông tin từ CV của bạn.")}</p>
                </div>
              </li>
              <li>
                <span>{tr("02")}</span>
                <div>
                  <strong>{tr("Vị trí mục tiêu")}</strong>
                  <p>{tr("Đối chiếu yêu cầu và tìm kỹ năng cần bổ sung.")}</p>
                </div>
              </li>
              <li>
                <span>{tr("03")}</span>
                <div>
                  <strong>{tr("Luyện phỏng vấn")}</strong>
                  <p>{tr("Sắp xếp câu trả lời theo cấu trúc STAR.")}</p>
                </div>
              </li>
            </ol>
            <a href="#courses" className="neu-course-link">
              {tr("Tra cứu học phần NEU ")}
              <Icon name="arrow" size={18} />
            </a>
          </div>
          <div className="u216-screen-footer">
            <span>{tr("Quy trình sử dụng")}</span>
            <button
              type="button"
              className="motion-toggle"
              aria-pressed={paused}
              onClick={onToggleMotion}
            >
              {tr(paused ? "Bật chuyển động" : "Tạm dừng chuyển động")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
