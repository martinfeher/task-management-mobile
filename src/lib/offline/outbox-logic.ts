import type {
  FieldChanges,
  NewOutboxEntry,
  OutboxEntry,
  SyncField,
} from "@/lib/offline/types";

export type EnqueueResult = {
  entries: OutboxEntry[];
  /** Entries whose persisted row must be written (inserted or updated). */
  upserted: OutboxEntry[];
  /** Sequence numbers whose persisted row must be removed. */
  removedSeqs: number[];
};

export function mergeFieldChanges(
  base: FieldChanges | undefined,
  next: FieldChanges | undefined,
): FieldChanges {
  const merged: FieldChanges = { ...(base ?? {}) };
  for (const [field, change] of Object.entries(next ?? {}) as [SyncField, FieldChanges[SyncField]][]) {
    if (!change) continue;
    const existing = merged[field];
    if (!existing || change.at >= existing.at) {
      merged[field] = change;
    }
  }
  return merged;
}

/**
 * Appends a mutation to the outbox, folding it into pending entries where
 * possible so a burst of offline edits sends as few mutations as possible.
 * Entries that are already in flight are never modified.
 */
export function enqueueWithCoalescing(
  entries: OutboxEntry[],
  incoming: NewOutboxEntry,
  nextSeq: number,
): EnqueueResult {
  const isPending = (entry: OutboxEntry) =>
    entry.status === "pending" && entry.entityId === incoming.entityId;
  const fresh: OutboxEntry = {
    ...incoming,
    seq: nextSeq,
    status: "pending",
    attempts: 0,
    lastError: null,
  };

  if (incoming.kind === "update") {
    if (entries.some((entry) => isPending(entry) && entry.kind === "delete")) {
      return { entries, upserted: [], removedSeqs: [] };
    }

    const target = [...entries]
      .reverse()
      .find((entry) => isPending(entry) && (entry.kind === "create" || entry.kind === "update"));

    if (target) {
      const merged: OutboxEntry = {
        ...target,
        at: Math.max(target.at, incoming.at),
        fields: mergeFieldChanges(target.fields, incoming.fields),
      };
      return {
        entries: entries.map((entry) => (entry.seq === target.seq ? merged : entry)),
        upserted: [merged],
        removedSeqs: [],
      };
    }

    return { entries: [...entries, fresh], upserted: [fresh], removedSeqs: [] };
  }

  if (incoming.kind === "delete") {
    const pendingForEntity = entries.filter(isPending);
    const hadPendingCreate = pendingForEntity.some((entry) => entry.kind === "create");
    const hasInflight = entries.some(
      (entry) => entry.entityId === incoming.entityId && entry.status !== "pending",
    );
    const removedSeqs = pendingForEntity.map((entry) => entry.seq);
    const remaining = entries.filter((entry) => !removedSeqs.includes(entry.seq));

    if (hadPendingCreate && !hasInflight) {
      return { entries: remaining, upserted: [], removedSeqs };
    }

    return { entries: [...remaining, fresh], upserted: [fresh], removedSeqs };
  }

  if (incoming.kind === "reorder") {
    const removedSeqs = entries
      .filter((entry) => isPending(entry) && entry.kind === "reorder")
      .map((entry) => entry.seq);
    const remaining = entries.filter((entry) => !removedSeqs.includes(entry.seq));
    return { entries: [...remaining, fresh], upserted: [fresh], removedSeqs };
  }

  return { entries: [...entries, fresh], upserted: [fresh], removedSeqs: [] };
}

/** Rewrites every reference to `tempId` once the server has assigned a real id. */
export function remapEntryIds(
  entries: OutboxEntry[],
  tempId: string,
  serverId: string,
): { entries: OutboxEntry[]; changed: OutboxEntry[] } {
  const changed: OutboxEntry[] = [];
  const next = entries.map((entry) => {
    let updated = entry;

    if (entry.entityId === tempId) {
      updated = { ...updated, entityId: serverId };
    }

    if (entry.reorder?.taskIds.includes(tempId)) {
      updated = {
        ...updated,
        reorder: {
          ...entry.reorder,
          taskIds: entry.reorder.taskIds.map((id) => (id === tempId ? serverId : id)),
        },
      };
    }

    if (entry.fields?.parentId?.value === tempId) {
      updated = {
        ...updated,
        fields: {
          ...updated.fields,
          parentId: { ...entry.fields.parentId, value: serverId },
        },
      };
    }

    if (updated !== entry) changed.push(updated);
    return updated;
  });

  return { entries: next, changed };
}

/** Field names with unsent local changes for a task (local values must survive a pull). */
export function pendingFieldsFor(entries: OutboxEntry[], taskId: string): Set<SyncField> {
  const fields = new Set<SyncField>();
  for (const entry of entries) {
    if (entry.entityId !== taskId || !entry.fields) continue;
    if (entry.status === "failed") continue;
    for (const field of Object.keys(entry.fields) as SyncField[]) {
      fields.add(field);
    }
  }
  return fields;
}

export function hasPendingDelete(entries: OutboxEntry[], taskId: string) {
  return entries.some(
    (entry) => entry.entityId === taskId && entry.kind === "delete" && entry.status !== "failed",
  );
}
