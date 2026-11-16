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
  historyAvailable?: boolean;
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
  rawStatus?: string;
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
    historyRecords?: boolean;
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
export type View =
  | "overview"
  | "sources"
  | "activity"
  | "documents"
  | "records"
  | "record"
  | "delivery";

export type FieldLocator = { json_pointer?: string; [key: string]: unknown };
export type HistoryRecord = {
  source_id: string;
  source_record_id: string;
  version_id: string;
  title: string;
  record_kind: string;
  source_url?: string;
  raw_content?: string;
  raw_media_type?: string;
  raw_sha256?: string;
  clean_text?: string;
  parser_version?: string;
  facts?: Record<string, unknown>;
  field_locators?: Record<string, FieldLocator>;
  source_published_at?: string;
  source_updated_at?: string;
  first_seen_at?: string;
  received_at?: string;
  event_time?: string;
  mapping_review?: unknown;
  availability_proof?: unknown;
  published_seq?: number;
};
export type HistoryPage = {
  items: HistoryRecord[];
  next_cursor: string | null;
  cutoff: string;
  coverage?: Record<string, unknown>;
};
