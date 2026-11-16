import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Braces,
  Check,
  ChevronLeft,
  ChevronRight,
  Code2,
  Download,
  ExternalLink,
  FileCode2,
  FileText,
  Fingerprint,
  Link2,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { getJson } from "./api";
import { dateTime, number } from "./format";
import {
  factLabels,
  hasHtml,
  htmlPreview,
  jsonLines,
  parseJson,
  plainText,
  pointerValue,
  pretty,
  safeSourceUrl,
  shortValue,
} from "./content";
import { download, Empty, SectionHeader } from "./ui";
import type { HistoryPage, HistoryRecord, Source } from "./types";

export function RecordBrowser({
  sources,
  source: requested,
  term = "",
  run = "",
  onFilter,
  onOpen,
  compact = false,
}: {
  sources: Source[];
  source?: string;
  term?: string;
  run?: string;
  onFilter: (source: string, term?: string, run?: string) => void;
  onOpen: (record: HistoryRecord, cutoff: string) => void;
  compact?: boolean;
}) {
  const available = sources.filter((s) => s.historyAvailable);
  const unavailable = Boolean(
    requested && !available.some((s) => s.id === requested),
  );
  const source =
    available.find((s) => s.id === requested)?.id ||
    available.find((s) => s.id === "clinicaltrials")?.id ||
    available[0]?.id ||
    "";
  const [search, setSearch] = useState(term);
  const [page, setPage] = useState(0);
  const [cursors, setCursors] = useState<string[]>([""]);
  const [data, setData] = useState<HistoryPage | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const cutoff = useRef("");
  const cursor = cursors[page] || "";
  useEffect(() => {
    if (!source || unavailable) return;
    const abort = new AbortController();
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ source, limit: compact ? "5" : "12" });
    if (term) params.set("term", term);
    if (run) params.set("run", run);
    if (cutoff.current) params.set("cutoff", cutoff.current);
    if (cursor) params.set("cursor", cursor);
    getJson<HistoryPage>(`/api/history/records?${params}`, abort.signal)
      .then((value) => {
        cutoff.current = value.cutoff;
        setData(value);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [source, term, run, cursor, refresh, compact, unavailable]);
  function reload() {
    cutoff.current = "";
    setCursors([""]);
    setPage(0);
    setRefresh((n) => n + 1);
  }
  if (!available.length)
    return (
      <Empty title="持续采集资料连接暂不可用">
        来源目录恢复后即可查看原文和清洗结果。
      </Empty>
    );
  if (unavailable)
    return (
      <Empty
        title="这个来源尚未开放原文与清洗读取"
        action={
          <button className="button" onClick={() => onFilter(available[0].id)}>
            选择已接入来源
          </button>
        }
      >
        业务资料仍可在资料库中查看。
      </Empty>
    );
  return (
    <section className={`records-browser ${compact ? "compact" : ""}`}>
      {!compact && (
        <div className="records-toolbar">
          <form
            className="search-field"
            onSubmit={(e) => {
              e.preventDefault();
              if (search.trim().length === 1) {
                setError("请输入至少 2 个字符");
                return;
              }
              onFilter(source, search.trim(), run);
            }}
          >
            <Search size={17} />
            <input
              aria-label="检索当前来源资料"
              placeholder="在当前来源检索关键词…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxLength={120}
            />
            <button type="submit">检索</button>
          </form>
          <select
            aria-label="选择采集来源"
            value={source}
            onChange={(e) => onFilter(e.target.value)}
          >
            {available.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            className="icon-button"
            aria-label="刷新采集资料"
            onClick={reload}
            disabled={loading}
          >
            <RefreshCw size={17} className={loading ? "spin" : ""} />
          </button>
        </div>
      )}
      {run && (
        <div className="context-strip">
          <Fingerprint size={14} />
          <span>
            限定采集批次 <code>{run}</code>
          </span>
          <button onClick={() => onFilter(source, term)}>
            查看该来源全部资料 <X size={13} />
          </button>
        </div>
      )}
      {error ? (
        <Empty
          title={error}
          action={
            <button className="button" onClick={reload}>
              重新读取
            </button>
          }
        />
      ) : (
        <>
          <div
            className={`record-list ${loading ? "is-loading" : ""}`}
            aria-busy={loading}
          >
            {(data?.items || []).map((record) => (
              <button
                className="record-row"
                key={record.version_id}
                onClick={() => onOpen(record, data!.cutoff)}
              >
                <span className="record-symbol">
                  <FileText size={19} />
                </span>
                <span className="record-title">
                  <strong>{record.title || record.source_record_id}</strong>
                  <small>
                    <span>{record.source_record_id}</span>
                    <span>{record.record_kind || "资料记录"}</span>
                  </small>
                </span>
                <span className="record-timestamp">
                  <small>首次观测</small>
                  <span>{dateTime(record.first_seen_at, true)}</span>
                </span>
                <span className="record-open">
                  原文 / 清洗
                  <ArrowUpRight size={15} />
                </span>
              </button>
            ))}
            {!data?.items.length && !loading && (
              <Empty title="当前查询没有资料">
                {run
                  ? "这个批次尚未关联可读取的原文版本。可切换到该来源的全部资料。"
                  : "可尝试其他来源或修改检索词。"}
              </Empty>
            )}
            {loading && (
              <div className="list-loading">
                <LoaderCircle size={18} className="spin" />
                读取真实采集资料…
              </div>
            )}
          </div>
          {!compact && (
            <div className="table-footer">
              <span>
                本页 {data?.items.length || 0} 条 · 按来源记录编号排序
              </span>
              <div className="pagination">
                <button
                  aria-label="上一页采集资料"
                  disabled={page === 0 || loading}
                  onClick={() => setPage((n) => n - 1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <span>第 {page + 1} 页</span>
                <button
                  aria-label="下一页采集资料"
                  disabled={!data?.next_cursor || loading}
                  onClick={() => {
                    setCursors((old) => [
                      ...old.slice(0, page + 1),
                      data!.next_cursor!,
                    ]);
                    setPage((n) => n + 1);
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {!compact && data && (
        <p className="scope-note">
          截止 {dateTime(data.cutoff)} · 当前有效版本 · 不含演示数据 ·
          来源历史库与业务库存分别统计
        </p>
      )}
    </section>
  );
}

function JsonCode({
  value,
  selectedPointer,
  onSelect,
  fieldPointers,
  output = false,
}: {
  value: unknown;
  selectedPointer?: string | null;
  onSelect?: (key: string) => void;
  fieldPointers?: Record<string, string>;
  output?: boolean;
}) {
  const lines = useMemo(() => jsonLines(value), [value]);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const line = container.current?.querySelector<HTMLElement>(
      '[data-highlight="true"]',
    );
    if (line && container.current)
      container.current.scrollTo({
        top: line.offsetTop - container.current.offsetTop - 110,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  }, [selectedPointer]);
  return (
    <div
      className={`code-lines ${output ? "output-code" : ""}`}
      ref={container}
      role="region"
      aria-label={output ? "结构化 JSON" : "原始 JSON"}
      tabIndex={0}
    >
      {lines.map((line, i) => {
        const highlighted =
          selectedPointer != null &&
          (line.pointer === selectedPointer ||
            (selectedPointer !== "" &&
              line.pointer.startsWith(selectedPointer + "/")));
        const key =
          fieldPointers &&
          Object.keys(fieldPointers).find(
            (k) => fieldPointers[k] === line.pointer,
          );
        const contents = (
          <>
            <span className="line-number" aria-hidden>
              {i + 1}
            </span>
            <code>{line.text}</code>
          </>
        );
        return key && onSelect ? (
          <button
            key={i}
            className="code-line"
            data-highlight={highlighted}
            onClick={() => onSelect(key)}
            aria-pressed={highlighted}
          >
            {contents}
          </button>
        ) : (
          <div key={i} className="code-line" data-highlight={highlighted}>
            {contents}
          </div>
        );
      })}
    </div>
  );
}

export function RecordInspector({
  source,
  recordId,
  version,
  cutoff,
  dark,
  sourceName,
  onBack,
}: {
  source: string;
  recordId: string;
  version: string;
  cutoff?: string;
  dark: boolean;
  sourceName: string;
  onBack: () => void;
}) {
  const [record, setRecord] = useState<HistoryRecord | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [left, setLeft] = useState<"json" | "raw" | "html">("json");
  const [right, setRight] = useState<"facts" | "text" | "json" | "metadata">(
    "facts",
  );
  const [selected, setSelected] = useState("");
  const [htmlKey, setHtmlKey] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setRecord(null);
    setError("");
    const params = new URLSearchParams({ source, record: recordId });
    if (cutoff) params.set("cutoff", cutoff);
    getJson<{ record: HistoryRecord }>(
      `/api/history/versions/${encodeURIComponent(version)}?${params}`,
      controller.signal,
    )
      .then(({ record: value }) => {
        setRecord(value);
        setSelected(
          Object.keys(value.facts || {}).find(
            (key) => value.field_locators?.[key]?.json_pointer,
          ) ||
            Object.keys(value.facts || {})[0] ||
            "",
        );
        setLeft(
          parseJson(value.raw_content || "").valid
            ? "json"
            : hasHtml(value.raw_content || "")
              ? "html"
              : "raw",
        );
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [source, recordId, version, cutoff, refresh]);
  const raw = record?.raw_content || "";
  const parsed = useMemo(() => parseJson(raw), [raw]);
  const facts = record?.facts || {};
  const locator = record?.field_locators?.[selected];
  const pointer =
    typeof locator?.json_pointer === "string" ? locator.json_pointer : null;
  const origin =
    parsed.valid && pointer != null
      ? pointerValue(parsed.value, pointer)
      : { found: false };
  const htmlFields = useMemo(
    () =>
      Object.entries(record?.facts || {})
        .filter(([, value]) => typeof value === "string" && hasHtml(value))
        .map(([key, value]) => {
          const path = record?.field_locators?.[key]?.json_pointer;
          const original =
            parsed.valid && path
              ? pointerValue(parsed.value, path)
              : { found: false };
          return original.found && typeof original.value === "string"
            ? { key, value: original.value }
            : null;
        })
        .filter((v): v is { key: string; value: string } => Boolean(v)),
    [record, parsed],
  );
  const fullHtml = !parsed.valid && hasHtml(raw);
  const htmlContent = fullHtml
    ? raw
    : htmlFields.find((f) => f.key === htmlKey)?.value ||
      htmlFields[0]?.value ||
      "";
  const preview = useMemo(
    () => (htmlContent ? htmlPreview(htmlContent, dark) : ""),
    [htmlContent, dark],
  );
  const sourceUrl = safeSourceUrl(record?.source_url);
  if (error)
    return (
      <>
        <button className="back-link" onClick={onBack}>
          <ArrowLeft size={16} />
          返回采集资料
        </button>
        <Empty
          title={error}
          action={
            <button className="button" onClick={() => setRefresh((n) => n + 1)}>
              重新读取
            </button>
          }
        />
      </>
    );
  if (!record)
    return (
      <Empty loading title="读取原文与清洗结果">
        正在读取同一来源、同一原文版本的实际产物。
      </Empty>
    );
  const currentFacts = Object.entries(facts);
  const stageOptions = [
    {
      key: "text",
      icon: FileText,
      title: "清洗正文",
      caption: record.clean_text
        ? `${number(record.clean_text.length)} 字符`
        : "未提供",
    },
    {
      key: "facts",
      icon: Braces,
      title: "结构化数据",
      caption: `${currentFacts.length} 个字段`,
    },
    {
      key: "metadata",
      icon: Fingerprint,
      title: "来源与解析记录",
      caption: record.parser_version || "版本未提供",
    },
  ];
  const outputPointers = Object.fromEntries(
    currentFacts.map(([key]) => [
      key,
      "/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
    ]),
  );
  return (
    <div className="record-workbench">
      <div className="record-breadcrumb">
        <button className="back-link" onClick={onBack}>
          <ArrowLeft size={16} />
          采集资料
        </button>
        <ChevronRight size={13} />
        <span>{sourceName}</span>
        <ChevronRight size={13} />
        <code>{record.source_record_id}</code>
      </div>
      <div className="workbench-heading">
        <div>
          <span className="eyebrow">原文与清洗对照</span>
          <h1>{record.title || record.source_record_id}</h1>
          <p>
            <span className="verified-dot" />
            真实采集记录 · 原文版本 {record.version_id.slice(0, 12)} · 首次观测{" "}
            {dateTime(record.first_seen_at)}
          </p>
        </div>
        <div className="heading-actions">
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="button"
            >
              <ExternalLink size={15} />
              原始来源
            </a>
          )}
          <button
            className="button"
            onClick={() =>
              download(
                `${record.source_record_id}-facts.json`,
                JSON.stringify(facts, null, 2),
                "application/json",
              )
            }
          >
            <Download size={15} />
            导出结构化结果
          </button>
        </div>
      </div>
      <div className="artifact-stages">
        <div className="artifact-stage saved">
          <span className="stage-icon">
            <Check size={18} />
          </span>
          <span>
            <b>原文归档</b>
            <small>左侧固定展示</small>
          </span>
        </div>
        {stageOptions.map((s) => (
          <button
            key={s.key}
            className={`artifact-stage ${right === s.key || (right === "json" && s.key === "facts") ? "active" : ""}`}
            onClick={() => setRight(s.key as typeof right)}
          >
            <span className="stage-icon">
              <s.icon size={18} />
            </span>
            <span>
              <b>{s.title}</b>
              <small>{s.caption}</small>
            </span>
            <ChevronRight size={14} />
          </button>
        ))}
      </div>
      <div className="comparison-grid">
        <section className="comparison-panel raw-panel">
          <header>
            <div>
              <FileCode2 size={18} />
              <span>
                <b>采集原文</b>
                <small>{record.raw_media_type || "原始内容"}</small>
              </span>
            </div>
            <div className="segmented">
              {parsed.valid && (
                <button
                  className={left === "json" ? "active" : ""}
                  onClick={() => setLeft("json")}
                >
                  JSON
                </button>
              )}
              <button
                className={left === "raw" ? "active" : ""}
                onClick={() => setLeft("raw")}
              >
                原始内容
              </button>
              {(fullHtml || htmlFields.length > 0) && (
                <button
                  className={left === "html" ? "active" : ""}
                  onClick={() => setLeft("html")}
                >
                  {fullHtml ? "HTML 预览" : "HTML 正文"}
                </button>
              )}
            </div>
          </header>
          <div className="pane-meta">
            <span>
              {left === "html" && !fullHtml
                ? "原始响应内的 HTML 字段"
                : "采集时保存的原始版本"}
            </span>
            <button
              aria-label="下载原文"
              onClick={() =>
                download(
                  `${record.source_record_id}-raw.${parsed.valid ? "json" : fullHtml ? "html" : "txt"}`,
                  raw,
                )
              }
            >
              <Download size={14} />
            </button>
          </div>
          {left === "html" ? (
            <>
              {!fullHtml && (
                <div className="html-field-select">
                  <label>
                    正文片段
                    <select
                      aria-label="选择 HTML 正文片段"
                      value={
                        htmlFields.find((f) => f.key === htmlKey)?.key ||
                        htmlFields[0]?.key ||
                        ""
                      }
                      onChange={(e) => setHtmlKey(e.target.value)}
                    >
                      {htmlFields.map((f) => (
                        <option key={f.key} value={f.key}>
                          {factLabels[f.key] || f.key}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span>来自 API 响应，非完整网页快照</span>
                </div>
              )}
              <iframe
                title="原文 HTML 内容预览"
                sandbox=""
                srcDoc={preview}
                className="html-preview"
                referrerPolicy="no-referrer"
              />
            </>
          ) : left === "json" && parsed.valid ? (
            <JsonCode value={parsed.value} selectedPointer={pointer} />
          ) : (
            <pre className="raw-text">{raw || "当前记录未提供原文内容。"}</pre>
          )}
          <footer>
            <span>
              {number(raw.length)} 字符 · 版本 {record.version_id.slice(0, 10)}
            </span>
            <span>原文保持不变</span>
          </footer>
        </section>
        <div className="comparison-link" aria-hidden>
          <ArrowRight size={19} />
        </div>
        <section className="comparison-panel clean-panel">
          <header>
            <div>
              <ShieldCheck size={18} />
              <span>
                <b>
                  {right === "text"
                    ? "清洗后的正文"
                    : right === "metadata"
                      ? "来源与解析记录"
                      : "结构化数据"}
                </b>
                <small>关联同一原文版本</small>
              </span>
            </div>
            {right !== "text" && right !== "metadata" && (
              <div className="segmented">
                <button
                  className={right === "facts" ? "active" : ""}
                  onClick={() => setRight("facts")}
                >
                  字段
                </button>
                <button
                  className={right === "json" ? "active" : ""}
                  onClick={() => setRight("json")}
                >
                  JSON
                </button>
              </div>
            )}
          </header>
          <div className="pane-meta">
            <span>
              {record.parser_version
                ? `解析器 ${record.parser_version}`
                : "解析器版本未提供"}
            </span>
            <span>
              {right === "text"
                ? "clean_text"
                : right === "metadata"
                  ? "来源记录"
                  : `${currentFacts.length} 个字段`}
            </span>
          </div>
          {right === "text" ? (
            <div className="clean-prose">
              {record.clean_text || (
                <Empty title="这条资料没有保存清洗正文">
                  原始内容仍可在左侧查看。
                </Empty>
              )}
            </div>
          ) : right === "json" ? (
            <JsonCode
              value={facts}
              output
              selectedPointer={outputPointers[selected]}
              onSelect={setSelected}
              fieldPointers={outputPointers}
            />
          ) : right === "metadata" ? (
            <div className="metadata-list">
              {[
                ["来源记录编号", record.source_record_id],
                ["资料类型", record.record_kind],
                [
                  "来源发布时间",
                  record.source_published_at
                    ? dateTime(record.source_published_at)
                    : null,
                ],
                [
                  "来源更新时间",
                  record.source_updated_at
                    ? dateTime(record.source_updated_at)
                    : null,
                ],
                [
                  "首次观测时间",
                  record.first_seen_at ? dateTime(record.first_seen_at) : null,
                ],
                [
                  "接收时间",
                  record.received_at ? dateTime(record.received_at) : null,
                ],
                ["解析器版本", record.parser_version],
                ["原文版本", record.version_id],
                ["原文 SHA256（服务记录）", record.raw_sha256],
                ["字段映射评审", record.mapping_review],
                ["可用时间依据", record.availability_proof],
              ].map(([label, value], i) => (
                <div key={i}>
                  <dt>{label as string}</dt>
                  <dd>{value == null ? "未提供" : pretty(value)}</dd>
                </div>
              ))}
            </div>
          ) : currentFacts.length ? (
            <div className="facts-list">
              {currentFacts.map(([key, value]) => (
                <button
                  key={key}
                  className={`fact-row ${selected === key ? "selected" : ""}`}
                  aria-pressed={selected === key}
                  onClick={() => {
                    setSelected(key);
                    if (
                      left === "html" &&
                      record.field_locators?.[key]?.json_pointer
                    )
                      setLeft("json");
                  }}
                >
                  <span className="fact-label">
                    {factLabels[key] || key}
                    <small>{factLabels[key] ? key : ""}</small>
                  </span>
                  <span className="fact-value">
                    {shortValue(
                      typeof value === "string" && hasHtml(value)
                        ? plainText(value)
                        : value,
                      190,
                    )}
                  </span>
                  <span
                    className={`type-tag ${value == null ? "missing" : ""}`}
                  >
                    {value == null
                      ? "缺失"
                      : Array.isArray(value)
                        ? `数组 · ${value.length}`
                        : typeof value === "object"
                          ? "对象"
                          : typeof value === "number"
                            ? "数值"
                            : typeof value === "boolean"
                              ? "布尔"
                              : hasHtml(String(value))
                                ? "HTML 字段"
                                : "文本"}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <Empty title="当前资料未提供结构化字段">
              可先查看清洗正文或原文。
            </Empty>
          )}
          <footer>
            <span>真实保存的处理产物</span>
            <span>
              {right === "text"
                ? `${number(record.clean_text?.length || 0)} 字符`
                : "点击字段追溯原文"}
            </span>
          </footer>
        </section>
      </div>
      {selected && (right === "facts" || right === "json") && (
        <section className="field-trace">
          <SectionHeader
            title={`字段出处 · ${factLabels[selected] || selected}`}
          >
            <span className={`trace-state ${origin.found ? "found" : ""}`}>
              <Link2 size={13} />
              {origin.found ? "已定位原文位置" : "该字段未提供可解析的原文定位"}
            </span>
          </SectionHeader>
          <div className="trace-columns">
            <div>
              <label>原文中的值</label>
              <pre>
                {origin.found ? pretty(origin.value) : "未提供可解析的原文定位"}
              </pre>
              <code>{pointer || "无 JSON Pointer"}</code>
            </div>
            <div>
              <label>当前结构化结果</label>
              <pre>{pretty(facts[selected])}</pre>
              <code>{selected}</code>
            </div>
            <div>
              <label>记录说明</label>
              <p>
                {origin.found &&
                JSON.stringify(origin.value) === JSON.stringify(facts[selected])
                  ? "该字段保留了原文取值。"
                  : origin.found
                    ? "字段值与原文位置已关联，可逐项核对。"
                    : "界面保留字段结果，不推测缺失的来源位置。"}
              </p>
              <small>
                接口未提供逐字段转换规则与完整中间步骤，本页不重构虚拟处理记录。
              </small>
            </div>
          </div>
        </section>
      )}
      <p className="scope-note">
        <Fingerprint size={13} />
        原文、清洗正文、结构化事实均来自同一 History 版本。字段值中保留的 HTML
        可在正文视图阅读。
      </p>
    </div>
  );
}
