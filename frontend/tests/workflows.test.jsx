import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CVTab from "../src/components/CVTab";
import MatchingTab from "../src/components/MatchingTab";
import CoursesTab from "../src/components/CoursesTab";
import InterviewTab from "../src/components/InterviewTab";
import AuthTab from "../src/components/AuthTab";
import { careerApi } from "../src/services/api";
vi.mock("../src/services/api", () => ({
  careerApi: {
    uploadCV: vi.fn(),
    matchSkills: vi.fn(),
    getCurriculum: vi.fn(),
    startInterview: vi.fn(),
    sendInterviewAnswer: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    getEnterpriseJobs: vi.fn(),
    getAdminStats: vi.fn(),
    getAdminUsers: vi.fn(),
    createEnterpriseJob: vi.fn(),
    getJobCandidates: vi.fn(),
    applyEnterpriseJob: vi.fn(),
  },
}));
import { resetCurriculumCache } from "../src/hooks/useCurriculum";
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  resetCurriculumCache();
});
describe("Career workflows", () => {
  it("rejects invalid CV files without making a request", () => {
    render(<CVTab onCvParsed={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Chọn file CV"), {
      target: { files: [new File(["x"], "cv.exe")] },
    });
    expect(screen.getByRole("alert").textContent).toContain("PDF");
    expect(careerApi.uploadCV).not.toHaveBeenCalled();
  });
  it("uploads a selected PDF, returns parsed data and handles errors", async () => {
    const parsed = { full_name: "Nguyễn Văn An", skills: [] };
    careerApi.uploadCV.mockResolvedValueOnce(parsed).mockRejectedValueOnce({
      response: { data: { detail: "File vượt quá 5MB" } },
    });
    const done = vi.fn();
    render(<CVTab onCvParsed={done} />);
    const file = new File(["pdf"], "cv.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Chọn file CV"), {
      target: { files: [file] },
    });
    await userEvent.click(screen.getByRole("button", { name: "Phân tích CV" }));
    await waitFor(() => expect(done).toHaveBeenCalledWith(parsed));
    expect(careerApi.uploadCV).toHaveBeenCalledWith(file);
    await userEvent.click(screen.getByRole("button", { name: "Phân tích CV" }));
    expect((await screen.findByRole("alert")).textContent).toContain("5MB");
  });
  it("prefills CV skills, submits distinct skills and renders match results", async () => {
    careerApi.matchSkills.mockResolvedValue({
      overall_match_percentage: 72,
      requirements_source: "role_preset",
      matched_skills: ["SQL"],
      missing_skills: ["Python"],
      unrecognized_skills: [],
      radar_chart_data: [
        {
          category_name: "Công cụ",
          candidate_score: 50,
          job_requirement_score: 100,
        },
      ],
      recommended_neu_courses: [
        {
          course_code: "NEU01",
          course_name: "Phân tích dữ liệu",
          credits: 3,
          skills_covered: ["Python"],
          reason: "Bổ sung Python",
        },
      ],
      general_advice: "Luyện tập thêm Python.",
    });
    render(<MatchingTab cvData={{ skills: [{ name: "SQL" }] }} />);
    await userEvent.type(
      screen.getByLabelText("Vị trí bạn muốn ứng tuyển"),
      "Data Analyst",
    );
    fireEvent.change(screen.getByLabelText("Kỹ năng hiện có"), {
      target: { value: "SQL, SQL\nExcel" },
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Khám phá độ phù hợp" }),
    );
    await screen.findByText("72");
    expect(careerApi.matchSkills).toHaveBeenCalledWith({
      jobTitle: "Data Analyst",
      jobDescription: "",
      candidateSkills: ["SQL", "Excel"],
    });
    expect(screen.getByText("Phân tích dữ liệu")).toBeTruthy();
  });
  it("filters courses without Vietnamese accents and clears empty search", async () => {
    careerApi.getCurriculum.mockResolvedValue({
      courses: [
        {
          id: "1",
          name: "Phân tích dữ liệu",
          code: "NEU01",
          major: "Kinh tế",
          credits: 3,
          description: "Phân tích dữ liệu kinh doanh",
          skills_provided: ["SQL"],
        },
      ],
    });
    render(<CoursesTab />);
    await screen.findByRole("heading", { name: "Phân tích dữ liệu" });
    const input = screen.getByLabelText("Tìm tên, mã học phần hoặc kỹ năng");
    await userEvent.type(input, "phan tich");
    expect(screen.getByText("1 học phần phù hợp")).toBeTruthy();
    await userEvent.clear(input);
    await userEvent.type(input, "not-found");
    expect(screen.getByText("Chưa tìm thấy học phần")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Xóa bộ lọc" }));
    expect(screen.getByText("1 học phần phù hợp")).toBeTruthy();
  });
  it("offers retry when curriculum is offline", async () => {
    careerApi.getCurriculum
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ courses: [] });
    render(<CoursesTab />);
    await screen.findByRole("alert");
    await userEvent.click(screen.getByRole("button", { name: "Thử tải lại" }));
    await screen.findByText("0 học phần phù hợp");
    expect(careerApi.getCurriculum).toHaveBeenCalledTimes(2);
  });
  it("keeps an unsent interview answer after failure then shows STAR evaluation", async () => {
    careerApi.startInterview.mockResolvedValue({
      session_id: "s1",
      interviewer_reply: "Hãy giới thiệu bản thân.",
      is_mock: true,
    });
    careerApi.sendInterviewAnswer
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({
        session_id: "s1",
        interviewer_reply: "Cảm ơn bạn.",
        is_finished: true,
        overall_summary: "Đã hoàn thành.",
        current_evaluation: {
          situation_score: 7,
          task_score: 8,
          action_score: 9,
          result_score: 6,
          feedback: "Hãy nêu kết quả cụ thể.",
        },
      });
    render(<InterviewTab />);
    await userEvent.type(screen.getByLabelText("Tên của bạn"), "An");
    await userEvent.type(
      screen.getByLabelText("Vị trí phỏng vấn"),
      "Data Analyst",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Bắt đầu phỏng vấn" }),
    );
    await screen.findByText(/Chế độ mô phỏng/);
    await userEvent.type(
      screen.getByLabelText("Câu trả lời của bạn"),
      "Em đã làm dự án phân tích dữ liệu.",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Gửi câu trả lời" }),
    );
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Câu trả lời của bạn").value).toContain(
      "Em đã làm",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Gửi câu trả lời" }),
    );
    await screen.findByText("Bạn đã hoàn thành buổi luyện tập");
    expect(screen.getByLabelText("Điểm Hành động").value).toBe(9);
    expect(careerApi.sendInterviewAnswer).toHaveBeenLastCalledWith(
      "s1",
      "Em đã làm dự án phân tích dữ liệu.",
    );
  });
  it("logs in using entered credentials and reports API rejection", async () => {
    const done = vi.fn();
    careerApi.login
      .mockRejectedValueOnce({
        response: { data: { detail: "Thông tin đăng nhập không đúng" } },
      })
      .mockResolvedValueOnce({
        user: { id: "1", full_name: "An", role: "student" },
      });
    render(<AuthTab onAuthSuccess={done} />);
    await userEvent.type(screen.getByLabelText("Email"), "an@example.com");
    await userEvent.type(screen.getByLabelText(/^Mật khẩu/), "secret1");
    await userEvent.click(
      screen.getAllByRole("button", { name: "Đăng nhập" }).at(-1),
    );
    await screen.findByRole("alert");
    await userEvent.click(
      screen.getAllByRole("button", { name: "Đăng nhập" }).at(-1),
    );
    await waitFor(() =>
      expect(done).toHaveBeenCalledWith({
        id: "1",
        full_name: "An",
        role: "student",
      }),
    );
  });
  it("registers enterprise with company details", async () => {
    const done = vi.fn();
    careerApi.register.mockResolvedValue({
      user: { id: "2", role: "enterprise" },
    });
    render(<AuthTab onAuthSuccess={done} />);
    await userEvent.click(screen.getByRole("button", { name: "Đăng ký" }));
    await userEvent.type(screen.getByLabelText("Họ và tên"), "HR");
    await userEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    await userEvent.selectOptions(
      screen.getByLabelText("Bạn là"),
      "enterprise",
    );
    await userEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    await userEvent.type(
      screen.getByLabelText("Tên doanh nghiệp"),
      "Công ty A",
    );
    await userEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    await userEvent.type(screen.getByLabelText("Email"), "hr@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    await userEvent.type(screen.getByLabelText(/^Mật khẩu/), "secret1");
    await userEvent.click(
      screen.getByRole("button", { name: "Tạo tài khoản" }),
    );
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(careerApi.register).toHaveBeenCalledWith({
      email: "hr@example.com",
      password: "secret1",
      full_name: "HR",
      role: "enterprise",
      company_name: "Công ty A",
      student_major: null,
    });
  });
  it("shows the admin statistics and user status", async () => {
    careerApi.getAdminStats.mockResolvedValue({
      total_users: 12,
      total_students: 10,
      total_enterprises: 1,
      total_jobs: 2,
      pending_jobs: 1,
      total_interviews: 4,
    });
    careerApi.getAdminUsers.mockResolvedValue([
      {
        id: "u1",
        full_name: "Sinh viên kiểm thử",
        email: "test@example.com",
        role: "student",
        is_active: true,
      },
    ]);
    render(
      <AuthTab
        currentUser={{
          id: "a1",
          role: "admin",
          full_name: "Admin",
          email: "admin@example.com",
        }}
      />,
    );
    await screen.findByText("Sinh viên kiểm thử");
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("Hoạt động")).toBeTruthy();
  });
});
