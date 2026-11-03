import { useEffect, useState } from "react";
import api from "./api";
import { dbClear, dbDelete, dbGet, dbGetAll, dbPut } from "./offlineDb";

/**
 * Offline-first writes for the Stage 2 clinical screening flow.
 *
 *  sendOrQueue()  tries the API; if the device is offline (or the request never reached the server)
 *                 the write is stored in IndexedDB and a provisional response is returned so the
 *                 form keeps working.
 *  flushOutbox()  replays queued writes in order when the network is back. Provisional IDs
 *                 (client ID, visit ID) are swapped for the real ones as each response arrives.
 *
 * Every request carries an `Idempotency-Key` header (the outbox item id) so a retry after a
 * timeout can't create duplicates, provided the server honours it (see IdempotencyMiddleware.php).
 */

// ── provisional IDs ──────────────────────────────────────────────────────
const TEMP_RE = /\b(?:OFFLINE|TMPVISIT)-[A-Z0-9]{6}\b/g;
const TEMP_TEST = /\b(?:OFFLINE|TMPVISIT)-[A-Z0-9]{6}\b/;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function rand(n: number): string {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
export const newTempClientId = () => `OFFLINE-${rand(6)}`;
export const newTempVisitId = () => `TMPVISIT-${rand(6)}`;
export const isTempId = (v: unknown): boolean => typeof v === "string" && TEMP_TEST.test(v);

// ── types ────────────────────────────────────────────────────────────────
export type Produces = { temp: string; from: string[] };

export type OutboxItem = {
  id: string;
  seq: number;
  method: "post" | "patch" | "put";
  path: string;
  body: any;
  label: string;
  createdAt: number;
  status: "pending" | "failed";
  attempts: number;
  error?: string;
  produces?: Produces[];
};

export type SendArgs = {
  method: "post" | "patch" | "put";
  path: string;
  body?: any;
  label: string;
  /** Provisional IDs this request will create; resolved from the real response on sync. */
  produces?: Produces[];
  /** What the form receives if the request is queued instead of sent. */
  provisional?: any;
};

export type SendResult = { data: any; queued: boolean };

export type SyncState = {
  online: boolean;
  syncing: boolean;
  pending: number;
  failed: number;
  items: OutboxItem[];
  idMap: Record<string, string>;
  lastSyncedAt: number | null;
};

// ── internal state ───────────────────────────────────────────────────────
const listeners = new Set<(s: SyncState) => void>();
let state: SyncState = {
  online: true,
  syncing: false,
  pending: 0,
  failed: 0,
  items: [],
  idMap: {},
  lastSyncedAt: null,
};
let flushing = false;
let engineStarted = false;

function emit() {
  listeners.forEach((l) => l(state));
}

async function loadIdMap(): Promise<Record<string, string>> {
  const rec = await dbGet<{ key: string; value: Record<string, string> }>("meta", "idMap");
  return rec?.value || {};
}
async function saveIdMap(map: Record<string, string>) {
  await dbPut("meta", { key: "idMap", value: map });
}

export async function refreshState(patch: Partial<SyncState> = {}) {
  let items: OutboxItem[] = [];
  let idMap: Record<string, string> = state.idMap;
  try {
    items = (await dbGetAll<OutboxItem>("outbox")).sort((a, b) => a.seq - b.seq);
    idMap = await loadIdMap();
  } catch {
    /* IndexedDB unavailable — behave as online-only */
  }
  state = {
    ...state,
    online: typeof navigator === "undefined" ? true : navigator.onLine,
    items,
    idMap,
    pending: items.filter((i) => i.status === "pending").length,
    failed: items.filter((i) => i.status === "failed").length,
    ...patch,
  };
  emit();
}

export function getSyncState() {
  return state;
}

export function subscribeSync(fn: (s: SyncState) => void): () => void {
  listeners.add(fn);
  fn(state);
  return () => {
    listeners.delete(fn);
  };
}

export function useSyncStatus(): SyncState {
  const [s, setS] = useState<SyncState>(state);
  useEffect(() => {
    refreshState();
    return subscribeSync(setS);
  }, []);
  return s;
}

/** Real ID if the provisional one has been synced, otherwise the value unchanged. */
export function resolveId(id: string, map: Record<string, string> = state.idMap): string {
  return map[id] || id;
}

// ── helpers ──────────────────────────────────────────────────────────────
function substitute<T>(value: T, map: Record<string, string>): T {
  const keys = Object.keys(map);
  if (!keys.length || value == null) return value;
  const swap = (str: string) => str.replace(TEMP_RE, (m) => map[m] || m);
  if (typeof value === "string") return swap(value) as any;
  return JSON.parse(swap(JSON.stringify(value)));
}

function containsTemp(path: string, body: any): boolean {
  return TEMP_TEST.test(path) || (body != null && TEMP_TEST.test(JSON.stringify(body)));
}

function pick(obj: any, dotted: string): any {
  return dotted.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function isNetworkError(err: any): boolean {
  return !err?.response; // axios: no response means the request never completed
}

function uuid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${rand(10)}`;
}

let seqCounter = 0;
function nextSeq() {
  seqCounter = Math.max(seqCounter + 1, Date.now());
  return seqCounter;
}

async function enqueue(item: OutboxItem) {
  await dbPut("outbox", item);
  await refreshState();
}

// ── public: send or queue ────────────────────────────────────────────────
export async function sendOrQueue(args: SendArgs): Promise<SendResult> {
  const map = await loadIdMap().catch(() => ({} as Record<string, string>));
  const path = substitute(args.path, map);
  const body = substitute(args.body, map);
  const id = uuid();

  const queue = async (): Promise<SendResult> => {
    await enqueue({
      id,
      seq: nextSeq(),
      method: args.method,
      path,
      body,
      label: args.label,
      createdAt: Date.now(),
      status: "pending",
      attempts: 0,
      produces: args.produces,
    });
    return { data: args.provisional ?? {}, queued: true };
  };

  // Anything that still refers to a provisional ID can't be sent yet.
  if (containsTemp(path, body)) return queue();
  if (typeof navigator !== "undefined" && !navigator.onLine) return queue();

  try {
    const res = await api.request({
      method: args.method,
      url: path,
      data: body,
      timeout: 20000,
      headers: { "Idempotency-Key": id },
    });
    return { data: res.data, queued: false };
  } catch (err: any) {
    if (isNetworkError(err)) return queue();
    throw err; // real server answer (validation error etc.) — let the form show it
  }
}

// ── flush ────────────────────────────────────────────────────────────────
export async function flushOutbox(): Promise<void> {
  if (flushing) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  flushing = true;
  await refreshState({ syncing: true });

  try {
    const map = await loadIdMap();
    const items = (await dbGetAll<OutboxItem>("outbox")).sort((a, b) => a.seq - b.seq);
    const blocked = new Set<string>(); // provisional IDs whose creating request failed

    for (const item of items) {
      if (item.status === "failed") {
        (item.produces || []).forEach((p) => blocked.add(p.temp));
        continue;
      }

      const path = substitute(item.path, map);
      const body = substitute(item.body, map);

      const refs = new Set<string>([
        ...(path.match(TEMP_RE) || []),
        ...(JSON.stringify(body ?? null).match(TEMP_RE) || []),
      ]);
      const dependsOnBlocked = [...refs].some((r) => blocked.has(r));
      const unresolved = [...refs].some((r) => !map[r]);

      if (dependsOnBlocked || unresolved) {
        (item.produces || []).forEach((p) => blocked.add(p.temp));
        await dbPut("outbox", {
          ...item,
          status: "failed",
          error: "Waiting on an earlier record that did not sync. Fix or discard that one first.",
        });
        continue;
      }

      try {
        const res = await api.request({
          method: item.method,
          url: path,
          data: body,
          timeout: 30000,
          headers: { "Idempotency-Key": item.id },
        });

        for (const p of item.produces || []) {
          const real = p.from.map((f) => pick(res.data, f)).find((v) => v != null && v !== "");
          if (real != null) map[p.temp] = String(real);
        }
        await saveIdMap(map);
        await dbDelete("outbox", item.id);
        await syncLocalClientIds(map);
        await refreshState();
      } catch (err: any) {
        if (isNetworkError(err) || err?.response?.status === 401 || err?.response?.status >= 500) {
          // Connection dropped, session expired or server trouble: stop and retry later, keep order.
          await dbPut("outbox", { ...item, attempts: item.attempts + 1 });
          break;
        }
        const msg =
          err?.response?.data?.message ||
          (err?.response?.data?.errors && Object.values(err.response.data.errors).flat().join(" ")) ||
          `Rejected by the server (${err?.response?.status}).`;
        (item.produces || []).forEach((p) => blocked.add(p.temp));
        await dbPut("outbox", { ...item, status: "failed", attempts: item.attempts + 1, error: String(msg) });
      }
    }
  } finally {
    flushing = false;
    await refreshState({ syncing: false, lastSyncedAt: Date.now() });
  }
}

export async function retryFailed(): Promise<void> {
  const items = await dbGetAll<OutboxItem>("outbox");
  for (const i of items) {
    if (i.status === "failed") await dbPut("outbox", { ...i, status: "pending", error: undefined });
  }
  await refreshState();
  await flushOutbox();
}

export async function discardItem(id: string): Promise<void> {
  await dbDelete("outbox", id);
  await refreshState();
}

// ── local client cache (only clients registered / opened on this device) ─
export type LocalClient = { clientId: string; provisionalId?: string; savedAt: number; data: any };

export async function saveLocalClient(client: any, provisionalId?: string) {
  if (!client?.clientId) return;
  try {
    await dbPut("clients", {
      clientId: client.clientId,
      provisionalId: provisionalId || (isTempId(client.clientId) ? client.clientId : undefined),
      savedAt: Date.now(),
      data: client,
    } as LocalClient);
  } catch {
    /* non-fatal */
  }
}

export async function findLocalClient(term: string): Promise<any | null> {
  const q = term.trim().toLowerCase();
  if (!q) return null;
  const digits = q.replace(/\D/g, "");
  try {
    const all = await dbGetAll<LocalClient>("clients");
    const hit = all.find((c) => {
      const d = c.data || {};
      if (c.clientId.toLowerCase() === q) return true;
      if (c.provisionalId && c.provisionalId.toLowerCase() === q) return true;
      const phones = [d.phoneNumber, d.caregiverPhoneNumber].map((p: string) => (p || "").replace(/\D/g, ""));
      return digits.length >= 7 && phones.some((p: string) => p && p.endsWith(digits.slice(-10)));
    });
    return hit ? { ...hit.data, clientId: hit.clientId } : null;
  } catch {
    return null;
  }
}

async function syncLocalClientIds(map: Record<string, string>) {
  const all = await dbGetAll<LocalClient>("clients");
  for (const c of all) {
    const real = map[c.clientId];
    if (real && real !== c.clientId) {
      await dbDelete("clients", c.clientId);
      await dbPut("clients", {
        ...c,
        clientId: real,
        provisionalId: c.provisionalId || c.clientId,
        data: { ...c.data, clientId: real },
      });
    }
  }
}

// ── engine ───────────────────────────────────────────────────────────────
/** Starts auto-sync: on load, when the network returns, and every 30 s while items wait. */
export function startSyncEngine() {
  if (engineStarted || typeof window === "undefined") return;
  engineStarted = true;

  const kick = () => {
    refreshState().then(flushOutbox);
  };
  window.addEventListener("online", kick);
  window.addEventListener("offline", () => refreshState());
  window.addEventListener("focus", kick);
  window.setInterval(() => {
    if (state.pending > 0 && navigator.onLine) flushOutbox();
  }, 30000);
  kick();
}

/** Removes everything stored for offline use. Refuses nothing — warn the user first if pending > 0. */
export async function wipeOfflineData() {
  await Promise.all([dbClear("outbox"), dbClear("clients"), dbClear("meta")]);
  await refreshState({ lastSyncedAt: null });
}
