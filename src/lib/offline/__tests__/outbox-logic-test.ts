import { describe, expect, test } from "@jest/globals";

import {
  enqueueWithCoalescing,
  hasPendingDelete,
  mergeFieldChanges,
  pendingFieldsFor,
  remapEntryIds,
} from "@/lib/offline/outbox-logic";
import type { NewOutboxEntry, OutboxEntry } from "@/lib/offline/types";

let counter = 0;
function entry(partial: Partial<NewOutboxEntry> & Pick<NewOutboxEntry, "kind" | "entityId">): NewOutboxEntry {
  counter += 1;
  return { mutationId: `m${counter}`, at: 1000 + counter, ...partial };
}

function enqueueAll(entries: NewOutboxEntry[], start: OutboxEntry[] = []) {
  let outbox = start;
  let seq = start.reduce((max, item) => Math.max(max, item.seq), 0) + 1;
  for (const next of entries) {
    const result = enqueueWithCoalescing(outbox, next, seq);
    if (result.upserted.some((item) => item.seq === seq)) seq += 1;
    outbox = result.entries;
  }
  return outbox;
}

describe("mergeFieldChanges", () => {
  test("keeps the newer value per field", () => {
    const merged = mergeFieldChanges(
      { name: { value: "new", at: 20 }, pinned: { value: true, at: 5 } },
      { name: { value: "old", at: 10 }, pinned: { value: false, at: 6 } },
    );
    expect(merged.name).toEqual({ value: "new", at: 20 });
    expect(merged.pinned).toEqual({ value: false, at: 6 });
  });
});

describe("enqueueWithCoalescing", () => {
  test("folds consecutive updates for a task into one entry", () => {
    const outbox = enqueueAll([
      entry({ kind: "update", entityId: "t1", fields: { name: { value: "a", at: 1 } } }),
      entry({ kind: "update", entityId: "t1", fields: { name: { value: "b", at: 2 }, pinned: { value: true, at: 2 } } }),
    ]);
    expect(outbox).toHaveLength(1);
    expect(outbox[0].fields?.name?.value).toBe("b");
    expect(outbox[0].fields?.pinned?.value).toBe(true);
  });

  test("folds updates into a pending create", () => {
    const outbox = enqueueAll([
      entry({ kind: "create", entityId: "local_1", fields: { name: { value: "new", at: 1 } } }),
      entry({ kind: "update", entityId: "local_1", fields: { important: { value: true, at: 2 } } }),
    ]);
    expect(outbox).toHaveLength(1);
    expect(outbox[0].kind).toBe("create");
    expect(outbox[0].fields?.important?.value).toBe(true);
  });

  test("never modifies an entry that is in flight", () => {
    const [first] = enqueueAll([
      entry({ kind: "update", entityId: "t1", fields: { name: { value: "a", at: 1 } } }),
    ]);
    const inflight: OutboxEntry = { ...first, status: "inflight" };
    const outbox = enqueueAll(
      [entry({ kind: "update", entityId: "t1", fields: { name: { value: "b", at: 2 } } })],
      [inflight],
    );
    expect(outbox).toHaveLength(2);
    expect(outbox[0]).toBe(inflight);
    expect(outbox[1].fields?.name?.value).toBe("b");
  });

  test("deleting a never-synced task drops it entirely", () => {
    const outbox = enqueueAll([
      entry({ kind: "create", entityId: "local_1", fields: { name: { value: "x", at: 1 } } }),
      entry({ kind: "update", entityId: "local_1", fields: { pinned: { value: true, at: 2 } } }),
      entry({ kind: "delete", entityId: "local_1" }),
    ]);
    expect(outbox).toHaveLength(0);
  });

  test("deleting while the create is in flight still queues the delete", () => {
    const [create] = enqueueAll([
      entry({ kind: "create", entityId: "local_1", fields: { name: { value: "x", at: 1 } } }),
    ]);
    const outbox = enqueueAll([entry({ kind: "delete", entityId: "local_1" })], [{ ...create, status: "inflight" }]);
    expect(outbox.map((item) => item.kind)).toEqual(["create", "delete"]);
  });

  test("delete replaces pending updates for a synced task", () => {
    const outbox = enqueueAll([
      entry({ kind: "update", entityId: "t1", fields: { name: { value: "a", at: 1 } } }),
      entry({ kind: "delete", entityId: "t1" }),
    ]);
    expect(outbox.map((item) => item.kind)).toEqual(["delete"]);
  });

  test("updates after a pending delete are dropped", () => {
    const outbox = enqueueAll([
      entry({ kind: "delete", entityId: "t1" }),
      entry({ kind: "update", entityId: "t1", fields: { name: { value: "a", at: 1 } } }),
    ]);
    expect(outbox.map((item) => item.kind)).toEqual(["delete"]);
    expect(hasPendingDelete(outbox, "t1")).toBe(true);
  });

  test("only the latest reorder per list section is kept", () => {
    const outbox = enqueueAll([
      entry({ kind: "reorder", entityId: "reorder:l1:tasks", reorder: { listId: "l1", section: "tasks", taskIds: ["a", "b"] } }),
      entry({ kind: "reorder", entityId: "reorder:l1:pinned", reorder: { listId: "l1", section: "pinned", taskIds: ["p"] } }),
      entry({ kind: "reorder", entityId: "reorder:l1:tasks", reorder: { listId: "l1", section: "tasks", taskIds: ["b", "a"] } }),
    ]);
    expect(outbox).toHaveLength(2);
    expect(outbox.find((item) => item.entityId === "reorder:l1:tasks")?.reorder?.taskIds).toEqual(["b", "a"]);
  });
});

describe("remapEntryIds", () => {
  test("rewrites entity ids, reorder ids and subtask parents", () => {
    const outbox = enqueueAll([
      entry({ kind: "update", entityId: "local_1", fields: { name: { value: "a", at: 1 } } }),
      entry({ kind: "create", entityId: "local_2", fields: { parentId: { value: "local_1", at: 1 } } }),
      entry({ kind: "reorder", entityId: "reorder:l1:tasks", reorder: { listId: "l1", section: "tasks", taskIds: ["x", "local_1"] } }),
    ]);
    const { entries, changed } = remapEntryIds(outbox, "local_1", "srv_1");
    expect(changed).toHaveLength(3);
    expect(entries[0].entityId).toBe("srv_1");
    expect(entries[1].fields?.parentId?.value).toBe("srv_1");
    expect(entries[2].reorder?.taskIds).toEqual(["x", "srv_1"]);
  });
});

describe("pendingFieldsFor", () => {
  test("ignores entries the server rejected", () => {
    const outbox = enqueueAll([
      entry({ kind: "update", entityId: "t1", fields: { name: { value: "a", at: 1 } } }),
    ]);
    const failed: OutboxEntry = { ...outbox[0], status: "failed" };
    expect([...pendingFieldsFor(outbox, "t1")]).toEqual(["name"]);
    expect(pendingFieldsFor([failed], "t1").size).toBe(0);
  });
});
