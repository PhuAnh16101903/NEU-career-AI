import LanguageText from "./LanguageText";
import { useEffect, useRef, useState } from "react";
import { LanguageToggle, t as tr, useLocale } from "../i18n";
import Brand from "./Brand";
import { ThemeToggle } from "./ThemeFrame";
import { Icon } from "./UI";
const links = [
  ["home", "Trang chủ"],
  ["about", "Giới thiệu"],
  ["tools", "Công cụ"],
  ["getting-started", "Cách bắt đầu"],
];
export function PublicHeader({
  currentUser,
  activeSection,
  overlay = false,
  onMenuChange,
}) {
  useLocale();
  const [menu, setMenu] = useState(false);
  const [compact, setCompact] = useState(
    () =>
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(max-width: 1000px)").matches,
  );
  const header = useRef(null),
    toggle = useRef(null);
  useEffect(() => {
    const q = window.matchMedia?.("(max-width: 1000px)");
    const sync = () => {
      setCompact(!!q?.matches);
      if (!q?.matches) setMenu(false);
    };
    q?.addEventListener?.("change", sync);
    return () => q?.removeEventListener?.("change", sync);
  }, []);
  useEffect(() => {
    onMenuChange?.(overlay && compact && menu);
    return () => onMenuChange?.(false);
  }, [menu, compact, overlay, onMenuChange]);
  const keydown = (e) => {
    if (!overlay || !compact || !menu) return;
    if (e.key === "Escape") {
      e.preventDefault();
      setMenu(false);
      toggle.current?.focus();
    }
    if (e.key === "Tab") {
      const items = [
        ...header.current.querySelectorAll("a[href],button:not([disabled])"),
      ].filter((el) => el.getClientRects().length);
      if (!items.length) return;
      const first = items[0],
        last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  return (
    <>
      <a
        className="skip-link"
        href="#home-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("home-content")?.focus();
        }}
      >
        {tr("Đến nội dung chính")}
      </a>
      <header
        ref={header}
        onKeyDown={keydown}
        className={`public-header ${overlay ? "video-hero-header" : ""}`}
      >
        <Brand />
        <button
          ref={toggle}
          className={`mobile-menu-button ${menu ? "menu-open" : ""}`}
          aria-expanded={menu}
          aria-controls="public-navigation"
          onClick={() => setMenu((v) => !v)}
        >
          {tr(menu ? "Đóng" : "Menu")}
          <span className="menu-symbols" aria-hidden="true">
            <Icon name="menu" size={20} />
            <Icon name="close" size={20} />
          </span>
        </button>
        <nav
          inert={overlay && compact && !menu ? "" : undefined}
          id="public-navigation"
          className={menu ? "is-open" : ""}
          aria-label={tr("Điều hướng trang chủ")}
        >
          {links.map(([id, label], index) => (
            <a
              href={`#${id}`}
              key={id}
              aria-current={activeSection === id ? "page" : undefined}
              onClick={() => setMenu(false)}
            >
              <LanguageText text={label} order={index} />
            </a>
          ))}
          <a
            href="https://neu.edu.vn/he-thong-nhan-dien/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenu(false)}
          >
            {tr("Về NEU")} <span aria-hidden="true">↗</span>
          </a>
          {overlay && (
            <a
              className="mobile-menu-cta"
              href={currentUser ? "#cv" : "#login"}
              onClick={() => setMenu(false)}
            >
              <LanguageText
                text={currentUser ? "Vào không gian của bạn" : "Đăng nhập"}
                order={5}
                resize
              />
              <Icon name="arrow" size={16} />
            </a>
          )}
        </nav>
        <LanguageToggle />
        <ThemeToggle />
        <a className="header-login" href={currentUser ? "#cv" : "#login"}>
          <LanguageText
            text={currentUser ? "Vào không gian của bạn" : "Đăng nhập"}
            order={5}
            resize
          />
          <Icon name="arrow" size={17} />
        </a>
      </header>
    </>
  );
}
export function PublicFooter() {
  useLocale();
  return (
    <footer className="landing-footer">
      <Brand />
      <p>{tr("CV, kỹ năng và luyện phỏng vấn trong một nơi.")}</p>
      <a href="#login">
        {tr("Đăng nhập")}
        <Icon name="arrow" size={16} />
      </a>
      <span>{tr("NEU Career AI · Dự án hỗ trợ định hướng nghề nghiệp")}</span>
    </footer>
  );
}
