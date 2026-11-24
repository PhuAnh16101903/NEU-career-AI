import { useEffect, useRef, useState } from "react";
import { t as tr, useLocale } from "../i18n";

const MUSIC_SOURCE = `${import.meta.env.BASE_URL}christmas-auth/audio/jingle-bells-orchestra.mp3`;
const INITIAL_VOLUME = 0.35;

export default function ChristmasMusicPlayer() {
  useLocale();
  const audioRef = useRef(null);
  // Music is enabled by default. The browser may still require a user gesture.
  const wantsPlaybackRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(INITIAL_VOLUME);
  const [muted, setMuted] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);
  const [awaitingInteraction, setAwaitingInteraction] = useState(false);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume;
    }
  }, [muted, volume]);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      wantsPlaybackRef.current = false;
      audio.pause();
      setPlaying(false);
      setAwaitingInteraction(false);
      return;
    }

    wantsPlaybackRef.current = true;
    setPlaybackError(false);
    try {
      await audio.play();
      setPlaying(true);
      setAwaitingInteraction(false);
    } catch (error) {
      setPlaying(false);
      if (error?.name === "NotAllowedError") setAwaitingInteraction(true);
      else if (error?.name !== "AbortError") setPlaybackError(true);
    }
  };

  const changeVolume = (event) => {
    const nextVolume = Number(event.target.value);
    setVolume(nextVolume);
    setMuted(nextVolume === 0);
    if (audioRef.current) audioRef.current.volume = nextVolume;
  };

  const toggleMute = () => {
    if (muted && volume === 0) setVolume(INITIAL_VOLUME);
    setMuted(!muted);
  };

  return (
    <aside className="christmas-music-player" aria-label={tr("Nhạc Giáng Sinh")}>
      <audio
        hidden
        ref={audioRef}
        src={MUSIC_SOURCE}
        loop
        preload="none"
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />
      <span className="christmas-music-player__title">
        <span aria-hidden="true">♫</span>
        <span>Jingle Bells</span>
      </span>
      <button
        className="christmas-music-player__play"
        type="button"
        onClick={togglePlayback}
        aria-label={tr(playing ? "Tạm dừng nhạc Giáng Sinh" : "Phát nhạc Giáng Sinh")}
        aria-pressed={playing}
      >
        <span aria-hidden="true">{playing ? "Ⅱ" : "▶"}</span>
      </button>
      <button
        className="christmas-music-player__mute"
        type="button"
        onClick={toggleMute}
        aria-label={tr(muted ? "Bật tiếng nhạc Giáng Sinh" : "Tắt tiếng nhạc Giáng Sinh")}
        aria-pressed={muted}
      >
        <span aria-hidden="true">{muted || volume === 0 ? "×" : "♪"}</span>
      </button>
      <label className="christmas-music-player__volume">
        <span className="sr-only">{tr("Âm lượng nhạc Giáng Sinh")}</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={muted ? 0 : volume}
          onChange={changeVolume}
          aria-label={tr("Âm lượng nhạc Giáng Sinh")}
        />
      </label>
      {awaitingInteraction && !playbackError && (
        <span className="christmas-music-player__error" role="status">
          {tr("Nhạc sẽ phát khi bạn tương tác với trang")}
        </span>
      )}
      {playbackError && (
        <span className="christmas-music-player__error" role="status">
          {tr("Không thể phát nhạc")}
        </span>
      )}
    </aside>
  );
}
