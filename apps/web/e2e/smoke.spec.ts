import { expect, test } from "@playwright/test";

test("login page renders in pt-BR at phone width", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Pago x Feito" })).toBeVisible();
  await expect(page.getByLabel("Seu e-mail")).toBeVisible();
  await expect(page.getByRole("button", { name: "Receber link de acesso" })).toBeVisible();
  // No horizontal overflow at 390px
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

test("app routes redirect anonymous users to login", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp/);
});

test("manifest is served", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBe(true);
  const json = await res.json();
  expect(json.name).toBe("Pago x Feito");
  expect(json.display).toBe("standalone");
});
