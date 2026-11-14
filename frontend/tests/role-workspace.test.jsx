import { StrictMode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";
import BusinessPage from "../src/components/BusinessPage";
import { careerApi, setAuthToken } from "../src/services/api";
vi.mock("../src/services/api", () => ({
  setAuthToken: vi.fn(),
  careerApi: {
    login: vi.fn(),
    getEnterpriseJobs: vi.fn(),
    getAdminStats: vi.fn(),
    getAdminUsers: vi.fn(),
    getAdminJobs: vi.fn(),
    moderateJob: vi.fn(),
    updateUserStatus: vi.fn(),
    getJobCandidates: vi.fn(),
    createEnterpriseJob: vi.fn(),
  },
}));
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  window.history.replaceState(null, "", "/#login");
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  Element.prototype.scrollIntoView = vi.fn();
  careerApi.getEnterpriseJobs.mockResolvedValue([]);
  careerApi.getAdminStats.mockResolvedValue({ total_users: 4 });
  careerApi.getAdminUsers.mockResolvedValue([]);
});
it.each([
  [
    "student",
    [
      "Phân tích CV",
      "So khớp kỹ năng",
      "Phỏng vấn STAR",
      "Học phần NEU",
      "Cơ hội việc làm",
    ],
    "cv",
  ],
  ["enterprise", ["Đăng tuyển", "Tìm ứng viên"], "recruitment"],
  ["admin", ["Tổng quan", "Quản lý người dùng", "Kiểm duyệt tin"], "overview"],
])(
  "gives %s a separate menu, settings above avatar and functional logout below",
  async (role, labels, route) => {
    careerApi.login.mockResolvedValue({
      user: { id: "me", role, full_name: "An", email: "an@example.com" },
    });
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    await userEvent.type(screen.getByLabelText("Email"), "an@example.com");
    await userEvent.type(screen.getByLabelText(/^Mật khẩu/), "secret123");
    await userEvent.click(
      screen.getAllByRole("button", { name: "Đăng nhập" }).at(-1),
    );
    await waitFor(() => expect(location.hash).toBe("#" + route));
    const nav = screen.getByRole("navigation", { name: "Điều hướng chính" });
    expect(
      within(nav)
        .getAllByRole("link")
        .map((a) => a.getAttribute("aria-label")),
    ).toEqual(labels);
    const account = document.querySelector(".u040-account");
    expect(
      [...account.children].map((el) => el.getAttribute("aria-label")),
    ).toEqual(["Cài đặt tài khoản", "Tài khoản", "Đăng xuất"]);
    await userEvent.click(
      screen.getByRole("link", { name: "Cài đặt tài khoản" }),
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Cài đặt tài khoản",
    );
    expect(screen.getByText("an@example.com")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Đổi mật khẩu" }).disabled).toBe(
      true,
    );
    // A typed route from another role cannot expose its page.
    location.hash = role === "admin" ? "candidates" : "users";
    fireEvent(window, new HashChangeEvent("hashchange"));
    await waitFor(() => expect(location.hash).toBe("#" + route));
    await userEvent.click(screen.getByRole("button", { name: "Đăng xuất" }));
    expect(setAuthToken).toHaveBeenCalledWith(null);
    expect(location.hash).toBe("#login");
    expect(
      screen.queryByRole("navigation", { name: "Điều hướng chính" }),
    ).toBeNull();
  },
);
it("keeps a pending job on API failure, then updates it only after approval succeeds", async () => {
  const job = {
    id: "j1",
    title: "Data Analyst",
    company_name: "NEU",
    description: "Analyze data",
    required_skills: ["SQL"],
    status: "pending",
  };
  careerApi.getAdminJobs.mockResolvedValue([job]);
  careerApi.moderateJob
    .mockRejectedValueOnce({
      response: { data: { detail: "Không thể duyệt" } },
    })
    .mockResolvedValueOnce({ ...job, status: "approved" });
  render(
    <BusinessPage user={{ id: "admin", role: "admin" }} view="moderation" />,
  );
  await screen.findByText("Data Analyst");
  fireEvent.change(screen.getByLabelText("Trạng thái"), {
    target: { value: "pending" },
  });
  await userEvent.click(screen.getByRole("button", { name: "Duyệt tin" }));
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Không thể duyệt",
  );
  expect(screen.getByText("Data Analyst")).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "Duyệt tin" }));
  await screen.findByText("Đã cập nhật trạng thái tin tuyển dụng.");
  expect(careerApi.moderateJob).toHaveBeenLastCalledWith("j1", "approved");
  expect(screen.queryByText("Data Analyst")).toBeNull();
  fireEvent.change(screen.getByLabelText("Trạng thái"), {
    target: { value: "approved" },
  });
  expect(screen.getByText("Data Analyst")).toBeTruthy();
});
it("updates a user status using the API and prevents self-locking", async () => {
  const other = {
    id: "sv",
    role: "student",
    full_name: "Bình",
    email: "b@example.com",
    is_active: true,
  };
  const admin = {
    id: "a",
    role: "admin",
    full_name: "Admin",
    email: "a@example.com",
    is_active: true,
  };
  careerApi.getAdminUsers.mockResolvedValue([admin, other]);
  careerApi.updateUserStatus.mockResolvedValue({ ...other, is_active: false });
  render(<BusinessPage user={admin} view="users" />);
  await screen.findByText("Bình");
  expect(
    screen.getAllByRole("button", { name: "Khóa tài khoản" }),
  ).toHaveLength(1);
  await userEvent.click(screen.getByRole("button", { name: "Khóa tài khoản" }));
  await screen.findByRole("button", { name: "Mở khóa" });
  expect(careerApi.updateUserStatus).toHaveBeenCalledWith("sv", false);
});

it("keeps the new job ID when moving from posting to candidates", async () => {
  const user = { id: "hr", role: "enterprise", company_name: "NEU" };
  careerApi.createEnterpriseJob.mockResolvedValue({
    id: "j-new",
    status: "approved",
  });
  careerApi.getJobCandidates.mockResolvedValue([]);
  const { rerender } = render(<BusinessPage user={user} view="recruitment" />);
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Đăng tin tuyển dụng" }).disabled,
    ).toBe(false),
  );
  await userEvent.type(
    screen.getByLabelText("Vị trí tuyển dụng"),
    "Data Analyst",
  );
  await userEvent.type(
    screen.getByLabelText("Mô tả công việc"),
    "Analyze data using SQL and Python.",
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Đăng tin tuyển dụng" }),
  );
  await screen.findByText("Tin tuyển dụng đã được đăng.");
  expect(
    screen.queryByRole("heading", { name: "Ứng viên theo tin tuyển dụng" }),
  ).toBeNull();
  rerender(<BusinessPage user={user} view="candidates" />);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Xem ứng viên" }).disabled).toBe(
      false,
    ),
  );
  expect(screen.getByLabelText("Mã tin tuyển dụng").value).toBe("j-new");
  expect(screen.queryByLabelText("Vị trí tuyển dụng")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Xem ứng viên" }));
  await screen.findByText("Chưa có ứng viên");
  expect(careerApi.getJobCandidates).toHaveBeenCalledWith("j-new");
});
