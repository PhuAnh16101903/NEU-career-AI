import { t as tr, useLocale as useUiLanguage } from "../i18n";
import { useEffect, useRef, useState } from "react";
import { careerApi } from "../services/api";
import { Empty, ErrorNotice, Icon, PageHead, errorText } from "./UI";
const INTERVIEW_STORAGE_KEY = "neu-career-interview-session";

function buildRestoredSession(data) {
  const history = Array.isArray(data.history) ? data.history : [];
  const evaluations = Array.isArray(data.evaluations)
    ? data.evaluations
    : [];

  const messages = history
    .map((item) => ({
      who:
        item.role === "assistant" || item.role === "ai"
          ? "ai"
          : "you",
      text: item.content ?? item.text ?? "",
      pending: false,
    }))
    .filter((item) => item.text);

  const isMock = history.some(
    (item) =>
      (item.role === "assistant" || item.role === "ai") &&
      item.is_mock === true,
  );

  let overallSummary = null;

  if (data.is_finished && evaluations.length > 0) {
    const scoreKeys = [
      "situation_score",
      "task_score",
      "action_score",
      "result_score",
    ];

    const total = evaluations.reduce(
      (sum, item) =>
        sum +
        scoreKeys.reduce(
          (score, key) => score + (Number(item[key]) || 0),
          0,
        ),
      0,
    );

    const average = (
      total /
      (evaluations.length * scoreKeys.length)
    ).toFixed(1);

    overallSummary =
      `Điểm STAR trung bình qua ${evaluations.length} câu trả lời: ${average}/10.`;
  }

  return {
    session_id: data.session_id,
    candidate_name: data.candidate_name,
    target_role: data.target_role,
    turn_index: data.turn_index,
    is_finished: data.is_finished,
    is_mock: isMock,
    overall_summary: overallSummary,
  };
}
export default function InterviewTab() {
  useUiLanguage();
  const [name, setName] = useState(""),
    [role, setRole] = useState(""),
    [session, setSession] = useState(null),
    [messages, setMessages] = useState([]),
    [answer, setAnswer] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [evaluation, setEvaluation] = useState(null);
  const log = useRef(null),
    inFlight = useRef(false),
    messageId = useRef(0);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages, busy]);
  useEffect(() => {
    const savedSessionId = localStorage.getItem(INTERVIEW_STORAGE_KEY);
    if (!savedSessionId) return;

    let active = true;

    async function restoreSession() {
      setBusy(true);
      setError("");

      try {
        const data = await careerApi.getInterviewSession(savedSessionId);

        if (!active) return;

        const restoredSession = buildRestoredSession(data);

        setSession(restoredSession);
        setName(data.candidate_name ?? "");
        setRole(data.target_role ?? "");
        setMessages(
          (Array.isArray(data.history) ? data.history : [])
            .map((item) => ({
              who:
                item.role === "assistant" || item.role === "ai"
                  ? "ai"
                  : "you",
              text: item.content ?? item.text ?? "",
              pending: false,
            }))
            .filter((item) => item.text),
        );

        const evaluations = Array.isArray(data.evaluations)
          ? data.evaluations
          : [];

        setEvaluation(evaluations.at(-1) ?? null);
      } catch (e) {
        if (!active) return;

        // Chỉ xóa ID nếu backend xác nhận phiên không tồn tại.
        if (e.response?.status === 404) {
          localStorage.removeItem(INTERVIEW_STORAGE_KEY);
        } else {
          setError(errorText(e));
        }
      } finally {
        if (active) setBusy(false);
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, []);
  async function start(e) {
    e.preventDefault();
    if (busy) return;
    if (!name.trim() || !role.trim()) return;
    setBusy(true);
    setError("");
    try {
      const d = await careerApi.startInterview(name.trim(), role.trim());
      if (d.session_id) {
        localStorage.setItem(INTERVIEW_STORAGE_KEY, d.session_id);
      }
      setSession(d);
      setMessages([
        {
          who: "ai",
          text: d.interviewer_reply,
        },
      ]);
      setEvaluation(d.current_evaluation);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function send(e) {
    e.preventDefault();
    if (!answer.trim() || busy || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    const text = answer.trim();
    const pendingId = ++messageId.current;
    setMessages((m) => [
      ...m,
      {
        who: "you",
        text,
        pending: true,
        id: pendingId,
      },
    ]);
    try {
      const d = await careerApi.sendInterviewAnswer(session.session_id, text);
      setMessages((m) => [
        ...m.map((message) =>
          message.id === pendingId
            ? {
                ...message,
                pending: false,
              }
            : message,
        ),
        {
          who: "ai",
          text: d.interviewer_reply,
        },
      ]);
      setSession(d);
      if (d.current_evaluation) setEvaluation(d.current_evaluation);
      setAnswer("");
    } catch (e) {
      setMessages((m) => m.filter((message) => message.id !== pendingId));
      setError(errorText(e));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <PageHead visual="interview"
        eyebrow={tr("LUYỆN TẬP HÔM NAY · TỰ TIN NGÀY MAI")}
        title={tr("Kể câu chuyện của bạn thật thuyết phục.")}
      >
        {tr(
          "Luyện trả lời phỏng vấn theo STAR: Bối cảnh, Nhiệm vụ, Hành động và Kết quả.",
        )}
      </PageHead>
      <div className="interview-grid">
        <section className="panel chat-panel">
          <div className="panel-heading">
            <div>
              <h2>{tr("Phòng phỏng vấn")}</h2>
              <p>
                {tr(session ? role : "Chuẩn bị cho cuộc trò chuyện tiếp theo.")}
              </p>
            </div>
            <span className="badge">
              {tr(
                session?.is_finished
                  ? "Hoàn thành"
                  : session
                    ? "Đang luyện tập"
                    : "Sẵn sàng",
              )}
            </span>
          </div>
          {!session ? (
            <form onSubmit={start}>
              <Empty icon="chat" title={tr("Một không gian để thử sức")}>
                {tr(
                  "Chọn vị trí mục tiêu. Bạn có thể dành thời gian suy nghĩ trước mỗi câu trả lời.",
                )}
              </Empty>
              <label>
                {tr("Tên của bạn")}
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={tr("Bạn muốn được gọi là gì?")}
                />
              </label>
              <label>
                {tr("Vị trí phỏng vấn")}
                <input
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder={tr("Ví dụ: Business Analyst")}
                />
              </label>
              <button className="button primary full" disabled={busy}>
                {tr(busy ? "Đang chuẩn bị…" : "Bắt đầu phỏng vấn")}
                <Icon name="arrow" size={18} />
              </button>
            </form>
          ) : (
            <>
              {tr(
                session.is_mock && (
                  <div className="notice">
                    {tr(
                      "Chế độ mô phỏng: câu hỏi và điểm số chưa do AI thật sinh ra.",
                    )}
                  </div>
                ),
              )}
              <div
                className="chat-log"
                role="log"
                aria-label={tr("Cuộc phỏng vấn")}
                ref={log}
              >
                {messages.map((m, i) => (
                  <div className={`message ${m.who}`} key={i}>
                    <span className="message-label">
                      {tr(m.who === "ai" ? "Người phỏng vấn" : "Bạn")}
                    </span>
                    <p>{tr(m.text)}</p>
                    {tr(m.pending && <small>{tr("Đang gửi…")}</small>)}
                  </div>
                ))}
                {tr(
                  busy && <p role="status">{tr("Đang xử lý câu trả lời…")}</p>,
                )}
              </div>
              {session.is_finished ? (
                <div className="interview-summary">
                  <h3>{tr("Bạn đã hoàn thành buổi luyện tập")}</h3>
                  <p>{tr(session.overall_summary)}</p>
                  <button
                    className="button secondary"
                    onClick={() => {
                      localStorage.removeItem(INTERVIEW_STORAGE_KEY);
                      setSession(null);
                      setEvaluation(null);
                      setMessages([]);
                      setAnswer("");
                      setError("");
                    }}
                  >
                    {tr("Luyện tập buổi mới")}
                  </button>
                </div>
              ) : (
                <form onSubmit={send} className="answer-form">
                  <label>
                    {tr("Câu trả lời của bạn")}
                    <textarea
                      rows="4"
                      disabled={busy}
                      maxLength={5000}
                      required
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder={tr(
                        "Mô tả một tình huống cụ thể và những gì bạn đã làm…",
                      )}
                    />
                  </label>
                  <div className="form-bottom">
                    <span className="helper">
                      {tr(answer.length)}
                      {tr("/5.000 ký tự")}
                    </span>
                    <button
                      className="button primary"
                      disabled={busy || !answer.trim()}
                    >
                      {tr("Gửi câu trả lời")}
                      <Icon name="arrow" size={17} />
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
          <ErrorNotice message={error} />
        </section>
        <aside className="panel">
          <span className="eyebrow">{tr("KHUNG TRẢ LỜI STAR")}</span>
          <h2>{tr("Cấu trúc tạo khác biệt.")}</h2>
          {[
            ["S", "Bối cảnh", "situation_score", "Chuyện gì đã xảy ra?"],
            ["T", "Nhiệm vụ", "task_score", "Bạn cần đạt mục tiêu gì?"],
            ["A", "Hành động", "action_score", "Cụ thể bạn đã làm gì?"],
            ["R", "Kết quả", "result_score", "Kết quả và bài học là gì?"],
          ].map(([letter, title, key, hint]) => (
            <div className="star-row" key={letter}>
              <span className="star-letter">{tr(letter)}</span>
              <div>
                <h3>{tr(title)}</h3>
                <p>{tr(hint)}</p>
                {tr(
                  evaluation && (
                    <progress
                      value={evaluation[key]}
                      max="10"
                      aria-label={tr(`Điểm ${title}`)}
                    />
                  ),
                )}
              </div>
              <strong>{tr(evaluation ? `${evaluation[key]}/10` : "—")}</strong>
            </div>
          ))}
          <div className="notice">
            <strong>
              {tr(evaluation ? "Nhận xét câu trả lời" : "Một gợi ý nhỏ")}
            </strong>
            <p>
              {tr(
                evaluation?.feedback ||
                  "Dùng ví dụ thật từ môn học, hoạt động ngoại khóa hoặc thực tập. Nêu rõ đóng góp của chính bạn.",
              )}
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
