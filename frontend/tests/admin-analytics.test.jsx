import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminAnalytics from "../src/components/AdminAnalytics";
import { jobTimeBuckets, overviewSeries } from "../src/components/adminChartData";

afterEach(cleanup);

const stats = {
  total_users: 15, total_students: 10, total_enterprises: 4, total_admins: 1,
  total_jobs: 8, approved_jobs: 5, pending_jobs: 2,
  total_applications: 21, total_interviews: 9,
};

it("uses actual totals and derives the rejected count without fabricated metrics", () => {
  const values = overviewSeries(stats);
  expect(values.users.map((item) => item.value)).toEqual([10, 4, 1]);
  expect(values.jobs.map((item) => item.value)).toEqual([5, 2, 1]);
  expect(values.operations.map((item) => item.value)).toEqual([21, 9]);
  expect(overviewSeries(null)).toBe(null);
});

it("groups real job created_at values without changing the all-time stats", () => {
  const result = jobTimeBuckets([
    { id: "a", created_at: "2026-11-17T09:00:00" },
    { id: "b", created_at: "2026-11-17T14:30:00" },
    { id: "c", created_at: "2026-11-10T10:00:00" },
    { id: "d", created_at: null },
  ], 7, new Date("2026-11-17T17:00:00"));
  expect(result).toHaveLength(7);
  expect(result.reduce((sum, item) => sum + item.value, 0)).toBe(2);
  expect(result.at(-1).value).toBe(2);
});

it("shows admin real-value charts and keyboard-accessible controls", async () => {
  const jobs = [
    { id: "a", status: "approved", created_at: new Date().toISOString() },
    { id: "b", status: "pending", created_at: new Date().toISOString() },
  ];

  const user = userEvent.setup();
  render(<AdminAnalytics stats={stats} jobs={jobs} />);

  expect(
    screen.getByRole("heading", { name: "Cơ cấu hệ thống" }),
  ).toBeTruthy();

  expect(
    screen.getByRole("group", { name: /Biểu đồ tròn:/ }),
  ).toBeTruthy();

  const studentLegend = screen
    .getAllByRole("button", { name: /Sinh viên/ })
    .find((element) => element.tagName === "BUTTON");

  expect(studentLegend).toBeTruthy();
  await user.click(studentLegend);

  expect(
    screen.getByRole("button", {
      name: "Sinh viên: 10 (66.7%)",
    }),
  ).toBeTruthy();

  await user.click(screen.getByRole("button", { name: "7 ngày" }));

  expect(
    screen.getByRole("button", { name: "7 ngày" }).getAttribute("aria-pressed"),
  ).toBe("true");

  const trend = screen.getByRole("group", {
    name: "Biểu đồ đường số tin đăng trong 7 ngày",
  });

  expect(within(trend).getAllByRole("button")).toHaveLength(7);
});

it("renders stats even if timeline API data cannot be fetched", () => {
  render(<AdminAnalytics stats={stats} jobs={null} jobsError="Kết nối lỗi" />);

  expect(
    screen.getByRole("heading", { name: "Cơ cấu hệ thống" }),
  ).toBeTruthy();

  expect(
    screen.getByText(/Không tải được dữ liệu tin tuyển dụng.*Kết nối lỗi/),
  ).toBeTruthy();
});
