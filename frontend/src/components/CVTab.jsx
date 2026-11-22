import { t as tr, useLocale as useUiLanguage } from "../i18n";
import { useRef, useState } from "react";
import { careerApi } from "../services/api";
import { Empty, ErrorNotice, Icon, PageHead, Tags, errorText } from "./UI";
export default function CVTab({ cvData, onCvParsed, onContinue }) {
  useUiLanguage();
  const input = useRef(null),
    [file, setFile] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [drag, setDrag] = useState(false);
  function select(f) {
    setError("");
    if (!f) return;
    if (!/\.(pdf|docx)$/i.test(f.name)) {
      setError("Vui lòng chọn CV định dạng PDF hoặc DOCX.");
      return;
    }
    setFile(f);
    onCvParsed(null);
  }
  async function upload() {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    onCvParsed(null);
    try {
      onCvParsed(await careerApi.uploadCV(file));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHead visual="cv"
        eyebrow={tr("HIỂU MÌNH ĐỂ ĐI XA HƠN")}
        title={tr("Khởi đầu từ chiếc CV của bạn.")}
      >
        {tr(
          "Khám phá kỹ năng hiện có và chuẩn bị cho cơ hội nghề nghiệp tiếp theo.",
        )}
      </PageHead>
      <ol className="steps">
        <li className="current">
          <span>{tr("01")}</span>
          <div>
            <strong>{tr("Khám phá năng lực")}</strong>
            <small>{tr("Tải lên và phân tích CV")}</small>
          </div>
        </li>
        <li>
          <span>{tr("02")}</span>
          <div>
            <strong>{tr("Tìm hướng phù hợp")}</strong>
            <small>{tr("So khớp với vị trí mục tiêu")}</small>
          </div>
        </li>
        <li>
          <span>{tr("03")}</span>
          <div>
            <strong>{tr("Tự tin ứng tuyển")}</strong>
            <small>{tr("Luyện phỏng vấn STAR")}</small>
          </div>
        </li>
      </ol>
      <div className="content-grid cv-workbench">
        <section className="panel" id="upload-panel">
          <div className="panel-heading">
            <div>
              <h2>{tr("Tải CV của bạn")}</h2>
              <p>{tr("Để kỹ năng kể câu chuyện của bạn.")}</p>
            </div>
            <span className="badge">{tr("BƯỚC 01")}</span>
          </div>
          <input
            ref={input}
            className="sr-only"
            type="file"
            tabIndex={-1}
            accept=".pdf,.docx"
            disabled={busy}
            aria-label={tr("Chọn file CV")}
            onChange={(e) => select(e.target.files[0])}
          />
          <button
            type="button"
            disabled={busy}
            className={`dropzone ${drag ? "dragging" : ""}`}
            onClick={() => input.current.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              if (!busy) select(e.dataTransfer.files[0]);
            }}
          >
            <span className="upload-icon">
              <Icon name={file ? "file" : "upload"} size={28} />
            </span>
            <strong>{tr(file ? file.name : "Kéo thả CV vào đây")}</strong>
            <span>
              {file ? (
                `${(file.size / 1024).toFixed(0)} KB · Nhấn để đổi file`
              ) : (
                <>
                  {tr("hoặc ")}
                  <b>{tr("chọn file từ thiết bị")}</b>
                </>
              )}
            </span>
            <small>{tr("Hỗ trợ PDF, DOCX")}</small>
          </button>
          <ErrorNotice message={error} />
          <button
            className="button primary full"
            disabled={!file || busy}
            onClick={upload}
          >
            {busy ? (
              <>
                <span className="spinner" />
                {tr("Đang phân tích CV…")}
              </>
            ) : (
              <>
                <Icon name="spark" size={18} />
                {tr("Phân tích CV")}
                <Icon name="arrow" size={18} />
              </>
            )}
          </button>
          <p className="helper">
            {tr(
              "File được gửi đến hệ thống để trích xuất thông tin. Bạn có thể kiểm tra kết quả trước khi so khớp.",
            )}
          </p>
        </section>
      <section className="panel results-panel" aria-live="polite">
        <div className="panel-heading">
          <h2>{tr("Kết quả phân tích")}</h2>
          {tr(
            cvData && (
              <span className="badge success">{tr("Đã nhận kết quả")}</span>
            ),
          )}
        </div>
        {!cvData ? (
          <Empty title={tr("Hồ sơ của bạn sẽ xuất hiện ở đây")}>
            {tr("Tải CV lên để bắt đầu khám phá các kỹ năng của mình.")}
          </Empty>
        ) : (
          <>
            {tr(
              cvData.is_mock && (
                <div className="notice">
                  {tr(
                    "Kết quả trích xuất còn giới hạn. Hãy kiểm tra thông tin; một số mục có thể chưa được nhận diện.",
                  )}
                </div>
              ),
            )}
            {tr(
              cvData.warnings?.map((w, i) => (
                <p className="helper" key={i}>
                  {tr(w)}
                </p>
              )),
            )}
            <div className="result-columns">
              <div>
                <h3>{tr(cvData.full_name || "Chưa nhận diện được tên")}</h3>
                <p>
                  {tr(cvData.email || "Chưa có email")}
                  {tr(" ·")}
                  {tr(" ")}
                  {tr(cvData.phone || "Chưa có số điện thoại")}
                </p>
                <h3>{tr("Kỹ năng nhận diện")}</h3>
                {cvData.skills?.length ? (
                  <Tags items={cvData.skills.map((s) => s.name)} />
                ) : (
                  <p>
                    {tr(
                      "Chưa nhận diện được kỹ năng. Bạn có thể nhập tay ở bước so khớp.",
                    )}
                  </p>
                )}
              </div>
              <div>
                <h3>{tr("Học vấn & kinh nghiệm")}</h3>
                {[
                  ...(cvData.education || []).map(
                    (e) => `${e.institution} · ${e.major}`,
                  ),
                  ...(cvData.experiences || []).map(
                    (e) =>
                      `${e.title} · ${e.company}${e.duration ? ` · ${e.duration}` : ""}`,
                  ),
                ].map((t, i) => (
                  <p key={i}>{tr(t)}</p>
                ))}
                {tr(
                  !cvData.education?.length && !cvData.experiences?.length && (
                    <p>{tr("Chưa có dữ liệu được trích xuất cho mục này.")}</p>
                  ),
                )}
              </div>
            </div>
            <button className="button primary" onClick={onContinue}>
              {tr("Tiếp tục so khớp kỹ năng")}
              <Icon name="arrow" size={18} />
            </button>
          </>
        )}
      </section>
      </div>
        <aside className="panel guide-panel">
          <span className="eyebrow">{tr("BẠN SẼ NHẬN ĐƯỢC")}</span>
          <h2>
            {tr("Hiểu rõ hơn.")}{" "}{tr("Chuẩn bị tốt hơn.")}
          </h2>
          {[
            [
              "user",
              "Hồ sơ tổng quan",
              "Thông tin cá nhân, học vấn và kinh nghiệm được nhận diện.",
            ],
            [
              "target",
              "Bản đồ kỹ năng",
              "Tổng hợp các kỹ năng để so sánh với yêu cầu công việc.",
            ],
            [
              "book",
              "Bước tiếp theo rõ ràng",
              "Tiếp tục so khớp để tìm kỹ năng cần bổ sung và học phần phù hợp.",
            ],
          ].map(([icon, title, desc], index) => (
            <div className="benefit" key={title}>
              <span className="icon-tile">
                <Icon name={icon} />
              </span>
              <div>
                <h3>{tr(title)}</h3>
                <p>{tr(desc)}</p>
              </div>
            </div>
          ))}
        </aside>
    </>
  );
}
