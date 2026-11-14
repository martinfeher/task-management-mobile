import type { SqlDriver } from "@/lib/offline/sql-driver-types";

/** Web keeps the offline store in memory only (no SQLite wasm setup). */
export async function openSqlDriver(_name: string): Promise<SqlDriver | null> {
  return null;
}
