// Lucian UX/UI Prompt #040 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#040
import { useRef } from "react";
import Brand from "./Brand";
import { Icon } from "./UI";
import { t as tr, useLocale } from "../i18n";
import "./CareerRail.css";
export default function CareerRail({
  wide,
  onToggle,
  tabs,
  activeTab,
  currentUser,
  navigate,
  onLogout,
}) {
  useLocale();
  const links = useRef([]);
  const index = tabs.findIndex((t) => t.id === activeTab);
  return (
    <aside className="sidebar u040-rail">
      <div className="u040-top">
        <Brand />
      </div>
      <button
        className="u040-tog"
        type="button"
        aria-expanded={wide}
        aria-controls="career-rail-nav"
        aria-label={tr(wide ? "Thu gọn menu" : "Mở rộng menu")}
        onClick={onToggle}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M6 3.5L10.5 8 6 12.5" />
        </svg>
      </button>
      <nav
        id="career-rail-nav"
        className="u040-nav"
        aria-label={tr("Điều hướng chính")}
      >
        <span
          className="u040-hl"
          style={{
            "--y": `${Math.max(index, 0) * 52}px`,
            visibility: index < 0 ? "hidden" : undefined,
          }}
          aria-hidden="true"
        />
        {tabs.map((t, i) => (
          <a
            key={t.id}
            ref={(el) => (links.current[i] = el)}
            href={`#${t.id === "auth" && !currentUser ? "login" : t.id}`}
            className="u040-it"
            aria-label={tr(t.label)}
            title={!wide ? tr(t.label) : undefined}
            aria-current={activeTab === t.id ? "page" : undefined}
            style={{ "--i": i }}
            onKeyDown={(e) => {
              const d =
                e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
              if (d) {
                e.preventDefault();
                links.current[(i + d + tabs.length) % tabs.length]?.focus();
              }
            }}
          >
            <Icon name={t.icon} />
            <span>{tr(t.label)}</span>
          </a>
        ))}
      </nav>
      <div className="u040-account">
        {currentUser && (
          <a
            href="#settings"
            className="u040-account-action"
            aria-label={tr("Cài đặt tài khoản")}
            title={tr("Cài đặt tài khoản")}
            aria-current={activeTab === "settings" ? "page" : undefined}
          >
            <Icon name="settings" size={19} />
            <span>{tr("Cài đặt")}</span>
          </a>
        )}
        <button
          className="u040-me"
          type="button"
          aria-label={tr(currentUser ? "Tài khoản" : "Đăng nhập")}
          title={!wide ? tr(currentUser?.full_name || "Đăng nhập") : undefined}
          onClick={() => navigate(currentUser ? "settings" : "login")}
        >
          <i aria-hidden="true">{currentUser?.full_name?.slice(0, 1) || "N"}</i>
          <span>
            {currentUser?.full_name || tr("Chào bạn!")}
            <small>
              {tr(
                currentUser
                  ? {
                      student: "Sinh viên",
                      enterprise: "Doanh nghiệp",
                      admin: "Quản trị viên",
                    }[currentUser.role]
                  : "Đăng nhập",
              )}
            </small>
          </span>
        </button>
        {currentUser && (
          <button
            type="button"
            className="u040-account-action u040-logout"
            onClick={onLogout}
            aria-label={tr("Đăng xuất")}
            title={tr("Đăng xuất")}
          >
            <Icon name="logout" size={16} />
            <span>{tr("Đăng xuất")}</span>
          </button>
        )}
      </div>
    </aside>
  );
}
