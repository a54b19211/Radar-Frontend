import { useCallback, useEffect, useRef, useState } from "react";
import type { Snapshot } from "./types";

export async function getJson<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(path, { signal });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "请求暂时没有完成");
  return body as T;
}

export function useSnapshot(live: boolean) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const pending = useRef(false);
  const refresh = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    setRefreshing(true);
    try {
      setData(
        await getJson<Snapshot>("/api/overview", AbortSignal.timeout(45000)),
      );
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "连接暂时中断");
    } finally {
      pending.current = false;
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 15000);
    const resume = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", resume);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [live, refresh]);
  return { data, error, refreshing, refresh };
}
