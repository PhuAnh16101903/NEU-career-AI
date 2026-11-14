import neuLogo from "../assets/neu-logo.png";
import { t as tr, useLocale as useUiLanguage } from "../i18n";
export default function Brand() {
  useUiLanguage();
  return (
    <a
      className="brand public-brand"
      href="#home"
      aria-label={tr("NEU Career AI · Trang chủ")}
    >
      <span className="neu-logo">
        <img
          src={neuLogo}
          alt={tr("Logo Đại học Kinh tế Quốc dân")}
          width="644"
          height="405"
        />
      </span>
      <span>
        {tr("NEU Career AI")}
        <span className="brand-caption">{tr("ĐẠI HỌC KINH TẾ QUỐC DÂN")}</span>
      </span>
    </a>
  );
}
