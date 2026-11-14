// Lucian UX/UI Prompt #219 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#219
import { t as tr, useLocale as useUiLanguage } from "../i18n";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import "./ThemeFrame.css";
import "./PromptMotion.css";
import "./Polish.css";
const ThemeContext = createContext({
  theme: "light",
  toggle: () => {},
});
const preference = () => {
  if (typeof window === "undefined") return "light";
  try {
    const saved = localStorage.getItem("neu-career-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};
export function ThemeToggle() {
  useUiLanguage();
  const { theme, toggle } = useContext(ThemeContext);
  return (
    <button
      type="button"
      className="u219-tg"
      aria-label={tr(
        theme === "dark"
          ? "Chuyển sang giao diện sáng"
          : "Chuyển sang giao diện tối",
      )}
      aria-pressed={theme === "dark"}
      onClick={(e) => toggle(e.currentTarget)}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <g className="u219-sun">
          <circle cx="8" cy="8" r="3" fill="currentColor" />
          <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M8 1.5v1.4M8 13.1v1.4M1.5 8h1.4M13.1 8h1.4M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1" />
          </g>
        </g>
        <path
          className="u219-moon"
          d="M13.5 9.8A5.6 5.6 0 0 1 6.2 2.5a5.6 5.6 0 1 0 7.3 7.3z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
}
export default function ThemeFrame({ children }) {
  useUiLanguage();
  const [theme, setTheme] = useState(preference),
    root = useRef(null),
    overlay = useRef(null),
    animation = useRef(null),
    timer = useRef(null),
    media = useRef(null),
    nativeTransition = useRef(null),
    themeValue = useRef(theme);
  const clear = () => {
    nativeTransition.current?.skipTransition();
    nativeTransition.current = null;
    animation.current?.cancel();
    animation.current = null;
    clearTimeout(timer.current);
    overlay.current?.replaceChildren();
  };
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    media.current = query;
    const change = () => {
      if (query?.matches) clear();
    };
    query?.addEventListener?.("change", change);
    return () => {
      clear();
      query?.removeEventListener?.("change", change);
    };
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("neu-career-theme", theme);
    } catch {}
  }, [theme]);
  const toggle = (button) => {
    clear();
    const previous = themeValue.current;
    const next = previous === "dark" ? "light" : "dark";
    themeValue.current = next;
    const commit = () => flushSync(() => setTheme(next));
    // Native snapshots avoid cloning the hidden workspace behind public pages.
    if (!media.current?.matches && typeof document.startViewTransition === "function") {
      const b = button.getBoundingClientRect();
      const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      const radius = Math.hypot(Math.max(cx, innerWidth-cx), Math.max(cy,innerHeight-cy));
      try {
        const transition = document.startViewTransition(commit);
        nativeTransition.current = transition;
        transition.ready.then(() => {
          if (nativeTransition.current !== transition) return;
          animation.current = document.documentElement.animate(
            {clipPath:[`circle(0px at ${cx}px ${cy}px)`, `circle(${radius}px at ${cx}px ${cy}px)`]},
            {duration:700,easing:"cubic-bezier(.22,1,.36,1)",fill:"both",pseudoElement:"::view-transition-new(root)"}
          );
        }).catch(() => {});
        transition.finished.catch(() => {}).finally(() => {
          if (nativeTransition.current === transition) {nativeTransition.current=null;animation.current=null;}
        });
        return;
      } catch { commit(); return; }
    }
    // Snapshots are inert and short-lived. The single live React tree retains all form state and focus.
    if (
      !media.current?.matches &&
      overlay.current &&
      root.current &&
      typeof Element.prototype.animate === "function"
    ) {
      try {
        const bounds = root.current.getBoundingClientRect(),
          b = button.getBoundingClientRect();
        const cx = b.left + b.width / 2,
          cy = b.top + b.height / 2;
        const radius = Math.hypot(
          Math.max(cx, innerWidth - cx),
          Math.max(cy, innerHeight - cy),
        );
        const snapshot = (mode, index) => {
          const layer = document.createElement("div");
          layer.className = "u219-layer";
          const copy = root.current.cloneNode(true);
          copy.dataset.theme = mode;
          const sourceNodes = root.current.querySelectorAll("*"),
            copiedNodes = copy.querySelectorAll("*");
          sourceNodes.forEach((source, i) => {
            const target = copiedNodes[i];
            if (source instanceof HTMLSelectElement)
              target.value = source.value;
            if (source instanceof HTMLTextAreaElement)
              target.value = source.value;
            if (source instanceof HTMLInputElement && source.type !== "file") {
              target.value = source.value;
              target.checked = source.checked;
            }
          });
          copy.classList.add("u219-snapshot");
          copy.style.width = `${bounds.width}px`;
          copy.style.left = `${bounds.left}px`;
          copy.style.top = `${bounds.top}px`;
          // Unique SVG IDs keep both snapshots independent without collisions with the live page.
          const ids = new Map();
          copy.querySelectorAll("[id]").forEach((el) => {
            const old = el.id;
            el.id = `u219-copy-${index}-${old}`;
            ids.set(old, el.id);
          });
          copy.querySelectorAll("*").forEach((el) => {
            for (const attr of [...el.attributes]) {
              let value = attr.value;
              ids.forEach((replacement, id) => {
                value = value.replaceAll(`url(#${id})`, `url(#${replacement})`);
                if (["aria-labelledby", "aria-describedby"].includes(attr.name))
                  value = value
                    .split(" ")
                    .map((v) => (v === id ? replacement : v))
                    .join(" ");
              });
              if (value !== attr.value) el.setAttribute(attr.name, value);
            }
          });
          // Preserve the current video frame in the short-lived theme snapshot.
          sourceNodes.forEach((source, i) => {
            if (source instanceof HTMLVideoElement && source.readyState >= 2) {
              const canvas = document.createElement("canvas");
              canvas.width = source.videoWidth;
              canvas.height = source.videoHeight;
              canvas.className = source.className;
              canvas.style.cssText = source.style.cssText;
              try {
                canvas.getContext("2d")?.drawImage(source, 0, 0);
                copiedNodes[i].replaceWith(canvas);
              } catch {}
            }
          });
          copy.querySelectorAll("[hidden]").forEach((node) => node.remove());
          layer.append(copy);
          overlay.current.append(layer);
          sourceNodes.forEach((source, i) => {
            copiedNodes[i].scrollTop = source.scrollTop;
            copiedNodes[i].scrollLeft = source.scrollLeft;
          });
          return layer;
        };
        snapshot(theme, 0);
        const reveal = snapshot(next, 1);
        animation.current = reveal.animate(
          [
            {
              clipPath: `circle(0px at ${cx}px ${cy}px)`,
            },
            {
              clipPath: `circle(${radius}px at ${cx}px ${cy}px)`,
            },
          ],
          {
            duration: 700,
            easing: "cubic-bezier(.65,0,.35,1)",
            fill: "forwards",
          },
        );
        reveal.querySelectorAll(".u219-tg svg").forEach((icon) =>
          icon.animate(
            [
              {
                transform: `rotate(${theme === "dark" ? -90 : 0}deg)`,
              },
              {
                transform: `rotate(${next === "dark" ? -90 : 0}deg)`,
              },
            ],
            {
              duration: 600,
              easing: "cubic-bezier(.3,1.4,.5,1)",
              fill: "forwards",
            },
          ),
        );
        animation.current.onfinish = clear;
        timer.current = setTimeout(clear, 850);
      } catch {
        clear();
      }
    }
    setTheme(next);
  };
  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggle,
      }}
    >
      <div className="u219 neu-prompt-only" data-theme={theme} ref={root}>
        {tr(children)}
      </div>
      {tr(
        typeof document !== "undefined" &&
          createPortal(
            <div
              className="u219 u219-reveal"
              ref={overlay}
              aria-hidden="true"
              inert=""
            />,
            document.body,
          ),
      )}
    </ThemeContext.Provider>
  );
}
