import type { Page } from "@playwright/test";

export async function go(page: Page, hashPath: string) {
  const cleaned = hashPath.replace(/^#/, "");
  const withSlash = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
  await page.goto(`/#${withSlash}`);
  await page.waitForFunction(
    (expected) => window.location.hash.replace(/^#/, "") === expected || window.location.hash.includes(expected.split("?")[0]),
    withSlash,
  );
}

export async function expectHeading(page: Page, name: string | RegExp) {
  await page.getByRole("heading", { name }).first().waitFor({ state: "visible" });
}
