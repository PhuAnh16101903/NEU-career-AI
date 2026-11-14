import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LanguageSwitch from "../src/components/LanguageSwitch";
import LanguageText from "../src/components/LanguageText";
import { setLanguage } from "../src/i18n";
beforeEach(() => setLanguage("vi"));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
it.each(["light", "dark"])(
  "supports selection, Escape and outside dismissal in %s theme",
  async (theme) => {
    render(
      <div className="u219 neu-prompt-only" data-theme={theme}>
        <LanguageSwitch />
        <button>Outside</button>
      </div>,
    );
    const trigger = screen.getByRole("button", {
      name: "Chọn ngôn ngữ: Tiếng Việt",
    });
    expect(screen.queryByRole("listbox")).toBeNull();
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(
      screen.getByRole("option", { name: "Tiếng Việt" }),
    );
    await userEvent.keyboard("{End}{Enter}");
    expect(document.documentElement.lang).toBe("en");
    expect(document.activeElement).toBe(trigger);
    expect(screen.queryByRole("listbox")).toBeNull();
    await userEvent.click(trigger);
    expect(
      screen
        .getByRole("option", { name: "English" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    await userEvent.keyboard("{Escape}");
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    await userEvent.click(trigger);
    fireEvent.pointerDown(screen.getByText("Outside"));
    expect(screen.queryByRole("listbox")).toBeNull();
  },
);
it("finishes the latest text after rapid interrupted language changes", () => {
  vi.useFakeTimers();
  const { container, unmount } = render(
    <LanguageText text="Trang chủ" order={2} />,
  );
  act(() => setLanguage("en"));
  act(() => vi.advanceTimersByTime(90));
  expect(container.firstChild.classList.contains("is-go")).toBe(true);
  act(() => vi.advanceTimersByTime(260));
  expect(container.textContent).toBe("Home");
  act(() => setLanguage("vi"));
  act(() => vi.runAllTimers());
  expect(container.textContent).toBe("Trang chủ");
  expect(container.firstChild.classList.contains("is-in")).toBe(false);
  act(() => setLanguage("en"));
  // Flush jsdom's zero-delay storage event, leaving only animation timers.
  act(() => vi.advanceTimersByTime(0));
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
it("shows final text immediately with reduced motion", () => {
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  const { container } = render(<LanguageText text="Trang chủ" order={9} />);
  act(() => setLanguage("en"));
  expect(container.textContent).toBe("Home");
  expect(container.firstChild.classList.contains("is-go")).toBe(false);
  vi.unstubAllGlobals();
});
