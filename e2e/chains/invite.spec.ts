import { expect, test } from "@playwright/test";
import { registerWithRole, signOut } from "../helpers/auth";
import { go } from "../helpers/nav";
import { seedFixtures } from "../helpers/seed";

test.describe("Project invite join", () => {
  test.beforeEach(() => {
    seedFixtures();
  });

  test("new Senior Researcher joins the flood project", async ({ page }) => {
    const stamp = Date.now();
    const email = `e2e.senior.${stamp}@example.com`;
    const name = `E2E Senior ${stamp}`;

    await registerWithRole(page, {
      email,
      password: "fixture-pass",
      name,
      role: "senior_researcher",
      next: "/join/join-flood-senior",
    });

    await page.waitForURL(/#\/join\/join-flood-senior/);
    await expect(page.getByRole("heading", { name: "Join this project." })).toBeVisible();
    await page.getByRole("button", { name: "Join this project" }).click();
    await expect(page.getByText("You have joined this project.")).toBeVisible({ timeout: 20_000 });

    await go(page, "/dashboard");
    await expect(page.getByText("Flood mapping from satellite imagery").first()).toBeVisible();

    await signOut(page);
  });
});
