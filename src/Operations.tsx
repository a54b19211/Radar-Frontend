import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCheck,
  Clock3,
  Database,
  FileText,
  Fingerprint,
  Globe2,
  Layers3,
  Link2,
  ListFilter,
  RadioTower,
  Search,
  ShieldCheck,
} from "lucide-react";
import { getJson } from "./api";
import { factLabels, pretty, safeSourceUrl, shortValue } from "./content";
import { dateTime, number, percent } from "./format";
import { sourceTask } from "./PipelineScene";
import { Empty, Metric, SectionHeader, Status } from "./ui";
import type { Snapshot, Source, Task } from "./types";

export function TaskList({
  tasks,
  onSelect,
  compact = false,
}: {
  tasks: Task[];
  onSelect: (id: string) => void;
  compact?: boolean;
}) {
  const ranks: Record<string, number> = {
    running: 0,
    failed: 1,
    stale: 2,
    queued: 3,
    idle: 4,
    completed: 5,
    unknown: 6,
  };
  const sorted = [...tasks].sort((a, b) => ranks[a.status] - ranks[b.status]);
  return (
    <div className="task-list">
      {(compact ? sorted.slice(0, 4) : sorted).map((task) => (
        <button
          className="task-row"
          key={task.id}
          onClick={() => onSelect(task.id)}
        >
          <span className={`task-indicator ${task.status}`}>
            <RadioTower size={17} />
          </span>
          <span className="task-info">
            <b>{task.title}</b>
            <small>
              {task.status === "running"
                ? "当前有活跃采集批次"
                : `最近检查 ${dateTime(task.startedAt, true)}`}
            </small>
          </span>
          <Status state={task.status} />
          <ArrowUpRight size={14} />
        </button>
      ))}
      {!tasks.length && <Empty title="当前未返回监测任务" />}
    </div>
  );
}

export function TasksView({
  data,
  source = "",
  taskId = "",
  onPick,
  onRecords,
}: {
  data: Snapshot;
  source?: string;
  taskId?: string;
  onPick: (id: string) => void;
  onRecords: (source: string, run?: string) => void;
}) {
  const [filter, setFilter] = useState("all");
  const [run, setRun] = useState<Record<string, unknown> | null>(null);
  const [runError, setRunError] = useState("");
  const all = data.collection?.tasks || [];
  const tasks = all.filter(
    (t) =>
      (!source || t.source === source) &&
      (filter === "all" || t.status === filter),
  );
  const selected =
    tasks.find((t) => t.id === taskId) ||
    tasks.find((t) => t.status === "running") ||
    tasks[0];
  useEffect(() => {
    setRun(null);
    setRunError("");
    if (!selected?.activeRunId) return;
    const controller = new AbortController();
    getJson<Record<string, unknown>>(
      `/api/history/runs/${encodeURIComponent(selected.activeRunId)}`,
      controller.signal,
    )
      .then(setRun)
      .catch((e) => {
        if (!controller.signal.aborted) setRunError(e.message);
      });
    return () => controller.abort();
  }, [selected?.activeRunId]);
  const runState = typeof run?.state === "string" ? run.state : "";
  const coverage =
    run?.coverage && typeof run.coverage === "object"
      ? Object.entries(run.coverage)
      : [];
  return (
    <>
      <div className="view-intro">
        <div>
          <span className="eyebrow">采集运行 / 全程可见</span>
          <h1>每一轮采集，都有迹可循。</h1>
          <p>查看监测状态、真实批次与原文结果，发现卡点。</p>
        </div>
        <div className="intro-counter">
          <b>{all.length}</b>
          <span>项持续监测</span>
        </div>
      </div>
      <div className="view-toolbar">
        <div className="filter-pills">
          {[
            ["all", "全部监测"],
            ["running", "运行中"],
            ["failed", "需要关注"],
            ["idle", "等待下一轮"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={filter === value ? "active" : ""}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="muted small">
          {source
            ? data.sources.find((s) => s.id === source)?.name
            : "所有已接入来源"}
        </span>
      </div>
      {!selected ? (
        <Empty title="当前筛选下没有监测任务" />
      ) : (
        <div className="task-workspace">
          <aside className="task-sidebar">
            {tasks.map((task) => (
              <button
                key={task.id}
                className={`task-choice ${selected.id === task.id ? "active" : ""}`}
                onClick={() => onPick(task.id)}
              >
                <Status state={task.status} />
                <b>{task.title}</b>
                <small>最近检查 {dateTime(task.startedAt, true)}</small>
              </button>
            ))}
          </aside>
          <div className="task-detail-stack">
            <section className="panel">
              <SectionHeader
                title={selected.title}
                caption={selected.scope || "持续采集监测"}
              >
                <Status state={selected.status} />
              </SectionHeader>
              <div className="task-checkpoints">
                {[
                  ["最近检查", selected.startedAt],
                  ["最近成功", selected.lastSuccessAt],
                  ["最近批次", selected.lastBatchAt],
                  ["下一次计划", selected.nextAt],
                ].map(([label, time]) => (
                  <div key={label}>
                    <Clock3 size={15} />
                    <span>{label}</span>
                    <strong>{dateTime(time, true)}</strong>
                  </div>
                ))}
              </div>
              {selected.error && (
                <div className="notice warning">
                  <span>最近错误</span>
                  <p>{selected.error}</p>
                </div>
              )}
              <div className="task-detail-actions">
                <button
                  className="button primary"
                  onClick={() => onRecords(selected.source)}
                >
                  查看来源资料
                  <ArrowRight size={15} />
                </button>
                <span className="muted small">
                  按来源浏览；不将历史资料冒充本轮产出
                </span>
              </div>
            </section>
            <section className="panel">
              <SectionHeader
                title="最近有记录的批次"
                caption={`批次时间 ${dateTime(selected.lastBatchAt)} · 与上方当前运行状态分别记录`}
              />
              <div className="batch-stats">
                {[
                  ["接收条目", selected.processed],
                  ["新/变更版本", selected.newVersions],
                  ["内容未变", selected.sameVersions],
                  ["本轮完成页数", selected.cyclePages],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <strong>{number(value as number | null)}</strong>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              <div className="detail-keyvalues">
                <span>
                  请求次数 <b>{number(selected.requests)}</b>
                </span>
                <span>
                  结束原因{" "}
                  <b>
                    {selected.stopReason
                      ? factLabels[selected.stopReason] || selected.stopReason
                      : "未提供"}
                  </b>
                </span>
              </div>
            </section>
            <section className="panel">
              <SectionHeader
                title="当前关联的采集批次"
                caption="监测返回活跃批次编号时，可直接追踪该批次的原文版本"
              />
              {selected.activeRunId ? (
                <>
                  <div className="run-identity">
                    <Fingerprint size={18} />
                    <code>{selected.activeRunId}</code>
                    <Status
                      state={runState || "running"}
                      label={
                        runState ? factLabels[runState] || runState : "读取中"
                      }
                    />
                  </div>
                  {runError ? (
                    <p className="notice warning">{runError}</p>
                  ) : run ? (
                    <>
                      <div className="run-coverage">
                        {coverage.map(([key, value]) => (
                          <div key={key}>
                            <span>{factLabels[key] || key}</span>
                            <b>{shortValue(value, 90)}</b>
                          </div>
                        ))}
                      </div>
                      {Array.isArray(run.version_ids) && (
                        <p className="muted">
                          这个批次关联 {run.version_ids.length} 个原文版本。
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="inline-loading">读取批次详情…</div>
                  )}
                  <button
                    className="button"
                    onClick={() =>
                      onRecords(selected.source, selected.activeRunId)
                    }
                  >
                    查看此批次的原文版本
                    <ArrowRight size={14} />
                  </button>
                </>
              ) : (
                <div className="quiet-empty">
                  <Fingerprint size={26} />
                  <h3>当前没有活跃批次编号</h3>
                  <p>
                    监测任务结束后会清空当前编号。最近批次计数仍保留在上方，来源资料可以继续浏览。
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  );
}

export function SourcesView({
  data,
  selected: selectedId = "",
  onSelect,
  onRecords,
  onDocuments,
  onTasks,
}: {
  data: Snapshot;
  selected?: string;
  onSelect: (source: string) => void;
  onRecords: (source: string) => void;
  onDocuments: (source: string) => void;
  onTasks: (source: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部来源");
  const sources = data.sources.filter(
    (s) =>
      (category === "全部来源" || s.category === category) &&
      `${s.name} ${s.id} ${s.description}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const tasks = data.collection?.tasks || [];
  const selected = data.sources.find((s) => s.id === selectedId);
  return (
    <>
      <div className="view-intro">
        <div>
          <span className="eyebrow">信源网络 / 多源汇聚</span>
          <h1>每一个来源，都是一条线索。</h1>
          <p>观察采集状态、资料规模与检查时间，从全局进入单个来源。</p>
        </div>
        <div className="intro-counter">
          <b>{data.sources.length}</b>
          <span>个已登记来源</span>
        </div>
      </div>
      <div className="source-distribution panel">
        <SectionHeader
          title="业务库存中的来源分布"
          caption={`${number(data.total)} 条已归档业务资料 · 独立采集历史库未计入占比`}
        />
        <div className="distribution-bar">
          {data.sources
            .filter((s) => (s.count || 0) > 0)
            .map((s) => (
              <button
                key={s.id}
                style={{
                  width: `${(s.count! / data.total) * 100}%`,
                  background: s.color,
                }}
                aria-label={`${s.name}占比${percent(s.count, data.total)}`}
                title={`${s.name} ${percent(s.count, data.total)}`}
                onClick={() => onSelect(s.id)}
              />
            ))}
        </div>
        <div className="distribution-legend">
          {data.sources
            .filter((s) => (s.count || 0) > 0)
            .slice(0, 5)
            .map((s) => (
              <button key={s.id} onClick={() => onSelect(s.id)}>
                <i style={{ background: s.color }} />
                {s.short}
                <b>{percent(s.count, data.total)}</b>
              </button>
            ))}
        </div>
      </div>
      <div className="view-toolbar">
        <div className="filter-pills">
          {["全部来源", ...new Set(data.sources.map((s) => s.category))].map(
            (c) => (
              <button
                key={c}
                className={category === c ? "active" : ""}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ),
          )}
        </div>
        <div className="search-field compact">
          <Search size={16} />
          <input
            aria-label="搜索来源"
            placeholder="搜索来源…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      {selected && (
        <SourceDetail
          source={selected}
          tasks={tasks.filter((t) => t.source === selected.id)}
          total={data.total}
          onClose={() => onSelect("")}
          onRecords={onRecords}
          onDocuments={onDocuments}
          onTasks={onTasks}
        />
      )}
      <div className="source-grid">
        {sources.map((source) => {
          const task = sourceTask(source.id, tasks);
          return (
            <button
              key={source.id}
              className={`source-card ${selectedId === source.id ? "selected" : ""}`}
              onClick={() => onSelect(source.id)}
            >
              <div className="source-card-top">
                <span className="source-avatar" style={{ color: source.color }}>
                  {source.short}
                </span>
                <Status
                  state={task?.status}
                  label={
                    task
                      ? undefined
                      : source.historyAvailable
                        ? "来源可读"
                        : "库存可读"
                  }
                />
              </div>
              <h3>{source.name}</h3>
              <p>{source.description}</p>
              <div className="source-card-numbers">
                <div>
                  <b>{number(source.count)}</b>
                  <span>
                    {source.historyOnly
                      ? "独立历史库 · 未汇总"
                      : "业务库存条目"}
                  </span>
                </div>
                <div>
                  <b>{percent(source.count, data.total)}</b>
                  <span>业务库存占比</span>
                </div>
              </div>
              <div className="source-card-foot">
                <span>
                  {task
                    ? `最近检查 ${dateTime(task.startedAt, true)}`
                    : source.category}
                </span>
                <ArrowUpRight size={15} />
              </div>
            </button>
          );
        })}
      </div>
      {!sources.length && <Empty title="没有匹配的来源" />}
    </>
  );
}

function SourceDetail({
  source,
  tasks,
  total,
  onClose,
  onRecords,
  onDocuments,
  onTasks,
}: {
  source: Source;
  tasks: Task[];
  total: number;
  onClose: () => void;
  onRecords: (s: string) => void;
  onDocuments: (s: string) => void;
  onTasks: (s: string) => void;
}) {
  const url = safeSourceUrl(source.url);
  return (
    <section className="panel source-detail">
      <SectionHeader title={source.name} caption={source.description}>
        <button className="text-button" onClick={onClose}>
          收起详情
        </button>
      </SectionHeader>
      <div className="source-detail-body">
        <div>
          <div className="source-detail-count">
            <b>{number(source.count)}</b>
            <span>条业务资料 · 占比 {percent(source.count, total)}</span>
          </div>
          <div className="tag-row">
            <span className="tag">{source.category}</span>
            <span className="tag">{tasks.length} 项持续监测</span>
            {source.historyAvailable && (
              <span className="tag positive">原文与清洗可读</span>
            )}
          </div>
          <div className="heading-actions">
            {source.historyAvailable && (
              <button
                className="button primary"
                onClick={() => onRecords(source.id)}
              >
                查看原文 / 清洗
                <ArrowRight size={14} />
              </button>
            )}
            {source.count != null && (
              <button className="button" onClick={() => onDocuments(source.id)}>
                查看业务资料
              </button>
            )}
            {url && (
              <a href={url} target="_blank" rel="noreferrer" className="button">
                来源网站
                <ArrowUpRight size={14} />
              </a>
            )}
          </div>
        </div>
        <div>
          <span className="tiny-label">来源观测</span>
          {source.health ? (
            <dl className="source-health">
              <div>
                <dt>最近采集检查</dt>
                <dd>
                  {dateTime(
                    source.health.collection.last_check_at || undefined,
                  )}
                </dd>
              </div>
              <div>
                <dt>发布心跳</dt>
                <dd>
                  {dateTime(
                    source.health.publication.last_heartbeat || undefined,
                  )}
                </dd>
              </div>
              <div>
                <dt>状态采样时间</dt>
                <dd>{dateTime(source.health.observedAt)}</dd>
              </div>
            </dl>
          ) : (
            <p className="muted">当前未提供该来源的采集检查信息。</p>
          )}
          {tasks.length > 0 && (
            <button className="text-button" onClick={() => onTasks(source.id)}>
              查看 {tasks.length} 项监测
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export function DeliveryView({
  data,
  onDocuments,
}: {
  data: Snapshot;
  onDocuments: () => void;
}) {
  const stats = data.sync;
  const total = stats ? stats.synced + stats.pending + stats.failed : 0;
  return (
    <>
      <div className="view-intro">
        <div>
          <span className="eyebrow">知识交付 / WeKnora</span>
          <h1>让资料，进入知识体系。</h1>
          <p>读取 Fabric 的业务资料同步状态，观察积压与已完成交付。</p>
        </div>
        <div className="integration-emblem">
          <Layers3 size={35} />
          <span>WeKnora</span>
        </div>
      </div>
      <div className="metrics-grid three">
        <Metric
          icon={CheckCheck}
          title="业务资料已同步"
          value={stats?.synced}
          note="Fabric 记录的同步状态"
          onClick={onDocuments}
        />
        <Metric
          icon={Clock3}
          title="等待同步"
          value={stats?.pending}
          note="等待进入知识库的业务资料"
          accent="amber"
          onClick={onDocuments}
        />
        <Metric
          icon={ShieldCheck}
          title="同步失败"
          value={stats?.failed}
          note="保留失败状态，供后续处理"
          accent="purple"
          onClick={onDocuments}
        />
      </div>
      <section className="panel delivery-panel">
        <SectionHeader
          title="业务资料同步进度"
          caption="同步完成与远端索引可检索是不同状态"
        />
        <div className="delivery-route">
          <div>
            <Database size={25} />
            <b>业务资料库</b>
            <span>{number(data.total)} 条库存</span>
          </div>
          <div className="delivery-connection">
            <span />
            <ArrowRight size={19} />
          </div>
          <div>
            <Layers3 size={25} />
            <b>WeKnora</b>
            <span>{number(stats?.synced)} 条已同步</span>
          </div>
        </div>
        {stats ? (
          <>
            <div
              className="delivery-progress"
              aria-label={`业务资料同步比例${percent(stats.synced, total)}`}
            >
              <span
                style={{
                  width: `${total ? (stats.synced / total) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="delivery-ratio">
              <b>{percent(stats.synced, total)}</b>
              <span>本次同步状态统计中的已同步比例</span>
            </div>
          </>
        ) : (
          <Empty title="同步统计暂时不可用" />
        )}
        <div className="notice">
          <Link2 size={17} />
          <p>
            此处展示 Fabric
            已开放的同步记录。远端知识条目的解析、向量索引与检索状态尚未向当前只读连接开放。
          </p>
        </div>
      </section>
      <section className="panel">
        <SectionHeader
          title="持续采集来源的发布心跳"
          caption="用于观察版本发布服务；不等同于知识库接收回执"
        />
        <div className="publication-grid">
          {data.sources
            .filter((s) => s.health)
            .map((s) => (
              <div key={s.id}>
                <span
                  className="source-small-dot"
                  style={{ background: s.color }}
                />
                <div>
                  <b>{s.name}</b>
                  <small>
                    {dateTime(
                      s.health?.publication.last_heartbeat || undefined,
                    )}
                  </small>
                </div>
                <span className="tag">
                  {s.health?.publication.state === "running"
                    ? "发布服务运行中"
                    : s.health?.publication.state === "idle"
                      ? "等待发布"
                      : s.health?.publication.state || "未提供"}
                </span>
              </div>
            ))}
        </div>
      </section>
    </>
  );
}
