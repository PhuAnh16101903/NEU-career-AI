import GlassPanel from "./GlassPanel";
import AuthMotionForm from "./AuthMotionForm";
import { t as tr, useLocale as useUiLanguage } from "../i18n";
import neuLogo from "../assets/neu-logo.png";
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
const roles = {
  student: "Sinh viên",
  enterprise: "Doanh nghiệp",
  admin: "Quản trị viên",
};
export function AccountWorkspace({ user, view }) {
  useUiLanguage();
  const [jobs, setJobs] = useState([]),
    [users, setUsers] = useState([]),
    [stats, setStats] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [candidates, setCandidates] = useState(null),
    [jobId, setJobId] = useState(""),
    [skills, setSkills] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    setBusy(true);
    setError("");
    const task =
      user.role === "admin"
        ? Promise.all([
            view === "users" ? null : careerApi.getAdminStats(),
            view === "overview" ? [] : careerApi.getAdminUsers(),
          ])
        : careerApi.getEnterpriseJobs();
    task
      .then((d) => {
        if (!alive) return;
        if (user.role === "admin") {
          setStats(d[0]);
          setUsers(d[1]);
        } else setJobs(d);
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
  }, [user.id, user.role, retry, view]);
  async function action(fn) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function create(e) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form);
    await action(async () => {
      const job = await careerApi.createEnterpriseJob({
        title: f.get("title").trim(),
        companyName: user.company_name,
        description: f.get("description").trim(),
        requiredSkills: skillList(f.get("skills")),
      });
      setJobId(job.id);
      setNotice(
        job.status === "approved"
          ? "Tin tuyển dụng đã được đăng."
          : "Đã gửi tin tuyển dụng, đang chờ duyệt.",
      );
      form.reset();
    });
  }
  return (
    <>
      <ErrorNotice message={error} />
      {tr(
        error && (
          <button
            className="button secondary"
            onClick={() => setRetry(retry + 1)}
            disabled={busy}
          >
            {tr("Tải lại dữ liệu")}
          </button>
        ),
      )}
      {tr(
        notice && (
          <div className="notice" role="status">
            {tr(notice)}
          </div>
        ),
      )}
      {tr(busy && <p role="status">{tr("Đang xử lý…")}</p>)}
      {user.role === "admin" ? (
        <>
          {view !== "users" && (
            <div className="stats-grid">
              {[
                ["total_users", "Người dùng"],
                ["total_students", "Sinh viên"],
                ["total_enterprises", "Doanh nghiệp"],
                ["total_jobs", "Tin tuyển dụng"],
                ["pending_jobs", "Tin chờ duyệt"],
                ["total_interviews", "Buổi phỏng vấn"],
              ].map(([k, label]) => (
                <article className="panel stat" key={k}>
                  <span>{tr(label)}</span>
                  <strong>{tr(stats?.[k] ?? "—")}</strong>
                </article>
              ))}
            </div>
          )}
          {view !== "overview" && (
            <section className="panel">
              <h2>{tr("Danh sách người dùng")}</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{tr("Người dùng")}</th>
                      <th>{tr("Email")}</th>
                      <th>{tr("Vai trò")}</th>
                      <th>{tr("Trạng thái")}</th>
                      <th>{tr("Thao tác")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>{tr(u.full_name)}</td>
                        <td>{tr(u.email)}</td>
                        <td>{tr(roles[u.role])}</td>
                        <td>
                          <span className={`tag ${u.is_active ? "green" : ""}`}>
                            {tr(u.is_active ? "Hoạt động" : "Đã khóa")}
                          </span>
                        </td>
                        <td>
                          {u.id !== user.id && (
                            <button
                              className="button secondary"
                              disabled={busy}
                              onClick={() =>
                                action(async () => {
                                  const updated =
                                    await careerApi.updateUserStatus(
                                      u.id,
                                      !u.is_active,
                                    );
                                  setUsers((items) =>
                                    items.map((item) =>
                                      item.id === updated.id ? updated : item,
                                    ),
                                  );
                                  setNotice(
                                    "Đã cập nhật trạng thái tài khoản.",
                                  );
                                })
                              }
                            >
                              {tr(u.is_active ? "Khóa tài khoản" : "Mở khóa")}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      ) : user.role === "enterprise" ? (
        <div className={view ? "business-content" : "content-grid"}>
          {view !== "candidates" && (
            <form className="panel" onSubmit={create}>
              <h2>{tr("Đăng tin tuyển dụng")}</h2>
              {jobId && (
                <p role="status">
                  {tr("Mã tin tuyển dụng")}: <strong>{jobId}</strong> ·{" "}
                  <a href="#candidates">{tr("Xem ứng viên")}</a>
                </p>
              )}
              <label>
                {tr("Vị trí tuyển dụng")}
                <input
                  name="title"
                  required
                  minLength={2}
                  placeholder={tr("Ví dụ: Thực tập sinh Data Analyst")}
                />
              </label>
              <label>
                {tr("Mô tả công việc")}
                <textarea
                  name="description"
                  required
                  minLength={10}
                  rows="5"
                  placeholder={tr("Mô tả nhiệm vụ và yêu cầu ứng viên…")}
                />
              </label>
              <label>
                {tr("Kỹ năng yêu cầu")}
                <input
                  name="skills"
                  placeholder={tr("SQL, Excel, giao tiếp…")}
                />
              </label>
              <button className="button primary" disabled={busy}>
                {tr("Đăng tin tuyển dụng")}
                <Icon name="arrow" size={17} />
              </button>
            </form>
          )}
          {view !== "recruitment" && (
            <section className="panel">
              <h2>{tr("Ứng viên theo tin tuyển dụng")}</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  action(async () =>
                    setCandidates(
                      await careerApi.getJobCandidates(jobId.trim()),
                    ),
                  );
                }}
              >
                <label>
                  {tr("Mã tin tuyển dụng")}
                  <input
                    required
                    value={jobId}
                    onChange={(e) => setJobId(e.target.value)}
                    placeholder={tr("Nhập mã tin của doanh nghiệp")}
                    list="own-jobs"
                  />
                </label>
                <datalist id="own-jobs">
                  {jobs
                    .filter((j) => j.enterprise_id === user.id)
                    .map((j) => (
                      <option key={j.id} value={j.id}>
                        {tr(j.title)}
                      </option>
                    ))}
                </datalist>
                <button className="button secondary" disabled={busy}>
                  {tr("Xem ứng viên")}
                </button>
              </form>
              {tr(
                candidates?.length === 0 && (
                  <Empty icon="user" title={tr("Chưa có ứng viên")}>
                    {tr("Ứng viên sẽ xuất hiện khi có hồ sơ ứng tuyển.")}
                  </Empty>
                ),
              )}
              {tr(
                candidates?.map((c) => (
                  <article className="candidate" key={c.id}>
                    <h3>
                      {tr(c.student_name)}
                      {tr(" ")}
                      <span className="badge">
                        {tr(Math.round(c.match_percentage))}
                        {tr("% phù hợp")}
                      </span>
                    </h3>
                    <p>{tr(c.student_email)}</p>
                    <Tags items={c.candidate_skills} />
                  </article>
                )),
              )}
            </section>
          )}
        </div>
      ) : (
        <section className="panel">
          <div className="panel-heading">
            <h2>{tr("Cơ hội tuyển dụng")}</h2>
            <Icon name="briefcase" />
          </div>
          <label>
            {tr("Kỹ năng dùng để ứng tuyển")}
            <input
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder={tr("SQL, Python, Excel…")}
            />
          </label>
          <p className="helper">
            {tr(
              "Kiểm tra kỹ năng và mô tả trước khi gửi hồ sơ. Mỗi nút “Ứng tuyển” sẽ gửi hồ sơ đến doanh nghiệp tương ứng.",
            )}
          </p>
          {tr(
            !busy && !error && !jobs.length && (
              <Empty icon="briefcase" title={tr("Chưa có tin tuyển dụng")}>
                {tr("Các tin đã được duyệt sẽ xuất hiện tại đây.")}
              </Empty>
            ),
          )}
          <div className="course-grid">
            {jobs.map((j) => (
              <article className="course-card" key={j.id}>
                <span className="eyebrow">{tr(j.company_name)}</span>
                <h3>{tr(j.title)}</h3>
                <p>{tr(j.description)}</p>
                <Tags items={j.required_skills} />
                <button
                  className="button secondary"
                  disabled={busy || !skillList(skills).length}
                  onClick={() =>
                    action(async () => {
                      const d = await careerApi.applyEnterpriseJob(
                        j.id,
                        skillList(skills),
                      );
                      setNotice(
                        `Đã ứng tuyển ${j.title}. Độ phù hợp kỹ năng: ${Math.round(d.match_percentage)}%.`,
                      );
                    })
                  }
                >
                  {tr("Ứng tuyển")}
                  <Icon name="arrow" size={16} />
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
export default function AuthTab({
  currentUser,
  onAuthSuccess,
  onLogout,
  initialMode = "login",
  onModeChange,
  standalone = false,
}) {
  useUiLanguage();
  const [mode, setMode] = useState(initialMode);
  return (
    <>
      {tr(
        !standalone && (
          <PageHead
            visual={currentUser?.role || "student"}
            eyebrow={tr("KẾT NỐI VỚI CƠ HỘI")}
            title={tr(
              currentUser
                ? `Xin chào, ${currentUser.full_name}.`
                : "Bước tiếp theo bắt đầu từ đây.",
            )}
          >
            {tr(
              currentUser
                ? `${roles[currentUser.role]} · ${currentUser.email}`
                : "Một không gian cho sinh viên, doanh nghiệp và cộng đồng NEU.",
            )}
          </PageHead>
        ),
      )}
      {currentUser ? (
        <>
          <div className="account-toolbar">
            <span className="badge">{tr(roles[currentUser.role])}</span>
            <button className="button secondary" onClick={onLogout}>
              <Icon name="logout" size={17} />
              {tr("Đăng xuất")}
            </button>
          </div>
          <AccountWorkspace user={currentUser} />
        </>
      ) : (
        <div className="auth-grid">
          <section className="auth-story">
            <h2>
              {tr("Một tài khoản.")}
              <br />
              {tr("Các công cụ")}
              <br />
              <em>{tr("chuẩn bị ứng tuyển.")}</em>
            </h2>
            <p>
              {tr("Kết nối những gì bạn đã học với công việc bạn muốn làm.")}
            </p>
            {tr(
              standalone && (
                <div className="neu-auth-identity">
                  <span className="neu-logo">
                    <img
                      src={neuLogo}
                      alt={tr("Logo Đại học Kinh tế Quốc dân")}
                      width="644"
                      height="405"
                    />
                  </span>
                  <strong>{tr("Đại học Kinh tế Quốc dân")}</strong>
                  <span>{tr("Công cụ hỗ trợ chuẩn bị ứng tuyển")}</span>
                </div>
              ),
            )}
            <div className="auth-story-bottom">
              <Icon name="book" size={30} />
              <p>
                {tr("Dành cho sinh viên NEU")}
                <br />
                <strong>{tr("và doanh nghiệp tuyển dụng.")}</strong>
              </p>
            </div>
          </section>
          <GlassPanel>
            <div className="segmented" aria-label={tr("Hình thức truy cập")}>
              <button
                aria-pressed={mode === "login"}
                onClick={() => {
                  setMode("login");
                  onModeChange?.("login");
                }}
              >
                {tr("Đăng nhập")}
              </button>
              <button
                aria-pressed={mode === "register"}
                onClick={() => {
                  setMode("register");
                  onModeChange?.("register");
                }}
              >
                {tr("Đăng ký")}
              </button>
            </div>
            <h1>
              {tr(
                mode === "login"
                  ? "Chào mừng bạn trở lại"
                  : "Tạo tài khoản của bạn",
              )}
            </h1>
            <p>
              {tr(
                mode === "login"
                  ? "Tiếp tục hành trình nghề nghiệp của bạn."
                  : "Bắt đầu với những thông tin cơ bản.",
              )}
            </p>
            <AuthMotionForm
              key={mode}
              mode={mode}
              onAuthSuccess={onAuthSuccess}
            />
          </GlassPanel>
        </div>
      )}
    </>
  );
}
