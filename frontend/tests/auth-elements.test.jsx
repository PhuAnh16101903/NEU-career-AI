import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  render,
  act,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthMotionForm from "../src/components/AuthMotionForm";
import CareerRail from "../src/components/CareerRail";
import { careerApi } from "../src/services/api";
vi.mock("../src/services/api", () => ({
  careerApi: { login: vi.fn(), register: vi.fn() },
}));
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);
it("validates steps, supports editing answers, and only sends the completed student form", async () => {
  const done = vi.fn();
  careerApi.register.mockResolvedValue({ user: { id: "s" } });
  const { container } = render(
    <AuthMotionForm mode="register" onAuthSuccess={done} />,
  );
  const next = () =>
    userEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
  await next();
  expect(screen.getByRole("alert").textContent).toContain("họ và tên");
  expect(careerApi.register).not.toHaveBeenCalled();
  await userEvent.type(screen.getByLabelText("Họ và tên"), "An");
  await next();
  await next();
  await next();
  await userEvent.type(screen.getByLabelText("Email"), "bad");
  await next();
  expect(screen.getByRole("alert").textContent).toContain("email hợp lệ");
  await userEvent.clear(screen.getByLabelText("Email"));
  await userEvent.type(screen.getByLabelText("Email"), "an@neu.edu.vn");
  await next();
  await userEvent.type(screen.getByLabelText("Mật khẩu"), " secret1 ");
  await userEvent.click(screen.getByRole("button", { name: "Sửa Họ và tên" }));
  expect(screen.getByLabelText("Họ và tên").value).toBe("An");
  await next();
  await next();
  await next();
  await next();
  await userEvent.click(screen.getByRole("button", { name: "Tạo tài khoản" }));
  await waitFor(() => expect(done).toHaveBeenCalledWith({ id: "s" }));
  expect(careerApi.register).toHaveBeenCalledTimes(1);
  expect(careerApi.register.mock.calls[0][0]).toMatchObject({
    full_name: "An",
    role: "student",
    password: " secret1 ",
    company_name: null,
  });
  expect(container.querySelector("video")).toBeNull();
});
it("blocks duplicate login submissions, shows server error, and retains typed values", async () => {
  let reject;
  careerApi.login.mockImplementation(() => new Promise((_, r) => (reject = r)));
  const { container } = render(
    <AuthMotionForm mode="login" onAuthSuccess={vi.fn()} />,
  );
  await userEvent.type(screen.getByLabelText("Email"), "an@neu.edu.vn");
  await userEvent.type(screen.getByLabelText("Mật khẩu"), "secret");
  await userEvent.click(screen.getByRole("button", { name: "Hiện mật khẩu" }));
  expect(screen.getByLabelText("Mật khẩu").type).toBe("text");
  fireEvent.submit(container.querySelector("form"));
  fireEvent.submit(container.querySelector("form"));
  expect(careerApi.login).toHaveBeenCalledTimes(1);
  reject({ response: { data: { detail: "Sai thông tin đăng nhập" } } });
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.getByLabelText("Mật khẩu").value).toBe("secret");
});
it("keeps icon links named and supports rail expansion and arrow-key focus", async () => {
  const toggle = vi.fn(),
    tabs = [
      { id: "cv", label: "Phân tích CV", icon: "file" },
      { id: "matching", label: "So khớp", icon: "target" },
    ];
  const { rerender } = render(
    <CareerRail
      wide={false}
      onToggle={toggle}
      tabs={tabs}
      activeTab="cv"
      navigate={vi.fn()}
    />,
  );
  const first = screen.getByRole("link", { name: "Phân tích CV" });
  first.focus();
  await userEvent.keyboard("{ArrowDown}");
  expect(document.activeElement).toBe(
    screen.getByRole("link", { name: "So khớp" }),
  );
  await userEvent.click(screen.getByRole("button", { name: "Mở rộng menu" }));
  expect(toggle).toHaveBeenCalledTimes(1);
  rerender(
    <CareerRail
      wide
      onToggle={toggle}
      tabs={tabs}
      activeTab="matching"
      navigate={vi.fn()}
    />,
  );
  expect(
    screen
      .getByRole("button", { name: "Thu gọn menu" })
      .getAttribute("aria-expanded"),
  ).toBe("true");
  expect(
    screen.getByRole("link", { name: "So khớp" }).getAttribute("aria-current"),
  ).toBe("page");
});

it("shows the success check before handing off once at 650ms", async () => {
  const done = vi.fn();
  careerApi.login.mockResolvedValue({ user: { id: "hr", role: "enterprise" } });
  const { container } = render(
    <AuthMotionForm mode="login" onAuthSuccess={done} />,
  );
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "hr@fpt.com" },
  });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), {
    target: { value: "123456" },
  });
  vi.useFakeTimers();
  try {
    await act(async () => {
      fireEvent.submit(container.querySelector("form"));
    });
    expect(screen.getByRole("button", { name: "Thành công" })).toBeTruthy();
    expect(done).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(649));
    expect(done).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(1));
    expect(done).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledWith({
      id: "hr",
      role: "enterprise",
    });
  } finally {
    vi.useRealTimers();
  }
});
it("does not strand the form in success state if session handoff fails", async () => {
  careerApi.login.mockResolvedValue({ user: { id: "hr", role: "enterprise" } });
  const { container } = render(
    <AuthMotionForm
      mode="login"
      onAuthSuccess={() => {
        throw new Error("handoff");
      }}
    />,
  );
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "hr@fpt.com" },
  });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), {
    target: { value: "123456" },
  });
  fireEvent.submit(container.querySelector("form"));
  await screen.findByRole("alert");
  expect(screen.getByRole("button", { name: "Đăng nhập" }).disabled).toBe(
    false,
  );
  expect(screen.queryByText("Đăng nhập thành công")).toBeNull();
});
