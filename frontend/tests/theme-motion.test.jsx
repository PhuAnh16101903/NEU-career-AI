import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeFrame, { ThemeToggle } from "../src/components/ThemeFrame";
import HomePage from "../src/components/HomePage";
import GuidePage from "../src/components/GuidePage";
let reduced = false,
  systemDark = false;
beforeEach(() => {
  localStorage.clear();
  reduced = false;
  systemDark = false;
  vi.stubGlobal(
    "matchMedia",
    vi.fn((q) => ({
      matches: q.includes("reduced-motion") ? reduced : systemDark,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it("toggles light/dark using keyboard, preserves form values and focus, persists choice", async () => {
  render(
    <ThemeFrame>
      <ThemeToggle />
      <input aria-label="Bản nháp" defaultValue="SQL, Python" />
    </ThemeFrame>,
  );
  const button = screen.getByRole("button", {
    name: "Chuyển sang giao diện tối",
  });
  button.focus();
  await userEvent.keyboard("{Enter}");
  expect(
    screen.getByRole("button", { name: "Chuyển sang giao diện sáng" }),
  ).toBe(button);
  expect(document.activeElement).toBe(button);
  expect(button.getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByLabelText("Bản nháp").value).toBe("SQL, Python");
  expect(localStorage.getItem("neu-career-theme")).toBe("dark");
  await userEvent.keyboard(" ");
  expect(button.getAttribute("aria-pressed")).toBe("false");
});
it("uses system dark preference without saved choice and saved light overrides it", () => {
  systemDark = true;
  const first = render(
    <ThemeFrame>
      <ThemeToggle />
    </ThemeFrame>,
  );
  expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("true");
  first.unmount();
  localStorage.setItem("neu-career-theme", "light");
  render(
    <ThemeFrame>
      <ThemeToggle />
    </ThemeFrame>,
  );
  expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("false");
});

it("restores circular reveal and cleans up snapshots without duplicating controls", () => {
  const effects = [];
  Element.prototype.animate = vi.fn((frames, options) => {
    const effect = { cancel: vi.fn(), onfinish: null, frames, options };
    effects.push(effect);
    return effect;
  });
  render(
    <ThemeFrame>
      <ThemeToggle />
      <input aria-label="Draft" defaultValue="My resume" />
    </ThemeFrame>,
  );
  fireEvent.click(screen.getByRole("button"));
  const reveal = effects.find((e) => e.options.duration === 700);
  expect(reveal.options.easing).toBe("cubic-bezier(.65,0,.35,1)");
  const overlay = document.querySelector(".u219-reveal");
  expect(overlay.children.length).toBe(2);
  expect(overlay.hasAttribute("inert")).toBe(true);
  expect(screen.getAllByRole("button").length).toBe(1);
  expect(screen.getByRole("textbox", { name: "Draft" }).value).toBe(
    "My resume",
  );
  act(() => reveal.onfinish());
  expect(overlay.children.length).toBe(0);
  delete Element.prototype.animate;
});
it("reduced motion keeps the real hero and action links available without observers", () => {
  reduced = true;
  const observer = vi.fn();
  vi.stubGlobal("IntersectionObserver", observer);
  render(
    <ThemeFrame>
      <HomePage />
    </ThemeFrame>,
  );
  expect(observer).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Phát lại" })).toBeNull();
  expect(
    screen.getByRole("heading", { level: 1 }).getAttribute("aria-label"),
  ).toBe("Phân tích CV. So khớp kỹ năng. Luyện phỏng vấn.");
  expect(document.querySelector('.video-hero-cta[href="#about"]')).toBeTruthy();
  expect(
    [...document.querySelectorAll(".landing-section")].every((el) =>
      el.classList.contains("motion-in"),
    ),
  ).toBe(true);
});
it("preserves guide reveals and autoplays the homepage video", async () => {
  let notify;
  const unobserve = vi.fn();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback, options) {
        notify = callback;
        expect(options.threshold).toBe(0.3);
      }
      observe() {}
      unobserve = unobserve;
      disconnect() {}
    },
  );
  const view = render(
    <ThemeFrame>
      <GuidePage />
    </ThemeFrame>,
  );
  const section = document.querySelector(".landing-section");
  act(() => notify([{ isIntersecting: true, target: section }]));
  expect(section.classList.contains("motion-in")).toBe(true);
  expect(unobserve).toHaveBeenCalledWith(section);
  view.rerender(
    <ThemeFrame>
      <HomePage />
    </ThemeFrame>,
  );
  expect(document.querySelector("video").autoplay).toBe(true);
  expect(
    screen.queryByRole("button", { name: "Tạm dừng chuyển động" }),
  ).toBeNull();
});

it('uses native transitions without remounting forms and handles rapid toggles', async () => {
 const transitions=[];
 const start=vi.fn(callback=>{
  callback();
  const t={ready:Promise.resolve(),finished:new Promise(()=>{}),skipTransition:vi.fn()};
  transitions.push(t);return t;
 });
 document.startViewTransition=start;
 Element.prototype.animate=vi.fn(()=>({cancel:vi.fn()}));
 render(<ThemeFrame><ThemeToggle/><input aria-label="Preserved" defaultValue="SQL"/></ThemeFrame>);
 const field=screen.getByLabelText('Preserved');
 fireEvent.click(screen.getByRole('button'));
 fireEvent.click(screen.getByRole('button'));
 expect(start).toHaveBeenCalledTimes(2);
 expect(transitions[0].skipTransition).toHaveBeenCalled();
 expect(screen.getByLabelText('Preserved')).toBe(field);
 expect(field.value).toBe('SQL');
 expect(document.querySelector('.neu-prompt-only').dataset.theme).toBe('light');
 await act(async()=>{await Promise.resolve()});
 delete document.startViewTransition;
 delete Element.prototype.animate;
});
