import { expect, test } from "@playwright/test";
import { accounts, signInAs, signOut } from "./helpers/auth";
import { go, expectHeading } from "./helpers/nav";
import { seedFixtures } from "./helpers/seed";

test.describe("Admin", () => {
  test.beforeEach(() => {
    seedFixtures();
  });

  test("tasks, matching, projects, mentors, and reports", async ({ page }) => {
    await signInAs(page, accounts.admin);
    await expectHeading(page, /Programme workspace/);

    await go(page, "/admin/tasks");
    await expect(page.getByText(/Decide the Data request/i).first()).toBeVisible({ timeout: 20_000 });

    await go(page, "/admin/matching");
    await expect(page.getByText("No proposals are waiting for matching.")).toBeVisible();

    await go(page, "/admin/projects");
    await expect(page.getByText("Flood mapping from satellite imagery").first()).toBeVisible();
    await page.locator("summary").filter({ hasText: "Invites and email" }).first().click();
    await expect(page.getByRole("button", { name: "Copy award invite" }).first()).toBeVisible();

    await go(page, "/admin/mentors");
    await expect(page.getByRole("cell", { name: /Kwame Mensah/ }).first()).toBeVisible();
    await expect(page.getByRole("cell", { name: /Zainab Ibrahim/ }).first()).toBeVisible();
    await expect(page.getByRole("combobox").filter({ hasText: "In the pool" }).first()).toBeVisible();

    await go(page, "/admin/reports");
    await expect(page.getByRole("button", { name: "Export this view" })).toBeVisible();
    await expect(page.getByText(/Flood mapping|Yoruba|Hausa/i).first()).toBeVisible();

    await signOut(page);
  });
});
