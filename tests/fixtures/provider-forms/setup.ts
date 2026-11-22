// These fixtures model saved provider configurations for editor interaction tests.
// Product catalog tests exercise the real exports without these mocks.
import { vi } from "vitest";

vi.mock("@/config/claudeDesktopProviderPresets", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/config/claudeDesktopProviderPresets")
    >();
  const { default: samples } = await import(
    "./claudeDesktopProviderPresets.json"
  );
  return {
    ...actual,
    claudeDesktopProviderPresets: [
      ...actual.claudeDesktopProviderPresets,
      ...samples,
    ],
  };
});

vi.mock("@/config/claudeProviderPresets", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/config/claudeProviderPresets")>();
  const { default: samples } = await import("./providerPresets.json");
  return {
    ...actual,
    providerPresets: [...actual.providerPresets, ...samples],
  };
});

vi.mock("@/config/codexProviderPresets", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/config/codexProviderPresets")>();
  const { default: samples } = await import("./codexProviderPresets.json");
  return {
    ...actual,
    codexProviderPresets: [...actual.codexProviderPresets, ...samples],
  };
});

vi.mock("@/config/geminiProviderPresets", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/config/geminiProviderPresets")>();
  const { default: samples } = await import("./geminiProviderPresets.json");
  return {
    ...actual,
    geminiProviderPresets: [...actual.geminiProviderPresets, ...samples],
  };
});

vi.mock("@/config/grokBuildProviderPresets", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/config/grokBuildProviderPresets")>();
  const { default: samples } = await import("./grokBuildProviderPresets.json");
  return {
    ...actual,
    grokBuildProviderPresets: [...actual.grokBuildProviderPresets, ...samples],
  };
});

vi.mock("@/config/openclawProviderPresets", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/config/openclawProviderPresets")>();
  const { default: samples } = await import("./openclawProviderPresets.json");
  return {
    ...actual,
    openclawProviderPresets: [...actual.openclawProviderPresets, ...samples],
  };
});

vi.mock("@/config/piProviderPresets", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/config/piProviderPresets")>();
  const { default: samples } = await import("./piProviderPresets.json");
  return {
    ...actual,
    piProviderPresets: [...actual.piProviderPresets, ...samples],
  };
});
