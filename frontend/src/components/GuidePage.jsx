import { t as tr, useLocale as useUiLanguage } from "../i18n";
import { Icon } from "./UI";
import { PublicHeader, PublicFooter } from "./PublicLayout";
import { usePromptMotion } from "../hooks/usePromptMotion";
const features = [
  {
    id: "cv",
    no: "01",
    icon: "file",
    name: "Phân tích hồ sơ CV",
    text: "Nhận diện thông tin và kỹ năng từ CV. Hiểu rõ điểm xuất phát trước khi chọn bước đi tiếp theo.",
    cta: "Khám phá CV",
  },
  {
    id: "matching",
    no: "02",
    icon: "target",
    name: "So khớp với vị trí ứng tuyển",
    text: "So khớp kỹ năng với vị trí mục tiêu. Nhìn rõ điều đã có và điều bạn cần bổ sung.",
    cta: "So khớp kỹ năng",
  },
  {
    id: "interview",
    no: "03",
    icon: "chat",
    name: "Luyện phỏng vấn theo STAR",
    text: "Luyện phỏng vấn theo STAR, nhận phản hồi và học cách kể câu chuyện của mình rõ ràng hơn.",
    cta: "Luyện phỏng vấn",
  },
  {
    id: "courses",
    no: "04",
    icon: "book",
    name: "Tra cứu học phần NEU",
    text: "Khám phá các học phần NEU và kỹ năng được trang bị. Kết nối việc học với mục tiêu nghề nghiệp.",
    cta: "Xem học phần",
  },
];

export default function GuidePage({ currentUser, activeSection }) {
  useUiLanguage();
  const root = usePromptMotion(false);
  return (
    <div className="public-page neu-prompt-motion guide-page" ref={root}>
      <PublicHeader currentUser={currentUser} activeSection={activeSection} />
      <main className="home-main" id="home-content" tabIndex={-1}>
        <header className="guide-page-heading">
          <h1>{tr("Giới thiệu NEU Career AI")}</h1>
          <p>{tr("Tìm hiểu các công cụ và cách bắt đầu sử dụng.")}</p>
        </header>
        <section className="intro-section landing-section" id="why-career">
          <div>
            <h2>
              {tr("Từ hồ sơ cá nhân")}
              <br />
              <span>{tr("đến kế hoạch ứng tuyển.")}</span>
            </h2>
          </div>
          <div>
            <p>
              {tr("“Mình phù hợp với công việc nào?”")}
              <br />
              {tr("“Những gì mình đã học có đủ chưa?”")}
            </p>
            <p>
              {tr(
                "Những băn khoăn rất quen thuộc khi sắp bước vào nghề. NEU Career AI giúp bạn kết nối kỹ năng hiện tại, yêu cầu công việc và việc học để bạn biết nên bổ sung điều gì.",
              )}
            </p>
            <a className="text-link" href="#cv">
              {tr("Tìm điểm bắt đầu của bạn")}
              <Icon name="arrow" size={18} />
            </a>
          </div>
        </section>
        <section
          className="feature-section landing-section"
          id="career-features"
        >
          <div className="section-heading">
            <div>
              <h2>
                {tr("Bốn công cụ")}
                <br />
                <span>{tr("chuẩn bị ứng tuyển.")}</span>
              </h2>
            </div>
            <p>
              {tr("Chọn công cụ theo việc bạn cần làm.")}
              <br />
              {tr("Mỗi công cụ giải quyết một bước trong hành trình.")}
            </p>
          </div>
          <div className="landing-feature-grid">
            {features.map((f) => (
              <a
                href={`#${f.id}`}
                className={`landing-feature feature-${f.id}`}
                key={f.id}
              >
                <div className="feature-top">
                  <span className="feature-icon">
                    <Icon name={f.icon} size={26} />
                  </span>
                  <span>
                    {tr(f.no)}
                    {tr(" /")}
                  </span>
                </div>
                <h3>{tr(f.name)}</h3>
                <p>{tr(f.text)}</p>
                <span className="feature-cta">
                  {tr(f.cta)}
                  <Icon name="arrow" size={19} />
                </span>
              </a>
            ))}
          </div>
        </section>
        <section className="practice-section landing-section">
          <div className="practice-preview">
            <span className="preview-label">
              <span />
              {tr("GÓC NHÌN TÍNH NĂNG · MINH HỌA")}
            </span>
            <div className="demo-message">
              <span className="demo-ai">
                <Icon name="spark" size={18} />
              </span>
              <p>
                {tr(
                  "Hãy kể về một lần bạn giải quyết khó khăn trong dự án nhóm.",
                )}
              </p>
            </div>
            <div className="demo-message demo-answer">
              <p>
                {tr(
                  "Trong dự án môn học, nhóm mình cần phân tích dữ liệu trong một tuần…",
                )}
              </p>
            </div>
            <div className="star-demo">
              {["Situation", "Task", "Action", "Result"].map((s, i) => (
                <div key={s}>
                  <span>{tr(s[0])}</span>
                  <strong>{tr(s)}</strong>
                  <i>
                    <b
                      style={{
                        "--bar-size": `${[78, 65, 88, 72][i]}%`,
                        "--bar-delay": `${i * 150}ms`,
                      }}
                    />
                  </i>
                </div>
              ))}
            </div>
            <span className="preview-disclaimer">
              {tr("Giao diện minh họa, không phải kết quả đánh giá thực tế.")}
            </span>
          </div>
          <div className="practice-copy">
            <h2>
              {tr("Trả lời rõ tình huống,")}
              <br />
              {tr("hành động")}
              <br />
              <span>{tr("và kết quả.")}</span>
            </h2>
            <p>
              {tr(
                "Một dự án môn học. Một hoạt động câu lạc bộ. Một lần vượt khó. Luyện cấu trúc STAR để biến trải nghiệm của bạn thành câu trả lời có trọng tâm.",
              )}
            </p>
            <a className="landing-button navy" href="#interview">
              {tr("Vào phòng luyện tập")}
              <Icon name="arrow" />
            </a>
          </div>
        </section>
        <section className="how-section landing-section" id="career-how">
          <div className="section-heading">
            <div>
              <h2>
                {tr("Bắt đầu từ CV")}
                <br />
                <span>{tr("và vị trí mục tiêu.")}</span>
              </h2>
            </div>
            <a className="text-link" href="#register">
              {tr("Tạo tài khoản")}
              <Icon name="arrow" size={18} />
            </a>
          </div>
          <ol className="how-steps">
            {[
              [
                "01",
                "Nhập hồ sơ",
                "Tải CV hoặc nhập những kỹ năng bạn đang có.",
              ],
              [
                "02",
                "Chọn vị trí ứng tuyển",
                "Nhập vị trí mục tiêu để khám phá mức độ phù hợp.",
              ],
              [
                "03",
                "Luyện tập và bổ sung kỹ năng",
                "Bổ sung kỹ năng và luyện phỏng vấn trước khi ứng tuyển.",
              ],
            ].map(([n, t, p]) => (
              <li key={n}>
                <span>
                  {tr(n)}
                  <Icon name="arrow" size={21} />
                </span>
                <h3>{tr(t)}</h3>
                <p>{tr(p)}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className="landing-cta">
          <span className="cta-orbit" aria-hidden="true" />
          <h2>{tr("Bắt đầu với hồ sơ của bạn.")}</h2>
          <a className="landing-button pink" href="#register">
            {tr("Tạo tài khoản")}
            <Icon name="arrow" />
          </a>
          <p>{tr("Bạn có thể thử phân tích CV trước khi tạo tài khoản.")}</p>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
