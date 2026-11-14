import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";
import { careerApi } from "../src/services/api";
vi.mock("../src/services/api", () => ({
  setAuthToken: vi.fn(),
  careerApi: { login: vi.fn() },
}));
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  window.history.replaceState(null, "", "/");
});
it("opens the separate homepage by default and autoplays its video without a motion toggle", async () => {
  render(<App />);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
    "Luyện phỏng vấn.",
  );
  expect(
    screen.queryByRole("navigation", { name: "Điều hướng chính" }),
  ).toBeNull();
  expect(document.querySelector("video").autoplay).toBe(true);
  expect(
    screen.queryByRole("button", { name: "Tạm dừng chuyển động" }),
  ).toBeNull();
});
it("opens a dedicated login page without workspace sidebar", () => {
  window.history.replaceState(null, "", "/#login");
  render(<App />);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
    "Chào mừng bạn trở lại",
  );
  expect(
    screen.getByRole("link", { name: "← Về trang chủ" }).getAttribute("href"),
  ).toBe("#home");
  expect(
    screen.queryByRole("navigation", { name: "Điều hướng chính" }),
  ).toBeNull();
});
it("supports direct registration links and switching back to login", async () => {
  window.history.replaceState(null, "", "/#register");
  render(<App />);
  expect(screen.getByLabelText("Họ và tên")).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
  await waitFor(() => expect(window.location.hash).toBe("#login"));
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
    "Chào mừng bạn trở lại",
  );
});
it("navigates to the career workspace after successful student login", async () => {
  window.history.replaceState(null, "", "/#login");
  careerApi.login.mockResolvedValue({
    user: {
      id: "student1",
      role: "student",
      full_name: "An",
      email: "an@example.com",
    },
  });
  render(<App />);
  await userEvent.type(screen.getByLabelText("Email"), "an@example.com");
  await userEvent.type(screen.getByLabelText(/^Mật khẩu/), "secret123");
  await userEvent.click(
    screen.getAllByRole("button", { name: "Đăng nhập" }).at(-1),
  );
  await waitFor(() => expect(window.location.hash).toBe("#cv"));
  expect(
    screen.getByRole("navigation", { name: "Điều hướng chính" }),
  ).toBeTruthy();
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
    "Khởi đầu từ chiếc CV của bạn.",
  );
});
it("expands and closes the mobile navigation with an accessible control", async () => {
  render(<App />);
  // jsdom has no media-query layout; query DOM for the responsive control.
  const menu = document.querySelector(".mobile-menu-button");
  await userEvent.click(menu);
  expect(menu.getAttribute("aria-expanded")).toBe("true");
  await userEvent.click(menu);
  expect(menu.getAttribute("aria-expanded")).toBe("false");
});

it("keeps homepage separate and routes informational links to the guide page", async () => {
  render(<App />);
  expect(document.getElementById("career-features")).toBeNull();
  expect(document.getElementById("career-how")).toBeNull();
  await userEvent.click(screen.getByRole("link", { name: "Giới thiệu" }));
  expect(window.location.hash).toBe("#about");
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
    "Giới thiệu NEU Career AI",
  );
  expect(document.getElementById("career-features")).toBeTruthy();
  expect(document.getElementById("career-how")).toBeTruthy();
  expect(document.querySelector(".u216-body")).toBeNull();
  await userEvent.click(screen.getByRole("link", { name: "Cách bắt đầu" }));
  await waitFor(() =>
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled(),
  );
  expect(window.location.hash).toBe("#getting-started");
  await userEvent.click(screen.getByRole("link", { name: "Trang chủ" }));
  expect(document.getElementById("career-features")).toBeNull();
});
it("supports direct guide routes without showing the workspace sidebar", () => {
  window.history.replaceState(null, "", "/#tools");
  render(<App />);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
    "Giới thiệu NEU Career AI",
  );
  expect(
    screen.queryByRole("navigation", { name: "Điều hướng chính" }),
  ).toBeNull();
  expect(
    screen.getByRole("link", { name: "Công cụ" }).getAttribute("aria-current"),
  ).toBe("page");
});
it("links About NEU to the exact supplied URL in a new tab", () => {
  render(<App />);
  const link = screen.getByRole("link", { name: /Về NEU/ });
  expect(link.getAttribute("href")).toBe(
    "https://neu.edu.vn/he-thong-nhan-dien/",
  );
  expect(link.getAttribute("target")).toBe("_blank");
  expect(link.getAttribute("rel")).toContain("noopener");
});

it.each(['home','about','tools','getting-started','login','register','cv','matching','interview'])('switches theme in both directions directly on #%s', async (route) => {
 localStorage.clear();
 window.history.replaceState(null,'',`/#${route}`);
 render(<App />);
 const button=screen.getByRole('button',{name:'Chuyển sang giao diện tối'});
 await userEvent.click(button);
 expect(button.getAttribute('aria-pressed')).toBe('true');
 expect(document.querySelector('.neu-prompt-only').dataset.theme).toBe('dark');
 await userEvent.click(button);
 expect(button.getAttribute('aria-pressed')).toBe('false');
 expect(localStorage.getItem('neu-career-theme')).toBe('light');
});
