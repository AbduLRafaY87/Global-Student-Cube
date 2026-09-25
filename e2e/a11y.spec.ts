import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { PUBLIC_ROUTES } from "./public-routes";

test.describe("automated axe T114", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`axe wcag22aa on ${route}`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.ok(), route).toBeTruthy();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    });
  }
});
