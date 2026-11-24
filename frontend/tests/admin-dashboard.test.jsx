
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  getAIUsageStats: vi.fn(),
  getAIUsageByFeature: vi.fn(),
  getAIUsageLogs: vi.fn(),
}));

vi.mock("../src/services/api", () => ({
  careerApi: mocks,
}));

import AdminDashboard from "../src/components/AdminDashboard";

afterEach(() => {
  cleanup();
});

const mockStats = {
  total_requests: 100,
  successful_requests: 90,
  failed_requests: 10,
  success_rate: 90,
  prompt_tokens: 12000,
  completion_tokens: 8000,
  total_tokens: 20000,
  average_latency_ms: 1250,
  estimated_cost_usd: 0.025,
};

const mockFeatures = [
  {
    feature: "cv",
    total_requests: 40,
    successful_requests: 38,
    failed_requests: 2,
    total_tokens: 8000,
    average_latency_ms: 1000,
  },
  {
    feature: "career_advisor",
    total_requests: 60,
    successful_requests: 52,
    failed_requests: 8,
    total_tokens: 12000,
    average_latency_ms: 1500,
  },
];

const mockLogs = [
  {
    id: "log-1",
    provider: "Google",
    model: "gemini-test",
    feature: "cv",
    status: "success",
    prompt_tokens: 100,
    completion_tokens: 200,
    total_tokens: 300,
    latency_ms: 1200,
    error_type: null,
    created_at: "2026-11-23T01:00:00",
  },
  {
    id: "log-2",
    provider: "Google",
    model: "gemini-test",
    feature: "interview",
    status: "failed",
    prompt_tokens: 150,
    completion_tokens: 0,
    total_tokens: 150,
    latency_ms: 800,
    error_type: "LLMError",
    created_at: "2026-11-23T02:00:00",
  },
];

function mockLogsResponse(items = mockLogs, total = 2) {
  return {
    items,
    total,
    page: 1,
    page_size: 10,
  };
}

function setupSuccessfulApis() {
  mocks.getAIUsageStats.mockResolvedValue(mockStats);
  mocks.getAIUsageByFeature.mockResolvedValue(mockFeatures);
  mocks.getAIUsageLogs.mockResolvedValue(mockLogsResponse());
}

beforeEach(() => {
  vi.clearAllMocks();
  setupSuccessfulApis();
});

it("shows loading state before dashboard data is available", () => {
  mocks.getAIUsageStats.mockReturnValue(new Promise(() => {}));

  render(<AdminDashboard />);

  expect(
    screen.getByText("Đang tải dữ liệu Dashboard..."),
  ).toBeTruthy();
});

it("calls all three AI Usage APIs when mounted", async () => {
  render(<AdminDashboard />);

  await waitFor(() => {
    expect(mocks.getAIUsageStats).toHaveBeenCalledTimes(1);
    expect(mocks.getAIUsageByFeature).toHaveBeenCalledTimes(1);
    expect(mocks.getAIUsageLogs).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
      feature: "",
      status: "",
    });
  });
});

it("renders all dashboard statistics correctly", async () => {
  render(<AdminDashboard />);

  expect(await screen.findByText("AI Usage Dashboard")).toBeTruthy();

  expect(screen.getByText("100")).toBeTruthy();
  expect(screen.getByText("90")).toBeTruthy();
  expect(screen.getByText("10")).toBeTruthy();
  expect(screen.getByText("20.000")).toBeTruthy();
  expect(screen.getByText("1250 ms")).toBeTruthy();
  expect(screen.getByText("$0.0250")).toBeTruthy();
});

it("renders feature statistics and AI usage logs", async () => {
  render(<AdminDashboard />);

  const cvLabels = await screen.findAllByText("Phân tích CV");
  expect(cvLabels).toHaveLength(3);

  const advisorLabels = await screen.findAllByText("Định hướng nghề nghiệp");
  expect(advisorLabels).toHaveLength(2);

  const logTable = screen
    .getByRole("heading", { name: "Lịch sử sử dụng AI" })
    .closest(".career-card");

  expect(logTable).toBeTruthy();

  expect(within(logTable).getAllByText("gemini-test")).toHaveLength(2);
  expect(within(logTable).getByText("LLMError")).toBeTruthy();

  const successStatus = logTable.querySelector(".admin-status.is-success");
  const failedStatus = logTable.querySelector(".admin-status.is-failed");

  expect(successStatus).toBeTruthy();
  expect(successStatus.textContent).toBe("Thành công");

  expect(failedStatus).toBeTruthy();
  expect(failedStatus.textContent).toBe("Thất bại");
});

it("filters logs by feature and status", async () => {
  const user = userEvent.setup();

  render(<AdminDashboard />);

  await screen.findAllByText("gemini-test");

  const selects = screen.getAllByRole("combobox");

  await user.selectOptions(selects[0], "cv");

  await waitFor(() => {
    expect(mocks.getAIUsageLogs).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 10,
      feature: "cv",
      status: "",
    });
  });

  await user.selectOptions(selects[1], "failed");

  await waitFor(() => {
    expect(mocks.getAIUsageLogs).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 10,
      feature: "cv",
      status: "failed",
    });
  });
});

it("supports pagination", async () => {
  const user = userEvent.setup();

  mocks.getAIUsageLogs.mockResolvedValue(mockLogsResponse(mockLogs, 25));

  render(<AdminDashboard />);

  await screen.findAllByText("gemini-test");

  expect(screen.getByText("Trang 1 / 3")).toBeTruthy();

  await user.click(screen.getByRole("button", { name: "Trang sau" }));

  await waitFor(() => {
    expect(mocks.getAIUsageLogs).toHaveBeenLastCalledWith({
      page: 2,
      pageSize: 10,
      feature: "",
      status: "",
    });
  });

  expect(await screen.findByText("Trang 2 / 3")).toBeTruthy();
});

it("shows an error message when dashboard APIs fail", async () => {
  mocks.getAIUsageStats.mockRejectedValue({
    response: {
      data: {
        detail: "Không có quyền truy cập",
      },
    },
  });

  render(<AdminDashboard />);

  expect(await screen.findByText("Không có quyền truy cập")).toBeTruthy();
});

it("keeps available dashboard data when one API fails", async () => {
  mocks.getAIUsageStats.mockRejectedValue(new Error("Stats API failed"));

  render(<AdminDashboard />);

  const featureHeading = await screen.findByRole("heading", {
    name: "Thống kê theo tính năng",
  });

  const featureCard = featureHeading.closest(".career-card");

  expect(featureCard).toBeTruthy();
  expect(within(featureCard).getByText("Phân tích CV")).toBeTruthy();
  expect(within(featureCard).getByText("Định hướng nghề nghiệp")).toBeTruthy();

  const logHeading = screen.getByRole("heading", {
    name: "Lịch sử sử dụng AI",
  });

  const logCard = logHeading.closest(".career-card");

  expect(logCard).toBeTruthy();
  expect(within(logCard).getAllByText("gemini-test")).toHaveLength(2);
});
