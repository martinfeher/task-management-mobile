import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { View } from "react-native";

import { useApp } from "@/contexts/app-context";

/** Lists tab opens the drawer and stays selected. */
export default function ListsScreen() {
  const { animateListsDrawerOpen, setListsDrawerOpen } = useApp();

  useFocusEffect(
    useCallback(() => {
      animateListsDrawerOpen();
      return () => {
        setListsDrawerOpen(false);
      };
    }, [animateListsDrawerOpen, setListsDrawerOpen]),
  );

  return <View pointerEvents="none" style={{ flex: 1, backgroundColor: "transparent" }} />;
}
