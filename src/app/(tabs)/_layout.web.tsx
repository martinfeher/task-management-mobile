import { Tabs, TabList, TabTrigger, TabSlot } from "expo-router/ui";
import { StyleSheet, Text, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LastTabTracker, TAB_ITEMS } from "@/components/main-tabs-config";
import { ListsDrawerOverlay } from "@/components/lists-drawer-overlay";
import { Colors } from "@/constants/theme";

export default function WebTabsLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  return (
    <>
      <LastTabTracker />
      <Tabs style={styles.tabs}>
        <TabSlot style={styles.slot} />
        <TabList style={[styles.tabList, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          {TAB_ITEMS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} style={styles.tabTrigger}>
              <Text style={[styles.tabLabel, { color: colors.textSecondary }]}>{tab.label}</Text>
            </TabTrigger>
          ))}
        </TabList>
      </Tabs>
      <ListsDrawerOverlay />
    </>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flex: 1,
    flexDirection: "column",
  },
  slot: {
    flex: 1,
  },
  tabList: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#d9d9d9",
    backgroundColor: "#ffffff",
    paddingTop: 10,
  },
  tabTrigger: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
});
