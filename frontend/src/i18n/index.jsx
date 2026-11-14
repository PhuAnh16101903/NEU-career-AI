import { useEffect, useSyncExternalStore } from "react";
import en from "./en.json";
let language = "vi";
try {
  if (
    typeof window !== "undefined" &&
    localStorage.getItem("neu-career-language") === "en"
  )
    language = "en";
} catch {}
const listeners = new Set();
export function setLanguage(value) {
  language = value === "en" ? "en" : "vi";
  try {
    localStorage.setItem("neu-career-language", language);
  } catch {}
  if (typeof document !== "undefined") document.documentElement.lang = language;
  listeners.forEach((fn) => fn());
}
export function useLocale() {
  useEffect(() => {
    if (typeof document !== "undefined")
      document.documentElement.lang = language;
  }, []);
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => language,
    () => "vi",
  );
}
export function t(value) {
  if (language !== "en" || typeof value !== "string") return value;
  const clean = value.replace(/\s+/g, " ").trim();
  if (en[clean]) return value.replace(value.trim(), en[clean]);
  const greeting = clean.match(/^Xin chào, (.*)\.$/);
  if (greeting) return `Hello, ${greeting[1]}.`;
  const applied = clean.match(
    /^Đã ứng tuyển (.*)\. Độ phù hợp kỹ năng: (.*)%\.$/,
  );
  if (applied)
    return `Applied for ${applied[1]}. Skills match: ${applied[2]}%.`;
  if (clean.startsWith("Điểm ")) return "Score " + clean.slice(5);
  if (clean.endsWith(" KB · Nhấn để đổi file"))
    return clean.replace("Nhấn để đổi file", "Click to change file");
  const role = clean.match(/^(Sinh viên|Doanh nghiệp|Quản trị viên) · (.*)$/);
  if (role) return `${en[role[1]]} · ${role[2]}`;
  return value;
}
export { default as LanguageToggle } from "../components/LanguageSwitch";
