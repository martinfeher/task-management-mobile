import { Platform, UIManager } from "react-native";

/** True when the dev build includes react-native-enriched native views. */
export function isEnrichedNotesInputAvailable() {
  if (Platform.OS === "web") {
    return false;
  }

  const hasViewManager =
    typeof UIManager.hasViewManagerConfig === "function" &&
    (UIManager.hasViewManagerConfig("EnrichedTextInputView") ||
      UIManager.hasViewManagerConfig("RCTEnrichedTextInputView"));

  return hasViewManager;
}
