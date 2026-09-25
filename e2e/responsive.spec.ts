import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
] as const;

const SCREENS = ["/", "/tour", "/explore/universities", "/login", "/register"] as const;

test.describe("responsive key screens", () => {
  for (const viewport of VIEWPORTS) {
    for (const route of SCREENS) {
      test(`${route} at ${viewport.width}px does not overflow horizontally`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        const response = await page.goto(route);
        expect(response?.ok(), route).toBeTruthy();
        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          return {
            scrollWidth: doc.scrollWidth,
            clientWidth: doc.clientWidth,
          };
        });
        expect(
          overflow.scrollWidth,
          `${route} @${viewport.width}: ${overflow.scrollWidth} > ${overflow.clientWidth}`,
        ).toBeLessThanOrEqual(overflow.clientWidth + 1);
      });
    }
  }
});
