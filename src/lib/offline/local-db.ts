import { openSqlDriver } from "@/lib/offline/sql-driver";
import type { SqlDriver } from "@/lib/offline/sql-driver-types";
import type { LocalTask, OutboxEntry, ViewSnapshot } from "@/lib/offline/types";

const DATABASE_NAME = "todolist-offline.db";
const DATABASE_VERSION = 1;

export type LocalDbContents = {
  tasks: LocalTask[];
  views: ViewSnapshot[];
  outbox: OutboxEntry[];
  idMap: [string, string][];
  meta: Record<string, string>;
};

let driver: SqlDriver | null = null;
let openPromise: Promise<SqlDriver | null> | null = null;
let writeChain: Promise<void> = Promise.resolve();

async function migrate(db: SqlDriver) {
  const [row] = await db.all<{ user_version: number }>("PRAGMA user_version");
  const version = row?.user_version ?? 0;
  if (version >= DATABASE_VERSION) return;

  await db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS view_cache (
      key TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      pinned_ids TEXT NOT NULL,
      task_ids TEXT NOT NULL,
      fetched_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS outbox (
      seq INTEGER PRIMARY KEY NOT NULL,
      mutation_id TEXT NOT NULL UNIQUE,
      kind TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      at INTEGER NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    );
    CREATE TABLE IF NOT EXISTS id_map (
      temp_id TEXT PRIMARY KEY NOT NULL,
      server_id TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    PRAGMA user_version = ${DATABASE_VERSION};
  `);
}

async function getDriver() {
  if (driver) return driver;
  if (!openPromise) {
    openPromise = (async () => {
      try {
        const db = await openSqlDriver(DATABASE_NAME);
        if (db) await migrate(db);
        driver = db;
        return db;
      } catch (error) {
        console.warn("Offline store unavailable, using memory only:", error);
        return null;
      }
    })();
  }
  return openPromise;
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function loadLocalDb(): Promise<LocalDbContents> {
  const empty: LocalDbContents = { tasks: [], views: [], outbox: [], idMap: [], meta: {} };
  const db = await getDriver();
  if (!db) return empty;

  const [taskRows, viewRows, outboxRows, idRows, metaRows] = await Promise.all([
    db.all<{ data: string }>("SELECT data FROM tasks"),
    db.all<{ key: string; title: string; pinned_ids: string; task_ids: string; fetched_at: number }>(
      "SELECT * FROM view_cache",
    ),
    db.all<{
      seq: number;
      mutation_id: string;
      kind: OutboxEntry["kind"];
      entity_id: string;
      at: number;
      payload: string;
      status: OutboxEntry["status"];
      attempts: number;
      last_error: string | null;
    }>("SELECT * FROM outbox ORDER BY seq ASC"),
    db.all<{ temp_id: string; server_id: string }>("SELECT * FROM id_map"),
    db.all<{ key: string; value: string }>("SELECT * FROM sync_meta"),
  ]);

  return {
    tasks: taskRows
      .map((row) => parseJson<LocalTask | null>(row.data, null))
      .filter((task): task is LocalTask => task != null),
    views: viewRows.map((row) => ({
      key: row.key,
      title: row.title,
      pinnedIds: parseJson<string[]>(row.pinned_ids, []),
      taskIds: parseJson<string[]>(row.task_ids, []),
      fetchedAt: row.fetched_at,
    })),
    outbox: outboxRows.map((row) => {
      const payload = parseJson<Pick<OutboxEntry, "fields" | "reorder">>(row.payload, {});
      return {
        seq: row.seq,
        mutationId: row.mutation_id,
        kind: row.kind,
        entityId: row.entity_id,
        at: row.at,
        fields: payload.fields,
        reorder: payload.reorder,
        // Anything in flight when the app was killed is retried; the server dedupes by mutationId.
        status: row.status === "inflight" ? "pending" : row.status,
        attempts: row.attempts,
        lastError: row.last_error,
      };
    }),
    idMap: idRows.map((row) => [row.temp_id, row.server_id]),
    meta: Object.fromEntries(metaRows.map((row) => [row.key, row.value])),
  };
}

export type LocalDbWrite =
  | { type: "putTasks"; tasks: LocalTask[] }
  | { type: "deleteTasks"; ids: string[] }
  | { type: "putView"; view: ViewSnapshot }
  | { type: "putOutbox"; entries: OutboxEntry[] }
  | { type: "deleteOutbox"; seqs: number[] }
  | { type: "putIdMap"; tempId: string; serverId: string }
  | { type: "putMeta"; key: string; value: string }
  | { type: "clear" };

async function applyWrite(db: SqlDriver, write: LocalDbWrite) {
  switch (write.type) {
    case "putTasks":
      for (const task of write.tasks) {
        await db.run("INSERT OR REPLACE INTO tasks (id, data) VALUES (?, ?)", [
          task.id,
          JSON.stringify(task),
        ]);
      }
      return;
    case "deleteTasks":
      for (const id of write.ids) {
        await db.run("DELETE FROM tasks WHERE id = ?", [id]);
      }
      return;
    case "putView":
      await db.run(
        "INSERT OR REPLACE INTO view_cache (key, title, pinned_ids, task_ids, fetched_at) VALUES (?, ?, ?, ?, ?)",
        [
          write.view.key,
          write.view.title,
          JSON.stringify(write.view.pinnedIds),
          JSON.stringify(write.view.taskIds),
          write.view.fetchedAt,
        ],
      );
      return;
    case "putOutbox":
      for (const entry of write.entries) {
        await db.run(
          `INSERT OR REPLACE INTO outbox
            (seq, mutation_id, kind, entity_id, at, payload, status, attempts, last_error)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            entry.seq,
            entry.mutationId,
            entry.kind,
            entry.entityId,
            entry.at,
            JSON.stringify({ fields: entry.fields, reorder: entry.reorder }),
            entry.status,
            entry.attempts,
            entry.lastError ?? null,
          ],
        );
      }
      return;
    case "deleteOutbox":
      for (const seq of write.seqs) {
        await db.run("DELETE FROM outbox WHERE seq = ?", [seq]);
      }
      return;
    case "putIdMap":
      await db.run("INSERT OR REPLACE INTO id_map (temp_id, server_id) VALUES (?, ?)", [
        write.tempId,
        write.serverId,
      ]);
      return;
    case "putMeta":
      await db.run("INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)", [
        write.key,
        write.value,
      ]);
      return;
    case "clear":
      await db.exec(
        "DELETE FROM tasks; DELETE FROM view_cache; DELETE FROM outbox; DELETE FROM id_map; DELETE FROM sync_meta;",
      );
      return;
  }
}

/**
 * Queues writes so they reach SQLite in order, each batch in one transaction.
 * The in-memory store is the source of truth while the app runs.
 */
export function persistLocalWrites(writes: LocalDbWrite[]) {
  if (writes.length === 0) return writeChain;
  writeChain = writeChain
    .then(async () => {
      const db = await getDriver();
      if (!db) return;
      await db.transaction(async () => {
        for (const write of writes) {
          await applyWrite(db, write);
        }
      });
    })
    .catch((error) => {
      console.warn("Failed to persist offline changes:", error);
    });
  return writeChain;
}

export function flushLocalWrites() {
  return writeChain;
}
