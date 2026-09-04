export type TaskDetailSnapshot = {
  name: string;
  notesPlain: string;
  notesHtml: string;
};

export function snapshotsEqual(
  a: TaskDetailSnapshot,
  b: TaskDetailSnapshot,
): boolean {
  return (
    a.name === b.name &&
    a.notesPlain === b.notesPlain &&
    a.notesHtml === b.notesHtml
  );
}

export function createEmptyTaskDetailHistory() {
  return { past: [] as TaskDetailSnapshot[], future: [] as TaskDetailSnapshot[] };
}
