import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const base = process.env.BASE_URL || "http://127.0.0.1:3234";
const output = path.resolve(
  process.env.OUTPUT_DIR || "artifacts/console-check",
);
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_PATH || chromium.executablePath(),
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({
  viewport: { width: 1600, height: 1050 },
  deviceScaleFactor: 1,
});
const errors = [];
const checks = [];
page.on("pageerror", (error) => errors.push(error.message));
const capture = (name) =>
  page.screenshot({ path: path.join(output, name + ".png"), fullPage: true });
const read = async (route) => {
  const response = await page.request.get(base + route);
  assert.equal(response.status(), 200, route);
  return response.json();
};
const recordUrl = (record, cutoff) =>
  base +
  "/#/record?" +
  new URLSearchParams({
    source: record.source_id,
    record: record.source_record_id,
    version: record.version_id,
    cutoff,
  });
const ctRecord = {
  source_id: "clinicaltrials",
  source_record_id: "NCT00073242",
  version_id:
    "a7c4f74e0fe6c3a56d2c1dea7e03761d26189f64436428f7a5c30834d222caf6",
};
const whoRecord = {
  source_id: "who_don",
  source_record_id: "08240482-e484-4102-8447-dcbc842a5402",
  version_id:
    "369f546c12d4c2d1b30787cd4fa8b6a2d3461f984b2c0b69140b34c2fee7896e",
};
try {
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.locator(".signal-panel").waitFor({ timeout: 50000 });
  await page.locator(".record-row").first().waitFor({ timeout: 30000 });
  const snapshot = await read("/api/overview");
  assert.ok(snapshot.total > 0);
  assert.ok(
    (await page.locator(".metric").first().innerText()).includes(
      new Intl.NumberFormat("zh-CN").format(snapshot.total),
    ),
  );
  assert.equal(
    await page
      .locator(".radar-halo span")
      .evaluate((e) => getComputedStyle(e).animationPlayState),
    "running",
  );
  await page.getByRole("button", { name: "动效开启", exact: true }).click();
  assert.equal(await page.locator("html").getAttribute("data-motion"), "off");
  await page.getByRole("button", { name: "动效暂停", exact: true }).click();
  await capture("01-采集总览");
  checks.push("真实库存、默认动效与暂停");

  await page.locator(".record-row").first().click();
  await page.locator(".comparison-grid").waitFor({ timeout: 30000 });
  assert.ok((await page.locator(".facts-list .fact-row").count()) > 0);
  const firstPage = await read(
    "/api/history/records?source=clinicaltrials&limit=1",
  );
  const cutoff = firstPage.cutoff;
  await page.goto(recordUrl(ctRecord, cutoff));
  await page
    .locator(".fact-row")
    .filter({ hasText: "入组人数" })
    .click({ timeout: 30000 });
  assert.ok(
    (await page.locator(".trace-state").innerText()).includes("已定位"),
  );
  assert.ok(
    (await page.locator('.raw-panel [data-highlight="true"]').allTextContents())
      .join("")
      .includes("31"),
  );
  await capture("02-原文与结构化字段");
  await page
    .locator(".clean-panel .segmented")
    .getByRole("button", { name: "JSON", exact: true })
    .click();
  const structured = JSON.parse(
    (await page.locator(".clean-panel .code-line code").allTextContents()).join(
      "\n",
    ),
  );
  assert.equal(structured.enrollment, 31);
  assert.equal(structured.enrollment_type, "ACTUAL");
  await page.locator(".artifact-stage").filter({ hasText: "清洗正文" }).click();
  assert.ok((await page.locator(".clean-prose").innerText()).length > 100);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "导出结构化结果" }).click(),
  ]);
  const exported = JSON.parse(await fs.readFile(await download.path(), "utf8"));
  assert.equal(exported.enrollment, 31);
  checks.push("真实版本对照、字段原文定位、正文/JSON 与导出");

  await page.goto(recordUrl(whoRecord, cutoff));
  await page
    .locator(".raw-panel .segmented")
    .getByRole("button", { name: "HTML 正文", exact: true })
    .click({ timeout: 30000 });
  await page.locator(".artifact-stage").filter({ hasText: "清洗正文" }).click();
  assert.equal(await page.locator(".html-preview").getAttribute("sandbox"), "");
  assert.ok(
    (await page.locator(".html-field-select").innerText()).includes(
      "非完整网页快照",
    ),
  );
  const embedded = await page.locator(".html-preview").elementHandle();
  const embeddedFrame = await embedded.contentFrame();
  assert.ok((await embeddedFrame.locator("body").innerText()).length > 100);
  await capture("03-WHO正文对照");
  checks.push("真实 WHO 响应中 HTML 正文的隔离预览");

  await page.locator('.sidebar a[href="#/sources"]').click();
  await page.getByRole("textbox", { name: "搜索来源" }).fill("WHO");
  assert.equal(await page.locator(".source-card").count(), 1);
  await page.locator(".source-card").click();
  await page.locator(".source-detail").waitFor();
  await page.getByRole("button", { name: "查看原文 / 清洗" }).click();
  await page.locator(".record-row").first().waitFor({ timeout: 30000 });
  assert.equal(
    await page.getByRole("combobox", { name: "选择采集来源" }).inputValue(),
    "who_don",
  );
  await page
    .getByRole("combobox", { name: "选择采集来源" })
    .selectOption("clinicaltrials");
  await page.locator(".record-row").first().waitFor({ timeout: 30000 });
  const firstId = await page.locator(".record-row").first().innerText();
  const [nextResponse] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes("/api/history/records?") &&
        r.url().includes("cursor="),
    ),
    page.getByRole("button", { name: "下一页采集资料" }).click(),
  ]);
  const nextPage = await nextResponse.json();
  await page
    .getByText(nextPage.items[0].source_record_id, { exact: true })
    .first()
    .waitFor();
  assert.notEqual(
    await page.locator(".record-row").first().innerText(),
    firstId,
  );
  assert.ok((await page.locator(".pagination").innerText()).includes("2"));
  await capture("04-采集资料");
  checks.push("信源筛选、来源资料联动与固定截止时间分页");

  await page.locator('.sidebar a[href="#/activity"]').click();
  await page.locator(".task-choice").first().waitFor();
  await page.locator(".task-choice").last().click();
  assert.ok(
    (await page.locator(".task-checkpoints").innerText()).includes("最近检查"),
  );
  await capture("05-任务流水线");
  await page.locator('.sidebar a[href="#/delivery"]').click();
  await page.locator(".delivery-panel").waitFor();
  assert.ok(
    (await page.locator(".metric").first().innerText()).includes(
      new Intl.NumberFormat("zh-CN").format(snapshot.sync.synced),
    ),
  );
  await capture("06-知识交付");
  await page.locator('.sidebar a[href="#/documents"]').click();
  await page.locator(".document-title").first().waitFor({ timeout: 30000 });
  await page.locator(".document-title").first().click();
  await page.getByRole("dialog").waitFor();
  await page.locator(".legacy-raw").waitFor({ timeout: 30000 });
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/api/documents?") && r.url().includes("page=2"),
    ),
    page.getByRole("button", { name: "下一页", exact: true }).click(),
  ]);
  await page
    .locator(".table-loading")
    .waitFor({ state: "hidden", timeout: 30000 });
  assert.ok((await page.locator(".pagination").innerText()).startsWith("2"));
  checks.push("任务详情、知识交付、业务资料详情与分页");

  await page.locator('.sidebar a[href="#/overview"]').click();
  await page.locator(".signal-panel").waitFor();
  await page.getByRole("button", { name: "切换浅色模式" }).click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  await capture("07-浅色模式");
  await page.getByRole("button", { name: "切换深色模式" }).click();
  await page.route("**/api/overview", (route) => route.abort());
  await page.getByRole("button", { name: "刷新", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "上次成功快照" }).waitFor();
  assert.ok(
    (await page.locator(".metric").first().innerText()).includes(
      new Intl.NumberFormat("zh-CN").format(snapshot.total),
    ),
  );
  assert.equal(await page.locator(".wire-particle").count(), 0);
  await page.unroute("**/api/overview");
  await page.getByRole("button", { name: "重新连接", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "上次成功快照" })
    .waitFor({ state: "hidden", timeout: 30000 });
  checks.push("深浅主题与断线保留快照、停止运行流光");

  let activeRequests = 0;
  const inspectRequest = (request) => {
    if (request.url().includes("__ui_probe")) activeRequests++;
  };
  page.on("request", inspectRequest);
  await page.route("**/api/history/versions/ui-security-check**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        record: {
          source_id: "who_don",
          source_record_id: "ui-check",
          version_id: "ui-security-check",
          title: "浏览器隔离检查",
          raw_media_type: "text/html",
          raw_content:
            '<article><h1>保存的正文</h1><script>parent.__rawMarkupExecuted=true</script><img src="/__ui_probe" onerror="parent.__rawMarkupExecuted=true"><a href="javascript:alert(1)">链接</a></article>',
          clean_text: "保存的正文",
          facts: {},
          field_locators: {},
        },
      }),
    }),
  );
  await page.goto(
    recordUrl(
      {
        source_id: "who_don",
        source_record_id: "ui-check",
        version_id: "ui-security-check",
      },
      cutoff,
    ),
  );
  await page.locator(".html-preview").waitFor();
  const frame = await (
    await page.locator(".html-preview").elementHandle()
  ).contentFrame();
  await frame.getByRole("heading", { name: "保存的正文" }).waitFor();
  assert.equal(await frame.locator("script,iframe,object").count(), 0);
  assert.equal(
    await frame.locator("[onerror],[onclick],[src],[href]").count(),
    0,
  );
  assert.equal(
    await page.evaluate(() => window.__rawMarkupExecuted),
    undefined,
  );
  assert.equal(activeRequests, 0);
  await page.unroute("**/api/history/versions/ui-security-check**");
  page.off("request", inspectRequest);
  checks.push("原文 HTML 不执行脚本、不加载外部资源（仅浏览器内隔离响应）");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/#/overview");
  await page.locator(".signal-panel").waitFor({ timeout: 40000 });
  const mobile = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  assert.ok(mobile.scroll <= mobile.width + 1, JSON.stringify(mobile));
  await capture("08-手机总览");
  await page.getByRole("button", { name: "打开导航" }).click();
  await page.locator('.sidebar a[href="#/records"]').click();
  await page.locator(".record-row").first().waitFor({ timeout: 30000 });
  await page.locator(".record-row").first().click();
  await page.locator(".comparison-grid").waitFor({ timeout: 30000 });
  assert.equal(
    await page
      .locator(".comparison-grid")
      .evaluate(
        (e) => getComputedStyle(e).gridTemplateColumns.split(" ").length,
      ),
    1,
  );
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await capture("09-手机原文对照");
  checks.push("手机导航、无横向溢出、上下排列的原文对照");
  assert.deepEqual(errors, []);
  const result = {
    passed: true,
    at: new Date().toISOString(),
    base,
    checks,
    browserErrors: errors,
    mobile,
  };
  await fs.writeFile(
    path.join(output, "result.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  await capture("failure").catch(() => {});
  const result = {
    passed: false,
    checks,
    error: error.message,
    browserErrors: errors,
  };
  await fs.writeFile(
    path.join(output, "result.json"),
    JSON.stringify(result, null, 2),
  );
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
