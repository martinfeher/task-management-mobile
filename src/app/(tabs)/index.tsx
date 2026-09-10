import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { View } from "react-native";

import { useApp } from "@/contexts/app-context";

/** Lists tab opens the drawer and stays selected. */
export default function ListsScreen() {
  const { setListsDrawerOpen } = useApp();

  useFocusEffect(
    useCallback(() => {
      setListsDrawerOpen(true);
      return () => {
        setListsDrawerOpen(false);
      };
    }, [setListsDrawerOpen]),
  );

  return <View style={{ flex: 1, backgroundColor: "#ffffff" }} />;
}
