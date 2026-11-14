export type SqlParam = string | number | null;

export type SqlDriver = {
  exec: (sql: string) => Promise<void>;
  run: (sql: string, params?: SqlParam[]) => Promise<void>;
  all: <T>(sql: string, params?: SqlParam[]) => Promise<T[]>;
  transaction: (task: () => Promise<void>) => Promise<void>;
};
