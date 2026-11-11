import { useCallback, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Boxes,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Database,
  Download,
  FileText,
  Globe2,
  Layers3,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  Network,
  Pause,
  Play,
  Radar,
  Radio,
  RefreshCw,
  ScanText,
  Search,
  Settings2,
  Sparkles,
  Workflow,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import FlowCanvas from "./FlowCanvas";
import DetailDrawer from "./DetailDrawer";
import DocumentsTable from "./DocumentsTable";
import { useSnapshot } from "./api";
import { documentTitle, dateTime, number, percent, stateLabel } from "./format";
import type { Selection, Snapshot, Source, View } from "./types";

function Count({ value }: { value: number | null | undefined }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (value == null || !ref.current) return;
    const controls = animate(previous.current, value, {
      duration: reduced ? 0 : 1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = number(Math.round(v));
      },
    });
    previous.current = value;
    return () => controls.stop();
  }, [value, reduced]);
  return (
    <span ref={ref} className="tabular">
      {value == null ? "—" : number(value)}
    </span>
  );
}

const views: { id: View; name: string; icon: LucideIcon }[] = [
  { id: "overview", name: "采集总览", icon: LayoutDashboard },
  { id: "sources", name: "数据来源", icon: Globe2 },
  { id: "activity", name: "运行与活动", icon: Activity },
  { id: "documents", name: "资料浏览", icon: FileText },
];

function Brand({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand ${small ? "small" : ""}`}>
      <div className="brand-mark">
        <Radar size={26} strokeWidth={1.65} />
      </div>
      <div>
        <strong>
          BioRadar<span> / </span>
        </strong>
        <small>情报数据工作台</small>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  title,
  value,
  caption,
  accent,
  suffix,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  value: number | null | undefined;
  caption: string;
  accent: string;
  suffix?: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      className={`metric ${accent}`}
      onClick={onClick}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
    >
      <div className="metric-top">
        <span>{title}</span>
        <span className="metric-icon">
          <Icon size={17} strokeWidth={1.7} />
        </span>
      </div>
      <div className="metric-value">
        <Count value={value} />
        <span>{suffix || "条"}</span>
      </div>
      <div className="metric-bottom">
        <span>{caption}</span>
        <ArrowUpRight size={15} />
      </div>
    </motion.button>
  );
}

function SourceMark({ source }: { source: Source }) {
  return (
    <span
      className="source-mark"
      style={{ background: `${source.color}13`, color: source.color }}
    >
      {source.short === "NMPA" ? (
        <Globe2 size={22} strokeWidth={1.6} />
      ) : source.short === "CDE" ? (
        <Boxes size={22} strokeWidth={1.6} />
      ) : (
        <Database size={21} strokeWidth={1.6} />
      )}
    </span>
  );
}

function SourceDistribution({
  data,
  onSelect,
  onNavigate,
}: {
  data: Snapshot;
  onSelect: (s: Selection) => void;
  onNavigate: (v: View) => void;
}) {
  return (
    <section className="panel sources-panel">
      <div className="panel-heading">
        <div>
          <h2>
            数据从哪里来
            <span className="count-pill">{data.sources.length}</span>
          </h2>
          <p>业务资料库内，各来源的资料占比</p>
        </div>
        <button className="text-button" onClick={() => onNavigate("sources")}>
          全部来源 <ArrowUpRight size={14} />
        </button>
      </div>
      <div className="stacked-bar" aria-label="来源资料数量占比">
        {data.sources
          .filter((s) => s.count != null && s.count > 0)
          .map((s) => (
            <motion.button
              title={`${s.name} · ${percent(s.count, data.total)}`}
              aria-label={`查看${s.name}`}
              key={s.id}
              initial={{ width: 0 }}
              animate={{
                width: `${data.total ? ((s.count || 0) / data.total) * 100 : 0}%`,
              }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              style={{ background: s.color }}
              onClick={() => onSelect({ type: "source", id: s.id })}
            />
          ))}
      </div>
      <div className="source-rank-list">
        {data.sources.slice(0, 5).map((s, i) => (
          <button
            className="source-rank"
            key={s.id}
            onClick={() => onSelect({ type: "source", id: s.id })}
          >
            <span className="rank-no">0{i + 1}</span>
            <SourceMark source={s} />
            <div className="source-rank-info">
              <strong>{s.name}</strong>
              <small>{s.category}</small>
            </div>
            <div className="source-rank-numbers">
              <b>{number(s.count)}</b>
              <small>{percent(s.count, data.total)}</small>
            </div>
            <ChevronRight size={14} />
          </button>
        ))}
      </div>
      <div className="panel-footnote">
        <InfoDot />
        占比仅含业务库；独立 History 库未计入
      </div>
    </section>
  );
}

function InfoDot() {
  return <CircleHelp size={13} />;
}

function RunningTasks({
  data,
  onSelect,
  full = false,
}: {
  data: Snapshot;
  onSelect: (s: Selection) => void;
  full?: boolean;
}) {
  const tasks = data.collection?.tasks || [];
  const running = tasks.filter((t) => t.status === "running");
  const failed = tasks.filter((t) => t.status === "failed");
  const ordered = [...tasks].sort(
    (a, b) =>
      ({
        running: 0,
        failed: 1,
        stale: 2,
        queued: 3,
        idle: 4,
        completed: 5,
        unknown: 6,
      })[a.status] -
      {
        running: 0,
        failed: 1,
        stale: 2,
        queued: 3,
        idle: 4,
        completed: 5,
        unknown: 6,
      }[b.status],
  );
  const shown = full ? ordered : ordered.slice(0, 3);
  return (
    <section className={`panel running-panel ${full ? "full-running" : ""}`}>
      <div className="panel-heading">
        <div>
          <h2>
            现在正在做什么
            {data.capabilities.collectionTasks && (
              <span className="count-pill">{tasks.length}</span>
            )}
          </h2>
          <p>持续采集的最近状态 · 点击查看批次与错误</p>
        </div>
        <span
          className={`state-label ${data.capabilities.collectionTasks ? "connected" : ""}`}
        >
          <i />
          {data.capabilities.collectionTasks
            ? running.length
              ? `${running.length} 个任务运行中`
              : "持续监测已接入"
            : "等待任务接口"}
        </span>
      </div>
      {!data.capabilities.collectionTasks ? (
        <div className="task-empty">
          <div className="task-empty-visual">
            <div className="empty-orbit orbit-one" />
            <div className="empty-orbit orbit-two" />
            <Radio size={28} strokeWidth={1.3} />
            <span className="orbit-point" />
          </div>
          <div>
            <h3>让每个采集任务都可见</h3>
            <p>
              资料库存已经可见。爬虫任务、当前 URL
              和抓取进度，等待新采集接口接入。
            </p>
            <button
              className="text-button"
              onClick={() => onSelect({ type: "stage", id: "ingest" })}
            >
              查看接入范围 <ArrowRight size={14} />
            </button>
          </div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="inline-empty">
          <CheckCheck size={28} />
          <h3>当前没有已配置的监测任务</h3>
          <p>新任务出现后会自动更新到这里。</p>
        </div>
      ) : (
        <div className="task-list">
          {shown.map((t) => (
            <button
              key={t.id}
              className="task-row"
              onClick={() => onSelect({ type: "task", id: t.id })}
            >
              <span className={`task-status-icon ${t.status}`}>
                {t.status === "running" ? (
                  <LoaderCircle className="spin" size={17} />
                ) : t.status === "failed" ? (
                  <CircleHelp size={17} />
                ) : (
                  <Clock3 size={17} />
                )}
              </span>
              <div>
                <b>{t.title}</b>
                <small>最近检查 {dateTime(t.startedAt, true)}</small>
                <span className="task-batch-count">
                  已记录批次 <strong>{number(t.processed)}</strong> 条
                  {t.newVersions != null && (
                    <>
                      {" "}
                      · 新版本 <strong>{number(t.newVersions)}</strong> 条
                    </>
                  )}
                </span>
                {t.total != null &&
                  t.total > 0 &&
                  t.processed != null &&
                  t.countScope !== "last_batch" && (
                    <div className="task-progress">
                      <i
                        style={{
                          width: `${Math.min(100, (t.processed / t.total) * 100)}%`,
                        }}
                      />
                    </div>
                  )}
              </div>
              <span className={`status-chip ${t.status}`}>
                {t.status === "failed" ? "采集失败" : stateLabel[t.status]}
              </span>
              <ChevronRight size={14} />
            </button>
          ))}
          {!full && tasks.length > shown.length && (
            <button
              className="text-button all-tasks-link"
              onClick={() => onSelect({ type: "stage", id: "ingest" })}
            >
              查看全部 {tasks.length} 项监测 <ArrowRight size={13} />
            </button>
          )}
        </div>
      )}
      <div className="activity-summary">
        <span>
          <span className="tiny-dot" />
          {data.capabilities.collectionTasks
            ? "持续采集状态来自现役 API"
            : "资料库 API 已接入"}
        </span>
        <span>
          {failed.length ? (
            <>
              <b>{failed.length}</b> 个监测需留意
            </>
          ) : (
            <>
              运行中 <b>{number(running.length)}</b> 个
            </>
          )}
        </span>
      </div>
    </section>
  );
}

function PipelineStrip({ onSelect }: { onSelect: (s: Selection) => void }) {
  return (
    <div className="pipeline-strip">
      <div className="pipeline-step current">
        <span className="step-icon">
          <ArrowDownToLine size={16} />
        </span>
        <div>
          <b>数据采集</b>
          <small>当前工作空间</small>
        </div>
        <span className="current-stage-dot" />
      </div>
      <ChevronRight size={15} />
      <button
        className="pipeline-step"
        onClick={() => onSelect({ type: "stage", id: "cleaning" })}
      >
        <span className="step-icon">
          <ScanText size={16} />
        </span>
        <div>
          <b>清洗与加工</b>
          <small>流程观测待接入</small>
        </div>
      </button>
      <ChevronRight size={15} />
      <button
        className="pipeline-step"
        onClick={() => onSelect({ type: "stage", id: "sync" })}
      >
        <span className="step-icon">
          <Layers3 size={16} />
        </span>
        <div>
          <b>知识库</b>
          <small>已可读取同步状态</small>
        </div>
      </button>
      <ChevronRight size={15} />
      <button
        className="pipeline-step"
        onClick={() => onSelect({ type: "stage", id: "radar" })}
      >
        <span className="step-icon">
          <Radar size={16} />
        </span>
        <div>
          <b>雷达分析</b>
          <small>调查流程待接入</small>
        </div>
      </button>
      <span className="strip-caption">全链路视角</span>
    </div>
  );
}

function Overview({
  data,
  onSelect,
  onNavigate,
}: {
  data: Snapshot;
  onSelect: (s: Selection) => void;
  onNavigate: (v: View) => void;
}) {
  const [demo, setDemo] = useState(false);
  const reduced = useReducedMotion();
  return (
    <>
      <div className="metrics-grid">
        <Metric
          title="已入库资料"
          value={data.total}
          caption="业务资料库 · 不含独立 History 库"
          icon={Database}
          accent="teal"
          onClick={() => onSelect({ type: "stage", id: "archive" })}
        />
        <Metric
          title="数据来源"
          value={data.sources.length}
          caption="业务库与持续采集登记来源"
          suffix="个"
          icon={Globe2}
          accent="blue"
          onClick={() => onNavigate("sources")}
        />
        <Metric
          title="待抽取资料"
          value={data.extraction?.pending}
          caption={
            data.extraction
              ? `${number(data.extraction.done)} 条已完成抽取`
              : "抽取接口暂时不可用"
          }
          icon={ScanText}
          accent="amber"
          onClick={() => onSelect({ type: "stage", id: "extraction" })}
        />
        <Metric
          title="知识库已同步"
          value={data.sync?.synced}
          caption={
            data.sync
              ? `${percent(data.sync.synced, data.total)} 的库内资料已同步`
              : "同步接口暂时不可用"
          }
          icon={Layers3}
          accent="violet"
          onClick={() => onSelect({ type: "stage", id: "sync" })}
        />
      </div>
      <section className="flow-panel">
        <div className="flow-panel-heading">
          <div>
            <span className="section-icon">
              <Workflow size={18} />
            </span>
            <h2>数据流转图</h2>
            <span className="thin-divider" />
            <p>从来源到知识库，一眼看清</p>
          </div>
          <button
            className={`flow-demo-button ${demo ? "enabled" : ""}`}
            onClick={() => setDemo((d) => !d)}
            aria-pressed={demo}
            disabled={Boolean(reduced)}
            title={
              reduced
                ? "已遵循系统减少动态效果设置"
                : "只展示动效，不会启动后台任务"
            }
          >
            {demo ? <Pause size={13} /> : <Play size={13} />}{" "}
            {demo ? "停止演示" : "演示动效"}
          </button>
        </div>
        <FlowCanvas data={data} demo={demo && !reduced} onSelect={onSelect} />
        <div className="flow-panel-foot">
          <span>
            <Network size={13} />
            连线展示逻辑流程，节点数量来自当前资料库
          </span>
          <span>
            <span className="tiny-dot" />
            只读观测
          </span>
        </div>
      </section>
      <div className="overview-columns">
        <SourceDistribution
          data={data}
          onSelect={onSelect}
          onNavigate={onNavigate}
        />
        <div className="right-stack">
          <RunningTasks data={data} onSelect={onSelect} />
          <section className="next-stage-card">
            <span className="next-stage-icon">
              <Sparkles size={21} />
            </span>
            <div>
              <b>连接数据，也连接洞察</b>
              <p>清洗、核验与雷达分析，将在这里逐步串联。</p>
            </div>
            <button
              className="icon-button"
              aria-label="了解后续雷达流程"
              onClick={() => onSelect({ type: "stage", id: "radar" })}
            >
              <ArrowUpRight size={19} />
            </button>
          </section>
        </div>
      </div>
      <section className="panel recent-panel">
        <div className="panel-heading">
          <div>
            <h2>库内近期资料</h2>
            <p>查看原始资料、来源与处理状态</p>
          </div>
          <button
            className="text-button"
            onClick={() => onNavigate("documents")}
          >
            浏览全部资料 <ArrowUpRight size={14} />
          </button>
        </div>
        <DocumentsTable
          compact
          sources={data.sources}
          onOpen={(d) => onSelect({ type: "document", id: d.uuid })}
        />
      </section>
    </>
  );
}

function SourcesView({
  data,
  query,
  setQuery,
  onSelect,
}: {
  data: Snapshot;
  query: string;
  setQuery: (q: string) => void;
  onSelect: (s: Selection) => void;
}) {
  const [category, setCategory] = useState("全部来源");
  const categories = [
    "全部来源",
    ...new Set(data.sources.map((s) => s.category)),
  ];
  const sources = data.sources.filter(
    (s) =>
      (category === "全部来源" || s.category === category) &&
      `${s.name} ${s.id} ${s.description}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="source-overview-banner">
        <div>
          <span className="eyebrow">来源网络</span>
          <h2>每一个来源，都是一条可追溯的线索。</h2>
          <p>查看各来源的资料规模、处理状态和已入库内容。</p>
        </div>
        <div className="source-overview-totals">
          <div>
            <strong>{data.sources.length}</strong>
            <span>个数据来源</span>
          </div>
          <div>
            <strong>{number(data.total)}</strong>
            <span>条入库资料</span>
          </div>
        </div>
      </div>
      <div className="source-view-controls">
        <div className="category-tabs">
          {categories.map((c) => (
            <button
              key={c}
              className={category === c ? "active" : ""}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="input-with-icon">
          <Search size={16} />
          <input
            id="source-search"
            placeholder="搜索来源名称或标识…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="搜索来源"
          />
        </div>
      </div>
      <div className="source-cards">
        {sources.map((s, i) => (
          <motion.button
            className="source-card"
            key={s.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onSelect({ type: "source", id: s.id })}
          >
            <div className="source-card-top">
              <SourceMark source={s} />
              <span className="neutral-pill">{s.category}</span>
              <ArrowUpRight size={17} />
            </div>
            <h2>{s.name}</h2>
            <p>{s.description}</p>
            <div className="source-card-count">
              <strong>{number(s.count)}</strong>
              <span>{s.historyOnly ? "独立 History 库" : "条资料"}</span>
              <b>{percent(s.count, data.total)}</b>
            </div>
            <div className="source-share-track">
              <motion.i
                initial={{ width: 0 }}
                animate={{
                  width: `${data.total ? ((s.count || 0) / data.total) * 100 : 0}%`,
                }}
                style={{ background: s.color }}
              />
            </div>
            <div className="source-card-bottom">
              <code>{s.id}</code>
              <span>
                查看详情 <ChevronRight size={13} />
              </span>
            </div>
          </motion.button>
        ))}
      </div>
      {!sources.length && (
        <div className="panel inline-empty">
          <Search size={28} />
          <h3>没有找到这个来源</h3>
          <p>试试来源名称或缩写。</p>
          <button
            className="text-button"
            onClick={() => {
              setQuery("");
              setCategory("全部来源");
            }}
          >
            清除筛选
          </button>
        </div>
      )}
    </>
  );
}

function ActivityView({
  data,
  onSelect,
}: {
  data: Snapshot;
  onSelect: (s: Selection) => void;
}) {
  return (
    <div className="activity-layout">
      <RunningTasks full data={data} onSelect={onSelect} />
      <section className="panel timeline-panel">
        <div className="panel-heading">
          <div>
            <h2>资料更新记录</h2>
            <p>来自当前资料列表的更新时间，不等同于爬虫运行日志</p>
          </div>
          <Clock3 size={18} className="muted-text" />
        </div>
        <div className="timeline">
          {data.documents.slice(0, 12).map((d, i) => (
            <button
              className="timeline-item"
              key={d.uuid}
              onClick={() => onSelect({ type: "document", id: d.uuid })}
            >
              <div className="timeline-rail">
                <span className={i === 0 ? "highlight" : ""} />
                {i < 11 && <i />}
              </div>
              <div className="timeline-content">
                <span className="timeline-meta">
                  {dateTime(d.updated_at)}
                  <span>
                    {data.sources.find((s) => s.id === d.source_site)?.short ||
                      d.source_site}
                  </span>
                </span>
                <h3>{documentTitle(d)}</h3>
                <span className={`status-chip ${d.extraction_status}`}>
                  {stateLabel[d.extraction_status] || d.extraction_status}
                </span>
              </div>
              <ArrowUpRight size={15} />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>("overview");
  const [live, setLive] = useState(true);
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState("");
  const { data, error, refreshing, refresh } = useSnapshot(live);
  const closeDrawer = useCallback(() => setSelection(null), []);
  const navigate = (v: View) => {
    setView(v);
    setMenu(false);
    setQuery("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setView("sources");
        setTimeout(() => document.getElementById("source-search")?.focus(), 80);
      }
      if (e.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const exportSnapshot = () => {
    if (!data) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `BioRadar-采集快照-${data.observedAt.slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setToast("当前观测快照已导出");
  };
  const title = views.find((v) => v.id === view)?.name || "采集总览";
  const stale = Boolean(error || data?.stale);
  return (
    <div className="app-shell">
      {menu && (
        <button
          className="mobile-nav-scrim"
          aria-label="关闭导航"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <a
          className="brand-link"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("overview");
          }}
        >
          <Brand />
        </a>
        <div className="workspace-selector">
          <span className="workspace-avatar">B</span>
          <div>
            <b>医药情报工作空间</b>
            <small>数据与情报</small>
          </div>
          <ChevronDown size={15} />
        </div>
        <div className="nav-caption">工作台</div>
        <nav>
          {views.map(({ id, name, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${view === id ? "active" : ""}`}
              onClick={() => navigate(id)}
            >
              <Icon size={18} strokeWidth={1.7} />
              <span>{name}</span>
              {id === "sources" && data && <small>{data.sources.length}</small>}
              {view === id && <i />}
            </button>
          ))}
        </nav>
        <div className="nav-caption next-nav-caption">全流程</div>
        <button
          className="nav-item future"
          onClick={() => {
            setSelection({ type: "stage", id: "cleaning" });
            setMenu(false);
          }}
        >
          <ScanText size={18} />
          <span>清洗与加工</span>
          <span className="soon-label">即将接入</span>
        </button>
        <button
          className="nav-item future"
          onClick={() => {
            setSelection({ type: "stage", id: "radar" });
            setMenu(false);
          }}
        >
          <Radar size={18} />
          <span>雷达分析</span>
          <span className="soon-label">即将接入</span>
        </button>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <div className="sidebar-note-icon">
              <Network size={20} />
            </div>
            <b>看见数据的每一程</b>
            <p>
              连接采集、清洗与分析，
              <br />
              让情报有迹可循。
            </p>
            <button onClick={() => setSelection({ type: "about" })}>
              查看当前连接 <ArrowUpRight size={13} />
            </button>
          </div>
          <button
            className="connection-row"
            onClick={() => setSelection({ type: "about" })}
          >
            <span className={`connection-light ${stale ? "warning" : ""}`} />
            <div>
              <b>
                {stale
                  ? "数据连接需留意"
                  : data
                    ? "资料库已连接"
                    : "正在连接资料库"}
              </b>
              <small>4022 · 独立观测台</small>
            </div>
            <Settings2 size={15} />
          </button>
          <div className="sidebar-footer">
            <span className="avatar">ZK</span>
            <div>
              <b>研究工作空间</b>
              <small>只读访问</small>
            </div>
            <CircleHelp size={17} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-location">
            <button
              className="mobile-menu icon-button"
              onClick={() => setMenu((m) => !m)}
              aria-label="打开导航"
            >
              <Menu size={21} />
            </button>
            <span>工作空间</span>
            <ChevronRight size={13} />
            <strong>{title}</strong>
            <span className="readonly-tag">只读</span>
          </div>
          <div className="topbar-actions">
            <button
              className="topbar-search"
              onClick={() => {
                setView("sources");
                setTimeout(
                  () => document.getElementById("source-search")?.focus(),
                  80,
                );
              }}
            >
              <Search size={16} />
              <span>查找来源</span>
              <kbd>⌘ K</kbd>
            </button>
            <span className="topbar-separator" />
            <button
              className="icon-button notification-button"
              aria-label="查看数据连接状态"
              onClick={() => setSelection({ type: "about" })}
            >
              <Bell size={18} />
              {(stale || Boolean(data?.warnings.length)) && <i />}
            </button>
            <span className="topbar-avatar">ZK</span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span />
                数据，让洞察发生
              </div>
              <h1>
                {view === "overview" ? "看清数据的每一程" : title}
                <span className="heading-period">.</span>
              </h1>
              <p>
                {view === "overview"
                  ? "汇聚分散信源，掌握资料流转。从全局到每一条记录。"
                  : view === "sources"
                    ? "来源、规模与处理状态，清晰呈现。"
                    : view === "activity"
                      ? "跟踪运行状态，回看资料的更新轨迹。"
                      : "每条资料都有来源，每个状态都可追踪。"}
              </p>
            </div>
            <div className="heading-actions">
              <button
                className={`live-switch ${live && !stale ? "active" : ""}`}
                onClick={() => setLive((v) => !v)}
                aria-pressed={live}
              >
                <span className="live-pulse" />
                {live ? (stale ? "连接待恢复" : "自动刷新") : "刷新已暂停"}
                <ChevronDown size={12} />
              </button>
              <button
                className="button secondary refresh-button"
                onClick={() => void refresh()}
                disabled={refreshing}
                aria-label="刷新数据"
              >
                <RefreshCw size={16} className={refreshing ? "spin" : ""} />
              </button>
              <button
                className="button primary"
                onClick={exportSnapshot}
                disabled={!data}
              >
                <Download size={15} />
                导出快照
              </button>
            </div>
          </div>
          <div className="dataset-line">
            <span>
              <Database size={13} />
              {data?.dataset.label || "正在读取资料库"}
            </span>
            <span className="dataset-dot" />
            <span>累计库存</span>
            <span className="dataset-update">
              {refreshing
                ? "正在刷新"
                : data
                  ? `更新于 ${dateTime(data.observedAt, true)} · 北京时间`
                  : "等待首次响应"}
            </span>
          </div>
          {stale && (
            <div className="connection-banner" role="status">
              <Radio size={17} />
              <span>
                {data
                  ? "数据连接暂时中断，当前保留上次成功读取的快照。"
                  : error}
              </span>
              <button onClick={() => void refresh()}>
                重新连接 <ArrowRight size={13} />
              </button>
            </div>
          )}
          <PipelineStrip onSelect={setSelection} />
          {!data ? (
            <div className="loading-state" role="status">
              <div className="loading-orbit">
                <Radar size={38} />
              </div>
              <h2>{error ? "资料服务暂时不可用" : "正在连接你的数据世界"}</h2>
              <p>
                {error
                  ? "检查资料服务后，点击上方重新连接。"
                  : "读取来源、库存与处理状态…"}
              </p>
              <div className="skeleton-metrics">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} />
                ))}
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                {view === "overview" && (
                  <Overview
                    data={data}
                    onSelect={setSelection}
                    onNavigate={navigate}
                  />
                )}
                {view === "sources" && (
                  <SourcesView
                    data={data}
                    query={query}
                    setQuery={setQuery}
                    onSelect={setSelection}
                  />
                )}
                {view === "activity" && (
                  <ActivityView data={data} onSelect={setSelection} />
                )}
                {view === "documents" && (
                  <section className="panel all-documents-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>
                          资料目录
                          <span className="count-pill">
                            {number(data.total)}
                          </span>
                        </h2>
                        <p>按来源和处理状态筛选，点击资料查看详情</p>
                      </div>
                      <FileText size={20} className="muted-text" />
                    </div>
                    <DocumentsTable
                      sources={data.sources}
                      onOpen={(d) =>
                        setSelection({ type: "document", id: d.uuid })
                      }
                    />
                  </section>
                )}
              </motion.div>
            </AnimatePresence>
          )}
          <footer className="main-footer">
            <span>
              <Radar size={13} />
              BioRadar 数据观测台
            </span>
            <span>真实状态 · 清晰来源 · 可追溯过程</span>
            <button onClick={() => setSelection({ type: "about" })}>
              数据口径 <CircleHelp size={12} />
            </button>
          </footer>
        </main>
      </div>
      {data && (
        <DetailDrawer
          selection={selection}
          data={data}
          onClose={closeDrawer}
          onSelect={setSelection}
        />
      )}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            role="status"
          >
            <Check size={17} />
            {toast}
            <button aria-label="关闭提示" onClick={() => setToast("")}>
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
