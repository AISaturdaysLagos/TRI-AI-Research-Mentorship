import { expect, test } from "@playwright/test";
import { accounts, signInAs, signOut } from "./helpers/auth";
import { go, expectHeading } from "./helpers/nav";
import { seedFixtures } from "./helpers/seed";

test.describe("Researcher · Ada", () => {
  test.beforeEach(() => {
    seedFixtures();
  });

  test("dashboard, award, project panels, and first-person email", async ({ page }) => {
    await signInAs(page, accounts.ada);
    await expectHeading(page, "Ada Okonkwo");
    await expect(page.getByRole("heading", { name: "Flood mapping from satellite imagery" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Open this invite" })).toBeVisible();

    await page.locator("summary").filter({ hasText: "Email TRI AI" }).first().click();
    await page.locator("summary").filter({ hasText: "Message" }).first().click();
    await expect(page.locator(".email-support pre").first()).toContainText("I have uploaded");
    await expect(page.locator(".email-support pre").first()).toContainText("Ada Okonkwo");

    await go(page, "/dashboard/projects/fixture-flood-project?panel=work");
    await page.getByRole("button", { name: "Work" }).click();
    await expect(page.getByLabel("New task")).toBeVisible();

    const workspaceNav = page.getByRole("navigation", { name: "Project workspace" });
    for (const panel of ["Overview", "Charter", "Milestones", "Progress", "Resources", "Outputs", "Drive"] as const) {
      await workspaceNav.getByRole("button", { name: new RegExp(`^${panel}`) }).click();
    }
    await workspaceNav.getByRole("button", { name: /^Milestones/ }).click();
    await expect(page.getByText("Collect ground reports for one flood event")).toBeVisible();

    await go(page, "/dashboard?tab=records");
    await expect(page.getByRole("link", { name: "Crop disease detection from phone photos" })).toBeVisible();

    await signOut(page);
  });
});
