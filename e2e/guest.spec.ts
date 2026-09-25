import { expect, test } from "@playwright/test";
import { PUBLIC_ROUTES } from "./public-routes";

test.describe("guest journeys T001–T004", () => {
  test("guest home and tour load without a session", async ({ page }) => {
    const home = await page.goto("/");
    expect(home?.ok()).toBeTruthy();
    await expect(page.locator("main#main-content")).toBeVisible();
    await expect(
      page.locator("#main-content").getByRole("link", { name: "Start my journey" }),
    ).toBeVisible();

    const tour = await page.goto("/tour");
    expect(tour?.ok()).toBeTruthy();
    await expect(page.locator("main#main-content")).toBeVisible();
  });

  test("guest match and catalog stay on public chrome", async ({ page }) => {
    await page.goto("/quick-match");
    await expect(page.locator("main#main-content")).toBeVisible();
    await page.goto("/explore/universities");
    await expect(page.locator("main#main-content")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Public" })).toBeVisible();
  });

  test("guest cannot open a dashboard route", async ({ page }) => {
    await page.goto("/home");
    await expect(page).toHaveURL(/login|verify-email|register/);
  });

  test("every listed public route returns success", async ({ page }) => {
    for (const route of PUBLIC_ROUTES) {
      const response = await page.goto(route);
      expect(response?.ok(), route).toBeTruthy();
    }
  });
});
