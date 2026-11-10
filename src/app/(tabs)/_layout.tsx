import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { NativeTabs } from "expo-router/native-tabs";
import { useColorScheme } from "react-native";

import { TAB_ITEMS } from "@/components/main-tabs-config";
import { Colors } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";

export default function TabsLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const { lastTabHref, listsDrawerOpen, openListsDrawerPanel } = useApp();

  return (
    <>
      <NativeTabs
        tintColor="#3c87f7"
        labelStyle={{
          color: colors.textSecondary,
        }}
        iconColor={colors.textSecondary}>
        {TAB_ITEMS.map((tab) => (
          <NativeTabs.Trigger
            key={tab.name}
            name={tab.name}
            contentStyle={
              tab.name === "index"
                ? { backgroundColor: "transparent" }
                : undefined
            }
            listeners={
              tab.name === "index"
                ? {
                    tabPress: () => {
                      if (
                        lastTabHref.includes("/tasks") &&
                        !listsDrawerOpen
                      ) {
                        openListsDrawerPanel();
                      }
                    },
                  }
                : undefined
            }>
            <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon
              sf={tab.sf}
              src={
                <NativeTabs.Trigger.VectorIcon
                  family={MaterialIcons}
                  name={tab.androidIcon}
                />
              }
            />
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
    </>
  );
}
