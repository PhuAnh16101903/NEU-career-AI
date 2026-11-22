import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import ThemeFrame from "../src/components/ThemeFrame";
import HomePage, { HERO_VIDEO } from "../src/components/HomePage";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("uses the requested silent looping inline video and keeps navigation after a video error", () => {
  const { container } = render(
    <ThemeFrame>
      <HomePage />
    </ThemeFrame>,
  );
  const video = container.querySelector("video");
  expect(video.getAttribute("src")).toBe(HERO_VIDEO);
  expect(video.muted).toBe(true);
  expect(video.loop).toBe(true);
  expect(video.playsInline).toBe(true);
  fireEvent.error(video);
  expect(video.hidden).toBe(true);
  expect(screen.getByRole("status").textContent).toContain(
    "Video chưa tải được",
  );
  expect(container.querySelector(".video-hero-cta").getAttribute("href")).toBe(
    "#about",
  );
});
it("makes the mobile overlay accessible, restores focus on Escape and closes on login", () => {
  vi.stubGlobal("matchMedia", (q) => ({
    matches: q.includes("max-width"),
    addEventListener() {},
    removeEventListener() {},
  }));
  const { container } = render(
    <ThemeFrame>
      <HomePage />
    </ThemeFrame>,
  );
  const button = container.querySelector(".mobile-menu-button"),
    nav = container.querySelector("nav"),
    main = container.querySelector("main");
  expect(nav.hasAttribute("inert")).toBe(true);
  fireEvent.click(button);
  expect(nav.hasAttribute("inert")).toBe(false);
  expect(main.hasAttribute("inert")).toBe(true);
  fireEvent.keyDown(button, { key: "Escape" });
  expect(document.activeElement).toBe(button);
  expect(button.getAttribute("aria-expanded")).toBe("false");
  fireEvent.click(button);
  fireEvent.click(container.querySelector(".mobile-menu-cta"));
  expect(button.getAttribute("aria-expanded")).toBe("false");
  expect(main.hasAttribute("inert")).toBe(false);
});
it("does not autoplay when reduced motion is requested", () => {
  vi.stubGlobal("matchMedia", (q) => ({
    matches: q.includes("reduced-motion"),
    addEventListener() {},
    removeEventListener() {},
  }));
  const { container } = render(
    <ThemeFrame>
      <HomePage />
    </ThemeFrame>,
  );
  expect(container.querySelector("video").autoplay).toBe(false);
  expect(screen.queryByRole("button", { name: "Bật chuyển động" })).toBeNull();
});

it('keeps text entrance enabled when the browser aborts autoplay', async () => {
 const play=vi.spyOn(HTMLMediaElement.prototype,'play').mockRejectedValue(new DOMException('Interrupted','AbortError'));
 const {container}=render(<ThemeFrame><HomePage /></ThemeFrame>);
 await Promise.resolve();
 expect(container.querySelector('.video-hero').classList.contains('motion-paused')).toBe(false);
 expect(container.querySelector('video').autoplay).toBe(true);
 play.mockRestore();
});
