import { Platform, StyleSheet, View } from "react-native";
import { FullWindowOverlay } from "react-native-screens";

import { TextFormatToolbar } from "@/components/text-format-toolbar";
import type { TextFormatToolbarRegistration } from "@/contexts/text-format-toolbar-context";

type TextFormatToolbarHostProps = {
  registration: TextFormatToolbarRegistration | null;
};

/**
 * Renders the formatting bar above the entire navigation stack (including iOS
 * form sheets) using react-native-screens FullWindowOverlay — the same layering
 * model React Navigation uses for transparent modals.
 */
export function TextFormatToolbarHost({ registration }: TextFormatToolbarHostProps) {
  if (!registration) return null;

  const toolbar = (
    <View style={styles.overlay} pointerEvents="box-none">
      <TextFormatToolbar
        visible
        layout="floating"
        variant="glass"
        bottom={registration.bottom}
        selectionHighlightColor={registration.selectionHighlightColor ?? null}
        selectionFontSize={registration.selectionFontSize ?? null}
        selectionBoldActive={registration.selectionBoldActive ?? false}
        selectionFontFamily={registration.selectionFontFamily ?? null}
        onFormat={registration.onFormat}
        onDismiss={registration.onDismiss}
        onKeepKeyboardFocus={registration.onKeepKeyboardFocus}
      />
    </View>
  );

  if (Platform.OS === "web") {
    return toolbar;
  }

  return <FullWindowOverlay>{toolbar}</FullWindowOverlay>;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
  },
});
