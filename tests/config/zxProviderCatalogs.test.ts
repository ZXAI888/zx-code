import { describe, expect, it } from "vitest";
import { providerPresets } from "@/config/claudeProviderPresets";
import { claudeDesktopProviderPresets } from "@/config/claudeDesktopProviderPresets";
import { codexProviderPresets } from "@/config/codexProviderPresets";
import { geminiProviderPresets } from "@/config/geminiProviderPresets";
import { hermesProviderPresets } from "@/config/hermesProviderPresets";
import {
  grokBuildProviderPresets,
  grokBuildOfficialPreset,
} from "@/config/grokBuildProviderPresets";
import { openclawProviderPresets } from "@/config/openclawProviderPresets";
import { opencodeProviderPresets } from "@/config/opencodeProviderPresets";
import { piProviderPresets } from "@/config/piProviderPresets";
import { ompProviderPresets } from "@/config/ompProviderPresets";
import { mcodeProviderPresets } from "@/config/mcodeProviderPresets";
import {
  dshProviderPresets,
  dshAccountPreset,
} from "@/config/dshProviderPresets";
import {
  kimiProviderPresets,
  kimiAccountPreset,
} from "@/config/kimiProviderPresets";
import {
  copilotProviderPresets,
  copilotOfficialPreset,
} from "@/config/copilotProviderPresets";
import {
  workbuddyProviderPresets,
  workbuddyOfficialPreset,
} from "@/config/workbuddyProviderPresets";
import {
  universalProviderPresets,
  createUniversalProviderFromPreset,
} from "@/config/universalProviderPresets";
const catalogs = [
  ...providerPresets,
  ...claudeDesktopProviderPresets,
  ...codexProviderPresets,
  ...geminiProviderPresets,
  ...hermesProviderPresets,
  ...grokBuildProviderPresets,
  ...openclawProviderPresets,
  ...opencodeProviderPresets,
  ...piProviderPresets,
  ...ompProviderPresets,
  ...mcodeProviderPresets,
  ...dshProviderPresets,
  ...kimiProviderPresets,
  ...copilotProviderPresets,
  ...workbuddyProviderPresets,
  grokBuildOfficialPreset,
  dshAccountPreset,
  kimiAccountPreset,
  copilotOfficialPreset,
  workbuddyOfficialPreset,
];

describe("ZX Code provider catalogs", () => {
  it("ships only the first-party login and API entries", () => {
    expect(catalogs.map((p) => p.name)).toContain("OpenAI Official");
    expect(catalogs.map((p) => p.name)).toContain("Claude Official");
    for (const preset of catalogs) {
      expect(preset.category).toBe("official");
      expect(preset).not.toHaveProperty("partnerPromotionKey");
      expect(preset).not.toHaveProperty("isPartner", true);
      if (preset.websiteUrl) expect(new URL(preset.websiteUrl).search).toBe("");
    }
  });
  it("creates a custom gateway using the address entered by the user", () => {
    expect(universalProviderPresets).toHaveLength(1);
    const [template] = universalProviderPresets;
    expect(template.isCustomTemplate).toBe(true);
    const gateway = createUniversalProviderFromPreset(
      template,
      "my-gateway",
      "https://private.example/v1",
      "example-key",
      "My Gateway",
    );
    expect(gateway).toMatchObject({
      name: "My Gateway",
      baseUrl: "https://private.example/v1",
    });
  });
});
