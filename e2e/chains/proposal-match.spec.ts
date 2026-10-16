import { expect, test } from "@playwright/test";
import { accounts, signInAs, signOut } from "../helpers/auth";
import { go } from "../helpers/nav";
import { seedFixtures } from "../helpers/seed";

test.describe("Proposal to match introduction", () => {
  test.beforeEach(() => {
    seedFixtures();
  });

  test("admin approves, Kwame accepts, admin introduces", async ({ page }) => {
    await signInAs(page, accounts.admin);
    await go(page, "/admin/proposals/fixture-under-review");
    await expect(page.getByRole("heading", { name: "A benchmark of African language tokenisers" })).toBeVisible();
    await page.getByRole("button", { name: "Approved for Matching" }).click();
    await expect(page.getByText("Decision recorded.")).toBeVisible();

    await go(page, "/admin/matching");
    await page.getByLabel("Proposal").selectOption({ label: "A benchmark of African language tokenisers" });
    await page.getByRole("button", { name: /Kwame Mensah/ }).click();
    await page.getByRole("button", { name: "Send opportunity" }).click();
    await expect(page.getByText("Sent.")).toBeVisible();

    await signOut(page);
    await signInAs(page, accounts.kwame);
    await go(page, "/dashboard?tab=records");
    const card = page.locator("article.opportunity").filter({
      has: page.getByRole("heading", { name: "A benchmark of African language tokenisers" }),
    });
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "Interested", exact: true }).click();
    await expect(card.locator(".email-support, pre").or(card.getByText(/interested/i)).first()).toBeVisible();

    await signOut(page);
    await signInAs(page, accounts.admin);
    await go(page, "/admin/matching");
    await page.getByLabel("Proposal").selectOption({ label: "A benchmark of African language tokenisers" });
    await page.getByRole("button", { name: "Introduce" }).click();
    await expect(
      page.getByText(/Introduced Kwame|TRI AI Research Project Introduction — A benchmark/i).first(),
    ).toBeVisible();
  });
});
