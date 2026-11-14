import { tabsFor, settingsTab } from "../workspaceRoutes";
import { t as tr, useLocale as useUiLanguage } from "../i18n";
import { useEffect, useRef, useState } from "react";
export default function InteractionLayer({ navigate, currentUser }) {
  useUiLanguage();
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState(0);
  const dialog = useRef(null),
    input = useRef(null),
    trigger = useRef(null);
  const destinations = [
    { id: "home", label: "Trang chủ" },
    { id: "about", label: "Giới thiệu" },
    { id: "tools", label: "Công cụ" },
    { id: "getting-started", label: "Cách bắt đầu" },
    ...tabsFor(currentUser),
    currentUser ? settingsTab : { id: "auth", label: "Tài khoản" },
  ];
  const list = destinations.filter((d) =>
    tr(d.label).toLocaleLowerCase().includes(query.toLocaleLowerCase("vi")),
  );
  const close = () => {
    setOpen(false);
    setQuery("");
    setSelected(0);
    trigger.current?.focus();
  };
  const choose = (d) => {
    close();
    navigate(d.id === "auth" && !currentUser ? "login" : d.id);
  };
  useEffect(() => {
    const key = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
      input.current?.focus();
    } else dialog.current?.close();
  }, [open]);
  return (
    <>
      <button
        className="command-trigger"
        ref={trigger}
        onClick={() => setOpen(true)}
        aria-label={tr("Mở điều hướng nhanh")}
        aria-keyshortcuts="Control+k Meta+k"
      >
        {tr("Đi đến… ")}
        <kbd>{tr("Ctrl / ⌘ K")}</kbd>
      </button>
      <dialog
        className="command-dialog"
        ref={dialog}
        aria-labelledby="command-title"
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onClick={(e) => {
          if (e.target === dialog.current) close();
        }}
      >
        <div className="command-content">
          <div className="command-heading">
            <h2 id="command-title">{tr("Bạn muốn đi đâu?")}</h2>
            <button
              className="dismiss-control"
              onClick={close}
              aria-label={tr("Đóng điều hướng nhanh")}
            >
              {tr("×")}
            </button>
          </div>
          <input
            ref={input}
            role="combobox"
            aria-label={tr("Tìm màn hình")}
            aria-expanded="true"
            aria-controls="command-results"
            aria-autocomplete="list"
            aria-activedescendant={
              list[selected] ? `command-${list[selected].id}` : undefined
            }
            value={query}
            placeholder={tr("Tìm màn hình…")}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                close();
              }
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelected((i) => Math.min(i + 1, list.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelected((i) => Math.max(0, i - 1));
              }
              if (e.key === "Enter" && list[selected]) {
                e.preventDefault();
                choose(list[selected]);
              }
            }}
          />
          <ul id="command-results" role="listbox" aria-label={tr("Màn hình")}>
            {list.map((d, i) => (
              <li
                id={`command-${d.id}`}
                role="option"
                aria-selected={selected === i}
                key={d.id}
                onPointerMove={() => setSelected(i)}
                onClick={() => choose(d)}
              >
                {tr(d.label)}
                <span>{tr("↵")}</span>
              </li>
            ))}
          </ul>
          {tr(
            !list.length && (
              <p role="status">{tr("Không tìm thấy màn hình.")}</p>
            ),
          )}
          <p className="command-help">
            <kbd>{tr("↑ ↓")}</kbd>
            {tr(" Chọn ")}
            <kbd>{tr("Enter")}</kbd>
            {tr(" Mở ")}
            <kbd>{tr("Esc")}</kbd>
            {tr(" Đóng")}
          </p>
        </div>
      </dialog>
    </>
  );
}
export function UndoToast({ message, onUndo, onClose }) {
  useUiLanguage();
  if (!message) return null;
  // No expiry: users can reach Undo at their own pace, including keyboard/AT.
  return (
    <div className="undo-toast" role="status">
      <span>{tr(message)}</span>
      <button onClick={onUndo}>{tr("Hoàn tác")}</button>
      <button onClick={onClose} aria-label={tr("Đóng thông báo")}>
        {tr("×")}
      </button>
    </div>
  );
}
export function CourseSkeletons() {
  useUiLanguage();
  return (
    <div
      className="skeleton-region"
      role="status"
      aria-label={tr("Đang tải danh mục học phần")}
    >
      <span className="sr-only">{tr("Đang tải danh mục học phần…")}</span>
      <div className="course-grid" aria-hidden="true">
        {[0, 1, 2, 3].map((n) => (
          <div className="panel skeleton-card" key={n}>
            <i />
            <i />
            <i />
            <i />
          </div>
        ))}
      </div>
    </div>
  );
}
