import { beforeEach, describe, expect, jest, test } from "@jest/globals";

jest.mock("@/lib/offline/local-db", () => ({
  loadLocalDb: async () => ({ tasks: [], views: [], outbox: [], idMap: [], meta: {} }),
  persistLocalWrites: () => Promise.resolve(),
}));

import {
  clearLocalStore,
  enqueueMutation,
  getLocalTask,
  getOutbox,
  hydrateLocalStore,
  putLocalTask,
  readLocalView,
  remapTaskId,
  resolveTaskId,
  revertInflightEntries,
  saveServerTasks,
  saveServerView,
  subscribeLocalStore,
  takeOutboxBatch,
  type LocalStoreEvent,
} from "@/lib/offline/local-store";
import type { LocalTask } from "@/lib/offline/types";

const baseTask: LocalTask = {
  id: "local_1",
  name: "Offline",
  completed: false,
  dueDate: null,
  pinned: false,
  important: false,
  priority: null,
  parentId: null,
  depth: 0,
  labels: [],
  listId: "l1",
};

beforeEach(async () => {
  await hydrateLocalStore();
  clearLocalStore();
});

describe("local store", () => {
  test("remapping a temporary id moves the task, its queue entries and the view", () => {
    saveServerView({ type: "list", id: "l1" }, { title: "Inbox", pinned: [], tasks: [] });
    putLocalTask(baseTask);
    putLocalTask({ ...baseTask, id: "local_2", parentId: "local_1", depth: 1 });
    enqueueMutation({ mutationId: "c1", kind: "create", entityId: "local_1", at: 1, fields: { name: { value: "Offline", at: 1 } } });
    enqueueMutation({ mutationId: "c2", kind: "create", entityId: "local_2", at: 2, fields: { parentId: { value: "local_1", at: 2 } } });

    const events: LocalStoreEvent[] = [];
    const unsubscribe = subscribeLocalStore((event) => events.push(event));
    const [first] = takeOutboxBatch(1);
    expect(first.mutationId).toBe("c1");
    remapTaskId("local_1", "srv_1");
    unsubscribe();

    expect(events).toContainEqual({ type: "idRemapped", tempId: "local_1", serverId: "srv_1" });
    expect(resolveTaskId("local_1")).toBe("srv_1");
    expect(getLocalTask("local_1")?.id).toBe("srv_1");
    expect(getLocalTask("local_2")?.parentId).toBe("srv_1");
    expect(getOutbox().find((entry) => entry.mutationId === "c2")?.fields?.parentId?.value).toBe("srv_1");
    expect(readLocalView({ type: "list", id: "l1" })?.tasks.map((task) => task.id)).toEqual(["srv_1", "local_2"]);
  });

  test("a pull does not overwrite fields with unsent edits", () => {
    putLocalTask({ ...baseTask, id: "t1", name: "Mine", pinned: true });
    enqueueMutation({ mutationId: "u1", kind: "update", entityId: "t1", at: 5, fields: { name: { value: "Mine", at: 5 } } });

    saveServerTasks([
      { ...baseTask, id: "t1", name: "Theirs", pinned: false, deletedAt: null, updatedAt: "2026-11-13T00:00:00Z" },
    ]);

    expect(getLocalTask("t1")?.name).toBe("Mine");
    expect(getLocalTask("t1")?.pinned).toBe(false);
  });

  test("entries that fail to send go back to pending", () => {
    enqueueMutation({ mutationId: "u1", kind: "update", entityId: "t1", at: 5, fields: { name: { value: "x", at: 5 } } });
    expect(takeOutboxBatch(10)[0].status).toBe("inflight");
    revertInflightEntries();
    expect(getOutbox()[0].status).toBe("pending");
    expect(getOutbox()[0].attempts).toBe(1);
  });
});
