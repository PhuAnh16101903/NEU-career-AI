import LanguageText from "./LanguageText";
import { useEffect, useRef, useState } from "react";
import { t as tr, useLocale } from "../i18n";
import { PublicHeader } from "./PublicLayout";
import { Icon } from "./UI";
import "./VideoHero.css";
export { default as Brand } from "./Brand";
export const HERO_VIDEO = `${import.meta.env.BASE_URL}media/career-hero.mp4`;
export default function HomePage({ currentUser }) {
  useLocale();
  const video = useRef(null);
  const [paused, setPaused] = useState(
    () =>
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
  const [failed, setFailed] = useState(false),
    [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const change = () => {
      setPaused(!!media?.matches);
    };
    media?.addEventListener?.("change", change);
    return () => media?.removeEventListener?.("change", change);
  }, []);
  useEffect(() => {
    const player = video.current;
    if (!player) return;
    if (paused || failed) {
      player.pause();
      return;
    }
    let disposed = false;
    const play = () => {
      if (disposed) return;
      player.play()?.catch((error) => {
        // StrictMode cleanup can abort the first play; it must not disable text animation.
        if (!disposed && error.name !== "AbortError")
          player.dataset.autoplayBlocked = "true";
      });
    };
    play();
    player.addEventListener("canplay", play);
    return () => {
      disposed = true;
      player.removeEventListener("canplay", play);
      player.pause();
    };
  }, [paused, failed]);
  return (
    <div className={`public-page video-hero ${paused ? "motion-paused" : ""}`}>
      <video
        ref={video}
        className="video-hero-media"
        src={HERO_VIDEO}
        autoPlay={!paused}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
        onError={() => setFailed(true)}
        hidden={failed}
      />
      <div className="video-hero-scrim" aria-hidden="true" />
      <PublicHeader
        currentUser={currentUser}
        activeSection="home"
        overlay
        onMenuChange={setMenuOpen}
      />
      <main
        className="video-hero-content"
        id="home-content"
        tabIndex={-1}
        inert={menuOpen ? "" : undefined}
      >
        <div className="video-hero-top">
          <p className="video-hero-eyebrow">
            <LanguageText
              text="Công cụ nghề nghiệp dành cho sinh viên NEU"
              order={3}
            />
          </p>
          <h1
            aria-label={tr("Phân tích CV. So khớp kỹ năng. Luyện phỏng vấn.")}
          >
            <span>
              <LanguageText text="Phân tích CV." order={4} />
            </span>
            <span>
              <LanguageText text="So khớp kỹ năng." order={5} />
            </span>
            <span>
              <LanguageText text="Luyện phỏng vấn." order={6} />
            </span>
          </h1>
        </div>
        <div className="video-hero-bottom">
          <p>
            <LanguageText
              text="Đối chiếu kỹ năng trong CV với vị trí bạn muốn ứng tuyển."
              order={7}
            />{" "}
            <LanguageText
              text="Tìm học phần còn thiếu và luyện trả lời phỏng vấn theo STAR."
              order={8}
            />
          </p>
          <a className="video-hero-cta" href="#about">
            <LanguageText
              text="Tìm hiểu công cụ và cách sử dụng"
              order={9}
              resize
            />
            <Icon name="arrow" size={16} />
          </a>
        </div>
      </main>
      {failed && (
        <div className="video-hero-controls" inert={menuOpen ? "" : undefined}>
          <span role="status">
            {tr("Video chưa tải được. Bạn vẫn có thể sử dụng các công cụ.")}
          </span>
        </div>
      )}
    </div>
  );
}
