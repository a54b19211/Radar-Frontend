import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Braces,
  ChevronRight,
  CircleHelp,
  Database,
  Download,
  ExternalLink,
  Globe2,
  Layers3,
  LayoutDashboard,
  Menu,
  Moon,
  Pause,
  Play,
  RadioTower,
  RefreshCw,
  Search,
  ShieldCheck,
  Sun,
  Workflow,
  X,
} from "lucide-react";
import PipelineScene from "./PipelineScene";
import { DeliveryView, SourcesView, TaskList, TasksView } from "./Operations";
import { RecordBrowser, RecordInspector } from "./Records";
import DocumentsTable from "./DocumentsTable";
import { getJson, useSnapshot } from "./api";
import { documentTitle, dateTime, number, percent } from "./format";
import { parseJson, pretty, safeSourceUrl } from "./content";
import { download, Empty, Metric, SectionHeader, Status } from "./ui";
import type { Document, HistoryRecord, Snapshot, View } from "./types";

const navigation = [
  { id: "overview" as View, name: "采集总览", icon: LayoutDashboard },
  { id: "activity" as View, name: "任务流水线", icon: Workflow },
  { id: "sources" as View, name: "信源中心", icon: Globe2 },
  { id: "records" as View, name: "原文与清洗", icon: Braces },
  { id: "documents" as View, name: "业务资料库", icon: Database },
  { id: "delivery" as View, name: "知识交付", icon: Layers3 },
];
const routeViews = new Set([...navigation.map((v) => v.id), "record"]);
function readRoute() {
  const [path, query = ""] = location.hash.replace(/^#\/?/, "").split("?");
  return {
    view: (routeViews.has(path as View) ? path : "overview") as View,
    params: new URLSearchParams(query),
  };
}
function go(view: View, params: Record<string, string | undefined> = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] =>
      Boolean(entry[1]),
    ),
  );
  location.hash = `/${view}${query.size ? "?" + query : ""}`;
}

export default function Console() {
  const [route, setRoute] = useState(readRoute);
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem("bioradar-theme") !== "light";
    } catch {
      return true;
    }
  });
  const [motionOn, setMotionOn] = useState(true);
  const [visible, setVisible] = useState(!document.hidden);
  const [sidebar, setSidebar] = useState(false);
  const [connection, setConnection] = useState(false);
  const [legacy, setLegacy] = useState<Document | null>(null);
  const reduced = useReducedMotion();
  const { data, error, refreshing, refresh } = useSnapshot(true);
  const active = motionOn && !reduced && visible;
  const closeLegacy = useCallback(() => setLegacy(null), []);
  const closeConnection = useCallback(() => setConnection(false), []);
  useEffect(() => {
    const changed = () => {
      setRoute(readRoute());
      setSidebar(false);
      window.scrollTo({ top: 0 });
    };
    const visibility = () => setVisible(!document.hidden);
    window.addEventListener("hashchange", changed);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("hashchange", changed);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    try {
      localStorage.setItem("bioradar-theme", dark ? "dark" : "light");
    } catch {
      /* Theme remains active for this visit. */
    }
  }, [dark]);
  useEffect(() => {
    document.documentElement.dataset.motion = active ? "on" : "off";
  }, [active]);
  useEffect(() => {
    document.title = `${navigation.find((v) => v.id === (route.view === "record" ? "records" : route.view))?.name || "采集观测"} · BioRadar`;
  }, [route.view]);
  const tasks = data?.collection?.tasks || [];
  const attention = tasks.filter(
    (t) => t.status === "failed" || t.status === "stale",
  );
  const currentView = route.view === "record" ? "records" : route.view;
  const selectedSource = route.params.get("source") || "";
  const openRecord = (record: HistoryRecord, cutoff: string) =>
    go("record", {
      source: record.source_id,
      record: record.source_record_id,
      version: record.version_id,
      cutoff,
      run: route.params.get("run") || undefined,
    });
  return (
    <div className="app-shell">
      {sidebar && (
        <button
          className="mobile-scrim"
          aria-label="收起导航"
          onClick={() => setSidebar(false)}
        />
      )}
      <aside className={`sidebar ${sidebar ? "open" : ""}`}>
        <a className="brand" href="#/overview">
          <span className="brand-orbit">
            <RadioTower size={25} />
            <i />
            <i />
          </span>
          <span>
            <b>
              BioRadar<span> /</span>
            </b>
            <small>情报数据工作空间</small>
          </span>
        </a>
        <div className="workspace-label">
          <span className="workspace-avatar">医</span>
          <span>
            医药情报工作空间<small>数据采集与知识加工</small>
          </span>
          <ChevronRight size={13} />
        </div>
        <span className="nav-caption">数据工作台</span>
        <nav>
          {navigation.map((item) => (
            <a
              key={item.id}
              href={`#/${item.id}`}
              className={currentView === item.id ? "active" : ""}
              aria-current={currentView === item.id ? "page" : undefined}
            >
              <item.icon size={18} strokeWidth={1.7} />
              <span>{item.name}</span>
              {item.id === "sources" && data && (
                <small>{data.sources.length}</small>
              )}
              {item.id === "activity" && attention.length > 0 && (
                <small className="nav-alert">{attention.length}</small>
              )}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="sidebar-note-icon">
              <ShieldCheck size={18} />
            </span>
            <strong>看得见过程，追得溯来源。</strong>
            <p>从原始资料到结构化知识，每一步都有据可查。</p>
            <button onClick={() => go("records")}>
              打开一条真实资料
              <ArrowUpRight size={14} />
            </button>
          </div>
          <button
            className="sidebar-connection"
            onClick={() => setConnection(true)}
          >
            <span
              className={`connection-dot ${data && !error && !data.stale ? "ok" : ""}`}
            />
            <span>
              {data && !error && !data.stale
                ? "数据服务已连接"
                : "正在连接数据服务"}
              <small>4022 · 只读观测台</small>
            </span>
            <CircleHelp size={15} />
          </button>
          <div className="workspace-footer">
            <span className="avatar">研</span>
            <div>
              研究工作空间<small>只读访问 · 真实数据</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-menu"
              aria-label="打开导航"
              onClick={() => setSidebar(true)}
            >
              <Menu size={20} />
            </button>
            <span>工作空间</span>
            <ChevronRight size={13} />
            <b>{navigation.find((v) => v.id === currentView)?.name}</b>
            <span className="read-badge">只读</span>
          </div>
          <div className="topbar-actions">
            <button className="topbar-search" onClick={() => go("records")}>
              <Search size={16} />
              <span>检索资料</span>
            </button>
            <button
              className="icon-button"
              aria-label={dark ? "切换浅色模式" : "切换深色模式"}
              onClick={() => setDark((v) => !v)}
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button
              className={`icon-button ${attention.length ? "has-notification" : ""}`}
              aria-label="查看需关注的监测"
              onClick={() => go("activity", { task: attention[0]?.id })}
            >
              <Bell size={17} />
            </button>
            <span className="avatar">研</span>
          </div>
        </header>
        <main className={`page-content view-${route.view}`}>
          {data && (
            <div className="data-statusbar">
              <span>
                <span
                  className={`connection-dot ${!error && !data.stale ? "ok" : ""}`}
                />
                {data.dataset.label}
                <span className="statusbar-divider" />
                数据快照 {dateTime(data.observedAt, true)}
              </span>
              <div>
                <button
                  className="quiet-button"
                  onClick={() => setMotionOn((v) => !v)}
                  aria-pressed={motionOn}
                >
                  {motionOn ? <Pause size={13} /> : <Play size={13} />}动效
                  {motionOn ? "开启" : "暂停"}
                </button>
                <button
                  className="quiet-button"
                  onClick={() => void refresh()}
                  disabled={refreshing}
                >
                  <RefreshCw size={13} className={refreshing ? "spin" : ""} />
                  {refreshing ? "刷新中" : "刷新"}
                </button>
              </div>
            </div>
          )}
          {(error || data?.stale) && data && (
            <div className="notice warning" role="status">
              <ShieldCheck size={17} />
              <p>连接暂时中断，当前保留上次成功快照；运行流光已暂停。</p>
              <button className="text-button" onClick={() => void refresh()}>
                重新连接
              </button>
            </div>
          )}
          {!data ? (
            <div className="startup">
              <div className="startup-orbit">
                <RadioTower size={32} />
                <i />
                <i />
              </div>
              <h1>
                {error ? "暂时无法连接资料服务" : "正在连接你的数据工作空间"}
              </h1>
              <p>{error || "读取采集监测、资料库存与知识交付状态。"}</p>
              {error && (
                <button
                  className="button primary"
                  onClick={() => void refresh()}
                >
                  重新连接
                </button>
              )}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={route.view}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: active ? 0.2 : 0 }}
              >
                {route.view === "overview" && (
                  <Overview
                    data={data}
                    active={active && !error && !data.stale}
                    openRecord={openRecord}
                  />
                )}
                {route.view === "sources" && (
                  <SourcesView
                    data={data}
                    selected={selectedSource}
                    onSelect={(source) => go("sources", { source })}
                    onRecords={(source) => go("records", { source })}
                    onDocuments={(source) => go("documents", { source })}
                    onTasks={(source) => go("activity", { source })}
                  />
                )}
                {route.view === "activity" && (
                  <TasksView
                    data={data}
                    source={selectedSource}
                    taskId={route.params.get("task") || ""}
                    onPick={(task) =>
                      go("activity", { source: selectedSource, task })
                    }
                    onRecords={(source, run) => go("records", { source, run })}
                  />
                )}
                {route.view === "records" && (
                  <>
                    <div className="view-intro">
                      <div>
                        <span className="eyebrow">采集资料 / 原文可追溯</span>
                        <h1>打开资料，看见处理过程。</h1>
                        <p>原始响应、清洗正文、结构化字段，放在一起核对。</p>
                      </div>
                      <span className="intro-emblem">
                        <Braces size={34} />
                      </span>
                    </div>
                    <section className="panel records-panel">
                      <SectionHeader
                        title="持续采集资料"
                        caption="选择一条真实资料，查看原文与清洗结果"
                      />
                      <RecordBrowser
                        key={`${selectedSource}:${route.params.get("term")}:${route.params.get("run")}`}
                        sources={data.sources}
                        source={selectedSource}
                        term={route.params.get("term") || ""}
                        run={route.params.get("run") || ""}
                        onFilter={(source, term, run) =>
                          go("records", { source, term, run })
                        }
                        onOpen={openRecord}
                      />
                    </section>
                  </>
                )}
                {route.view === "record" && (
                  <RecordInspector
                    key={route.params.get("version")}
                    source={selectedSource}
                    recordId={route.params.get("record") || ""}
                    version={route.params.get("version") || ""}
                    cutoff={route.params.get("cutoff") || undefined}
                    dark={dark}
                    sourceName={
                      data.sources.find((s) => s.id === selectedSource)?.name ||
                      selectedSource
                    }
                    onBack={() =>
                      go("records", {
                        source: selectedSource,
                        run: route.params.get("run") || undefined,
                      })
                    }
                  />
                )}
                {route.view === "documents" && (
                  <Inventory
                    data={data}
                    source={selectedSource}
                    state={route.params.get("state") || ""}
                    onOpen={setLegacy}
                  />
                )}
                {route.view === "delivery" && (
                  <DeliveryView
                    data={data}
                    onDocuments={() => go("documents")}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
          <footer className="page-footer">
            <span>
              <RadioTower size={13} />
              BioRadar · 数据采集工作台
            </span>
            <button onClick={() => setConnection(true)}>
              数据连接与统计口径
              <CircleHelp size={13} />
            </button>
          </footer>
        </main>
      </div>
      {connection && (
        <Modal title="数据连接与统计口径" onClose={closeConnection}>
          <div className="connection-info">
            <div className="connection-hero">
              <RadioTower size={28} />
              <b>{data && !error ? "数据服务已连接" : "等待连接恢复"}</b>
              <span>4022 前端 · zktest 数据服务</span>
            </div>
            <dl className="detail-list">
              <div>
                <dt>业务资料库存</dt>
                <dd>{number(data?.total)} 条 · 未删除的业务条目</dd>
              </div>
              <div>
                <dt>持续采集资料</dt>
                <dd>独立 History 原文版本库，不与业务库存直接相加</dd>
              </div>
              <div>
                <dt>监测任务</dt>
                <dd>真实检查状态与最近一批计数；最近批次不等于当前运行批次</dd>
              </div>
              <div>
                <dt>原文对照</dt>
                <dd>
                  按来源、记录与版本精确读取原文、清洗正文、facts 和字段出处
                </dd>
              </div>
              <div>
                <dt>刷新方式</dt>
                <dd>
                  后台约每分钟汇总一次；页面保持自动读取，切到后台后暂停轮询
                </dd>
              </div>
              <div>
                <dt>知识交付</dt>
                <dd>Fabric 返回的同步状态；远端索引回执尚未向只读连接开放</dd>
              </div>
              <div>
                <dt>图中动效</dt>
                <dd>运行状态驱动路径动画，不模拟未记录的逐条事件</dd>
              </div>
            </dl>
            {data && (
              <button
                className="button"
                onClick={() =>
                  download(
                    "bioradar-snapshot.json",
                    JSON.stringify(data, null, 2),
                    "application/json",
                  )
                }
              >
                <Download size={14} />
                导出当前数据快照
              </button>
            )}
          </div>
        </Modal>
      )}
      {legacy && (
        <LegacyDocument
          item={legacy}
          onClose={closeLegacy}
          onHistory={() => {
            setLegacy(null);
            go("records", { source: legacy?.source_site });
          }}
        />
      )}
    </div>
  );
}

function Overview({
  data,
  active,
  openRecord,
}: {
  data: Snapshot;
  active: boolean;
  openRecord: (record: HistoryRecord, cutoff: string) => void;
}) {
  const tasks = data.collection?.tasks || [];
  const running = tasks.filter((t) => t.status === "running");
  const failed = tasks.filter(
    (t) => t.status === "failed" || t.status === "stale",
  );
  return (
    <>
      <div className="overview-hero">
        <div>
          <div className="eyebrow">
            <span className="hero-tick" />
            数据正在连接，洞察正在发生
          </div>
          <h1>
            看见数据的<span>每一程。</span>
          </h1>
          <p>汇聚信源，追踪采集，让每一份资料都有清晰的来路。</p>
        </div>
        <button className="button primary" onClick={() => go("records")}>
          探索原文与清洗
          <ArrowUpRight size={16} />
        </button>
      </div>
      <div className="metrics-grid">
        <Metric
          icon={Database}
          title="已归档业务资料"
          value={data.total}
          note="业务库存 · 独立历史库另计"
          onClick={() => go("documents")}
        />
        <Metric
          icon={RadioTower}
          title="正在运行的监测"
          value={running.length}
          unit="项"
          note={`共 ${tasks.length} 项监测配置`}
          onClick={() => go("activity")}
        />
        <Metric
          icon={Globe2}
          title="已登记的数据来源"
          value={data.sources.length}
          unit="个"
          note="临床 · 科研 · 监管 · 公共卫生"
          accent="purple"
          onClick={() => go("sources")}
        />
        <Metric
          icon={ShieldCheck}
          title="需要关注的监测"
          value={failed.length}
          unit="项"
          note={
            failed.length
              ? "查看失败或状态过期的来源"
              : "当前未返回失败或过期监测"
          }
          accent="amber"
          onClick={() => go("activity", { task: failed[0]?.id })}
        />
      </div>
      <PipelineScene
        data={data}
        active={active}
        onTasks={(source) => go("activity", { source })}
        onRecords={(source) => go("records", { source })}
      />
      <div className="overview-columns">
        <section className="panel">
          <SectionHeader title="监测动态" caption="持续采集的当前状态">
            <button className="text-button" onClick={() => go("activity")}>
              全部监测
              <ArrowUpRight size={14} />
            </button>
          </SectionHeader>
          <TaskList
            tasks={tasks}
            compact
            onSelect={(task) => go("activity", { task })}
          />
        </section>
        <section className="panel">
          <SectionHeader
            title="资料从哪里来"
            caption="各来源在业务库存中的分布"
          >
            <button className="text-button" onClick={() => go("sources")}>
              信源中心
              <ArrowUpRight size={14} />
            </button>
          </SectionHeader>
          <div className="source-ranking">
            {data.sources
              .filter((s) => s.count != null)
              .slice(0, 5)
              .map((source, i) => (
                <button
                  key={source.id}
                  onClick={() => go("sources", { source: source.id })}
                >
                  <span className="rank">0{i + 1}</span>
                  <span
                    className="source-small-dot"
                    style={{ background: source.color }}
                  />
                  <span className="ranking-name">{source.name}</span>
                  <span>
                    <b>{number(source.count)}</b>
                    <small>{percent(source.count, data.total)}</small>
                  </span>
                  <ChevronRight size={14} />
                </button>
              ))}
          </div>
        </section>
      </div>
      <section className="panel records-panel">
        <SectionHeader
          title="进入一条真实资料"
          caption="ClinicalTrials.gov · 对照原始响应、清洗正文与结构化字段"
        >
          <button className="text-button" onClick={() => go("records")}>
            浏览采集资料
            <ArrowRight size={14} />
          </button>
        </SectionHeader>
        <RecordBrowser
          compact
          sources={data.sources}
          onFilter={(source) => go("records", { source })}
          onOpen={openRecord}
        />
      </section>
    </>
  );
}

function Inventory({
  data,
  source,
  state,
  onOpen,
}: {
  data: Snapshot;
  source: string;
  state: string;
  onOpen: (document: Document) => void;
}) {
  const stages = [
    ["pending", "等待抽取"],
    ["queued", "队列中"],
    ["processing", "正在抽取"],
    ["done", "抽取完成"],
    ["failed", "抽取失败"],
    ["no_entity", "未发现实体"],
  ];
  return (
    <>
      <div className="view-intro">
        <div>
          <span className="eyebrow">业务资料 / 库存与加工</span>
          <h1>让已有资料，也清晰可见。</h1>
          <p>查看历史业务库存、抽取进度与原始内容。</p>
        </div>
        <div className="intro-counter">
          <b>{number(data.total)}</b>
          <span>条业务资料</span>
        </div>
      </div>
      <div className="inventory-stats">
        {stages.map(([key, label]) => (
          <button
            key={key}
            className={state === key ? "selected" : ""}
            onClick={() =>
              go("documents", {
                source,
                state: state === key ? undefined : key,
              })
            }
          >
            <span>{label}</span>
            <b>{number(data.extraction?.[key])}</b>
          </button>
        ))}
      </div>
      <div className="notice">
        <Database size={17} />
        <p>
          此处为历史业务资料库。持续采集的原文、清洗正文和字段对照，请进入“原文与清洗”。
        </p>
        <button className="text-button" onClick={() => go("records")}>
          查看对照
          <ArrowRight size={14} />
        </button>
      </div>
      <section className="panel records-panel">
        <DocumentsTable
          key={`${source}:${state}`}
          sources={data.sources}
          sourceId={source}
          initialState={state}
          onOpen={onOpen}
        />
      </section>
    </>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const targets = Array.from(
          panel.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),a[href],input,select,[tabindex="0"]',
          ) || [],
        );
        const first = targets[0],
          last = targets[targets.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === panel.current)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div className="modal-layer">
      <button
        className="modal-backdrop"
        onClick={onClose}
        aria-label="关闭对话框"
      />
      <motion.div
        className="modal-panel"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="关闭详情"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        <div className="modal-content">{children}</div>
      </motion.div>
    </div>
  );
}

function LegacyDocument({
  item,
  onClose,
  onHistory,
}: {
  item: Document;
  onClose: () => void;
  onHistory: () => void;
}) {
  const [doc, setDoc] = useState<Document | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    getJson<Document>(`/api/documents/${item.uuid}`, controller.signal)
      .then(setDoc)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [item.uuid]);
  const parsed = parseJson(doc?.raw_content || "");
  const url = safeSourceUrl(doc?.source_url || doc?.url);
  return (
    <Modal title="业务资料详情" onClose={onClose}>
      <div className="legacy-heading">
        <span className="eyebrow">历史业务资料库</span>
        <h2>{documentTitle(item)}</h2>
        <div className="tag-row">
          <Status state={item.extraction_status} />
          <Status
            state={item.weknora_sync_status}
            label={
              item.weknora_sync_status === "pending" ? "等待同步" : undefined
            }
          />
          <span className="tag">{item.source_site}</span>
        </div>
        <p className="muted">
          {dateTime(item.updated_at)} · {item.uuid}
        </p>
      </div>
      {error ? (
        <Empty title={error} />
      ) : !doc ? (
        <Empty loading title="读取原始资料" />
      ) : (
        <>
          <div className="heading-actions">
            {url && (
              <a className="button" href={url} target="_blank" rel="noreferrer">
                来源网站
                <ExternalLink size={14} />
              </a>
            )}
            <button
              className="button"
              onClick={() =>
                download(`${item.uuid}-raw.txt`, doc.raw_content || "")
              }
            >
              <Download size={14} />
              下载原文
            </button>
          </div>
          <pre className="legacy-raw">
            {parsed.valid
              ? pretty(parsed.value)
              : doc.raw_content || "该记录未提供原文内容。"}
          </pre>
          <div className="notice">
            <p>
              此业务接口没有提供对应的清洗正文和字段出处。可查看该来源的持续采集资料。
            </p>
            <button className="text-button" onClick={onHistory}>
              进入原文与清洗
              <ArrowRight size={14} />
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
