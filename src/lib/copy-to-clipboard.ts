import { Platform, Share } from "react-native";

export async function copyToClipboard(
  text: string,
): Promise<"copied" | "shared" | "failed"> {
  if (Platform.OS === "web") {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return "copied";
      } catch {
        return "failed";
      }
    }
    return "failed";
  }

  try {
    const Clipboard = require("expo-clipboard") as typeof import("expo-clipboard");
    await Clipboard.setStringAsync(text);
    return "copied";
  } catch {
    try {
      await Share.share({ message: text });
      return "shared";
    } catch {
      return "failed";
    }
  }
}
