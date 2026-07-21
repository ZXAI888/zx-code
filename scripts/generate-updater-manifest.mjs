import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PLATFORM_ARTIFACTS = [
  { suffix: "Windows.msi", platforms: ["windows-x86_64"] },
  { suffix: "Windows-arm64.msi", platforms: ["windows-aarch64"] },
  {
    suffix: "macOS.app.tar.gz",
    platforms: ["darwin-x86_64", "darwin-aarch64"],
  },
  { suffix: "Linux-x86_64.AppImage.tar.gz", platforms: ["linux-x86_64"] },
  { suffix: "Linux-arm64.AppImage.tar.gz", platforms: ["linux-aarch64"] },
];

export async function generateManifest({
  assetsDir,
  repo,
  tag,
  output,
  notes = `ZX Code ${tag}`,
  pubDate = new Date().toISOString(),
}) {
  if (!/^v\d+\.\d+\.\d+(?:[-+].+)?$/.test(tag)) {
    throw new Error(`Invalid release tag: ${tag}`);
  }
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
    throw new Error(`Invalid GitHub repository: ${repo}`);
  }

  const platforms = {};
  for (const artifact of PLATFORM_ARTIFACTS) {
    const fileName = `ZX-Code-${tag}-${artifact.suffix}`;
    const signature = (
      await readFile(path.join(assetsDir, `${fileName}.sig`), "utf8")
    ).trim();
    if (!signature) {
      throw new Error(`Empty updater signature: ${fileName}.sig`);
    }

    const url = `https://github.com/${repo}/releases/download/${tag}/${encodeURIComponent(fileName)}`;
    for (const platform of artifact.platforms) {
      platforms[platform] = { signature, url };
    }
  }

  const manifest = {
    version: tag.slice(1),
    notes,
    pub_date: pubDate,
    platforms,
  };
  await writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) {
    throw new Error(`Missing required argument: ${name}`);
  }
  return process.argv[index + 1];
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await generateManifest({
    assetsDir: readArg("--assets"),
    repo: readArg("--repo"),
    tag: readArg("--tag"),
    output: readArg("--output"),
  });
}
