import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

import { CalendarPanel } from "@/components/calendar-panel";
import { useApp } from "@/contexts/app-context";

export default function CalendarScreen() {
  const { setListsDrawerOpen, loadCalendarTasks } = useApp();

  useFocusEffect(
    useCallback(() => {
      setListsDrawerOpen(false);
      void loadCalendarTasks(true);
    }, [loadCalendarTasks, setListsDrawerOpen]),
  );

  return <CalendarPanel />;
}
