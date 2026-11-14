import * as SQLite from "expo-sqlite";

import type { SqlDriver } from "@/lib/offline/sql-driver-types";

export async function openSqlDriver(name: string): Promise<SqlDriver | null> {
  const db = await SQLite.openDatabaseAsync(name);
  await db.execAsync("PRAGMA journal_mode = WAL");

  return {
    exec: (sql) => db.execAsync(sql),
    run: async (sql, params = []) => {
      await db.runAsync(sql, params);
    },
    all: (sql, params = []) => db.getAllAsync(sql, params),
    transaction: (task) => db.withTransactionAsync(task),
  };
}
