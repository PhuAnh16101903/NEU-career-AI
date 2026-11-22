import { t as tr, useLocale as useUiLanguage } from "../i18n";
import { useEffect, useRef } from "react";
import { Tags } from "./UI";
export default function CourseSheet({ course, onClose }) {
  useUiLanguage();
  const ref = useRef(null),
    drag = useRef(null);
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    return () => {
      d.close();
    };
  }, []);
  const settle = () => {
    ref.current.style.transform = "";
    ref.current.classList.remove("is-dragging");
    drag.current = null;
  };
  const start = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (drag.current) return;
    drag.current = {
      y: e.clientY,
      lastY: e.clientY,
      lastTime: e.timeStamp,
      velocity: 0,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    ref.current.classList.add("is-dragging");
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    const elapsed = e.timeStamp - d.lastTime;
    d.velocity = elapsed > 0 ? (e.clientY - d.lastY) / elapsed : 0;
    d.lastY = e.clientY;
    d.lastTime = e.timeStamp;
    ref.current.style.transform = `translateY(${Math.max(0, e.clientY - d.y)}px)`;
  };
  const finish = (e) => {
    const d = drag.current;
    if (!d) return;
    const velocity = e.timeStamp - d.lastTime < 100 ? d.velocity : 0;
    if (e.clientY - d.y > 110 || (e.clientY - d.y > 25 && velocity > 0.5)) {
      settle();
      onClose();
    } else settle();
  };
  return (
    <dialog
      className="course-sheet"
      ref={ref}
      aria-labelledby="sheet-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div
        className="sheet-handle"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={settle}
        aria-hidden="true"
      >
        <span />
      </div>
      <div className="sheet-body">
        <div className="panel-heading">
          <span>
            {tr(course.code)}
            {tr(" · ")}
            {tr(course.credits)}
            {tr(" tín chỉ")}
          </span>
          <button
            className="dismiss-control"
            onClick={onClose}
            aria-label={tr("Đóng chi tiết học phần")}
          >
            {tr("×")}
          </button>
        </div>
        <h2 id="sheet-title">{tr(course.name)}</h2>
        <p>{tr(course.major)}</p>
        <p>{tr(course.description)}</p>
        <h3>{tr("Kỹ năng được trang bị")}</h3>
        <Tags items={course.skills_provided} />
      </div>
    </dialog>
  );
}
