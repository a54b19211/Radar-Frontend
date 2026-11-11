import { memo, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Handle,
  Position,
  Background,
  BackgroundVariant,
  useReactFlow,
  Panel,
} from "@xyflow/react";
import type { Node, NodeProps, Edge } from "@xyflow/react";
import {
  ArrowDownToLine,
  Database,
  ScanText,
  Layers3,
  Plus,
  Minus,
  Maximize2,
  Globe2,
  ChevronRight,
  CircleHelp,
} from "lucide-react";
import type { Snapshot, Selection } from "./types";
import { number } from "./format";
import "@xyflow/react/dist/style.css";

type CardData = {
  label: string;
  value: string;
  caption: string;
  kind: "source" | "stage";
  color: string;
  code: string;
  target: Selection;
  muted?: boolean;
  vertical?: boolean;
};
type CardNode = Node<CardData, "card">;
const icons = {
  ingest: ArrowDownToLine,
  archive: Database,
  extraction: ScanText,
  sync: Layers3,
};

const FlowCard = memo(function FlowCard({
  data,
  selected,
}: NodeProps<CardNode>) {
  const Icon = icons[data.code as keyof typeof icons] || Globe2;
  return (
    <div
      className={`flow-card ${data.kind} ${selected ? "selected" : ""} ${data.muted ? "muted" : ""}`}
      style={{ "--node-color": data.color } as React.CSSProperties}
    >
      <Handle
        type="target"
        position={data.vertical ? Position.Top : Position.Left}
      />
      <div className="flow-card-heading">
        <span className="flow-icon">
          <Icon size={17} strokeWidth={1.7} />
        </span>
        <span>{data.label}</span>
        <ChevronRight className="flow-chevron" size={14} />
      </div>
      {data.kind === "source" ? (
        <div className="flow-source-bottom">
          <span className="node-code">{data.code.toUpperCase()}</span>
          <b>
            {data.value}
            <small> 条</small>
          </b>
        </div>
      ) : (
        <>
          <div className="flow-number">{data.value}</div>
          <div className="flow-caption">
            {data.muted ? <CircleHelp size={11} /> : <i />}
            {data.caption}
          </div>
        </>
      )}
      <Handle
        type="source"
        position={data.vertical ? Position.Bottom : Position.Right}
      />
    </div>
  );
});
const nodeTypes = { card: FlowCard };

function ViewControls() {
  const flow = useReactFlow();
  return (
    <Panel position="bottom-left">
      <div className="canvas-controls">
        <button
          onClick={() => void flow.zoomIn({ duration: 250 })}
          aria-label="放大流程"
        >
          <Plus size={16} />
        </button>
        <button
          onClick={() => void flow.zoomOut({ duration: 250 })}
          aria-label="缩小流程"
        >
          <Minus size={16} />
        </button>
        <span />
        <button
          onClick={() => void flow.fitView({ padding: 0.13, duration: 400 })}
          aria-label="适应画布"
        >
          <Maximize2 size={15} />
        </button>
      </div>
    </Panel>
  );
}

export default function FlowCanvas({
  data,
  demo,
  onSelect,
}: {
  data: Snapshot;
  demo: boolean;
  onSelect: (s: Selection) => void;
}) {
  const [compact, setCompact] = useState(
    () => window.matchMedia("(max-width: 570px)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(max-width: 570px)");
    const change = () => setCompact(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  const { nodes, edges } = useMemo(() => {
    const sources = data.sources.slice(0, 5);
    const height = Math.max(240, sources.length * 77);
    const y = height / 2 - 65;
    const nodes: CardNode[] = compact
      ? []
      : sources.map((s, i) => ({
          id: s.id,
          type: "card",
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          position: { x: 0, y: i * 77 },
          data: {
            kind: "source",
            label: s.name,
            code: s.short,
            caption: "",
            value: number(s.count),
            color: s.color,
            target: { type: "source", id: s.id },
          },
        }));
    const stages: CardData[] = [
      {
        kind: "stage",
        label: "来源接入",
        code: "ingest",
        value: `${data.sources.length} 个来源`,
        caption: data.capabilities.collectionTasks
          ? `${data.collection?.tasks.length || 0} 个持续监测任务`
          : "任务状态待接入",
        color: "#8da0ac",
        target: { type: "stage", id: "ingest" },
        muted: !data.capabilities.collectionTasks,
      },
      {
        kind: "stage",
        label: "原始资料",
        code: "archive",
        value: number(data.total),
        caption: "库内已归档资料",
        color: "#7ee2c1",
        target: { type: "stage", id: "archive" },
      },
      {
        kind: "stage",
        label: "结构化抽取",
        code: "extraction",
        value: number(data.extraction?.done),
        caption: data.extraction?.processing
          ? `${data.extraction.processing} 条正在抽取`
          : "抽取完成 · 可查看",
        color: "#85b5f5",
        target: { type: "stage", id: "extraction" },
        muted: !data.extraction,
      },
      {
        kind: "stage",
        label: "知识库同步",
        code: "sync",
        value: number(data.sync?.synced),
        caption: "已同步至知识库",
        color: "#bea1ef",
        target: { type: "stage", id: "sync" },
        muted: !data.sync,
      },
    ];
    stages.forEach((s, i) =>
      nodes.push({
        id: s.code,
        type: "card",
        sourcePosition: compact ? Position.Bottom : Position.Right,
        targetPosition: compact ? Position.Top : Position.Left,
        position: compact ? { x: 0, y: i * 148 } : { x: 236 + i * 222, y },
        data: { ...s, vertical: compact },
      }),
    );
    // These edges describe a logical route, not observed per-document execution events.
    const flowing = demo;
    const edge = (source: string, target: string, color = "#53b99c"): Edge => ({
      id: `${source}-${target}`,
      source,
      target,
      type: "smoothstep",
      className: flowing ? "flowing" : "",
      style: { stroke: color, strokeWidth: 1.5, opacity: flowing ? 0.85 : 0.4 },
    });
    const edges = [
      ...(compact ? [] : sources.map((s) => edge(s.id, "ingest", s.color))),
      edge("ingest", "archive"),
      edge("archive", "extraction", "#78a6d3"),
      edge("extraction", "sync", "#ae8edd"),
    ];
    return { nodes, edges };
  }, [data, demo, compact]);
  return (
    <div
      className={`flow-canvas ${demo ? "demo-active" : ""} ${compact ? "compact-flow" : ""}`}
    >
      <div className="canvas-ambient" />
      <ReactFlow<CardNode>
        key={compact ? "compact" : "wide"}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.13 }}
        minZoom={0.35}
        maxZoom={1.5}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        onNodeClick={(_, n) => onSelect(n.data.target)}
        proOptions={{ hideAttribution: true }}
        preventScrolling={false}
        colorMode="dark"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#2b4149"
        />
        <Panel position="top-left">
          <div className="canvas-eyebrow">
            <span className="canvas-dot" />
            {demo ? "动效演示 · 不启动采集任务" : "业务库逻辑流转 · 状态快照"}
          </div>
        </Panel>
        <Panel position="top-right">
          <span className="canvas-tag">
            {data.sources.length > 5
              ? `展示库存最多的 5 个来源 · 共 ${data.sources.length} 个来源`
              : "点击节点探索"}
          </span>
        </Panel>
        <ViewControls />
        <Panel position="bottom-right">
          <div className="canvas-legend">
            <span>
              <i className="mint" />
              已有观测数据
            </span>
            <span>
              <i />
              观测待接入
            </span>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
