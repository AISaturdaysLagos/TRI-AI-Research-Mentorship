import { expect, test } from "@playwright/test";
import { accounts, signInAs, signOut } from "./helpers/auth";
import { go, expectHeading } from "./helpers/nav";
import { seedFixtures } from "./helpers/seed";

test.describe("Senior · Kwame", () => {
  test.beforeEach(() => {
    seedFixtures();
  });

  test("projects, Hausa resources, and Yoruba outputs", async ({ page }) => {
    await signInAs(page, accounts.kwame);
    await expectHeading(page, "Kwame Mensah");

    await go(page, "/dashboard");
    await expect(page.getByText("Flood mapping from satellite imagery").first()).toBeVisible();
    await expect(page.getByText("Evaluating translation models for Hausa health information").first()).toBeVisible();

    await go(page, "/dashboard?tab=records");
    await expect(page.getByRole("heading", { name: "Match requests" })).toBeVisible();
    await expect(page.getByText("You do not have access to do that.")).toHaveCount(0);

    await go(page, "/dashboard/projects/fixture-hausa-pilot?panel=resources");
    await page.getByRole("button", { name: "Resources" }).click();
    await expect(page.getByText(/Hausa health leaflets/i)).toBeVisible();
    await expect(page.getByText(/requested/i).first()).toBeVisible();

    await go(page, "/dashboard/projects/fixture-yoruba-corpus?panel=outputs");
    await page.getByRole("button", { name: "Outputs" }).click();
    await expect(page.getByText("Open speech notes for Yoruba clinics").first()).toBeVisible();
    await expect(page.getByText("Consented Yoruba clinic phrases")).toBeVisible();

    await signOut(page);
  });
});
