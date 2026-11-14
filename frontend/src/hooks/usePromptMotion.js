import { useEffect, useRef } from "react";
// Only motion vocabulary from the supplied Melli prompt; no new visual assets.
export function usePromptMotion(paused) {
  const root = useRef(null);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let observer,
      frame = 0,
      pointerFrame = 0,
      previous = 0;
    const targets = [...node.querySelectorAll(".landing-section,.landing-cta")];
    const parallax = [...node.querySelectorAll("[data-motion-speed]")];
    const route = node.querySelector(".neu-route");
    const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
    const reset = () => {
      parallax.forEach((el) => el.style.removeProperty("transform"));
      route?.style.removeProperty("transform");
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(pointerFrame);
      frame = 0;
      pointerFrame = 0;
      observer?.disconnect();
      reset();
    };
    const applyScroll = () => {
      frame = 0;
      if (paused || media?.matches || document.hidden) return;
      parallax.forEach((el) => {
        const section = el.closest("section");
        if (!section) return;
        const rect = section.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > innerHeight) return;
        const p = -rect.top / innerHeight;
        el.style.transform = `translate3d(0,${p * Number(el.dataset.motionSpeed) * innerHeight}px,0) rotate(${p * Number(el.dataset.motionRot || 0)}deg)`;
      });
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(applyScroll);
    };
    const follow = (time) => {
      pointerFrame = 0;
      if (paused || media?.matches || document.hidden) return;
      const dt = Math.min((time - (previous || time - 16)) / 1000, 0.05);
      previous = time;
      const k = 1 - Math.exp(-dt * 2);
      pointer.sx += (pointer.x - pointer.sx) * k;
      pointer.sy += (pointer.y - pointer.sy) * k;
      if (route)
        route.style.transform = `perspective(700px) translate3d(${pointer.sx * 3}px,${pointer.sy * 2}px,0) rotateY(${pointer.sx * 3}deg) rotateX(${-pointer.sy * 2}deg)`;
      if (
        Math.abs(pointer.x - pointer.sx) + Math.abs(pointer.y - pointer.sy) >
        0.001
      )
        pointerFrame = requestAnimationFrame(follow);
    };
    const move = (e) => {
      if (e.pointerType !== "mouse" || paused || media?.matches || !route)
        return;
      const rect = route.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight) return;
      pointer.x = (e.clientX / innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / innerHeight) * 2 - 1);
      if (!pointerFrame) {
        previous = 0;
        pointerFrame = requestAnimationFrame(follow);
      }
    };
    const configure = () => {
      stop();
      node.classList.add("motion-loaded");
      if (paused || media?.matches || !window.IntersectionObserver) {
        targets.forEach((el) => el.classList.add("motion-in"));
        return;
      }
      observer = new IntersectionObserver(
        (entries) =>
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("motion-in");
              observer.unobserve(entry.target);
            }
          }),
        { threshold: 0.3 },
      );
      targets.forEach((section) => {
        section
          .querySelectorAll(
            "h2,h3,p,.text-link,.landing-button,.landing-feature,.how-steps li",
          )
          .forEach((el, i) => {
            if (
              el.closest(".landing-feature") !== el &&
              el.closest(".landing-feature")
            )
              return;
            if (el.parentElement.closest(".motion-reveal")) return;
            el.classList.add("motion-reveal");
            el.style.setProperty(
              "--reveal-delay",
              `${[0, 0.1, 0.22, 0.34][i % 4]}s`,
            );
          });
        observer.observe(section);
      });
      scroll();
    };
    configure();
    media?.addEventListener?.("change", configure);
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", scroll);
    window.addEventListener("pointermove", move, { passive: true });
    const visibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(pointerFrame);
        pointerFrame = 0;
      } else scroll();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      stop();
      media?.removeEventListener?.("change", configure);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", scroll);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [paused]);
  return root;
}
