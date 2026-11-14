import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CoursesTab from "../src/components/CoursesTab";
import InteractionLayer from "../src/components/InteractionLayer";
import { resetCurriculumCache } from "../src/hooks/useCurriculum";
import { careerApi } from "../src/services/api";
vi.mock("../src/services/api", () => ({
  careerApi: { getCurriculum: vi.fn() },
}));
const course = {
  id: 1,
  code: "NEU01",
  name: "Phân tích dữ liệu",
  major: "CNTT",
  credits: 3,
  description: "Thực hành dữ liệu",
  skills_provided: ["SQL"],
};
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  resetCurriculumCache();
});
it("opens command menu with shortcut, searches and routes using Enter", async () => {
  const navigate = vi.fn();
  render(<InteractionLayer navigate={navigate} />);
  fireEvent.keyDown(window, { key: "k", ctrlKey: true });
  await userEvent.type(screen.getByRole("combobox"), "Tài khoản");
  await userEvent.keyboard("{Enter}");
  expect(navigate).toHaveBeenCalledWith("login");
  expect(screen.queryByRole("dialog")).toBeNull();
});
it("shows skeleton then restores filters with Undo", async () => {
  let resolve;
  careerApi.getCurriculum.mockReturnValue(new Promise((r) => (resolve = r)));
  render(<CoursesTab />);
  expect(
    screen.getByRole("status", { name: "Đang tải danh mục học phần" }),
  ).toBeTruthy();
  await act(async () => resolve({ courses: [course] }));
  const search = screen.getByLabelText("Tìm tên, mã học phần hoặc kỹ năng");
  await userEvent.type(search, "không tồn tại");
  await userEvent.click(screen.getByRole("button", { name: "Xóa bộ lọc" }));
  expect(screen.getByRole("heading", { name: course.name })).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "Hoàn tác" }));
  expect(search.value).toBe("không tồn tại");
  expect(screen.getByText("Chưa tìm thấy học phần")).toBeTruthy();
});
it("keeps stale courses visible while revalidating and after network failure", async () => {
  careerApi.getCurriculum.mockResolvedValueOnce({ courses: [course] });
  const view = render(<CoursesTab />);
  await screen.findByRole("heading", { name: course.name });
  view.unmount();
  let reject;
  careerApi.getCurriculum.mockReturnValue(new Promise((_, r) => (reject = r)));
  render(<CoursesTab />);
  expect(screen.getByRole("heading", { name: course.name })).toBeTruthy();
  expect(screen.getByText("Đang cập nhật danh mục…")).toBeTruthy();
  await act(async () => reject(new Error("Offline")));
  expect(screen.getByRole("heading", { name: course.name })).toBeTruthy();
  expect(screen.getByRole("alert")).toBeTruthy();
});
it("opens and dismisses course details with explicit accessible controls", async () => {
  careerApi.getCurriculum.mockResolvedValue({ courses: [course] });
  render(<CoursesTab />);
  await userEvent.click(
    await screen.findByRole("button", {
      name: `Chi tiết học phần ${course.name}`,
    }),
  );
  expect(screen.getByRole("dialog", { name: course.name })).toBeTruthy();
  await userEvent.click(
    screen.getByRole("button", { name: "Đóng chi tiết học phần" }),
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});
