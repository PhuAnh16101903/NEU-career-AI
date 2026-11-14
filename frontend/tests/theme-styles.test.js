import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import postcss from "postcss";
const css = postcss.parse(
  readFileSync("src/components/ThemeFrame.css", "utf8"),
);
const palette = (selector) => {
  const result = {};
  css.walkRules(selector, (r) =>
    r.walkDecls((d) => (result[d.prop] = d.value)),
  );
  return result;
};
const light = palette(".u219"),
  dark = { ...light, ...palette('.u219[data-theme="dark"]') };
const resolve = (value, vars) => {
  while (value.startsWith("var(")) {
    const [, name, fallback] = value.match(
      /^var\((--[\w-]+)(?:,\s*([^()]+))?\)$/,
    );
    value = vars[name] || fallback;
  }
  return value;
};
const lum = (hex) => {
  let s = hex.slice(1);
  if (s.length === 3)
    s = s
      .split("")
      .map((v) => v + v)
      .join("");
  const rgb = [0, 2, 4]
    .map((i) => parseInt(s.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
};
const contrast = (a, b) => {
  const l = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l[0] + 0.05) / (l[1] + 0.05);
};
it.each([
  ["light", light],
  ["dark", dark],
])(
  "%s palette has readable body, muted, button and feedback text",
  (_, vars) => {
    for (const [fg, bg] of [
      ["--ux-ink", "--ux-surface"],
      ["--ux-ink-2", "--ux-page"],
      ["--ux-ink-3", "--ux-surface"],
      ["--ux-accent-ink", "--ux-accent"],
      ["--ux-danger", "--ux-danger-bg"],
      ["--ux-mint", "--ux-success-bg"],
      ["--ux-warn", "--ux-warn-bg"],
    ])
      expect(
        contrast(resolve(vars[fg], vars), resolve(vars[bg], vars)),
        `${fg} on ${bg}`,
      ).toBeGreaterThanOrEqual(4.5);
  },
);
it("keeps new styles inside the component namespaces", () => {
  for (const [file, prefix] of [
    ["ThemeFrame.css", ".u219"],
    ["StaggeredHero.css", ".u216"],
  ]) {
    const parsed = postcss.parse(
      readFileSync(`src/components/${file}`, "utf8"),
    );
    parsed.walkRules((rule) => {
      if (
        rule.parent.type === "atrule" &&
        rule.parent.name.endsWith("keyframes")
      )
        return;
      for (const selector of rule.selectors)
        expect(selector.trim().startsWith(prefix), selector).toBe(true);
    });
  }
});
