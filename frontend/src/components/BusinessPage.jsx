import { useEffect, useRef, useState } from "react";
import { t as tr, useLocale } from "../i18n";
import { workspaceTabs } from "../workspaceRoutes";
import { AccountWorkspace } from "./AuthTab";
import { careerApi } from "../services/api";
import { PageHead, ErrorNotice, Empty, Tags, errorText } from "./UI";
export default function BusinessPage({ user, view }) {
  useLocale();
  const descriptions = {
    opportunities:
      "Khám phá công việc phù hợp và gửi kỹ năng đến doanh nghiệp.",
    recruitment: "Mô tả vị trí và kỹ năng để tìm đúng ứng viên.",
    candidates: "Xem hồ sơ ứng tuyển theo từng tin tuyển dụng.",
    overview: "Theo dõi hoạt động của cộng đồng NEU Career AI.",
    users: "Theo dõi và quản lý trạng thái tài khoản.",
    moderation: "Đọc nội dung và quyết định trạng thái tin tuyển dụng.",
  };
  return (
    <>
      <PageHead
        title={tr(workspaceTabs.find((t) => t.id === view)?.label)}
        visual={user.role}
      >
        {tr(descriptions[view])}
      </PageHead>
      {view === "moderation" ? (
        <Moderation />
      ) : (
        <AccountWorkspace user={user} view={view} />
      )}
    </>
  );
}
function Moderation() {
  const [jobs, setJobs] = useState([]),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [retry, setRetry] = useState(0),
    [filter, setFilter] = useState("");
  const lock = useRef(false);
  useEffect(() => {
    let alive = true;
    setBusy(true);
    setError("");
    careerApi
      .getAdminJobs()
      .then((data) => {
        if (alive) setJobs(data);
      })
      .catch((e) => {
        if (alive) setError(errorText(e));
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [retry]);
  async function moderate(job, status) {
    if (lock.current || busy) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = await careerApi.moderateJob(job.id, status);
      setJobs((items) =>
        items.map((item) => (item.id === updated.id ? updated : item)),
      );
      setNotice("Đã cập nhật trạng thái tin tuyển dụng.");
    } catch (e) {
      setError(errorText(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const shown = jobs.filter((j) => !filter || j.status === filter);
  return (
    <section className="panel business-moderation" aria-busy={busy}>
      <div className="panel-heading">
        <h2>{tr("Tin tuyển dụng")}</h2>
        <label>
          {tr("Trạng thái")}
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="pending">{tr("Chờ duyệt")}</option>
            <option value="approved">{tr("Đã duyệt")}</option>
            <option value="rejected">{tr("Đã từ chối")}</option>
            <option value="">{tr("Tất cả")}</option>
          </select>
        </label>
      </div>
      <ErrorNotice message={error} />
      {error && (
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => setRetry((v) => v + 1)}
        >
          {tr("Tải lại dữ liệu")}
        </button>
      )}
      {notice && <p role="status">{tr(notice)}</p>}
      {busy && <p role="status">{tr("Đang xử lý…")}</p>}
      {!busy && !error && !shown.length && (
        <Empty
          title={tr("Không có tin trong trạng thái này")}
          icon="briefcase"
        />
      )}
      {shown.map((job) => (
        <article className="moderation-job" key={job.id}>
          <span className="eyebrow">{job.company_name}</span>
          <h3>{job.title}</h3>
          <p className="job-description">{job.description}</p>
          <Tags items={job.required_skills} />
          <div className="moderation-actions">
            <span className="tag">
              {tr(
                {
                  pending: "Chờ duyệt",
                  approved: "Đã duyệt",
                  rejected: "Đã từ chối",
                }[job.status],
              )}
            </span>
            <button
              className="button primary"
              disabled={busy || job.status === "approved"}
              onClick={() => moderate(job, "approved")}
            >
              {tr("Duyệt tin")}
            </button>
            <button
              className="button secondary"
              disabled={busy || job.status === "rejected"}
              onClick={() => moderate(job, "rejected")}
            >
              {tr("Từ chối")}
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
