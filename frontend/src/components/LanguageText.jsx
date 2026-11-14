// Lucian UX/UI Prompt #267 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#267
import { useEffect, useRef, useState } from "react";
import { t, useLocale } from "../i18n";
import "./LanguageSwitch.css";
export default function LanguageText({ text, order = 0, resize = false }) {
  const locale = useLocale(),
    target = t(text);
  const [shown, setShown] = useState(target),
    [phase, setPhase] = useState("");
  const previous = useRef(locale),
    box = useRef(null);
  useEffect(() => {
    const changed = previous.current !== locale;
    previous.current = locale;
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let timers = [],
      widthAnimation;
    const reset = () => {
      timers.forEach(clearTimeout);
      widthAnimation?.cancel();
      setShown(target);
      setPhase("");
      if (box.current) box.current.style.width = "";
    };
    if (!changed || media?.matches) {
      reset();
      return;
    }
    const width = box.current?.getBoundingClientRect().width;
    timers.push(setTimeout(() => setPhase("is-go"), order * 45));
    timers.push(
      setTimeout(
        () => {
          setShown(target);
          setPhase("is-in");
          timers.push(
            setTimeout(() => {
              const el = box.current;
              if (resize && width && el?.animate) {
                const next = el.getBoundingClientRect().width;
                widthAnimation = el.animate(
                  [{ width: `${width}px` }, { width: `${next}px` }],
                  { duration: 350, easing: "cubic-bezier(.3,1.3,.5,1)" },
                );
              }
            }, 0),
          );
        },
        order * 45 + 260,
      ),
    );
    timers.push(setTimeout(() => setPhase(""), order * 45 + 640));
    const reduced = () => {
      if (media.matches) reset();
    };
    media?.addEventListener?.("change", reduced);
    return () => {
      timers.forEach(clearTimeout);
      widthAnimation?.cancel();
      media?.removeEventListener?.("change", reduced);
    };
  }, [locale, target, order, resize]);
  return (
    <span className={`u267 u267-sw ${phase}`} ref={box} aria-label={target}>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}
