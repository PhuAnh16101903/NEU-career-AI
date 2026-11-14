import LanguageText from "./LanguageText";
import WorkspaceArt from "./WorkspaceArt";
import { t as tr, useLocale as useUiLanguage } from "../i18n";
export function Icon({ name = "spark", size = 20, ...props }) {
  useUiLanguage();
  const paths = {
    settings: "M4 7h16M4 17h16M8 4v6M16 14v6",
    menu: "M4 6h16M4 12h16M4 18h16",
    spark: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z",
    file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6M8 13h8M8 17h5",
    target: "M21 12a9 9 0 1 1-9-9M21 3l-9 9M16 3h5v5M16 12a4 4 0 1 1-4-4",
    chat: "M21 11.5a8.5 8.5 0 0 1-8.5 8.5H3l2-5a8.5 8.5 0 1 1 16-3.5Z",
    book: "M12 5v16M3 3l9 2 9-2v16l-9 2-9-2Z",
    user: "M20 21v-2a7 7 0 0 0-14 0v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
    upload: "M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5",
    arrow: "M4 12h16m-6-6 6 6-6 6",
    check: "m5 12 4 4L19 6",
    search: "m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
    briefcase: "M9 6V3h6v3M3 6h18v15H3ZM3 11l9 3 9-3",
    logout: "M9 3H3v18h6m5-14 5 5-5 5M8 12h13",
    close: "m6 6 12 12M6 18 18 6",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] || paths.spark} />
    </svg>
  );
}
export function PageHead({ eyebrow, title, children, visual }) {
  useUiLanguage();
  return (
    <header className={`page-head ${visual ? "has-art" : ""}`}>
      <div className="page-head-copy">
        <h1>
          <LanguageText text={title} order={3} />
        </h1>
        <p>
          {typeof children === "string" ? (
            <LanguageText text={children} order={4} />
          ) : (
            children
          )}
        </p>
      </div>
      {visual && <WorkspaceArt kind={visual} />}
    </header>
  );
}
export function ErrorNotice({ message }) {
  useUiLanguage();
  return message ? (
    <div className="notice error" role="alert">
      {tr(message)}
    </div>
  ) : null;
}
export function Empty({ title, children, icon = "file" }) {
  useUiLanguage();
  return (
    <div className="empty">
      <div className="icon-tile">
        <Icon name={icon} size={27} />
      </div>
      <h3>{tr(title)}</h3>
      <p>{tr(children)}</p>
    </div>
  );
}
export function Tags({ items = [], tone = "" }) {
  useUiLanguage();
  return (
    <div className="tags">
      {items.map((x, i) => (
        <span className={`tag ${tone}`} key={`${x}-${i}`}>
          {tr(x)}
        </span>
      ))}
    </div>
  );
}
export function errorText(e) {
  const d = e.response?.data?.detail;
  return typeof d === "string"
    ? d
    : Array.isArray(d)
      ? d.map((x) => x.msg).join(". ")
      : "Không thể kết nối. Vui lòng kiểm tra kết nối và thử lại.";
}
export const skillList = (text) => [
  ...new Set(
    text
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean),
  ),
];
