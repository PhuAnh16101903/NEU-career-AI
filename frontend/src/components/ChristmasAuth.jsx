import { useEffect, useRef } from "react";
import { careerApi } from "../services/api";
import { useLocale, setLanguage } from "../i18n";
import translations from "../i18n/en.json";
import { errorText } from "./UI";
import "./ChristmasAuth.css";

// Preserve the reference document so workspace styles cannot alter its scene.
export default function ChristmasAuth({ mode, onAuthSuccess, onNavigate }) {
  const locale = useLocale();
  const frame = useRef(null);
  const latest = useRef({ mode, onAuthSuccess, onNavigate, locale });
  latest.current = { mode, onAuthSuccess, onNavigate, locale };
  useEffect(() => {
    let alive = true, pending = null, fallback = null;
    const send = (data) => frame.current?.contentWindow?.postMessage(
      { channel: "neu-christmas-auth", ...data }, window.location.origin,
    );
    const finish = async () => {
      if (!pending?.user || pending.finishing || !alive) return;
      const request = pending;
      request.finishing = true;
      clearTimeout(fallback);
      try { await latest.current.onAuthSuccess(request.user); }
      catch (error) {
        if (alive) send({ type: "result", id: request.id, error: errorText(error) });
        pending = null;
      }
    };
    const receive = async (event) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      const data = event.data;
      if (!data || data.channel !== "neu-christmas-auth") return;
      if (data.type === "ready") { send({ type: "mode", mode: latest.current.mode }); send({type:"locale",locale:latest.current.locale,translations}); return; }
      if (data.type === "locale" && ["vi","en"].includes(data.locale)) { setLanguage(data.locale); return; }
      if (data.type === "navigate" && ["home", "login", "register"].includes(data.route)) {
        if (!pending) latest.current.onNavigate(data.route);
        return;
      }
      if (data.type === "complete" && data.id === pending?.id) { await finish(); return; }
      if (data.type !== "authenticate" || pending || typeof data.id !== "string") return;
      const payload = data.payload;
      if (!payload || typeof payload.email !== "string" || typeof payload.password !== "string") return;
      if (!["login", "register"].includes(data.mode)) return;
      if (data.mode === "register" && !["student", "enterprise"].includes(payload.role)) return;
      const request = { id: data.id };
      pending = request;
      try {
        const result = data.mode === "login"
          ? await careerApi.login(payload.email.trim(), payload.password)
          : await careerApi.register({
              email: payload.email.trim(), password: payload.password,
              full_name: String(payload.full_name || "").trim(), role: payload.role,
              student_major: payload.role === "student" ? String(payload.student_major || "").trim() : null,
              company_name: payload.role === "enterprise" ? String(payload.company_name || "").trim() : null,
            });
        if (!alive) return;
        if (!result.user || !["student", "enterprise", "admin"].includes(result.user.role)) throw new Error("Thông tin tài khoản không hợp lệ.");
        request.user = result.user;
        send({ type: "result", id: data.id, success: true });
        fallback = setTimeout(finish, 6000);
      } catch (error) {
        if (alive) send({ type: "result", id: data.id, error: errorText(error) });
        pending = null;
      }
    };
    window.addEventListener("message", receive);
    return () => { alive = false; clearTimeout(fallback); window.removeEventListener("message", receive); };
  }, []);
  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ channel: "neu-christmas-auth", type: "mode", mode }, window.location.origin);
  }, [mode]);
  useEffect(() => {
    frame.current?.contentWindow?.postMessage({channel:"neu-christmas-auth",type:"locale",locale,translations},window.location.origin);
  }, [locale]);
  return <iframe ref={frame} className="christmas-auth-frame" src="/christmas-auth/index.html"
    title="Đăng nhập và đăng ký NEU Career AI" />;
}
