import type { Page } from "@playwright/test";
import { go } from "./nav";

export const accounts = {
  ada: "Researcher · Ada",
  chidi: "Researcher · Chidi",
  kwame: "Senior · Kwame",
  reviewer: "Reviewer",
  admin: "Admin",
} as const;

export async function signInAs(page: Page, label: string) {
  await go(page, "/login");
  await page.getByRole("button", { name: label, exact: true }).click();
  await page.waitForURL(/#\/(dashboard|admin)/);
}

export async function signOut(page: Page) {
  const account = page.getByRole("button", { name: "Account" });
  if (await account.isVisible().catch(() => false)) {
    await account.click();
    await page.getByRole("button", { name: "Sign out" }).click();
  }
  await page.getByRole("link", { name: "Sign in" }).first().waitFor({ state: "visible" });
}

export async function registerWithRole(
  page: Page,
  input: { email: string; password: string; name: string; role: "researcher" | "senior_researcher"; next?: string },
) {
  const query = new URLSearchParams({
    mode: "create",
    email: input.email,
    name: input.name,
  });
  if (input.next) query.set("next", input.next);
  if (input.role === "senior_researcher") query.set("role", "senior_researcher");
  await go(page, `/login?${query.toString()}`);
  await page.getByLabel("Email").fill(input.email);
  await page.getByLabel("Password").fill(input.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByRole("heading", { name: "Choose how you are joining." }).waitFor({ state: "visible" });
  await page.getByLabel("Name").fill(input.name);
  if (input.role === "senior_researcher") {
    await page.locator(".role-pick button").filter({ hasText: "Senior Researcher" }).click();
  } else {
    await page.locator(".role-pick button").filter({ hasText: "Researcher" }).first().click();
  }
  await page.getByRole("button", { name: "Continue" }).click();
}
