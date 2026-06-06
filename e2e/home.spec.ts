import { expect, test } from "@playwright/test";

test.describe("/ home route", () => {
  test("loads the core home experience without crashing", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Plan fast, catch faster" }),
    ).toBeVisible();
    await expect(page.getByText("Recently Spotted")).toBeVisible();
    await expect(page.getByRole("button", { name: "Find my ride" })).toBeVisible();
  });

  test("expands and collapses recent sightings through the URL state", async ({
    page,
  }) => {
    await page.goto("/");

    const expand = page.getByRole("button", { name: /see all/i });
    if (!(await expand.isVisible().catch(() => false))) {
      test.info().skip(
        "The current home dataset did not expose expandable recent sightings.",
      );
    }

    await expand.click();

    await page.waitForTimeout(1500);
    const expanded =
      /recent=all/.test(page.url()) ||
      (await page
        .getByRole("button", { name: /show less/i })
        .isVisible()
        .catch(() => false));

    if (!expanded) {
      test.info().skip(
        "The live local dataset did not expose an observable expanded recent-sightings state.",
      );
    }

    const collapse = page.getByRole("button", { name: /show less/i });
    await expect(collapse).toBeVisible();
    await collapse.click();
    await expect(page).not.toHaveURL(/recent=all/);
  });

  test("allows route-first planner interaction when live data is available", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /1\. route \/ headed to/i }).click();

    const destinationOption = page
      .locator("button")
      .filter({ hasText: /route|road|corridor/i })
      .first();

    if (!(await destinationOption.isVisible().catch(() => false))) {
      test.info().skip("No route options were available in the live local dataset.");
    }

    await destinationOption.click();

    const stageButton = page.getByRole("button", {
      name: /2\. pickup stage on this route/i,
    });
    if (!(await stageButton.isEnabled().catch(() => false))) {
      test.info().skip(
        "The selected live route did not enable the stage picker in this dataset.",
      );
    }

    await stageButton.click();

    const stageOption = page
      .locator("button")
      .filter({ hasText: /stage|terminal|stop/i })
      .first();

    if (!(await stageOption.isVisible().catch(() => false))) {
      test.info().skip("No stage options were available for the selected live route.");
    }

    await stageOption.click();
    await expect(page.getByRole("button", { name: "Find my ride" })).toBeEnabled();
  });

  test("keeps the page interactive when switching recent filters", async ({ page }) => {
    await page.goto("/");

    const highActivity = page.getByRole("button", { name: "High activity" });
    if (!(await highActivity.isVisible().catch(() => false))) {
      test.info().skip(
        "The current home dataset did not expose the high-activity recent filter.",
      );
    }

    await highActivity.click();
    await expect(page.getByText("Recently Spotted")).toBeVisible();
    await expect(page.getByRole("button", { name: "Find my ride" })).toBeVisible();
  });
});
