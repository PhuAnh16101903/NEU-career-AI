// Lucian UX/UI Prompt #267 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#267
import { useEffect, useId, useRef, useState } from "react";
import { setLanguage, useLocale } from "../i18n";
import "./LanguageSwitch.css";
const languages = [
  { lang: "vi", code: "VI", name: "Tiếng Việt" },
  { lang: "en", code: "EN", name: "English" },
];
export default function LanguageSwitch() {
  const locale = useLocale(),
    id = useId();
  const [open, setOpen] = useState(false);
  const root = useRef(null),
    trigger = useRef(null),
    options = useRef([]),
    focusIndex = useRef(0);
  const close = (restore = false) => {
    setOpen(false);
    if (restore) trigger.current?.focus();
  };
  const select = (lang) => {
    setLanguage(lang);
    close(true);
  };
  const show = (index = languages.findIndex((l) => l.lang === locale)) => {
    focusIndex.current = index;
    setOpen(true);
    if (open) options.current[index]?.focus();
  };
  useEffect(() => {
    if (!open) return;
    options.current[focusIndex.current]?.focus();
    const outside = (e) => {
      if (!root.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return (
    <div
      ref={root}
      className={`u267 language-switch ${open ? "is-open" : ""}`}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.preventDefault();
          e.stopPropagation();
          close(true);
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="u267-gb language-toggle"
        aria-label={
          locale === "vi"
            ? "Chọn ngôn ngữ: Tiếng Việt"
            : "Choose language: English"
        }
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => (open ? close() : show())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            show(e.key === "ArrowDown" ? 0 : languages.length - 1);
          }
        }}
      >
        <svg viewBox="0 0 14 14" aria-hidden="true">
          <circle
            cx="7"
            cy="7"
            r="5.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
          />
          <path
            d="M1.5 7h11M7 1.5c1.8 1.6 1.8 9.4 0 11M7 1.5c-1.8 1.6-1.8 9.4 0 11"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
          />
        </svg>
        <span className="u267-cd">{locale.toUpperCase()}</span>
      </button>
      <div
        id={id}
        className="u267-dd"
        role="listbox"
        aria-label={locale === "vi" ? "Ngôn ngữ" : "Language"}
        aria-hidden={!open}
        inert={!open ? "" : undefined}
      >
        {languages.map((l, i) => (
          <button
            key={l.lang}
            ref={(el) => (options.current[i] = el)}
            type="button"
            role="option"
            className={`u267-op ${locale === l.lang ? "is-on" : ""}`}
            lang={l.lang}
            aria-selected={locale === l.lang}
            disabled={!open}
            tabIndex={open ? 0 : -1}
            onClick={() => select(l.lang)}
            onKeyDown={(e) => {
              let next;
              if (e.key === "ArrowDown") next = (i + 1) % languages.length;
              if (e.key === "ArrowUp")
                next = (i + languages.length - 1) % languages.length;
              if (e.key === "Home") next = 0;
              if (e.key === "End") next = languages.length - 1;
              if (next !== undefined) {
                e.preventDefault();
                options.current[next]?.focus();
              }
            }}
          >
            <span>{l.name}</span>
            <svg viewBox="0 0 14 14" aria-hidden="true">
              <path
                d="M2.5 7.5l3 3 6-6.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
