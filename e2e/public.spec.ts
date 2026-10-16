import { expect, test } from "@playwright/test";
import { go, expectHeading } from "./helpers/nav";

test.describe("Public programme", () => {
  test("home and how it works", async ({ page }) => {
    await go(page, "/");
    await expectHeading(page, /Turn promising AI research ideas/);
    await expect(page.getByRole("link", { name: "Apply as a Researcher" }).first()).toBeVisible();

    await go(page, "/how-it-works");
    await expectHeading(page, /From a research idea to a project/);
  });

  test("role pages, research, about, and apply forms", async ({ page }) => {
    await go(page, "/researchers");
    await expect(page.getByRole("heading").first()).toBeVisible();

    await go(page, "/senior-researchers");
    await expect(page.locator("main").getByRole("heading").first()).toBeVisible();

    await go(page, "/about");
    await expect(page.locator("main").getByRole("heading").first()).toBeVisible();

    await go(page, "/research");
    await expect(page.locator("main").getByText("Open speech notes for Yoruba clinics").first()).toBeVisible({
      timeout: 20_000,
    });

    await go(page, "/apply/researcher");
    await expect(page.locator("main").getByRole("heading").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" }).first()).toBeVisible();

    await go(page, "/apply/senior-researcher");
    await expect(page.locator("main").getByRole("heading").first()).toBeVisible();
  });
});
