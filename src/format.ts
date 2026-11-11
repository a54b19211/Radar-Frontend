export const number = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("zh-CN").format(n);
export const documentTitle = (d: { title: string; uuid: string }) =>
  d.title?.trim() || `未提供标题 · ${d.uuid.slice(0, 8)}`;
export const percent = (n: number | null | undefined, total: number) =>
  n == null || !total ? "—" : `${((n / total) * 100).toFixed(1)}%`;
export function dateTime(value?: string, short = false) {
  if (!value || Number.isNaN(new Date(value).getTime())) return "时间未提供";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    ...(short ? {} : { year: "numeric" }),
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
export const stateLabel: Record<string, string> = {
  pending: "等待抽取",
  queued: "队列中",
  processing: "正在抽取",
  done: "抽取完成",
  failed: "处理失败",
  no_entity: "未抽取到实体",
  synced: "已同步",
  running: "运行中",
  completed: "已完成",
  idle: "等待下一轮",
  stale: "状态已过期",
  unknown: "状态未提供",
};
