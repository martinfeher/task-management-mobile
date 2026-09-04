import { usePathname } from "expo-router";
import { useEffect } from "react";

import { useApp } from "@/contexts/app-context";

export function LastTabTracker() {
  const pathname = usePathname();
  const { setLastTabHref } = useApp();

  useEffect(() => {
    if (!pathname || pathname.includes("search")) return;
    setLastTabHref(pathname);
  }, [pathname, setLastTabHref]);

  return null;
}

export const TAB_ITEMS = [
  {
    name: "index",
    href: "/",
    label: "Lists",
    sf: "list.bullet",
    androidIcon: "list",
  },
  {
    name: "tasks",
    href: "/tasks",
    label: "Tasks",
    sf: "checklist",
    androidIcon: "checklist",
  },
  {
    name: "calendar",
    href: "/calendar",
    label: "Calendar",
    sf: "calendar",
    androidIcon: "calendar-today",
  },
  {
    name: "search",
    href: "/search",
    label: "Search",
    sf: "magnifyingglass",
    androidIcon: "search",
  },
] as const;
