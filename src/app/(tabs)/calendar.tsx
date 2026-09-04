import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { CalendarPanel } from "@/components/calendar-panel";
import { useApp } from "@/contexts/app-context";

export default function CalendarScreen() {
  const { setListsDrawerOpen } = useApp();
  const [refreshNonce, setRefreshNonce] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setListsDrawerOpen(false);
      setRefreshNonce((value) => value + 1);
    }, [setListsDrawerOpen]),
  );

  return <CalendarPanel refreshNonce={refreshNonce} />;
}
