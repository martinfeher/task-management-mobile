import { useCallback } from "react";
import { View } from "react-native";
import { useFocusEffect } from "expo-router";

import { useApp } from "@/contexts/app-context";

export default function SearchTabScreen() {
  const { openSearchModal, consumeSearchOpenSuppressed, setListsDrawerOpen } = useApp();

  useFocusEffect(
    useCallback(() => {
      setListsDrawerOpen(false);
      // Closing a task opened from search lands here briefly — don't reopen.
      if (consumeSearchOpenSuppressed()) return;
      openSearchModal();
    }, [consumeSearchOpenSuppressed, openSearchModal, setListsDrawerOpen]),
  );

  return <View style={{ flex: 1 }} />;
}
