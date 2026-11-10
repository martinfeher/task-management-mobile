import { useFocusEffect } from "expo-router";
import { useCallback, useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { useApp } from "@/contexts/app-context";

/** Lists tab opens the drawer and stays selected. */
export default function ListsScreen() {
  const { animateListsDrawerOpen, openListsDrawerPanel, setListsDrawerOpen } =
    useApp();

  useEffect(() => {
    openListsDrawerPanel();
  }, [openListsDrawerPanel]);

  useFocusEffect(
    useCallback(() => {
      animateListsDrawerOpen();
      return () => {
        setListsDrawerOpen(false);
      };
    }, [animateListsDrawerOpen, setListsDrawerOpen]),
  );

  return (
    <View pointerEvents="none" style={styles.screen}>
      <View style={styles.backdrop} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f4f4f5",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
