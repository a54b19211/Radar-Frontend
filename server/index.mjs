import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = express();
const distDirectory = path.resolve(
  root,
  process.env.CONSOLE_DIST_DIR || "dist",
);
app.disable("x-powered-by");
const base = (process.env.FABRIC_URL || "http://127.0.0.1:8100").replace(
  /\/$/,
  "",
);
const label = process.env.FABRIC_LABEL || "4022 现役资料库";
const historyToken = process.env.FABRIC_HISTORY_TOKEN_FILE
  ? readFileSync(process.env.FABRIC_HISTORY_TOKEN_FILE, "utf8").trim()
  : "";
const telemetryUrl = process.env.COLLECTION_STATUS_URL;
let snapshot = null;
let inFlight = null;
let refreshed = 0;

async function read(url) {
  const headers = { Accept: "application/json" };
  if (historyToken && url.startsWith(base + "/api/history/"))
    headers.Authorization = `Bearer ${historyToken}`;
  if (url === telemetryUrl && process.env.COLLECTION_READ_TOKEN) {
    headers.Authorization = `Bearer ${process.env.COLLECTION_READ_TOKEN}`;
  }
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

const specs = {
  nmpa: {
    name: "国家药品监督管理局",
    short: "NMPA",
    category: "监管政策",
    color: "#4b91e6",
    description: "药品监管公告、政策与公开信息",
    url: "https://www.nmpa.gov.cn/",
  },
  cde: {
    name: "国家药监局药审中心",
    short: "CDE",
    category: "药品审评",
    color: "#a58be0",
    description: "药品审评与研发相关公开资料",
    url: "https://www.cde.org.cn/",
  },
  cde_xxgk: {
    name: "药审中心 · 信息公开",
    short: "CDE",
    category: "审评公开",
    color: "#58bda6",
    description: "药品审评信息公开栏目",
    url: "https://www.cde.org.cn/",
  },
  cpu: {
    name: "校内医药资料",
    short: "CPU",
    category: "研究资料",
    color: "#dfa95c",
    description: "当前库中来源标识为 CPU 的资料",
    url: null,
  },
  clinicaltrials: {
    name: "ClinicalTrials.gov",
    short: "CT",
    category: "临床试验",
    color: "#4b91e6",
    description: "临床试验注册信息",
    url: "https://clinicaltrials.gov/",
  },
  chictr: {
    name: "中国临床试验注册中心",
    short: "ChiCTR",
    category: "临床试验",
    color: "#a58be0",
    description: "中国临床试验注册信息",
    url: "https://www.chictr.org.cn/",
  },
  who_don: {
    name: "WHO 疾病暴发通报",
    short: "WHO",
    category: "公共卫生",
    color: "#4b91e6",
    description: "世界卫生组织疾病暴发通报",
    url: "https://www.who.int/emergencies/disease-outbreak-news",
  },
  europe_pmc: {
    name: "Europe PMC 文献",
    short: "PMC",
    category: "科研文献",
    color: "#d49c63",
    description: "生命科学文献元数据与摘要",
    url: "https://europepmc.org/",
  },
  fda_api_drug_label: {
    name: "FDA 药品标签",
    short: "FDA",
    category: "监管资料",
    color: "#6f9bc6",
    description: "FDA 药品标签公开库存",
    url: "https://open.fda.gov/apis/drug/label/",
  },
  fda_api_enforcement: {
    name: "FDA 执法与召回",
    short: "FDA",
    category: "监管资料",
    color: "#ce8d80",
    description: "FDA 执法与召回公开库存",
    url: "https://open.fda.gov/apis/drug/enforcement/",
  },
  fda_crl: {
    name: "FDA 完整回复函",
    short: "CRL",
    category: "监管资料",
    color: "#ad93c6",
    description: "公开信函及原生字段",
    url: "https://open.fda.gov/",
  },
  unknown: {
    name: "来源尚未归类",
    short: "OTHER",
    category: "待归类",
    color: "#9baab4",
    description: "业务资料库中尚未归类来源的条目",
    url: null,
  },
};

async function sourceTelemetry() {
  if (!historyToken)
    return { sources: [], tasks: [], connected: false, failed: 0 };
  const directory = await read(base + "/api/history/sources");
  const sources = directory.sources.filter(
    (s) =>
      s.read_enabled &&
      ["legacy_database", "public_api"].includes(s.acquisition_channel),
  );
  const tasks = [];
  let failed = 0;
  for (let i = 0; i < sources.length; i += 4) {
    await Promise.all(
      sources.slice(i, i + 4).map(async (source) => {
        try {
          const health = await read(
            `${base}/api/history/source-health?source_id=${encodeURIComponent(source.source_id)}`,
          );
          source.health = {
            observedAt: health.observed_at,
            collection: health.collection,
            publication: health.publication,
          };
          for (const watch of health.watches || []) {
            const status = watch.stale
              ? "stale"
              : watch.active_run_id
                ? "running"
                : ["failed", "idle", "queued", "running"].includes(watch.state)
                  ? watch.state
                  : "unknown";
            tasks.push({
              id: `${source.source_id}:${watch.watch_id}`,
              source: source.source_id,
              title: `${specs[source.source_id]?.name || source.name} · ${watch.watch_id}`,
              status,
              rawStatus: watch.state,
              startedAt: watch.last_check_at || watch.cycle_started_at,
              lastSuccessAt: watch.last_success_at,
              lastBatchAt: watch.last_page_at,
              nextAt: watch.next_check_at,
              scope: watch.scope,
              cyclePages: watch.cycle_pages,
              activeRunId: watch.active_run_id,
              processed: watch.last_coverage?.adopted_count ?? null,
              total: null,
              countScope: "last_batch",
              newVersions: watch.last_coverage?.new_version_count ?? null,
              sameVersions: watch.last_coverage?.same_version_count ?? null,
              requests: watch.last_coverage?.requests ?? null,
              stopReason: watch.last_coverage?.stop_reason,
              error: watch.error?.message || null,
            });
          }
        } catch {
          source.health = null;
          failed++;
        }
      }),
    );
  }
  return { sources, tasks, connected: true, failed };
}

async function collect() {
  const endpoints = {
    documents: "/api/documents?page=1&page_size=20",
    sites: "/api/documents/sites",
    extraction: "/api/extraction/stats",
    sync: "/api/weknora/stats",
  };
  if (process.env.FABRIC_PIPELINE_OVERVIEW === "true")
    endpoints.pipeline = "/api/agent/pipeline/overview";
  const telemetryRequest = sourceTelemetry().catch(() => ({
    sources: [],
    tasks: [],
    connected: false,
    failed: 1,
  }));
  const results = await Promise.allSettled(
    Object.values(endpoints).map((p) => read(base + p)),
  );
  const data = Object.fromEntries(
    Object.keys(endpoints).map((key, i) => [
      key,
      results[i].status === "fulfilled" ? results[i].value : null,
    ]),
  );
  if (!data.documents || !Number.isFinite(data.documents.total))
    throw new Error("资料接口暂时不可用");
  const warnings = Object.keys(endpoints).filter(
    (_, i) => results[i].status === "rejected",
  );
  const stage = data.pipeline?.stages?.find((s) => s.key === "extraction");
  const counts = {};
  for (const values of Object.values(stage?.by_site || {})) {
    for (const [site, count] of Object.entries(values))
      counts[site] = (counts[site] || 0) + Number(count);
  }
  const ids = data.sites?.sites || Object.keys(counts);
  // The site histogram is usable only when it covers the same document total.
  if (
    Object.values(counts).reduce((a, b) => a + b, 0) !== data.documents.total
  ) {
    for (let i = 0; i < ids.length; i += 4) {
      await Promise.all(
        ids.slice(i, i + 4).map(async (id) => {
          try {
            counts[id] = (
              await read(
                `${base}/api/documents?page=1&page_size=1&source_site=${encodeURIComponent(id)}`,
              )
            ).total;
          } catch {
            counts[id] = null;
          }
        }),
      );
    }
  }
  const telemetry = await telemetryRequest;
  if (telemetry.failed) warnings.push("collection");
  let collection = telemetry.connected
    ? { tasks: telemetry.tasks, failedSources: telemetry.failed }
    : null;
  if (telemetryUrl) {
    try {
      collection = await read(telemetryUrl);
    } catch {
      warnings.push("collection");
    }
  }
  const sourceIds = [
    ...new Set([...ids, ...telemetry.sources.map((s) => s.source_id)]),
  ];
  const sources = sourceIds
    .map((id) => ({
      id,
      ...(specs[id] || {
        name: id,
        short: id.slice(0, 5).toUpperCase(),
        category: "其他来源",
        color: "#7c9aaf",
        description: "当前资料库中的数据来源",
        url: null,
      }),
      count: counts[id] ?? null,
      historyOnly: !ids.includes(id),
      historyAvailable: telemetry.sources.some((s) => s.source_id === id),
      health: telemetry.sources.find((s) => s.source_id === id)?.health || null,
      extraction: Object.fromEntries(
        Object.entries(stage?.by_site || {}).map(([state, values]) => [
          state,
          values[id] || 0,
        ]),
      ),
    }))
    .sort((a, b) => (b.count ?? -1) - (a.count ?? -1));
  return {
    observedAt: new Date().toISOString(),
    dataset: {
      label,
      host: process.env.FABRIC_HOST_LABEL || "4022",
      scope: "业务资料库内未删除条目；不含独立 History 库，也不跨库相加去重",
      apiConnected: true,
    },
    total: data.documents.total,
    sources,
    extraction: data.extraction,
    sync: data.sync,
    documents: data.documents.items,
    collection,
    capabilities: {
      collectionTasks: Boolean(collection?.tasks),
      collectionRate: Boolean(collection?.history),
      cleaning: Boolean(historyToken),
      cleaningStageEvents: false,
      radar: false,
      historyRecords: Boolean(historyToken),
    },
    warnings,
    stale: false,
  };
}

app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", service: "bioradar-console", mode: "read-only" }),
);
app.get("/api/overview", async (_req, res) => {
  res.set("Cache-Control", "no-store");
  if (snapshot && Date.now() - refreshed < 60000) return res.json(snapshot);
  if (!inFlight) {
    inFlight = collect()
      .then((value) => {
        snapshot = value;
        refreshed = Date.now();
        return value;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  try {
    res.json(await inFlight);
  } catch {
    if (snapshot)
      res.json({
        ...snapshot,
        stale: true,
        warnings: [...snapshot.warnings, "connection"],
      });
    else
      res.status(502).json({
        error: "暂时无法连接资料服务，请稍后重试。",
        code: "upstream_unavailable",
      });
  }
});

app.get("/api/documents", async (req, res) => {
  const params = new URLSearchParams();
  for (const name of [
    "page",
    "page_size",
    "source_site",
    "extraction_status",
  ]) {
    if (typeof req.query[name] === "string") params.set(name, req.query[name]);
  }
  const pageSize = Math.min(
    50,
    Math.max(1, Number(params.get("page_size")) || 20),
  );
  params.set("page_size", String(pageSize));
  try {
    res.json(await read(`${base}/api/documents?${params}`));
  } catch {
    res.status(502).json({ error: "资料列表暂时不可用。" });
  }
});
app.get("/api/documents/:uuid", async (req, res) => {
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(req.params.uuid))
    return res.status(400).json({ error: "资料编号无效。" });
  try {
    const d = await read(`${base}/api/documents/${req.params.uuid}`);
    // Present document content, never backend configuration or arbitrary upstream fields.
    const keys = [
      "id",
      "uuid",
      "title",
      "source_site",
      "publish_date",
      "doc_status",
      "extraction_status",
      "weknora_sync_status",
      "updated_at",
      "created_at",
      "url",
      "source_url",
      "raw_content",
      "clean_content",
      "summary",
      "attachments",
      "extra",
    ];
    res.json(
      Object.fromEntries(
        keys.filter((k) => d[k] !== undefined).map((k) => [k, d[k]]),
      ),
    );
  } catch {
    res.status(502).json({ error: "这条资料的详情暂时不可用。" });
  }
});

const historyFields = [
  "source_id",
  "source_record_id",
  "version_id",
  "title",
  "record_kind",
  "source_url",
  "raw_content",
  "raw_media_type",
  "raw_sha256",
  "clean_text",
  "parser_version",
  "facts",
  "field_locators",
  "event_time",
  "source_published_at",
  "source_updated_at",
  "first_seen_at",
  "received_at",
  "mapping_review",
  "availability_proof",
  "published_seq",
];
function selectRecord(record, detail = false) {
  const keys = detail
    ? historyFields
    : historyFields.filter(
        (key) =>
          ![
            "raw_content",
            "clean_text",
            "facts",
            "field_locators",
            "availability_proof",
            "mapping_review",
          ].includes(key),
      );
  return Object.fromEntries(
    keys
      .filter((key) => record[key] !== undefined)
      .map((key) => [key, record[key]]),
  );
}
function historyParams(query) {
  const source = typeof query.source === "string" ? query.source : "";
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(source))
    throw new Error("请选择有效的数据来源");
  const cutoff =
    typeof query.cutoff === "string"
      ? query.cutoff
      : new Date(Date.now() - 5000).toISOString();
  if (!Number.isFinite(Date.parse(cutoff))) throw new Error("查询截止时间无效");
  return new URLSearchParams({
    source_id: source,
    is_demo: "false",
    mode: "current",
    cutoff,
  });
}
app.get("/api/history/records", async (req, res) => {
  res.set("Cache-Control", "no-store");
  if (!historyToken)
    return res.status(503).json({ error: "持续采集资料尚未配置只读连接。" });
  let params;
  try {
    params = historyParams(req.query);
    params.set(
      "limit",
      String(Math.min(30, Math.max(1, Number(req.query.limit) || 12))),
    );
    if (typeof req.query.cursor === "string")
      params.set("cursor", req.query.cursor);
    if (
      typeof req.query.run === "string" &&
      /^[a-zA-Z0-9-]{1,100}$/.test(req.query.run)
    )
      params.set("run_id", req.query.run);
    if (typeof req.query.term === "string" && req.query.term.trim()) {
      const term = req.query.term.trim();
      if (term.length < 2 || term.length > 120)
        throw new Error("检索词需要 2–120 个字符");
      params.append("terms", term);
    }
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
  try {
    const result = await read(`${base}/api/history/records?${params}`);
    res.json({
      items: (result.items || []).map((r) => selectRecord(r)),
      next_cursor: result.next_cursor || null,
      coverage: result.coverage,
      cutoff: params.get("cutoff"),
    });
  } catch {
    res.status(502).json({ error: "采集资料暂时无法读取，请刷新重试。" });
  }
});
app.get("/api/history/versions/:version", async (req, res) => {
  res.set("Cache-Control", "no-store");
  if (!/^[a-zA-Z0-9-]{1,128}$/.test(req.params.version))
    return res.status(400).json({ error: "原文版本无效。" });
  let params;
  try {
    params = historyParams(req.query);
    if (
      typeof req.query.record !== "string" ||
      !req.query.record ||
      req.query.record.length > 512
    )
      throw new Error("缺少有效的来源记录编号");
    params.set("source_record_id", req.query.record);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
  try {
    const result = await read(
      `${base}/api/history/versions/${encodeURIComponent(req.params.version)}?${params}`,
    );
    res.json({
      record: selectRecord(result, true),
      cutoff: params.get("cutoff"),
    });
  } catch {
    res
      .status(502)
      .json({ error: "这个原文版本暂时无法读取，请返回列表重新选择。" });
  }
});
app.get("/api/history/runs/:id", async (req, res) => {
  res.set("Cache-Control", "no-store");
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(req.params.id))
    return res.status(400).json({ error: "批次编号无效。" });
  try {
    const run = await read(
      `${base}/api/history/runs/${encodeURIComponent(req.params.id)}`,
    );
    const keys = [
      "id",
      "source_id",
      "state",
      "created_at",
      "completed_at",
      "version_ids",
      "error",
      "scope_description",
    ];
    const value = Object.fromEntries(
      keys
        .filter((key) => run[key] !== undefined)
        .map((key) => [key, run[key]]),
    );
    value.coverage = Object.fromEntries(
      [
        "mode",
        "bytes",
        "complete",
        "requests",
        "stop_reason",
        "source_total",
        "adopted_count",
        "new_version_count",
        "same_version_count",
        "upstream_pagination_exhausted",
      ]
        .filter((key) => run.coverage?.[key] !== undefined)
        .map((key) => [key, run.coverage[key]]),
    );
    res.json(value);
  } catch {
    res.status(502).json({ error: "当前批次详情暂时不可用。" });
  }
});
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "此观测台仅提供已声明的只读接口。" }),
);
app.use(express.static(distDirectory, { index: false, maxAge: "1h" }));
app.get("/{*path}", (_req, res) => {
  res.set("Cache-Control", "no-cache");
  res.sendFile(path.join(distDirectory, "index.html"));
});

const port = Number(process.env.PORT || 3234);
app.listen(port, process.env.HOST || "0.0.0.0", () =>
  console.log(
    `BioRadar Console: http://${process.env.HOST || "0.0.0.0"}:${port}`,
  ),
);
