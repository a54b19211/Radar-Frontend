export type Source = {
  id: string;
  name: string;
  short: string;
  category: string;
  color: string;
  description: string;
  url: string | null;
  count: number | null;
  extraction: Record<string, number>;
  historyOnly?: boolean;
  health?: {
    observedAt: string;
    collection: { state: string; last_check_at: string | null };
    publication: { state: string; last_heartbeat: string | null };
  } | null;
};
export type Document = {
  id: number;
  uuid: string;
  title: string;
  source_site: string;
  publish_date: string;
  doc_status: string;
  extraction_status: string;
  weknora_sync_status: string;
  updated_at: string;
  raw_content?: string;
  clean_content?: string;
  summary?: string;
  source_url?: string;
  url?: string;
};
export type Task = {
  id: string;
  source: string;
  title: string;
  status:
    | "running"
    | "queued"
    | "completed"
    | "failed"
    | "idle"
    | "stale"
    | "unknown";
  startedAt: string;
  finishedAt?: string;
  processed: number | null;
  total: number | null;
  error?: string;
  nextAt?: string;
  lastSuccessAt?: string;
  lastBatchAt?: string;
  scope?: string;
  cyclePages?: number;
  activeRunId?: string;
  countScope?: string;
  newVersions?: number | null;
  sameVersions?: number | null;
  requests?: number | null;
  stopReason?: string;
};
export type Snapshot = {
  observedAt: string;
  dataset: {
    label: string;
    host: string;
    scope: string;
    apiConnected: boolean;
  };
  total: number;
  sources: Source[];
  extraction: Record<string, number> | null;
  sync: { pending: number; synced: number; failed: number } | null;
  documents: Document[];
  collection: {
    tasks: Task[];
    history?: unknown[];
    failedSources?: number;
  } | null;
  capabilities: {
    collectionTasks: boolean;
    collectionRate: boolean;
    cleaning: boolean;
    radar: boolean;
  };
  warnings: string[];
  stale: boolean;
};
export type Selection =
  | { type: "source"; id: string }
  | { type: "stage"; id: string }
  | { type: "document"; id: string }
  | { type: "task"; id: string }
  | { type: "about" };
export type View = "overview" | "sources" | "activity" | "documents";
