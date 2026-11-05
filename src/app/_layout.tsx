import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { HeroUINativeProvider } from "heroui-native";
import { lazy, Suspense, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Inspector, InspectorDevMenu } from "react-native-dev-inspector";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const AddTaskComposer = lazy(() =>
  import("@/components/add-task-composer").then((module) => ({
    default: module.AddTaskComposer,
  })),
);
import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { ListsDrawerOverlay } from "@/components/lists-drawer-overlay";
import { LastTabTracker } from "@/components/main-tabs-config";
import { TaskAddedBadge } from "@/components/task-added-badge";
import { AppProvider, useApp } from "@/contexts/app-context";
import { HistoryActionsProvider } from "@/contexts/history-actions-toolbar-context";
import { TextFormatToolbarProvider } from "@/contexts/text-format-toolbar-context";
import { useDetailFonts } from "@/hooks/use-detail-fonts";
import { ensureNotificationPermissions } from "@/lib/notifications";

SplashScreen.preventAutoHideAsync();

const FONT_LOAD_TIMEOUT_MS = 4000;

export const unstable_settings = {
  anchor: "(tabs)",
};

function AddTaskComposerHost() {
  const { addTaskComposerOpen, closeAddTaskComposer } = useApp();
  if (!addTaskComposerOpen) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <AddTaskComposer visible onClose={closeAddTaskComposer} />
    </Suspense>
  );
}

export default function RootLayout() {
  const fontsLoaded = useDetailFonts();
  const [canRenderApp, setCanRenderApp] = useState(false);

  useEffect(() => {
    void ensureNotificationPermissions();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      setCanRenderApp(true);
    }
  }, [fontsLoaded]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setCanRenderApp(true);
      void SplashScreen.hideAsync();
    }, FONT_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, []);

  if (!canRenderApp) {
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
                  <LastTabTracker />
                  <AnimatedSplashOverlay />
                  <Stack screenOptions={{ freezeOnBlur: false }}>
                    <Stack.Screen
                      name="(tabs)"
                      options={{ headerShown: false, freezeOnBlur: false }}
                    />
                    <Stack.Screen
                      name="task/[id]"
                      options={{
                        presentation: "formSheet",
                        headerShown: false,
                        sheetAllowedDetents: [0.47, 1],
                        sheetInitialDetentIndex: 0,
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
                  <ListsDrawerOverlay />
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
