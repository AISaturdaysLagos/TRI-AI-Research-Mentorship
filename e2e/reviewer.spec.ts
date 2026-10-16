import { expect, test } from "@playwright/test";
import { accounts, signInAs, signOut } from "./helpers/auth";
import { go, expectHeading } from "./helpers/nav";
import { seedFixtures } from "./helpers/seed";

test.describe("Reviewer", () => {
  test.beforeEach(() => {
    seedFixtures();
  });

  test("can open a scored review and cannot see admin-only nav", async ({ page }) => {
    await signInAs(page, accounts.reviewer);
    await expectHeading(page, /Programme workspace/);

    await expect(page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Tasks" })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Scoping meetings" })).toHaveCount(0);

    await go(page, "/admin/proposals/fixture-under-review");
    await expectHeading(page, "A benchmark of African language tokenisers");
    await expect(page.getByRole("spinbutton").first()).toHaveValue("16");
    await expect(page.getByRole("button", { name: "Approved for Matching" })).toBeVisible();

    await signOut(page);
  });
});
