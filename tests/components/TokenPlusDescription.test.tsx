import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import zh from "@/i18n/locales/zh.json";
import { ApiKeySection } from "@/components/providers/forms/shared/ApiKeySection";

describe("Provider key instructions", () => {
  it("shows the saved instruction without displaying a legacy promotion", async () => {
    const i18n = createInstance();
    await i18n.init({ lng: "zh", resources: { zh: { translation: zh } } });
    render(
      <I18nextProvider i18n={i18n}>
        <ApiKeySection
          value=""
          onChange={() => {}}
          category="aggregator"
          shouldShowLink
          websiteUrl="https://gateway.example"
          hint="管理密钥"
          partnerPromotionKey="legacy"
        />
      </I18nextProvider>,
    );
    expect(screen.getByText("管理密钥")).toBeVisible();
    expect(screen.queryByText(/推广|邀请码/)).toBeNull();
  });
});
