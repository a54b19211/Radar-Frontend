export const factLabels: Record<string, string> = {
  title: "标题",
  trial_id: "临床试验编号",
  official_title: "正式标题",
  brief_title: "简要标题",
  status: "研究状态",
  phase: "研究阶段",
  enrollment: "入组人数",
  enrollment_type: "入组类型",
  conditions: "研究疾病",
  interventions: "干预措施",
  sponsor: "申办方",
  collaborators: "合作方",
  locations: "研究地点",
  study_type: "研究类型",
  study_design: "研究设计",
  brief_summary: "研究摘要",
  detailed_description: "详细描述",
  eligibility: "入选条件",
  primary_outcomes: "主要终点",
  secondary_outcomes: "次要终点",
  start_date: "开始日期",
  completion_date: "完成日期",
  primary_completion_date: "主要完成日期",
  last_update_posted: "最近更新日期",
  first_posted: "首次发布日期",
  countries: "国家与地区",
  disease: "疾病",
  disease_name: "疾病名称",
  notice_id: "通报编号",
  overview: "概况",
  advice: "建议",
  assessment: "风险评估",
  situation: "情况说明",
  response: "应对措施",
  count_statements: "数量陈述与出处",
  publication_date: "发布日期",
  published_at: "发布时间",
  updated_at: "更新时间",
  country: "国家",
  region: "地区",
  abstract: "摘要",
  authors: "作者",
  journal: "期刊",
  doi: "DOI",
  pmid: "PubMed 编号",
  pmcid: "PMC 编号",
  year: "年份",
  citations: "引用",
  url: "来源地址",
  language: "语言",
  source_id: "来源标识",
  source_record_id: "来源记录编号",
  record_kind: "资料类型",
  chemical_name: "药物名称",
  drug_name: "药品名称",
  is_open_access: "开放获取",
  pub_year: "发表年份",
  document_type: "文献类型",
  evidence: "证据",
  body: "正文",
  content: "内容",
  text: "文本",
  name: "名称",
  id: "编号",
  description: "描述",
  summary: "摘要",
  substance_names: "成分名称",
  brand_names: "商品名称",
  generic_names: "通用名称",
  applicant: "申请方",
  indication: "适应证",
  approval_date: "批准日期",
  source_publication_date: "来源发布日期",
  first_seen_at: "首次观测时间",
  received_at: "接收时间",
  observed_at: "观测时间",
  run_id: "采集批次",
  stop_reason: "结束原因",
  adopted_count: "接收条目",
  new_version_count: "新/变更版本",
  same_version_count: "内容未变",
  requests: "请求次数",
  records_seen: "读取条目",
  records_adopted: "接收条目",
  record_budget: "达到本轮条数上限",
  page_budget: "达到本轮页数上限",
  partial: "本轮有界完成",
  succeeded: "已完成",
  complete: "已完成",
  completed: "已完成",
  running: "运行中",
  pending: "等待",
  failed: "失败",
  not_modified: "内容未变化",
  source_exhausted: "已读至来源末尾",
  deadline: "达到本轮时限",
  request_budget: "达到本轮请求上限",
  parser_version: "解析器版本",
  raw_sha256: "原文校验值",
  mapping_review: "字段映射评审",
  availability_proof: "可用时间依据",
  event_time: "事件时间",
  source_published_at: "来源发布时间",
  source_updated_at: "来源更新时间",
  version_id: "原文版本",
  schema_version: "数据结构版本",
  published_seq: "发布序号",
};
export function shortValue(value: unknown, limit = 160): string {
  const text =
    value == null
      ? "null · 未提供"
      : typeof value === "string"
        ? value
        : JSON.stringify(value);
  return text.length > limit ? text.slice(0, limit) + "…" : text;
}
export function pretty(value: unknown) {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}
export function parseJson(value: string) {
  try {
    return { valid: true, value: JSON.parse(value) as unknown };
  } catch {
    return { valid: false, value: null };
  }
}
export function pointerValue(
  value: unknown,
  pointer: string,
): { found: boolean; value?: unknown } {
  if (pointer === "") return { found: true, value };
  if (!pointer.startsWith("/")) return { found: false };
  let result: unknown = value;
  for (const part of pointer
    .slice(1)
    .split("/")
    .map((p) => p.replace(/~1/g, "/").replace(/~0/g, "~"))) {
    if (
      result === null ||
      typeof result !== "object" ||
      !Object.prototype.hasOwnProperty.call(result, part)
    )
      return { found: false };
    result = (result as Record<string, unknown>)[part];
  }
  return { found: true, value: result };
}
export type JsonLine = { text: string; pointer: string };
export function jsonLines(value: unknown): JsonLine[] {
  const rows: JsonLine[] = [];
  function visit(
    v: unknown,
    path: string,
    depth: number,
    prefix: string,
    comma: string,
  ) {
    const indent = "  ".repeat(depth);
    if (v === null || typeof v !== "object") {
      rows.push({
        pointer: path,
        text: indent + prefix + JSON.stringify(v) + comma,
      });
      return;
    }
    const array = Array.isArray(v),
      entries = Object.entries(v as object);
    if (!entries.length) {
      rows.push({
        pointer: path,
        text: indent + prefix + (array ? "[]" : "{}") + comma,
      });
      return;
    }
    rows.push({ pointer: path, text: indent + prefix + (array ? "[" : "{") });
    entries.forEach(([key, child], i) =>
      visit(
        child,
        path + "/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
        depth + 1,
        array ? "" : JSON.stringify(key) + ": ",
        i < entries.length - 1 ? "," : "",
      ),
    );
    rows.push({ pointer: path, text: indent + (array ? "]" : "}") + comma });
  }
  visit(value, "", 0, "", "");
  return rows;
}
export function safeSourceUrl(value?: string | null) {
  return value && /^https?:\/\//i.test(value) ? value : null;
}
export function hasHtml(value: string) {
  return /<(?:p|div|h[1-6]|article|section|table|ul|br|html|body)\b/i.test(
    value,
  );
}
export function plainText(value: string) {
  if (!hasHtml(value)) return value;
  const doc = new DOMParser().parseFromString(value, "text/html");
  doc
    .querySelectorAll("script,style,iframe,object,embed")
    .forEach((n) => n.remove());
  return doc.body.textContent || "";
}
export function htmlPreview(value: string, dark: boolean) {
  const doc = new DOMParser().parseFromString(value, "text/html");
  doc
    .querySelectorAll(
      "script,style,link,iframe,object,embed,form,input,button,textarea,select,meta,base,svg,math,video,audio,source",
    )
    .forEach((n) => n.remove());
  doc.body.querySelectorAll("*").forEach((n) =>
    Array.from(n.attributes).forEach((a) => {
      if (!["colspan", "rowspan"].includes(a.name)) n.removeAttribute(a.name);
    }),
  );
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:;"><style>body{margin:0;padding:24px;font:14px/1.9 system-ui,sans-serif;overflow-wrap:anywhere;background:${dark ? "#101a2a" : "#fff"};color:${dark ? "#dfeaf7" : "#26354a"}}h1,h2,h3{line-height:1.5}a{color:${dark ? "#83dccc" : "#137e71"}}table{border-collapse:collapse;width:100%}td,th{padding:8px;border:1px solid ${dark ? "#34445a" : "#dce3eb"}}img{max-width:100%}</style></head><body>${doc.body.innerHTML}</body></html>`;
}
