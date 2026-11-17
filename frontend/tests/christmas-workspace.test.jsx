import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import ChristmasMusicPlayer from "../src/components/ChristmasMusicPlayer";
import ThemeFrame from "../src/components/ThemeFrame";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("keeps workspace music opt-in and uses one looping audio element", async () => {
  const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  const pause = vi
    .spyOn(HTMLMediaElement.prototype, "pause")
    .mockImplementation(() => {});
  render(<ChristmasMusicPlayer />);

  const audio = document.querySelector("audio");
  expect(audio).toBeTruthy();
  expect(audio.loop).toBe(true);
  expect(audio.preload).toBe("none");
  expect(document.querySelectorAll("audio")).toHaveLength(1);
  expect(play).not.toHaveBeenCalled();

  fireEvent.click(
    screen.getByRole("button", { name: "Phát nhạc Giáng Sinh" }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Tạm dừng nhạc Giáng Sinh" }),
    ).toBeTruthy(),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Tạm dừng nhạc Giáng Sinh" }),
  );
  expect(pause).toHaveBeenCalledTimes(1);
});

it("allows muting and changing volume without creating another audio instance", () => {
  render(<ChristmasMusicPlayer />);
  const audio = document.querySelector("audio");
  const slider = screen.getByRole("slider", {
    name: "Âm lượng nhạc Giáng Sinh",
  });

  fireEvent.click(
    screen.getByRole("button", { name: "Tắt tiếng nhạc Giáng Sinh" }),
  );
  expect(audio.volume).toBe(0);
  fireEvent.change(slider, { target: { value: "0.7" } });
  expect(audio.volume).toBeCloseTo(0.7);
  fireEvent.change(slider, { target: { value: "0" } });
  fireEvent.click(
    screen.getByRole("button", { name: "Bật tiếng nhạc Giáng Sinh" }),
  );
  expect(audio.volume).toBeCloseTo(0.35);
  expect(document.querySelectorAll("audio")).toHaveLength(1);
});

it("renders a lightweight deterministic snowfall layer and keeps reduced-motion CSS", () => {
  render(
    <ThemeFrame>
      <main>Workspace</main>
    </ThemeFrame>,
  );
  const snow = document.querySelector(".christmas-snow");
  expect(snow).toBeTruthy();
  expect(snow.children).toHaveLength(36);
  expect(snow.getAttribute("aria-hidden")).toBe("true");
  expect(snow.style.pointerEvents).toBe("");
});
