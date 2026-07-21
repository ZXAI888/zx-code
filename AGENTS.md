# ZX Code Agent Notes

This file records project-specific product and release requirements that future AI agents must preserve.

## Product Requirements

- Product name: ZX Code.
- Official website and download page: `https://zxai888.github.io/zx-code/`.
- In the About page, keep only the Official Website and Check for Updates actions. Do not restore GitHub or Release Notes buttons.
- User-facing update fallbacks must open the official download page, never a GitHub Releases page.
- Normal installed builds must download, install, and restart inside the app without opening a browser.
- Portable builds cannot self-install. Their update action must open the official download page.
- Preset provider selectors must expose official presets only. Do not restore third-party preset providers. The universal-provider flow may keep its custom gateway template because it is user-defined rather than a third-party preset.

## Updater Architecture

- The Tauri updater endpoint is `https://zxai888.github.io/zx-code/latest.json` in `src-tauri/tauri.conf.json`.
- The updater public key in `src-tauri/tauri.conf.json` must match the private key stored in the GitHub Actions secret `TAURI_SIGNING_PRIVATE_KEY_B64`.
- Never commit, print, upload as a release asset, or expose `.zx-code-updater.key*`. These files are ignored intentionally.
- Do not rotate the updater key casually. A public-key change makes already-installed versions unable to verify the next update unless a migration release is planned.
- The original v3.17.1 signing private key was unavailable. Therefore v3.17.1 users must manually install v3.17.2 once from the official website. Signed in-app updates are supported from v3.17.2 onward.
- Do not publish `latest.json` as a GitHub Release asset. The v3.17.1 client still checks the old `releases/latest/download/latest.json` endpoint with an unavailable signing key. The supported manifest belongs only on GitHub Pages under `docs/latest.json`.
- `src/components/UpdatePrompt.tsx` owns the startup reminder, download progress, install-and-restart action, portable-build handling, and official-site fallback.
- `scripts/generate-updater-manifest.mjs` creates the six-platform Tauri manifest. Keep its test in sync when artifact names change.

## Signed Release Artifacts

The release workflow is `.github/workflows/release.yml` and builds five jobs covering six updater platform keys.

- Windows x64: `.msi` and `.msi.sig`
- Windows ARM64: `.msi` and `.msi.sig`
- macOS Universal: `.app.tar.gz` and `.app.tar.gz.sig`, shared by Intel and Apple Silicon updater keys
- Linux x64: `.AppImage` and `.AppImage.sig`
- Linux ARM64: `.AppImage` and `.AppImage.sig`

Tauri 2.10 signs Linux AppImages directly. Do not change Linux updater lookup back to the obsolete `.AppImage.tar.gz` format.

The public Release also includes portable Windows ZIPs, macOS DMG/ZIP, and Linux DEB/RPM packages. The download page reads the repository's latest GitHub Release API and exposes these user-installable assets.

## Release Procedure

1. Bump the same version in `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`; update lockfiles as required.
2. Run at least:
   - `pnpm typecheck`
   - `pnpm format:check`
   - `pnpm build:renderer`
   - `pnpm test:updater-manifest`
   - `cargo fmt --check` from `src-tauri`
   - `cargo check --locked` from `src-tauri`
3. Commit and push `master`, then create and push an annotated `vX.Y.Z` tag.
4. Monitor every platform job and the final publish job. Do not treat a partially successful matrix as a completed release.
5. Verify the GitHub Release contains installers and all expected `.sig` files.
6. Verify `https://zxai888.github.io/zx-code/latest.json` reports the new version, contains all six platform keys, and has a non-empty signature for every platform.
7. Verify the latest GitHub Release API returns the new tag so the official download page displays it.
8. Pull the workflow-generated `docs/latest.json` commit back into the local `master` branch.

## Current Baseline

- v3.17.2 was published successfully on 2026-07-22 (Asia/Shanghai).
- The About page no longer shows GitHub or Release Notes buttons.
- The official download page and six-platform signed updater manifest are live.
- Future releases should preserve this behavior unless the owner explicitly requests a change.
