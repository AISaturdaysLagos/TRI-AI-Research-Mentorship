import { expect, test } from "@playwright/test";
import { accounts, signInAs, signOut } from "./helpers/auth";
import { go, expectHeading } from "./helpers/nav";
import { seedFixtures } from "./helpers/seed";

test.describe("Join invites and TRI AI Saturdays Award", () => {
  test.beforeEach(() => {
    seedFixtures();
  });

  test("signed-out invite pages", async ({ page }) => {
    await go(page, "/join/join-flood-researcher");
    await expectHeading(page, "Join this project.");
    await expect(page.locator("main").getByText("Flood mapping from satellite imagery")).toBeVisible();
    await expect(page.getByRole("link", { name: "Create an account" })).toBeVisible();

    await go(page, "/join/join-flood-senior");
    await expectHeading(page, "Join this project.");
    await expect(page.locator("main").getByText(/invited as a Senior Researcher/i)).toBeVisible();
  });

  test("award page as Ada", async ({ page }) => {
    await signInAs(page, accounts.ada);
    await go(page, "/award/saturdays-sample");
    await expectHeading(page, "TRI AI Saturdays Award");
    await expect(page.getByText("Flood mapping from satellite imagery").first()).toBeVisible();
    await expect(page.getByText("Ada Okonkwo")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save scoping notes" })).toBeVisible();
    await signOut(page);
  });
});
