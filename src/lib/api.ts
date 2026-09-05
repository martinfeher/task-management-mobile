import { API_BASE_URL } from "@/constants/api";
import type {
  SearchTask,
  SelectedView,
  SidebarData,
  SidebarListItem,
  TaskDetail,
  TaskItem,
  TaskLabel,
  TaskListData,
} from "@/types/todo";

export async function fetchSidebarData(): Promise<SidebarData> {
  const response = await fetch(`${API_BASE_URL}/api/lists`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load lists (${response.status})`);
  }

  return response.json() as Promise<SidebarData>;
}

function getTasksUrl(view: SelectedView) {
  const params = new URLSearchParams();

  if (view.type === "list") {
    params.set("listId", view.id);
  } else if (view.type === "label") {
    params.set("view", "label");
    params.set("labelId", view.id);
  } else {
    params.set("view", view.type);
  }

  return `${API_BASE_URL}/api/tasks?${params.toString()}`;
}

export async function fetchTasks(view: SelectedView): Promise<TaskListData> {
  const response = await fetch(getTasksUrl(view), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load tasks (${response.status})`);
  }

  return response.json() as Promise<TaskListData>;
}

export async function fetchSearchTasks(): Promise<SearchTask[]> {
  const response = await fetch(`${API_BASE_URL}/api/search`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to load search tasks (${response.status})`);
  }

  const data = (await response.json()) as { tasks: SearchTask[] };
  return data.tasks ?? [];
}

export async function fetchLastSearchQuery(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/search-settings`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to load last search query (${response.status})`);
  }

  const data = (await response.json()) as { query?: string };
  return typeof data.query === "string" ? data.query : "";
}

export async function saveLastSearchQuery(query: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/search-settings`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save last search query (${response.status})`);
  }
}

export async function createTask(input: {
  name: string;
  listId: string;
  dueDate?: string | null;
  details?: string;
  priority?: number | null;
  labelIds?: string[];
  parentId?: string | null;
}): Promise<TaskItem> {
  const response = await fetch(`${API_BASE_URL}/api/tasks`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: input.name,
      listId: input.listId,
      dueDate: input.dueDate ?? null,
      details: input.details,
      priority: input.priority,
      labelIds: input.labelIds,
      parentId: input.parentId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create task (${response.status})`);
  }

  return response.json() as Promise<TaskItem>;
}

export async function toggleTaskCompleted(taskId: string, completed: boolean) {
  const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ completed }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update task (${response.status})`);
  }
}

export async function fetchTaskDetail(taskId: string): Promise<TaskDetail> {
  const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to load task (${response.status})`);
  }

  return response.json() as Promise<TaskDetail>;
}

export async function fetchLabels(): Promise<TaskLabel[]> {
  const response = await fetch(`${API_BASE_URL}/api/labels`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to load labels (${response.status})`);
  }

  const data = (await response.json()) as { labels: TaskLabel[] };
  return data.labels;
}

export async function toggleTaskImportant(taskId: string, important: boolean) {
  const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ important }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update task (${response.status})`);
  }
}

export async function updateTaskPinned(taskId: string, pinned: boolean) {
  const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pinned }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update pin (${response.status})`);
  }
}

export async function updateTaskPriority(
  taskId: string,
  priority: number | null,
) {
  const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ priority }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update priority (${response.status})`);
  }
}

export async function updateTaskCalendarColor(
  taskId: string,
  calendarColor: string,
) {
  const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ calendarColor }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update calendar color (${response.status})`);
  }

  return response.json() as Promise<{ id: string; calendarColor: string | null }>;
}

export async function toggleTaskLabel(
  taskId: string,
  labelId: string,
  assigned: boolean,
): Promise<TaskLabel[]> {
  const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/labels`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ labelId, assigned }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update labels (${response.status})`);
  }

  const data = (await response.json()) as { labels: TaskLabel[] };
  return data.labels;
}

export async function moveTaskToList(
  taskId: string,
  listId: string,
): Promise<{ listId: string; listName: string }> {
  const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ listId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to move task (${response.status})`);
  }

  return response.json() as Promise<{ listId: string; listName: string }>;
}

export async function updateTaskName(taskId: string, name: string) {
  const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error(`Failed to rename task (${response.status})`);
  }
}

export async function updateTaskDetails(taskId: string, details: string) {
  const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/details`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ details }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save task details (${response.status})`);
  }
}

export async function reorderTasks(input: {
  listId: string;
  section: "pinned" | "tasks";
  taskIds: string[];
}) {
  const response = await fetch(`${API_BASE_URL}/api/tasks/reorder`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Failed to reorder tasks (${response.status})`);
  }
}

export async function deleteTask(taskId: string) {
  const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete task (${response.status})`);
  }
}

export async function updateTaskDueDate(
  taskId: string,
  dueDate: string | null,
) {
  return updateTaskSchedule(taskId, { dueDate });
}

export async function updateTaskSchedule(
  taskId: string,
  update: {
    dueDate?: string | null;
    dueTimeMinutes?: number | null;
    dueDurationMinutes?: number | null;
  },
) {
  const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(update),
  });

  if (!response.ok) {
    throw new Error(`Failed to update task schedule (${response.status})`);
  }

  return response.json() as Promise<{
    id: string;
    dueDate: string | null;
    dueTimeMinutes: number | null;
    dueDurationMinutes: number | null;
    dueTimeZone: string;
  }>;
}

export async function createSubtask(parentId: string, name: string) {
  const response = await fetch(`${API_BASE_URL}/api/tasks`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, parentId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create subtask (${response.status})`);
  }

  return response.json() as Promise<TaskItem>;
}

export async function createList(name: string) {
  const response = await fetch(`${API_BASE_URL}/api/lists`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create list (${response.status})`);
  }

  return response.json() as Promise<SidebarListItem>;
}

export async function renameList(listId: string, name: string) {
  const response = await fetch(`${API_BASE_URL}/api/lists/${listId}`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error(`Failed to rename list (${response.status})`);
  }

  return response.json() as Promise<{ id: string; name: string }>;
}

export async function deleteList(listId: string) {
  const response = await fetch(`${API_BASE_URL}/api/lists/${listId}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete list (${response.status})`);
  }
}

export async function reorderLists(listIds: string[]) {
  const response = await fetch(`${API_BASE_URL}/api/lists/reorder`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ listIds }),
  });

  if (!response.ok) {
    throw new Error(`Failed to reorder lists (${response.status})`);
  }
}

export async function createLabel(label: string) {
  const response = await fetch(`${API_BASE_URL}/api/labels`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ label }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create label (${response.status})`);
  }

  return response.json() as Promise<TaskLabel>;
}

export async function renameLabelApi(labelId: string, label: string) {
  const response = await fetch(`${API_BASE_URL}/api/labels/${labelId}`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ label }),
  });

  if (!response.ok) {
    throw new Error(`Failed to rename label (${response.status})`);
  }

  return response.json() as Promise<TaskLabel>;
}

export async function deleteLabelApi(labelId: string) {
  const response = await fetch(`${API_BASE_URL}/api/labels/${labelId}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete label (${response.status})`);
  }
}

export async function updateLabelColorApi(labelId: string, color: string) {
  const response = await fetch(`${API_BASE_URL}/api/labels/${labelId}`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ color }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update label color (${response.status})`);
  }

  return response.json() as Promise<TaskLabel>;
}
