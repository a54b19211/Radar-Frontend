import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "motion/react";
import { AlertCircle, ArrowUpRight, LoaderCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { number, stateLabel } from "./format";

export function Count({ value }: { value: number | null | undefined }) {
  const element = useRef<HTMLSpanElement>(null);
  const previous = useRef(value ?? 0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (value == null || !element.current) return;
    const animation = animate(previous.current, value, {
      duration: reduced ? 0 : 0.75,
      onUpdate: (n) => {
        if (element.current)
          element.current.textContent = number(Math.round(n));
      },
    });
    previous.current = value;
    return () => animation.stop();
  }, [value, reduced]);
  return (
    <span ref={element} className="tabular">
      {number(value)}
    </span>
  );
}
export function Status({ state, label }: { state?: string; label?: string }) {
  return (
    <span className={`status-chip ${state || "unknown"}`}>
      <i />
      {label || stateLabel[state || ""] || state || "未提供"}
    </span>
  );
}
export function Empty({
  title,
  children,
  loading = false,
  action,
}: {
  title: string;
  children?: ReactNode;
  loading?: boolean;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state" role={loading ? "status" : undefined}>
      {loading ? (
        <LoaderCircle className="spin" size={27} />
      ) : (
        <AlertCircle size={27} />
      )}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
export function Metric({
  icon: Icon,
  title,
  value,
  unit = "条",
  note,
  onClick,
  accent = "cyan",
}: {
  icon: LucideIcon;
  title: string;
  value: number | null | undefined;
  unit?: string;
  note: string;
  onClick?: () => void;
  accent?: string;
}) {
  return (
    <button
      className={`metric ${accent}`}
      onClick={onClick}
      disabled={!onClick}
    >
      <span className="metric-top">
        <span>{title}</span>
        <Icon size={17} />
      </span>
      <span className="metric-value">
        <Count value={value} />
        <small>{unit}</small>
      </span>
      <span className="metric-bottom">
        {note}
        {onClick && <ArrowUpRight size={13} />}
      </span>
    </button>
  );
}
export function SectionHeader({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        {caption && <p>{caption}</p>}
      </div>
      {children}
    </div>
  );
}
export function download(
  name: string,
  value: string,
  type = "text/plain;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
