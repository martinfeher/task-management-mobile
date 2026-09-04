import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { HeroUINativeProvider } from "heroui-native";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Inspector, InspectorDevMenu } from "react-native-dev-inspector";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AddTaskComposer } from "@/components/add-task-composer";
import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { TaskAddedBadge } from "@/components/task-added-badge";
import { AppProvider, useApp } from "@/contexts/app-context";
import { HistoryActionsProvider } from "@/contexts/history-actions-toolbar-context";
import { TextFormatToolbarProvider } from "@/contexts/text-format-toolbar-context";
import { useDetailFonts } from "@/hooks/use-detail-fonts";
import { ensureNotificationPermissions } from "@/lib/notifications";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: "(tabs)",
};

function AddTaskComposerHost() {
  const { addTaskComposerOpen, closeAddTaskComposer } = useApp();
  return (
    <AddTaskComposer
      visible={addTaskComposerOpen}
      onClose={closeAddTaskComposer}
    />
  );
}

export default function RootLayout() {
  const fontsLoaded = useDetailFonts();

  useEffect(() => {
    void ensureNotificationPermissions();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <HeroUINativeProvider>
        <Inspector editor="cursor">
          <AppProvider>
            <TextFormatToolbarProvider>
              <HistoryActionsProvider>
                <View style={styles.root}>
                  <AnimatedSplashOverlay />
                  <Stack>
                    <Stack.Screen
                      name="(tabs)"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="task/[id]"
                      options={{
                        presentation: "formSheet",
                        headerShown: false,
                        sheetAllowedDetents: "fitToContents",
                        sheetGrabberVisible: false,
                        contentStyle: { backgroundColor: "#ffffff" },
                      }}
                    />
                    <Stack.Screen
                      name="search-modal"
                      options={{
                        presentation: "transparentModal",
                        headerShown: false,
                        animation: "fade",
                        contentStyle: { backgroundColor: "transparent" },
                      }}
                    />
                  </Stack>
                  <AddTaskComposerHost />
                  <TaskAddedBadge />
                </View>
              </HistoryActionsProvider>
            </TextFormatToolbarProvider>
          </AppProvider>
          <InspectorDevMenu position="top-right" />
        </Inspector>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
