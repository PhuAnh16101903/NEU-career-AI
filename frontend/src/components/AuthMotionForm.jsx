// Lucian UX/UI Prompts #062, #063 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/
import { useEffect, useRef, useState, useId } from "react";
import { t as tr, useLocale } from "../i18n";
import { careerApi } from "../services/api";
import { errorText } from "./UI";
import "./AuthMotion.css";
const Check = () => (
  <svg viewBox="0 0 26 26" aria-hidden="true">
    <path d="M6 13.5l4.5 4.5L20 8.5" />
  </svg>
);
export default function AuthMotionForm({ mode, onAuthSuccess }) {
  useLocale();
  const register = mode === "register",
    uid = useId(),
    form = useRef(null),
    lock = useRef(false),
    alive = useRef(true),
    authenticatedUser = useRef(null),
    successCallback = useRef(onAuthSuccess);
  successCallback.current = onAuthSuccess;
  const [values, setValues] = useState({
    full_name: "",
    role: "student",
    student_major: "",
    company_name: "",
    email: "",
    password: "",
  });
  const [step, setStep] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [success, setSuccess] = useState(false),
    [show, setShow] = useState(false),
    [shake, setShake] = useState(false),
    [caps, setCaps] = useState(false);
  const fields = [
    ["full_name", "Họ và tên", "text", "name"],
    ["role", "Bạn là"],
    [
      values.role === "student" ? "student_major" : "company_name",
      values.role === "student" ? "Chuyên ngành" : "Tên doanh nghiệp",
      "text",
      "organization",
    ],
    ["email", "Email", "email", "email"],
    ["password", "Mật khẩu", "password", "new-password"],
  ];
  const strength = [
    values.password.length >= 8,
    /[0-9]/.test(values.password),
    /[^A-Za-z0-9]/.test(values.password),
    values.password.length >= 12,
  ].filter(Boolean).length;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (register)
      form.current
        ?.querySelector(
          `[data-step="${step}"] input, [data-step="${step}"] select`,
        )
        ?.focus({ preventScroll: true });
  }, [step, register]);
  useEffect(() => {
    if (!success) return;
    // Start after the success state is committed, not inside the API callback.
    // The check finishes in 500ms; retain it briefly before entering the workspace.
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = setTimeout(
      async () => {
        if (!alive.current) return;
        try {
          await successCallback.current(authenticatedUser.current);
        } catch (error) {
          if (!alive.current) return;
          setSuccess(false);
          lock.current = false;
          setError(errorText(error));
          setShake(true);
        }
      },
      reduced ? 0 : 650,
    );
    return () => clearTimeout(timer);
  }, [success]);
  const change = (key, value) => {
    setValues((v) => ({ ...v, [key]: value }));
    setError("");
    setShake(false);
  };
  const validate = (index) => {
    const key = fields[index][0],
      v = values[key].trim();
    if (key === "full_name" && !v) return tr("Vui lòng nhập họ và tên.");
    if (key === "company_name" && !v)
      return tr("Vui lòng nhập tên doanh nghiệp.");
    if (key === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
      return tr("Vui lòng nhập email hợp lệ.");
    if (key === "password" && values.password.length < 6)
      return tr("Mật khẩu cần ít nhất 6 ký tự.");
    return "";
  };
  const fail = (message) => {
    setError(message);
    setShake(true);
    const selector = register
      ? `[data-step="${step}"] input, [data-step="${step}"] select`
      : 'input[type="password"]';
    form.current?.querySelector(selector)?.focus({ preventScroll: true });
  };
  async function submit(e) {
    e.preventDefault();
    if (lock.current) return;
    if (register) {
      const issue = validate(step);
      if (issue) {
        fail(issue);
        return;
      }
      if (step < fields.length - 1) {
        setError("");
        setStep((s) => s + 1);
        return;
      }
      for (let i = 0; i < fields.length; i++) {
        const issue = validate(i);
        if (issue) {
          setStep(i);
          fail(issue);
          return;
        }
      }
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()) ||
      !values.password
    ) {
      fail(tr("Vui lòng nhập email và mật khẩu."));
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const data = register
        ? await careerApi.register({
            ...values,
            email: values.email.trim(),
            full_name: values.full_name.trim(),
            company_name:
              values.role === "enterprise" ? values.company_name.trim() : null,
            student_major:
              values.role === "student" ? values.student_major.trim() : null,
          })
        : await careerApi.login(values.email.trim(), values.password);
      if (!alive.current) return;
      setBusy(false);
      authenticatedUser.current = data.user;
      setSuccess(true);
    } catch (e) {
      if (alive.current) {
        setBusy(false);
        setSuccess(false);
        lock.current = false;
        fail(errorText(e));
      }
    }
  }
  function input(field, index) {
    const [key, label, type, autocomplete] = field;
    return (
      <div
        key={key}
        data-step={index}
        className={
          register
            ? `u063-q ${index < step ? "out" : index > step ? "wait" : ""} ${error && index === step ? "bad" : ""}`
            : "u062-f"
        }
        inert={register && index !== step ? "" : undefined}
        aria-hidden={register && index !== step ? true : undefined}
      >
        {register && (
          <small>
            {index + 1} / {fields.length}
          </small>
        )}
        <label htmlFor={uid + key}>{tr(label)}</label>
        <div className={register ? "u063-in" : "u062-box"}>
          {key === "role" ? (
            <select
              id={uid + key}
              value={values.role}
              disabled={busy || success}
              onChange={(e) => change(key, e.target.value)}
            >
              <option value="student">{tr("Sinh viên")}</option>
              <option value="enterprise">{tr("Doanh nghiệp")}</option>
            </select>
          ) : (
            <input
              id={uid + key}
              name={key}
              type={key === "password" && show ? "text" : type}
              autoComplete={
                key === "password" && !register
                  ? "current-password"
                  : autocomplete
              }
              value={values[key]}
              disabled={busy || success}
              aria-describedby={error ? uid + "error" : undefined}
              aria-invalid={
                error && (register ? index === step : key === "password")
                  ? true
                  : undefined
              }
              onChange={(e) => change(key, e.target.value)}
              onKeyUp={(e) =>
                key === "password" &&
                setCaps(!!e.getModifierState?.("CapsLock"))
              }
              placeholder={
                key === "password"
                  ? tr(register ? "Tối thiểu 6 ký tự" : "Nhập mật khẩu")
                  : tr(label)
              }
            />
          )}
          {key === "password" && (
            <button
              type="button"
              className="u062-eye"
              aria-label={tr(show ? "Ẩn mật khẩu" : "Hiện mật khẩu")}
              aria-pressed={show}
              onClick={() => setShow((v) => !v)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <g className="u062-lid">
                  <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
                  <circle cx="12" cy="12" r="3" />
                </g>
                <path className="u062-slash" d="M4 4l16 16" />
              </svg>
            </button>
          )}
        </div>
        {register && key === "password" && (
          <div className="u063-meter" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <i
                key={i}
                style={{
                  background: i < strength ? "var(--ux-accent)" : undefined,
                }}
              />
            ))}
          </div>
        )}
        {key === "password" && caps && (
          <small role="status">{tr("Caps Lock đang bật")}</small>
        )}
      </div>
    );
  }
  return (
    <form
      ref={form}
      className={`${register ? "u063" : "u062"} ${shake ? "shake" : ""}`}
      onSubmit={submit}
      noValidate
      aria-busy={busy}
      onAnimationEnd={() => setShake(false)}
    >
      {register && (
        <>
          <div
            className="u063-bar"
            aria-label={`${step + 1} / ${fields.length}`}
          >
            {fields.map((f, i) => (
              <i key={f[0]} className={i < step || success ? "on" : ""} />
            ))}
          </div>
          <div className="u063-chips">
            {fields.slice(0, step).map(([key, label], i) => (
              <button
                type="button"
                key={key}
                className="u063-chip"
                disabled={busy || success}
                aria-label={`${tr("Sửa")} ${tr(label)}`}
                onClick={() => {
                  setStep(i);
                  setError("");
                }}
              >
                <i aria-hidden="true">✓</i>
                <span>
                  {key === "role"
                    ? tr(
                        values.role === "student"
                          ? "Sinh viên"
                          : "Doanh nghiệp",
                      )
                    : values[key] || tr("Chưa cung cấp")}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
      <div className={register ? "u063-stage" : "u062-fields"}>
        {register
          ? fields.map(input)
          : [
              ["email", "Email", "email", "email"],
              ["password", "Mật khẩu", "password", "current-password"],
            ].map(input)}
      </div>
      {error && (
        <p id={uid + "error"} role="alert" className="auth-motion-error">
          {tr(error)}
        </p>
      )}
      <div className="auth-motion-status" role="status">
        {busy
          ? tr("Đang xử lý…")
          : success
            ? tr(register ? "Tạo tài khoản thành công" : "Đăng nhập thành công")
            : ""}
      </div>
      <button
        type="submit"
        className={`${register ? "u063-next" : "u062-go"} ${busy ? "busy" : ""} ${success ? "ok" : ""}`}
        disabled={busy || success}
        aria-label={tr(
          busy
            ? "Đang xử lý…"
            : success
              ? "Thành công"
              : register
                ? step === fields.length - 1
                  ? "Tạo tài khoản"
                  : "Tiếp tục"
                : "Đăng nhập",
        )}
      >
        <span>
          {tr(
            register
              ? step === fields.length - 1
                ? "Tạo tài khoản"
                : "Tiếp tục"
              : "Đăng nhập",
          )}
        </span>
        {!register && (
          <>
            <i aria-hidden="true" />
            <Check />
          </>
        )}
        {register && success && <Check />}
      </button>
    </form>
  );
}
