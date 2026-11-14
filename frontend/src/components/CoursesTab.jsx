import { t as tr, useLocale as useUiLanguage } from "../i18n";
import { useState } from "react";
import { useCurriculum } from "../hooks/useCurriculum";
import { CourseSkeletons, UndoToast } from "./InteractionLayer";
import CourseSheet from "./CourseSheet";
import { Empty, ErrorNotice, Icon, PageHead, Tags, errorText } from "./UI";
export default function CoursesTab() {
  useUiLanguage();
  const {
    courses,
    loading: busy,
    refreshing,
    error: loadError,
    retry,
  } = useCurriculum();
  const error = loadError ? errorText(loadError) : "";
  const [query, setQuery] = useState(""),
    [major, setMajor] = useState(""),
    [undo, setUndo] = useState(null),
    [selectedCourse, setSelectedCourse] = useState(null);
  const clearFilters = () => {
    setUndo({
      query,
      major,
    });
    setQuery("");
    setMajor("");
  };
  const normalize = (s) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase();
  const filtered = courses.filter(
    (c) =>
      (!major || c.major === major) &&
      normalize(`${c.name} ${c.code} ${c.skills_provided.join(" ")}`).includes(
        normalize(query.trim()),
      ),
  );
  return (
    <>
      <PageHead visual="courses"
        eyebrow={tr("HỌC CÓ ĐỊNH HƯỚNG")}
        title={tr("Mỗi học phần, một bước tiến.")}
      >
        {tr("Khám phá học phần NEU và những kỹ năng bạn có thể phát triển.")}
      </PageHead>
      <div className="panel filter-bar">
        <label className="search-field">
          <span className="sr-only">
            {tr("Tìm tên, mã học phần hoặc kỹ năng")}
          </span>
          <Icon name="search" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tr("Tìm tên, mã học phần hoặc kỹ năng…")}
          />
        </label>
        <label>
          <span className="sr-only">{tr("Lọc ngành")}</span>
          <select value={major} onChange={(e) => setMajor(e.target.value)}>
            <option value="">{tr("Tất cả ngành")}</option>
            {[...new Set(courses.map((c) => c.major))].map((m) => (
              <option key={m}>{tr(m)}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="filter-actions">
        <button
          className="button secondary"
          disabled={!query && !major}
          onClick={clearFilters}
        >
          {tr("Xóa bộ lọc")}
        </button>
        {tr(
          refreshing && !busy && (
            <span role="status">{tr("Đang cập nhật danh mục…")}</span>
          ),
        )}
      </div>
      <ErrorNotice message={error} />
      {tr(
        error && (
          <button className="button secondary" onClick={retry}>
            {tr("Thử tải lại")}
          </button>
        ),
      )}
      {busy ? (
        <CourseSkeletons />
      ) : (
        (!error || courses.length > 0) && (
          <>
            <p className="result-count" role="status">
              {tr(filtered.length)}
              {tr(" học phần phù hợp")}
            </p>
            {filtered.length ? (
              <div className="course-grid">
                {filtered.map((c) => (
                  <article className="panel course-card" key={c.id}>
                    <div className="panel-heading">
                      <span className="icon-tile">
                        <Icon name="book" />
                      </span>
                      <span className="badge">
                        {tr(c.credits)}
                        {tr(" tín chỉ")}
                      </span>
                    </div>
                    <span className="eyebrow">{tr(c.code)}</span>
                    <h2>{tr(c.name)}</h2>
                    <p className="course-major">{tr(c.major)}</p>
                    <p>{tr(c.description)}</p>
                    <Tags items={c.skills_provided} />
                    <button
                      className="button secondary"
                      onClick={() => setSelectedCourse(c)}
                    >
                      {tr("Chi tiết học phần")}
                      <span className="sr-only">
                        {tr(" ")}
                        {tr(c.name)}
                      </span>
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <section className="panel">
                <Empty icon="search" title={tr("Chưa tìm thấy học phần")}>
                  {tr("Thử từ khóa ngắn hơn hoặc chọn tất cả ngành.")}
                </Empty>
              </section>
            )}
          </>
        )
      )}
      {tr(
        selectedCourse && (
          <CourseSheet
            course={selectedCourse}
            onClose={() => setSelectedCourse(null)}
          />
        ),
      )}
      <UndoToast
        message={undo ? "Đã xóa bộ lọc học phần." : ""}
        onClose={() => setUndo(null)}
        onUndo={() => {
          setQuery(undo.query);
          setMajor(undo.major);
          setUndo(null);
        }}
      />
    </>
  );
}
