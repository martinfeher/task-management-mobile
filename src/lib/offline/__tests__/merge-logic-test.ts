import { describe, expect, test } from "@jest/globals";

import { buildViewData, mergeServerTask } from "@/lib/offline/merge-logic";
import type { LocalTask, ServerSyncTask, ViewSnapshot } from "@/lib/offline/types";

function task(overrides: Partial<LocalTask> & Pick<LocalTask, "id">): LocalTask {
  return {
    name: overrides.id,
    completed: false,
    dueDate: null,
    pinned: false,
    important: false,
    priority: null,
    parentId: null,
    depth: 0,
    labels: [],
    listId: "l1",
    ...overrides,
  };
}

function server(overrides: Partial<ServerSyncTask> & Pick<ServerSyncTask, "id">): ServerSyncTask {
  return { ...task(overrides), deletedAt: null, updatedAt: "2026-11-13T00:00:00.000Z", ...overrides };
}

describe("mergeServerTask", () => {
  test("server values win for fields without pending local edits", () => {
    const merged = mergeServerTask(
      task({ id: "t1", name: "local", pinned: true }),
      server({ id: "t1", name: "server", pinned: false }),
      new Set(),
      false,
    );
    expect(merged.name).toBe("server");
    expect(merged.pinned).toBe(false);
  });

  test("pending local fields survive a pull", () => {
    const labels = [{ id: "lab", label: "Work" }];
    const merged = mergeServerTask(
      task({ id: "t1", name: "local", labels, details: "<p>mine</p>", detailsDoc: null }),
      server({ id: "t1", name: "server", labels: [], details: "<p>theirs</p>", detailsDoc: { type: "doc" } as never }),
      new Set(["name", "labelIds", "details"]),
      false,
    );
    expect(merged.name).toBe("local");
    expect(merged.labels).toEqual(labels);
    expect(merged.details).toBe("<p>mine</p>");
    expect(merged.detailsDoc).toBeNull();
  });

  test("tombstones and pending deletes hide the task", () => {
    expect(mergeServerTask(undefined, server({ id: "t1", deletedAt: "2026-11-13T00:00:00Z" }), new Set(), false).deleted).toBe(true);
    expect(mergeServerTask(task({ id: "t1" }), server({ id: "t1" }), new Set(), true).deleted).toBe(true);
  });
});

describe("buildViewData", () => {
  const snapshot: ViewSnapshot = {
    key: "list:l1",
    title: "Inbox",
    pinnedIds: ["p1"],
    taskIds: ["a", "b"],
    fetchedAt: 0,
  };

  test("applies local edits on top of the snapshot", () => {
    const tasks = new Map<string, LocalTask>([
      ["p1", task({ id: "p1", pinned: true })],
      ["a", task({ id: "a", completed: true })],
      ["b", task({ id: "b" })],
      ["local_new", task({ id: "local_new" })],
      ["local_sub", task({ id: "local_sub", parentId: "b", depth: 1 })],
      ["moved", task({ id: "moved", listId: "other" })],
    ]);
    const view = buildViewData(
      { type: "list", id: "l1" },
      snapshot,
      tasks,
      new Set(["a", "local_new", "local_sub", "moved"]),
      "2026-11-13",
    );
    expect(view?.title).toBe("Inbox");
    expect(view?.pinned.map((item) => item.id)).toEqual(["p1"]);
    expect(view?.tasks.map((item) => item.id)).toEqual(["local_new", "b", "local_sub"]);
  });

  test("drops deleted tasks and moves unpinned tasks out of the pinned section", () => {
    const tasks = new Map<string, LocalTask>([
      ["p1", task({ id: "p1", pinned: false })],
      ["a", task({ id: "a", deleted: true })],
      ["b", task({ id: "b" })],
    ]);
    const view = buildViewData({ type: "list", id: "l1" }, snapshot, tasks, new Set(["p1"]), "2026-11-13");
    expect(view?.pinned).toEqual([]);
    expect(view?.tasks.map((item) => item.id)).toEqual(["p1", "b"]);
  });

  test("today view picks up locally scheduled tasks", () => {
    const tasks = new Map<string, LocalTask>([
      ["a", task({ id: "a", dueDate: "2026-11-13" })],
      ["b", task({ id: "b", dueDate: "2026-11-14" })],
    ]);
    const view = buildViewData({ type: "today" }, null, tasks, new Set(["a", "b"]), "2026-11-13");
    expect(view?.tasks.map((item) => item.id)).toEqual(["a"]);
  });

  test("returns null when nothing is cached for the view", () => {
    expect(buildViewData({ type: "important" }, null, new Map(), new Set(), "2026-11-13")).toBeNull();
  });
});
