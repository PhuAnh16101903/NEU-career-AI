import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  fireEvent,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";
import { setLanguage, t } from "../src/i18n";
vi.mock("../src/services/api", () => ({
  setAuthToken: vi.fn(),
  careerApi: { login: vi.fn() },
}));
beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  window.history.replaceState(null, "", "/");
  localStorage.clear();
  setLanguage("vi");
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("switches the homepage, headings, controls and document language to English and back", async () => {
  render(<App />);
  await userEvent.click(
    screen.getByRole("button", { name: "Chọn ngôn ngữ: Tiếng Việt" }),
  );
  await userEvent.click(screen.getByRole("option", { name: "English" }));
  expect(
    screen.getByRole("heading", { level: 1 }).getAttribute("aria-label"),
  ).toBe("Analyze your resume. Match your skills. Practice interviews.");
  expect(
    screen.getByRole("link", { name: t("Tìm hiểu công cụ và cách sử dụng") }),
  ).toBeTruthy();
  expect(document.documentElement.lang).toBe("en");
  expect(document.title).toBe("Home · NEU Career AI");
  expect(localStorage.getItem("neu-career-language")).toBe("en");
  await userEvent.click(
    screen.getByRole("button", { name: "Choose language: English" }),
  );
  await userEvent.click(screen.getByRole("option", { name: "Tiếng Việt" }));
  expect(
    screen.getByRole("link", { name: "Tìm hiểu công cụ và cách sử dụng" }),
  ).toBeTruthy();
});
it("preserves login inputs and keyboard focus when changing language", async () => {
  window.history.replaceState(null, "", "/#login");
  render(<App />);
  await userEvent.type(screen.getByLabelText("Email"), "student@neu.edu.vn");
  await userEvent.type(screen.getByLabelText(/^Mật khẩu/), "test-password");
  const switcher = screen.getByRole("button", {
    name: "Chọn ngôn ngữ: Tiếng Việt",
  });
  switcher.focus();
  await userEvent.keyboard("{Enter}");
  await userEvent.keyboard("{ArrowDown}{Enter}");
  expect(document.activeElement).toBe(switcher);
  expect(screen.getByLabelText("Email").value).toBe("student@neu.edu.vn");
  expect(screen.getByLabelText(/^Password/).value).toBe("test-password");
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
    "Welcome back",
  );
});
it("searches command navigation by the translated English label", async () => {
  render(<App />);
  await userEvent.click(
    screen.getByRole("button", { name: "Chọn ngôn ngữ: Tiếng Việt" }),
  );
  await userEvent.click(screen.getByRole("option", { name: "English" }));
  fireEvent.keyDown(window, { key: "k", ctrlKey: true });
  await userEvent.type(screen.getByRole("combobox"), "Account");
  expect(screen.getByRole("option", { name: /Account/ })).toBeTruthy();
  await userEvent.keyboard("{Enter}");
  expect(window.location.hash).toBe("#login");
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
    "Welcome back",
  );
});
it("translates UI messages while preserving dynamic names and backend content", () => {
  act(() => setLanguage("en"));
  expect(t("Xin chào, Nguyễn An.")).toBe("Hello, Nguyễn An.");
  expect(t("Đã ứng tuyển Data Analyst. Độ phù hợp kỹ năng: 80%.")).toBe(
    "Applied for Data Analyst. Skills match: 80%.",
  );
  expect(t("Nguyễn An làm dự án SQL")).toBe("Nguyễn An làm dự án SQL");
});
