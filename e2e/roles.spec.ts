import { expect, test, type Page } from "@playwright/test";

const ROLES = [
  {
    name: "student",
    email: process.env.PLAYWRIGHT_STUDENT_EMAIL,
    password: process.env.PLAYWRIGHT_STUDENT_PASSWORD,
    afterLogin: "/home",
  },
  {
    name: "parent",
    email: process.env.PLAYWRIGHT_PARENT_EMAIL,
    password: process.env.PLAYWRIGHT_PARENT_PASSWORD,
    afterLogin: "/parent",
  },
  {
    name: "counselor",
    email: process.env.PLAYWRIGHT_COUNSELOR_EMAIL,
    password: process.env.PLAYWRIGHT_COUNSELOR_PASSWORD,
    afterLogin: "/counselor",
  },
  {
    name: "admin",
    email: process.env.PLAYWRIGHT_ADMIN_EMAIL,
    password: process.env.PLAYWRIGHT_ADMIN_PASSWORD,
    afterLogin: "/admin",
  },
] as const;

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

test.describe("role journeys", () => {
  for (const role of ROLES) {
    test(`${role.name} reaches the signed-in workspace`, async ({ page }) => {
      test.skip(
        !role.email || !role.password,
        `No PLAYWRIGHT_${role.name.toUpperCase()}_EMAIL/PASSWORD. Role journey stays on the manual sheet.`,
      );
      await signIn(page, role.email ?? "", role.password ?? "");
      await page.waitForURL(new RegExp(`${role.afterLogin}|mfa|verify-email|verify-phone`));
      expect(page.url()).toMatch(
        new RegExp(`${role.afterLogin}|mfa|verify-email|verify-phone`),
      );
    });
  }
});
