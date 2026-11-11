import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.CONSOLE_URL || "http://127.0.0.1:3234";
const executablePath =
  process.env.BROWSER_PATH ||
  "/home/zk_admin/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome";
await fs.mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1600, height: 1100 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const checks = [];
try {
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.locator(".metrics-grid").waitFor({ timeout: 50000 });
  const snapshot = await (
    await page.request.get(`${base}/api/overview`)
  ).json();
  await page.waitForTimeout(1400);
  assert(
    (await page.locator(".metric").first().innerText()).includes(
      snapshot.total.toLocaleString("zh-CN"),
    ),
  );
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth),
    1600,
  );
  checks.push("桌面页面展示真实 API 总量，无横向溢出");

  await page.getByRole("button", { name: "演示动效", exact: true }).click();
  await page.locator(".flowing").first().waitFor();
  assert((await page.locator(".flowing").count()) > 0);
  assert(
    await page
      .getByText("动效演示 · 不启动采集任务", { exact: true })
      .isVisible(),
  );
  await page.screenshot({ path: "artifacts/desktop.png", fullPage: true });
  await page.getByRole("button", { name: "停止演示", exact: true }).click();
  checks.push("流程动效可切换，有明确演示标识");

  await page.locator(".nav-item").filter({ hasText: "数据来源" }).click();
  await page
    .getByRole("textbox", { name: "搜索来源", exact: true })
    .fill("nmpa");
  await page.waitForFunction(
    () => document.querySelectorAll(".source-card").length === 1,
  );
  assert.equal(await page.locator(".source-card").count(), 1);
  await page.locator(".source-card").click();
  await page.getByRole("dialog").waitFor();
  assert((await page.getByRole("dialog").innerText()).includes("nmpa"));
  await page.screenshot({
    path: "artifacts/source-detail.png",
    fullPage: false,
  });
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  checks.push("来源筛选、详情下钻、Esc 关闭正常");

  await page.locator(".nav-item").filter({ hasText: "资料浏览" }).click();
  await page
    .locator(".documents-table tbody tr")
    .first()
    .waitFor({ timeout: 25000 });
  await page.locator(".document-title").first().click();
  await page.locator(".doc-detail-title").waitFor({ timeout: 25000 });
  assert((await page.locator(".doc-detail-title").innerText()).length > 0);
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "下一页", exact: true }).click();
  await page.waitForFunction(() =>
    document.querySelector(".pagination")?.textContent?.includes("2 /"),
  );
  checks.push("资料详情和服务端分页正常");

  await page.locator(".nav-item").filter({ hasText: "运行与活动" }).click();
  if (
    snapshot.capabilities.collectionTasks &&
    snapshot.collection?.tasks.length
  ) {
    await page.locator(".task-row").first().waitFor();
    assert.equal(
      await page.locator(".task-row").count(),
      snapshot.collection.tasks.length,
    );
    await page.locator(".task-row").first().click();
    await page.getByRole("dialog").waitFor();
    assert(
      (await page.getByRole("dialog").innerText()).includes(
        "最近一批已记录的结果",
      ),
    );
    await page.screenshot({
      path: "artifacts/task-detail.png",
      fullPage: false,
    });
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
  }
  checks.push("采集监测任务和批次口径正常");

  await page.locator(".nav-item").filter({ hasText: "采集总览" }).click();
  await page.route("**/api/overview", (route) => route.abort("failed"));
  await page.getByRole("button", { name: "刷新数据", exact: true }).click();
  await page.locator(".connection-banner").waitFor();
  await page.waitForFunction(
    (total) => document.querySelector(".metric")?.textContent?.includes(total),
    snapshot.total.toLocaleString("zh-CN"),
  );
  checks.push("断线提示明确，保留上次成功快照");
  await page.unroute("**/api/overview");

  const mobile = await context.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto(base, { waitUntil: "domcontentloaded" });
  await mobile.locator(".metrics-grid").waitFor({ timeout: 50000 });
  await mobile.waitForTimeout(1200);
  assert.equal(
    await mobile.evaluate(() => document.documentElement.scrollWidth),
    390,
  );
  await mobile.screenshot({ path: "artifacts/mobile.png", fullPage: true });
  await mobile.getByRole("button", { name: "打开导航", exact: true }).click();
  await mobile.locator(".nav-item").filter({ hasText: "数据来源" }).click();
  await mobile.locator(".source-card").first().waitFor();
  await mobile.waitForFunction(
    () => !document.querySelector(".sidebar")?.classList.contains("open"),
  );
  assert(
    !(await mobile
      .locator(".sidebar")
      .evaluate((e) => e.classList.contains("open"))),
  );
  checks.push("手机布局无横向溢出，导航与页面切换正常");
  assert.deepEqual(errors, []);
  const result = {
    at: new Date().toISOString(),
    total: snapshot.total,
    sourceCount: snapshot.sources.length,
    taskCount: snapshot.collection?.tasks.length || 0,
    checks,
    browserErrors: errors,
  };
  await fs.writeFile(
    "artifacts/smoke-result.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
