import { useCallback } from "react";
import { useFocusEffect } from "expo-router";

import { SearchModal } from "@/components/search-modal";
import { useApp } from "@/contexts/app-context";

export default function SearchTabScreen() {
  const { setListsDrawerOpen } = useApp();

  useFocusEffect(
    useCallback(() => {
      setListsDrawerOpen(false);
    }, [setListsDrawerOpen]),
  );

  return <SearchModal variant="embedded" />;
}
