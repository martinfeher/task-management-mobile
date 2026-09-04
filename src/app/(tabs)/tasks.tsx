import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

import { TasksScreenContent } from "@/components/tasks-screen-content";
import { useApp } from "@/contexts/app-context";

export default function TasksScreen() {
  const { setListsDrawerOpen } = useApp();

  useFocusEffect(
    useCallback(() => {
      setListsDrawerOpen(false);
    }, [setListsDrawerOpen]),
  );

  return <TasksScreenContent />;
}
