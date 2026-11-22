import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { version } from "../../package.json";

const readmes = ["README.md", "README_ZH.md", "README_JA.md", "README_DE.md"];
describe.each(readmes)("%s", (name) => {
  const readme = readFileSync(resolve(__dirname, "../..", name), "utf8");
  it("identifies this release and its official download page", () => {
    expect(readme).toMatch(/^# ZX Code/m);
    expect(readme).toContain(`v${version}`);
    expect(readme).toContain("https://zxai888.github.io/zx-code/");
    expect(readme).toContain("(LICENSE)");
  });
  it("links all available translations", () => {
    for (const filename of readmes) expect(readme).toContain(`(${filename})`);
  });
});
