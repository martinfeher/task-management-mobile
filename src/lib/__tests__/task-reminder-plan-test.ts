import { describe, expect, test } from "@jest/globals";

import {
  getReminderFireAt,
  planReminders,
  type ReminderTaskInput,
  type ScheduledReminder,
} from "@/lib/task-reminder-plan";

// 2026-11-18 12:00 local time.
const NOW = new Date(2026, 10, 18, 12, 0, 0, 0).getTime();

function local(year: number, month: number, day: number, hour: number, minute = 0) {
  return new Date(year, month - 1, day, hour, minute, 0, 0).getTime();
}

function task(overrides: Partial<ReminderTaskInput> & Pick<ReminderTaskInput, "id">): ReminderTaskInput {
  return {
    name: overrides.id,
    completed: false,
    dueDate: "2026-11-19",
    dueTimeMinutes: 9 * 60,
    reminderOffsetMinutes: 0,
    ...overrides,
  };
}

describe("getReminderFireAt", () => {
  test("on time fires at the due time in local time", () => {
    expect(getReminderFireAt(task({ id: "a" }), NOW)).toBe(local(2026, 11, 19, 9));
  });

  test("offset fires that many minutes early", () => {
    expect(getReminderFireAt(task({ id: "a", reminderOffsetMinutes: 30 }), NOW)).toBe(
      local(2026, 11, 19, 8, 30),
    );
    expect(getReminderFireAt(task({ id: "a", reminderOffsetMinutes: 60 }), NOW)).toBe(
      local(2026, 11, 19, 8),
    );
  });

  test("accepts ISO due dates by their calendar day", () => {
    expect(
      getReminderFireAt(task({ id: "a", dueDate: "2026-11-19T12:00:00.000Z" }), NOW),
    ).toBe(local(2026, 11, 19, 9));
  });

  test("no reminder offset means no notification", () => {
    expect(getReminderFireAt(task({ id: "a", reminderOffsetMinutes: null }), NOW)).toBeNull();
    expect(getReminderFireAt(task({ id: "a", reminderOffsetMinutes: undefined }), NOW)).toBeNull();
  });

  test("a reminder needs a due date and a due time", () => {
    expect(getReminderFireAt(task({ id: "a", dueDate: null }), NOW)).toBeNull();
    expect(getReminderFireAt(task({ id: "a", dueTimeMinutes: null }), NOW)).toBeNull();
    expect(getReminderFireAt(task({ id: "a", dueDate: "not-a-date" }), NOW)).toBeNull();
  });

  test("completed, deleted and note tasks never notify", () => {
    expect(getReminderFireAt(task({ id: "a", completed: true }), NOW)).toBeNull();
    expect(getReminderFireAt(task({ id: "a", deleted: true }), NOW)).toBeNull();
    expect(getReminderFireAt(task({ id: "a", isNote: true }), NOW)).toBeNull();
  });

  test("past trigger times are skipped", () => {
    expect(getReminderFireAt(task({ id: "a", dueDate: "2026-11-18", dueTimeMinutes: 11 * 60 }), NOW)).toBeNull();
    // Due later today, but the early offset already passed.
    expect(
      getReminderFireAt(
        task({ id: "a", dueDate: "2026-11-18", dueTimeMinutes: 12 * 60 + 10, reminderOffsetMinutes: 30 }),
        NOW,
      ),
    ).toBeNull();
    // Due later today and the trigger is still ahead.
    expect(
      getReminderFireAt(
        task({ id: "a", dueDate: "2026-11-18", dueTimeMinutes: 12 * 60 + 10, reminderOffsetMinutes: 5 }),
        NOW,
      ),
    ).toBe(local(2026, 11, 18, 12, 5));
  });
});

describe("planReminders", () => {
  const fireAt = local(2026, 11, 19, 9);

  test("schedules reminders that are missing", () => {
    const plan = planReminders([task({ id: "a", name: "Call mum" })], [], NOW);
    expect(plan.cancel).toEqual([]);
    expect(plan.schedule).toEqual([{ id: "a", name: "Call mum", fireAt }]);
  });

  test("does nothing when the scheduled notification already matches", () => {
    const scheduled: ScheduledReminder[] = [{ id: "a", fireAt, name: "a" }];
    expect(planReminders([task({ id: "a" })], scheduled, NOW)).toEqual({ cancel: [], schedule: [] });
  });

  test("reschedules when the time or name changed", () => {
    const moved = planReminders(
      [task({ id: "a", dueTimeMinutes: 10 * 60 })],
      [{ id: "a", fireAt, name: "a" }],
      NOW,
    );
    expect(moved.cancel).toEqual([]);
    expect(moved.schedule.map((reminder) => reminder.fireAt)).toEqual([local(2026, 11, 19, 10)]);

    const renamed = planReminders(
      [task({ id: "a", name: "New name" })],
      [{ id: "a", fireAt, name: "Old name" }],
      NOW,
    );
    expect(renamed.schedule).toHaveLength(1);
  });

  test("cancels notifications for completed, deleted, cleared or unknown tasks", () => {
    const scheduled: ScheduledReminder[] = [
      { id: "done", fireAt, name: "done" },
      { id: "gone", fireAt, name: "gone" },
      { id: "cleared", fireAt, name: "cleared" },
      { id: "orphan", fireAt, name: "orphan" },
    ];
    const plan = planReminders(
      [
        task({ id: "done", completed: true }),
        task({ id: "gone", deleted: true }),
        task({ id: "cleared", reminderOffsetMinutes: null }),
      ],
      scheduled,
      NOW,
    );
    expect(plan.cancel.sort()).toEqual(["cleared", "done", "gone", "orphan"]);
    expect(plan.schedule).toEqual([]);
  });

  test("keeps only the soonest reminders under the cap and cancels the rest", () => {
    const tasks = [
      task({ id: "late", dueDate: "2026-11-25" }),
      task({ id: "soon", dueDate: "2026-11-19" }),
      task({ id: "mid", dueDate: "2026-11-21" }),
    ];
    const plan = planReminders(tasks, [{ id: "late", fireAt: local(2026, 11, 25, 9), name: "late" }], NOW, 2);
    expect(plan.schedule.map((reminder) => reminder.id)).toEqual(["soon", "mid"]);
    expect(plan.cancel).toEqual(["late"]);
  });

  test("an empty task list cancels everything", () => {
    const plan = planReminders([], [{ id: "a", fireAt, name: "a" }], NOW);
    expect(plan).toEqual({ cancel: ["a"], schedule: [] });
  });
});
