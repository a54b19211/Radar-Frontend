import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUpRight,
  Database,
  ExternalLink,
  FileText,
  Globe2,
  Info,
  LoaderCircle,
  Radio,
  X,
} from "lucide-react";
import { getJson } from "./api";
import { documentTitle, dateTime, number, percent, stateLabel } from "./format";
import DocumentsTable from "./DocumentsTable";
import type { Document, Selection, Snapshot } from "./types";

const stages = {
  ingest: {
    title: "来源接入",
    subtitle: "观察爬虫与接口的采集进度",
    copy: "这里读取持续采集监测的状态、检查时间、下一轮计划和最近一批接收量。最近一批的计数不代表任务累计进度；源站总量和当前抓取 URL 未提供时保持未知。",
  },
  archive: {
    title: "原始资料归档",
    subtitle: "从每一条资料追溯它的来源",
    copy: "这里统计当前仓库内未删除的资料条目。这个数量代表已入库资料，不代表源站全部内容，也不代表采集覆盖率。",
  },
  extraction: {
    title: "结构化抽取",
    subtitle: "资料进入结构化处理的当前状态",
    copy: "以下为现役服务返回的抽取状态。抽取完成与文本清洗完成含义不同；详细清洗流程将在后续接入。",
  },
  sync: {
    title: "知识库同步",
    subtitle: "查看资料送入知识库的状态",
    copy: "“已同步”是 Fabric 返回的同步状态，不等于已逐项验证向量索引或检索质量。",
  },
  cleaning: {
    title: "清洗与加工",
    subtitle: "下一阶段接入",
    copy: "这里将串联原文解析、清洗、结构化抽取与质量核验，展示每一步的输入、输出、耗时和失败原因。首版先完成数据采集观测。",
  },
  radar: {
    title: "雷达分析",
    subtitle: "下一阶段接入",
    copy: "这里将展示发现、计划、路由、检索、证据核验与报告生成的完整调查过程。待重构接口稳定后接入实际任务。",
  },
};

export default function DetailDrawer({
  selection,
  data,
  onClose,
  onSelect,
}: {
  selection: Selection | null;
  data: Snapshot;
  onClose: () => void;
  onSelect: (s: Selection) => void;
}) {
  return (
    <AnimatePresence>
      {selection && (
        <Drawer
          key={`${selection.type}-${"id" in selection ? selection.id : ""}`}
          selection={selection}
          data={data}
          onClose={onClose}
          onSelect={onSelect}
        />
      )}
    </AnimatePresence>
  );
}

function Drawer({
  selection,
  data,
  onClose,
  onSelect,
}: {
  selection: Selection;
  data: Snapshot;
  onClose: () => void;
  onSelect: (s: Selection) => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<Document | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const focusable = Array.from(
          panel.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], input, select, [tabindex="0"]',
          ) || [],
        );
        const first = focusable[0],
          last = focusable[focusable.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === panel.current)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [onClose]);
  useEffect(() => {
    if (selection.type !== "document") return;
    const c = new AbortController();
    getJson<Document>(`/api/documents/${selection.id}`, c.signal)
      .then(setDoc)
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [selection]);
  const source =
    selection.type === "source"
      ? data.sources.find((s) => s.id === selection.id)
      : null;
  const stage =
    selection.type === "stage"
      ? stages[selection.id as keyof typeof stages]
      : null;
  const task =
    selection.type === "task"
      ? data.collection?.tasks.find((t) => t.id === selection.id)
      : null;
  const title =
    source?.name ||
    stage?.title ||
    (selection.type === "document"
      ? "资料详情"
      : task?.title || "数据连接与口径");
  const safeUrl = (url?: string | null) =>
    url && /^https?:\/\//i.test(url) ? url : null;
  const docText = doc?.clean_content || doc?.summary || doc?.raw_content;
  let readableText = docText || null;
  if (docText?.trimStart().startsWith("<")) {
    const html = new DOMParser().parseFromString(docText, "text/html");
    html.querySelectorAll("script, style").forEach((node) => node.remove());
    readableText = html.body.textContent;
  } else if (docText) {
    try {
      readableText = JSON.stringify(JSON.parse(docText), null, 2);
    } catch {
      /* Plain text is already readable. */
    }
  }
  return (
    <>
      <motion.div
        className="drawer-scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="drawer"
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 33, stiffness: 330 }}
      >
        <div className="drawer-top">
          <span>
            <span className="tiny-dot" />
            资料与流程详情
          </span>
          <button
            className="icon-button"
            aria-label="关闭详情"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <div className="drawer-body">
          <div
            className="drawer-icon"
            style={
              source
                ? { color: source.color, background: `${source.color}14` }
                : {}
            }
          >
            {source ? (
              <Globe2 />
            ) : selection.type === "document" ? (
              <FileText />
            ) : (
              <Database />
            )}
          </div>
          <h2 id="drawer-title">{title}</h2>
          <p className="drawer-subtitle">
            {source?.description ||
              stage?.subtitle ||
              "基于实际返回的数据，查看当前观测范围。"}
          </p>
          {source && (
            <>
              <div className="drawer-facts">
                <div>
                  <span>
                    {source.historyOnly ? "History 库数量未提供" : "业务库资料"}
                  </span>
                  <strong>{number(source.count)}</strong>
                </div>
                <div>
                  <span>占当前资料库</span>
                  <strong>{percent(source.count, data.total)}</strong>
                </div>
              </div>
              <dl className="metadata">
                <div>
                  <dt>来源类型</dt>
                  <dd>{source.category}</dd>
                </div>
                <div>
                  <dt>来源标识</dt>
                  <dd>
                    <code>{source.id}</code>
                  </dd>
                </div>
                <div>
                  <dt>持续采集监测</dt>
                  <dd>
                    {data.collection?.tasks.filter(
                      (t) => t.source === source.id,
                    ).length || 0}{" "}
                    个已配置监测
                  </dd>
                </div>
                {safeUrl(source.url) && (
                  <div>
                    <dt>来源网站</dt>
                    <dd>
                      <a href={source.url!} target="_blank" rel="noreferrer">
                        访问原站 <ExternalLink size={13} />
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
              <h3>持续采集状态</h3>
              {data.collection?.tasks.some((t) => t.source === source.id) ? (
                <div className="status-distribution">
                  {data.collection.tasks
                    .filter((t) => t.source === source.id)
                    .map((t) => (
                      <div key={t.id}>
                        <button
                          className="text-button"
                          onClick={() => onSelect({ type: "task", id: t.id })}
                        >
                          {t.title} <ArrowUpRight size={13} />
                        </button>
                        <span className={`status-chip ${t.status}`}>
                          {stateLabel[t.status]}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="context-note">
                  <p>
                    当前没有返回这个来源的持续监测任务。资料库存不等于爬虫正在运行。
                  </p>
                </div>
              )}
              <h3 className="spaced-heading">该来源的资料</h3>
              {source.historyOnly ? (
                <div className="context-note">
                  <p>
                    这个来源的资料位于独立 History
                    库。当前已接入采集监测，History
                    逐条浏览尚未接入，不计入业务资料库总量。
                  </p>
                </div>
              ) : (
                <DocumentsTable
                  compact
                  sourceId={source.id}
                  sources={data.sources}
                  onOpen={(d) => onSelect({ type: "document", id: d.uuid })}
                />
              )}
            </>
          )}
          {stage && (
            <>
              <div className="context-note">
                <Info size={16} />
                <p>{stage.copy}</p>
              </div>
              {selection.type === "stage" &&
                selection.id === "ingest" &&
                data.capabilities.collectionTasks && (
                  <div className="status-distribution">
                    {data.collection?.tasks.map((t) => (
                      <div key={t.id}>
                        <button
                          className="text-button"
                          onClick={() => onSelect({ type: "task", id: t.id })}
                        >
                          {t.title} <ArrowUpRight size={13} />
                        </button>
                        <span className={`status-chip ${t.status}`}>
                          {stateLabel[t.status]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              {selection.type === "stage" && selection.id === "archive" && (
                <>
                  <div className="drawer-big-number">
                    {number(data.total)}
                    <span>条已归档资料</span>
                  </div>
                  <DocumentsTable
                    compact
                    sources={data.sources}
                    onOpen={(d) => onSelect({ type: "document", id: d.uuid })}
                  />
                </>
              )}
              {selection.type === "stage" && selection.id === "extraction" && (
                <div className="status-distribution">
                  {Object.entries(data.extraction || {}).map(([s, n]) => (
                    <div key={s}>
                      <span className={`status-chip ${s}`}>
                        {stateLabel[s] || s}
                      </span>
                      <b>{number(n)}</b>
                    </div>
                  ))}
                </div>
              )}
              {selection.type === "stage" && selection.id === "sync" && (
                <div className="status-distribution">
                  {Object.entries(data.sync || {}).map(([s, n]) => (
                    <div key={s}>
                      <span>
                        {s === "pending"
                          ? "待同步"
                          : s === "synced"
                            ? "已同步"
                            : "同步失败"}
                      </span>
                      <b>{number(n)}</b>
                    </div>
                  ))}
                </div>
              )}
              {selection.type === "stage" &&
                (["cleaning", "radar"].includes(selection.id) ||
                  (selection.id === "ingest" &&
                    !data.capabilities.collectionTasks)) && (
                  <div className="upcoming-illustration">
                    <div className="orbit-ring">
                      <Radio size={28} />
                    </div>
                    <h3>流程入口已就绪</h3>
                    <p>任务观测接口接入后，状态会在这里自动更新。</p>
                    <span className="neutral-pill">当前不触发任何后台任务</span>
                  </div>
                )}
            </>
          )}
          {selection.type === "document" &&
            (error ? (
              <div className="context-note error-note">{error}</div>
            ) : !doc ? (
              <div className="inline-empty">
                <LoaderCircle className="spin" />
                正在读取资料详情
              </div>
            ) : (
              <>
                <h3 className="doc-detail-title">{documentTitle(doc)}</h3>
                <dl className="metadata">
                  <div>
                    <dt>来源</dt>
                    <dd>
                      {data.sources.find((s) => s.id === doc.source_site)
                        ?.name ||
                        doc.source_site ||
                        "未提供"}
                    </dd>
                  </div>
                  <div>
                    <dt>发布时间</dt>
                    <dd>{doc.publish_date || "未提供"}</dd>
                  </div>
                  <div>
                    <dt>资料更新时间</dt>
                    <dd>{dateTime(doc.updated_at)}</dd>
                  </div>
                  <div>
                    <dt>抽取状态</dt>
                    <dd>
                      <span className={`status-chip ${doc.extraction_status}`}>
                        {stateLabel[doc.extraction_status] || "未提供"}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>资料编号</dt>
                    <dd className="copy-id">
                      <code>{doc.uuid}</code>
                    </dd>
                  </div>
                </dl>
                {safeUrl(doc.source_url || doc.url) && (
                  <a
                    className="button secondary external-document"
                    href={doc.source_url || doc.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    查看原始网页 <ArrowUpRight size={15} />
                  </a>
                )}
                <h3>正文预览</h3>
                <div className="document-content">
                  {readableText?.trim() || "当前详情接口未提供可展示的正文。"}
                </div>
              </>
            ))}
          {task && (
            <>
              <span className={`status-chip ${task.status}`}>
                {task.status === "failed"
                  ? "采集失败"
                  : stateLabel[task.status]}
              </span>
              <dl className="metadata">
                <div>
                  <dt>监测编号</dt>
                  <dd>
                    <code>{task.id}</code>
                  </dd>
                </div>
                <div>
                  <dt>最近检查</dt>
                  <dd>{dateTime(task.startedAt)}</dd>
                </div>
                <div>
                  <dt>最近成功</dt>
                  <dd>{dateTime(task.lastSuccessAt)}</dd>
                </div>
                <div>
                  <dt>下一轮计划</dt>
                  <dd>{dateTime(task.nextAt)}</dd>
                </div>
                <div>
                  <dt>采集范围</dt>
                  <dd>
                    <code>{task.scope || "未提供"}</code>
                  </dd>
                </div>
                <div>
                  <dt>本轮已记录页数</dt>
                  <dd>{number(task.cyclePages)}</dd>
                </div>
                <div>
                  <dt>活动运行编号</dt>
                  <dd>
                    <code>{task.activeRunId || "当前未返回活动运行"}</code>
                  </dd>
                </div>
              </dl>
              <h3>最近一批已记录的结果</h3>
              <p className="drawer-footnote">
                批次记录时间：{dateTime(task.lastBatchAt)}
              </p>
              <div className="drawer-facts">
                <div>
                  <span>接收资料</span>
                  <strong>{number(task.processed)}</strong>
                </div>
                <div>
                  <span>新增版本</span>
                  <strong>{number(task.newVersions)}</strong>
                </div>
              </div>
              <dl className="metadata">
                <div>
                  <dt>相同版本</dt>
                  <dd>{number(task.sameVersions)}</dd>
                </div>
                <div>
                  <dt>请求次数</dt>
                  <dd>{number(task.requests)}</dd>
                </div>
                <div>
                  <dt>停止原因</dt>
                  <dd>
                    {(
                      {
                        record_budget: "达到本批资料上限",
                        upstream_exhausted: "本次上游分页结束",
                        page_budget: "达到本批页数上限",
                      } as Record<string, string>
                    )[task.stopReason || ""] ||
                      task.stopReason ||
                      "未提供"}
                  </dd>
                </div>
              </dl>
              {task.error && (
                <div className="context-note error-note">{task.error}</div>
              )}
              <p className="drawer-footnote">
                这些计数来自最近保留的批次回执，可能早于最近一次检查，不代表本次失败检查接收了同样的数据，也不是整个来源的累计采集量。上游没有给出完整总量，因此不显示完成百分比。
              </p>
            </>
          )}
          {selection.type === "about" && (
            <>
              <div className="context-note">
                <Info size={16} />
                <p>观测台只读取现有 API，不会启动、暂停或重试采集任务。</p>
              </div>
              <dl className="metadata">
                <div>
                  <dt>当前资料库</dt>
                  <dd>{data.dataset.label}</dd>
                </div>
                <div>
                  <dt>最近成功读取</dt>
                  <dd>{dateTime(data.observedAt)}</dd>
                </div>
                <div>
                  <dt>自动刷新</dt>
                  <dd>每 15 秒检查 · 库存汇总每 60 秒更新</dd>
                </div>
                <div>
                  <dt>总量口径</dt>
                  <dd>{data.dataset.scope}</dd>
                </div>
                <div>
                  <dt>来源占比</dt>
                  <dd>该来源资料数 ÷ 库内资料总数</dd>
                </div>
              </dl>
              <h3>当前可见范围</h3>
              <div className="capability-list">
                {[
                  ["资料总量与来源", true],
                  ["抽取状态与同步状态", true],
                  ["持续采集任务状态", data.capabilities.collectionTasks],
                  ["当前抓取 URL", false],
                  ["每分钟采集量", data.capabilities.collectionRate],
                  ["清洗节点追踪", data.capabilities.cleaning],
                  ["雷达调查过程", data.capabilities.radar],
                ].map(([name, yes]) => (
                  <div key={String(name)}>
                    <span>{name}</span>
                    <span className={yes ? "good-text" : "muted-text"}>
                      {yes ? "已接入" : "待接入"}
                    </span>
                  </div>
                ))}
              </div>
              <p className="drawer-footnote">
                页面中的连线表示逻辑流程。只有取得实际任务状态时，才会显示任务正在运行；手动开启的演示动效不代表真实采集。
              </p>
            </>
          )}
        </div>
        <div className="drawer-bottom">
          <span className="tiny-dot" />
          数据来自 API<span>只读观测</span>
        </div>
      </motion.div>
    </>
  );
}
