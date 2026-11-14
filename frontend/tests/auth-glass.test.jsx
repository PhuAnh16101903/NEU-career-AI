import { afterEach, expect, it } from "vitest";
import { cleanup, render, fireEvent } from "@testing-library/react";
import AuthGlass from "../src/components/AuthGlass";
afterEach(cleanup);
it("keeps the authentication background static and preserves inputs", () => {
  const { container, getByLabelText } = render(
    <AuthGlass>
      <input aria-label="Email" defaultValue="a@neu.edu.vn" />
    </AuthGlass>,
  );
  fireEvent.pointerMove(container.firstChild, { clientX: 400, clientY: 200 });
  expect(container.firstChild.getAttribute("style")).toBeNull();
  expect(container.querySelector("video")).toBeNull();
  expect(getByLabelText("Email").value).toBe("a@neu.edu.vn");
});
