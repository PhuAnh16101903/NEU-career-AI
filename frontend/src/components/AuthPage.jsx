import AuthGlass from "./AuthGlass";
import { LanguageToggle } from "../i18n";
import { t as tr, useLocale as useUiLanguage } from "../i18n";
import { Brand } from "./HomePage";
import { ThemeToggle } from "./ThemeFrame";
import AuthTab from "./AuthTab";
export default function AuthPage({ mode, onAuthSuccess, onNavigate }) {
  useUiLanguage();
  return (
    <AuthGlass>
      <header className="auth-header">
        <Brand />
        <LanguageToggle />
        <ThemeToggle />
        <a className="back-home" href="#home">
          {tr("← Về trang chủ")}
        </a>
      </header>
      <main className="login-main">
        <AuthTab
          key={mode}
          initialMode={mode}
          standalone
          onModeChange={onNavigate}
          onAuthSuccess={onAuthSuccess}
        />
      </main>
      <footer className="login-footer">
        {tr("NEU Career AI")}
        <span>{tr("Tài khoản sinh viên, doanh nghiệp và quản trị viên.")}</span>
      </footer>
    </AuthGlass>
  );
}
