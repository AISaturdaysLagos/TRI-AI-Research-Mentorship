import { expect, test } from "@playwright/test";
import { accounts, signInAs, signOut } from "../helpers/auth";
import { go } from "../helpers/nav";
import { seedFixtures } from "../helpers/seed";

test.describe("Project workspace writes", () => {
  test.beforeEach(() => {
    seedFixtures();
  });

  test("researcher adds a work task and admin decides a resource", async ({ page }) => {
    const title = `E2E task ${Date.now()}`;

    await signInAs(page, accounts.ada);
    await go(page, "/dashboard/projects/fixture-flood-project?panel=work");
    await page.getByRole("button", { name: "Work" }).click();
    await page.getByLabel("New task").fill(title);
    await page.getByLabel("New task").press("Enter");
    await expect(page.getByRole("textbox", { name: "Task" })).toHaveValue(title);

    await signOut(page);
    await signInAs(page, accounts.admin);
    await go(page, "/dashboard/projects/fixture-hausa-pilot?panel=resources");
    await page.getByRole("button", { name: "Resources" }).click();
    await expect(page.getByText(/Hausa health leaflets/i)).toBeVisible();
    await page.locator("summary").filter({ hasText: "Record a decision" }).click();
    await page.locator("select").filter({ has: page.locator('option[value="approved"]') }).first().selectOption("approved");
    await page.getByRole("button", { name: "Save decision" }).click();
    await expect(page.getByText("Resource decision saved.")).toBeVisible();
  });
});
