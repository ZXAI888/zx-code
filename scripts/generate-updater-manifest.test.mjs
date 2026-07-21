import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { generateManifest } from "./generate-updater-manifest.mjs";

const ARTIFACTS = [
  "Windows.msi",
  "Windows-arm64.msi",
  "macOS.app.tar.gz",
  "Linux-x86_64.AppImage",
  "Linux-arm64.AppImage",
];

test("generates a complete Tauri updater manifest", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "zx-updater-"));
  const output = path.join(directory, "latest.json");

  try {
    for (const suffix of ARTIFACTS) {
      await writeFile(
        path.join(directory, `ZX-Code-v3.17.2-${suffix}.sig`),
        `signature-${suffix}\n`,
      );
    }

    const manifest = await generateManifest({
      assetsDir: directory,
      repo: "ZXAI888/zx-code",
      tag: "v3.17.2",
      output,
      notes: "Update test",
      pubDate: "2026-07-21T00:00:00.000Z",
    });

    assert.equal(manifest.version, "3.17.2");
    assert.deepEqual(Object.keys(manifest.platforms).sort(), [
      "darwin-aarch64",
      "darwin-x86_64",
      "linux-aarch64",
      "linux-x86_64",
      "windows-aarch64",
      "windows-x86_64",
    ]);
    assert.equal(
      manifest.platforms["darwin-aarch64"].url,
      manifest.platforms["darwin-x86_64"].url,
    );
    assert.match(
      manifest.platforms["windows-aarch64"].url,
      /ZX-Code-v3\.17\.2-Windows-arm64\.msi$/,
    );
    assert.deepEqual(JSON.parse(await readFile(output, "utf8")), manifest);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
