import { afterEach, expect, it } from "vitest";
import { cleanup, render, fireEvent } from "@testing-library/react";
import GlassPanel from "../src/components/GlassPanel";
afterEach(cleanup);
it("renders frosted glass without ripple layers or pointer movement", () => {
  const { container, getByLabelText } = render(
    <GlassPanel>
      <input aria-label="Email" defaultValue="a@neu.edu.vn" />
    </GlassPanel>,
  );
  fireEvent.pointerMove(container.firstChild, { clientX: 400, clientY: 200 });
  expect(container.querySelector(".glass-wave")).toBeNull();
  expect(container.firstChild.classList.contains("frosted-panel")).toBe(true);
  expect(getByLabelText("Email").value).toBe("a@neu.edu.vn");
});
