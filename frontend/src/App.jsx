import {
  workspaceTabs,
  tabsFor,
  workspaceDestination,
} from "./workspaceRoutes";
import BusinessPage from "./components/BusinessPage";
import AccountSettings from "./components/AccountSettings";
import CareerRail from "./components/CareerRail";
import { LanguageToggle } from "./i18n";
import { t as tr, useLocale as useUiLanguage } from "./i18n";
import { flushSync } from "react-dom";
import InteractionLayer from "./components/InteractionLayer";
import "./interaction.css";
import { useEffect, useState } from "react";
import AuthTab from "./components/AuthTab";
import CoursesTab from "./components/CoursesTab";
import CVTab from "./components/CVTab";
import InterviewTab from "./components/InterviewTab";
import MatchingTab from "./components/MatchingTab";
import { Icon } from "./components/UI";
import { setAuthToken } from "./services/api";
import HomePage, { Brand } from "./components/HomePage";
import GuidePage from "./components/GuidePage";
import AuthPage from "./components/AuthPage";
import "./styles.css";
import "./public.css";
import ThemeFrame, { ThemeToggle } from "./components/ThemeFrame";
import "./components/ThemeFrame.css";
import "./components/UnifiedUI.css";
import "./components/WorkspaceDesign.css";
import "./components/SurfacePolish.css";
const TABS = workspaceTabs;
const getTab = () =>
  [
    ...TABS.map((t) => t.id),
    "home",
    "about",
    "tools",
    "getting-started",
    "login",
    "register",
  ].includes(location.hash.slice(1))
    ? location.hash.slice(1)
    : "home";
export default function App() {
  const language = useUiLanguage();
  const [railWide, setRailWide] = useState(false);
  const [requestedTab, setActiveTab] = useState(getTab),
    [cvData, setCvData] = useState(null),
    [currentUser, setCurrentUser] = useState(null);
  const activeTab = workspaceDestination(requestedTab, currentUser);
  const tabs = tabsFor(currentUser);
  useEffect(() => {
    if (requestedTab !== activeTab) {
      location.replace(`#${activeTab}`);
      setActiveTab(activeTab);
    }
  }, [requestedTab, activeTab]);
  useEffect(() => {
    const sync = () => setActiveTab(getTab());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => {
    document.title = `${tr(
      TABS.find((t) => t.id === activeTab)?.label ||
        {
          home: "Trang chủ",
          about: "Giới thiệu",
          tools: "Công cụ",
          "getting-started": "Cách bắt đầu",
          login: "Đăng nhập",
          register: "Đăng ký",
        }[activeTab],
    )} · NEU Career AI`;
  }, [activeTab, language]);
  useEffect(() => {
    const target = {
      tools: "career-features",
      "getting-started": "career-how",
    }[activeTab];
    if (target) {
      const frame = requestAnimationFrame(() =>
        document.getElementById(target)?.scrollIntoView({
          block: "start",
          behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
        }),
      );
      return () => cancelAnimationFrame(frame);
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [activeTab]);
  const navigate = (id) => {
    if (id === getTab()) {
      const target = {
        tools: "career-features",
        "getting-started": "career-how",
      }[id];
      if (target)
        document.getElementById(target)?.scrollIntoView({
          block: "start",
          behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
        });
    }
    location.hash = id;
    flushSync(() => setActiveTab(id));
  };
  useEffect(() => {
    const click = (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.detail === 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = event.target.closest?.('a[href^="#"]');
      const id = anchor?.getAttribute("href").slice(1);
      if (
        !id ||
        ![
          ...TABS.map((t) => t.id),
          "home",
          "about",
          "tools",
          "getting-started",
          "login",
          "register",
        ].includes(id)
      )
        return;
      event.preventDefault();
      navigate(id, true);
    };
    document.addEventListener("click", click);
    return () => document.removeEventListener("click", click);
  }, []);
  const logout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    setCvData(null);
    navigate("login");
  };
  const publicRoute =
    ["home", "about", "tools", "getting-started", "login", "register"].includes(
      activeTab,
    ) ||
    (activeTab === "auth" && !currentUser);
  const authSuccess = (user) => {
    if (!user || !["student", "enterprise", "admin"].includes(user.role)) {
      throw new Error("Invalid authentication user");
    }
    const destination = tabsFor(user)[0].id;
    // Publish user and route in the same render so the route guard never sees
    // an authenticated destination with an anonymous session.
    flushSync(() => {
      setCurrentUser(user);
      setActiveTab(destination);
    });
    location.hash = destination;
  };
  return (
    <ThemeFrame>
      <InteractionLayer navigate={navigate} currentUser={currentUser} />
      {activeTab === "home" && <HomePage currentUser={currentUser} />}
      {["about", "tools", "getting-started"].includes(activeTab) && (
        <GuidePage currentUser={currentUser} activeSection={activeTab} />
      )}
      {tr(
        (activeTab === "login" ||
          activeTab === "register" ||
          (activeTab === "auth" && !currentUser)) && (
          <AuthPage
            mode={activeTab === "register" ? "register" : "login"}
            onAuthSuccess={authSuccess}
            onNavigate={navigate}
          />
        ),
      )}
      <div
        className={`app-shell u040 ${railWide ? "is-wide" : ""}`}
        hidden={publicRoute}
      >
        <a
          className="skip-link"
          href="#main-content"
          onClick={(event) => {
            event.preventDefault();
            document.getElementById("main-content").focus();
          }}
        >
          {tr("Đến nội dung chính")}
        </a>
        <CareerRail
          wide={railWide}
          onToggle={() => setRailWide((v) => !v)}
          tabs={tabs}
          activeTab={activeTab}
          currentUser={currentUser}
          navigate={navigate}
          onLogout={logout}
        />
        <div className="workspace">
          <header className="topbar">
            <span>
              {tr("Không gian nghề nghiệp ")}
              <span className="breadcrumb-slash">{tr("/")}</span>
              {tr(" ")}
              <strong>{tr(TABS.find((t) => t.id === activeTab)?.label)}</strong>
            </span>
            <div className="workspace-preferences">
              <LanguageToggle />
              <ThemeToggle />
            </div>
            <span className="topbar-label">
              <span className="small-dot" />
              {tr("Dành cho cộng đồng NEU")}
            </span>
          </header>
          <main id="main-content" tabIndex={-1}>
            <div hidden={activeTab !== "cv"}>
              <CVTab
                key={currentUser?.id || "guest"}
                cvData={cvData}
                onCvParsed={setCvData}
                onContinue={() => navigate("matching")}
              />
            </div>
            <div hidden={activeTab !== "matching"}>
              <MatchingTab key={currentUser?.id || "guest"} cvData={cvData} />
            </div>
            <div hidden={activeTab !== "interview"}>
              <InterviewTab key={currentUser?.id || "guest"} />
            </div>
            {tr(activeTab === "courses" && <CoursesTab />)}
            {activeTab === "settings" && currentUser && (
              <AccountSettings user={currentUser} />
            )}
            {[
              "opportunities",
              "recruitment",
              "candidates",
              "overview",
              "users",
              "moderation",
            ].includes(activeTab) &&
              currentUser && (
                <BusinessPage
                  key={currentUser.id}
                  user={currentUser}
                  view={activeTab}
                />
              )}
            <footer className="page-footer">
              <span>{tr("NEU Career AI")}</span>
              <span>{tr("Phân tích CV · Kỹ năng · Phỏng vấn")}</span>
            </footer>
          </main>
        </div>
      </div>
    </ThemeFrame>
  );
}
