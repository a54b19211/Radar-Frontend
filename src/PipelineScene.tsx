import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Braces,
  Fingerprint,
  RadioTower,
  Workflow,
} from "lucide-react";
import { dateTime, number } from "./format";
import { Status } from "./ui";
import type { Snapshot, Source, Task } from "./types";

export function sourceTask(source: string, tasks: Task[]) {
  const priority: Record<string, number> = {
    running: 0,
    failed: 1,
    stale: 2,
    queued: 3,
    idle: 4,
    completed: 5,
    unknown: 6,
  };
  return tasks
    .filter((t) => t.source === source)
    .sort((a, b) => priority[a.status] - priority[b.status])[0];
}
export default function PipelineScene({
  data,
  active,
  onTasks,
  onRecords,
}: {
  data: Snapshot;
  active: boolean;
  onTasks: (source: string) => void;
  onRecords: (source: string) => void;
}) {
  const candidates = ["clinicaltrials", "europe_pmc", "who_don"]
    .map((id) => data.sources.find((s) => s.id === id))
    .filter((s): s is Source => Boolean(s));
  const sources = candidates.length ? candidates : data.sources.slice(0, 3);
  const [focus, setFocus] = useState(
    () =>
      sources.find(
        (s) =>
          sourceTask(s.id, data.collection?.tasks || [])?.status === "running",
      )?.id ||
      sources[0]?.id ||
      "",
  );
  const [paths, setPaths] = useState<
    { path: string; enabled: boolean; destination?: boolean }[]
  >([]);
  const canvas = useRef<HTMLDivElement>(null);
  const tasks = data.collection?.tasks || [];
  const source = sources.find((s) => s.id === focus) || sources[0];
  const task = sourceTask(source?.id || "", tasks);
  const flowing = active && !data.stale && task?.status === "running";
  useEffect(() => {
    const frame = canvas.current;
    if (!frame) return;
    const draw = () => {
      const bounds = frame.getBoundingClientRect();
      const point = (key: string, side: string) => {
        const box = frame
          .querySelector(`[data-node="${key}"]`)
          ?.getBoundingClientRect();
        return box
          ? {
              x:
                box.left -
                bounds.left +
                (side === "right"
                  ? box.width
                  : side === "left"
                    ? 0
                    : box.width / 2),
              y:
                box.top -
                bounds.top +
                (side === "bottom"
                  ? box.height
                  : side === "top"
                    ? 0
                    : box.height / 2),
            }
          : null;
      };
      const connect = (from: string, to: string, vertical = false) => {
        const a = point(from, vertical ? "bottom" : "right"),
          b = point(to, vertical ? "top" : "left");
        if (!a || !b) return "";
        return vertical
          ? `M${a.x},${a.y} C${a.x},${(a.y + b.y) / 2} ${b.x},${(a.y + b.y) / 2} ${b.x},${b.y}`
          : `M${a.x},${a.y} C${(a.x + b.x) / 2},${a.y} ${(a.x + b.x) / 2},${b.y} ${b.x},${b.y}`;
      };
      setPaths([
        ...sources.map((s) => ({
          path: connect(s.id, "collector"),
          enabled: s.id === source?.id,
        })),
        { path: connect("collector", "archive"), enabled: true },
        {
          path: connect("archive", "clean", true),
          enabled: true,
          destination: true,
        },
      ]);
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [source?.id, sources.map((s) => s.id).join(",")]);
  return (
    <section className="signal-panel">
      <div className="signal-header">
        <span>
          <Workflow size={17} />
          <b>采集现场</b>
          <span className="live-tag">
            <i />
            {active && !data.stale ? "状态观测中" : "快照已保留"}
          </span>
        </span>
        <span className="signal-caption">选择来源，沿链路查看真实资料</span>
      </div>
      <div className="signal-layout">
        <div className="signal-canvas" ref={canvas}>
          <div className="signal-grid-bg" />
          <div className="radar-halo" aria-hidden>
            <i />
            <i />
            <i />
            <span />
          </div>
          <svg className="signal-wires" width="100%" height="100%" aria-hidden>
            {paths.map((p, i) => (
              <g key={`${i}-${p.path}`}>
                <path d={p.path} className="wire-base" />
                {p.enabled && (
                  <path
                    d={p.path}
                    className={`wire-route ${p.destination ? "green" : ""} ${flowing ? "flowing" : ""}`}
                  />
                )}
                {p.enabled && flowing && (
                  <circle
                    r="3.5"
                    className={`wire-particle ${p.destination ? "green" : ""}`}
                  >
                    <animateMotion
                      path={p.path}
                      dur="3.4s"
                      begin={`${-i * 0.8}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
              </g>
            ))}
          </svg>
          <div className="signal-node-grid">
            {sources.map((s, i) => {
              const item = sourceTask(s.id, tasks);
              return (
                <button
                  className={`signal-source ${source?.id === s.id ? "selected" : ""}`}
                  data-node={s.id}
                  style={{ gridRow: i + 1 }}
                  key={s.id}
                  onClick={() => setFocus(s.id)}
                  aria-pressed={source?.id === s.id}
                >
                  <span className="source-code">{s.short}</span>
                  <strong>{s.name}</strong>
                  <small>{s.category}</small>
                  <Status
                    state={item?.status}
                    label={item ? undefined : "来源已登记"}
                  />
                </button>
              );
            })}
            <div className="signal-caption-node">
              <span className="tiny-label">当前聚焦</span>
              <b>{source?.name}</b>
              <small>原文留存 → 清洗正文 → 结构化事实</small>
            </div>
            <button
              className={`signal-node collector ${task?.status === "running" ? "working" : ""}`}
              data-node="collector"
              onClick={() => onTasks(source?.id || "")}
            >
              <span className="node-eyebrow">
                <RadioTower size={16} />
                持续采集
              </span>
              <strong>
                {task ? <Status state={task.status} /> : "监测来源"}
              </strong>
              <small>
                {tasks.filter((t) => t.source === source?.id).length} 项监测配置
              </small>
              <ArrowUpRight size={14} className="node-arrow" />
            </button>
            <button
              className="signal-node archive"
              data-node="archive"
              onClick={() => onRecords(source?.id || "")}
            >
              <span className="node-eyebrow">
                <Fingerprint size={16} />
                原文版本
              </span>
              <strong>可追溯</strong>
              <small>来源 · 原始响应 · 获取时间</small>
              <ArrowUpRight size={14} className="node-arrow" />
            </button>
            <button
              className="signal-node clean"
              data-node="clean"
              onClick={() => onRecords(source?.id || "")}
            >
              <span className="node-eyebrow">
                <Braces size={16} />
                清洗与结构化
              </span>
              <strong>左右对照</strong>
              <small>正文 · 字段 · 原文定位</small>
              <ArrowUpRight size={14} className="node-arrow" />
            </button>
          </div>
        </div>
        <aside className="signal-inspector">
          <span className="tiny-label">来源速览</span>
          <h3>{source?.name}</h3>
          <p>{source?.description}</p>
          <div className="inspector-amount">
            <span>该来源业务库存</span>
            <b>
              {number(source?.count)}
              <small>{source?.count == null ? "尚未汇总" : "条"}</small>
            </b>
          </div>
          {task ? (
            <>
              <div className="inspector-batch-title">最近有记录的批次</div>
              <div className="inspector-batch">
                <div>
                  <b>{number(task.processed)}</b>
                  <span>接收条目</span>
                </div>
                <div>
                  <b>{number(task.newVersions)}</b>
                  <span>新/变更版本</span>
                </div>
              </div>
              <small className="muted">
                批次时间 {dateTime(task.lastBatchAt, true)}
              </small>
              <div className="next-check">
                <span>下一次检查</span>
                <b>{dateTime(task.nextAt, true)}</b>
              </div>
              {task.error && (
                <p className="inspector-error">最近错误：{task.error}</p>
              )}
            </>
          ) : (
            <p className="muted">当前未返回该来源的持续监测记录。</p>
          )}
          <button
            className="button primary"
            onClick={() => onRecords(source?.id || "")}
          >
            查看原文与清洗
            <ArrowRight size={14} />
          </button>
        </aside>
      </div>
      <div className="signal-footer">
        <span>
          <i />
          连线展示数据路径；运行状态驱动流光，不代表逐条处理回放
        </span>
        <span>
          {flowing ? "选中来源正在运行" : "选中来源当前无运行中的监测"}
        </span>
      </div>
    </section>
  );
}
