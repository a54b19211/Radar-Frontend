import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  FileText,
  LoaderCircle,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { getJson } from "./api";
import { documentTitle, dateTime, number, stateLabel } from "./format";
import type { Document, Source } from "./types";

export default function DocumentsTable({
  sources,
  onOpen,
  sourceId = "",
  compact = false,
  initialState = "",
}: {
  sources: Source[];
  onOpen: (d: Document) => void;
  sourceId?: string;
  compact?: boolean;
  initialState?: string;
}) {
  const [page, setPage] = useState(1);
  const [source, setSource] = useState(sourceId);
  const [state, setState] = useState(initialState);
  const [query, setQuery] = useState("");
  const [data, setData] = useState<{ total: number; items: Document[] } | null>(
    null,
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const pageSize = compact ? 6 : 15;
  useEffect(() => {
    setSource(sourceId);
    setPage(1);
  }, [sourceId]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
      source_site: source,
      extraction_status: state,
    });
    getJson<{ total: number; items: Document[] }>(
      `/api/documents?${params}`,
      controller.signal,
    )
      .then(setData)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, pageSize, source, state]);
  const items =
    data?.items.filter(
      (d) =>
        !query || (d.title || "").toLowerCase().includes(query.toLowerCase()),
    ) || [];
  return (
    <div className={`documents-component ${compact ? "compact-docs" : ""}`}>
      {!compact && (
        <div className="table-toolbar">
          <div className="input-with-icon">
            <Search size={16} />
            <input
              aria-label="搜索当前页资料"
              placeholder="搜索当前页资料…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="table-filters">
            <SlidersHorizontal size={15} />
            <select
              aria-label="按资料来源筛选"
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                setPage(1);
              }}
            >
              <option value="">全部来源</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              aria-label="按处理状态筛选"
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                setPage(1);
              }}
            >
              <option value="">全部状态</option>
              {[
                "pending",
                "queued",
                "processing",
                "done",
                "failed",
                "no_entity",
              ].map((s) => (
                <option key={s} value={s}>
                  {stateLabel[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      {error ? (
        <div className="inline-empty">{error}</div>
      ) : (
        <div className="table-scroll">
          <table className="documents-table">
            <thead>
              <tr>
                <th>资料标题</th>
                {!compact && <th>来源</th>}
                <th>处理状态</th>
                {!compact && <th>资料更新时间</th>}
                <th aria-label="查看详情" />
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.uuid} onClick={() => onOpen(d)}>
                  <td>
                    <button
                      className="document-title"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpen(d);
                      }}
                    >
                      <span className="document-icon">
                        <FileText size={16} />
                      </span>
                      <span>{documentTitle(d)}</span>
                    </button>
                    {compact && (
                      <small className="document-subtitle">
                        {dateTime(d.updated_at, true)}
                      </small>
                    )}
                  </td>
                  {!compact && (
                    <td>
                      <span
                        className="source-small-dot"
                        style={{
                          background: sources.find(
                            (s) => s.id === d.source_site,
                          )?.color,
                        }}
                      />
                      {sources.find((s) => s.id === d.source_site)?.short ||
                        d.source_site}
                    </td>
                  )}
                  <td>
                    <span className={`status-chip ${d.extraction_status}`}>
                      {stateLabel[d.extraction_status] ||
                        d.extraction_status ||
                        "未提供"}
                    </span>
                  </td>
                  {!compact && (
                    <td className="tabular muted-text">
                      {dateTime(d.updated_at)}
                    </td>
                  )}
                  <td>
                    <ArrowUpRight size={15} className="row-arrow" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length && !loading && (
            <div className="inline-empty">
              <FileText size={26} />
              <p>{query ? "当前页没有匹配的资料" : "这个筛选下还没有资料"}</p>
            </div>
          )}
          {loading && (
            <div className="table-loading">
              <LoaderCircle size={17} className="spin" />
              正在读取资料
            </div>
          )}
        </div>
      )}
      {!compact && (
        <div className="table-footer">
          <span>
            共 <b>{number(data?.total)}</b> 条资料
            {query && " · 标题搜索仅限当前页"}
          </span>
          <div className="pagination">
            <button
              aria-label="上一页"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              {page} / {Math.max(1, Math.ceil((data?.total || 0) / pageSize))}
            </span>
            <button
              aria-label="下一页"
              disabled={!data || page * pageSize >= data.total || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
