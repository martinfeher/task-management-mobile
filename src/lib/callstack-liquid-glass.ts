import type { ComponentType, ReactNode } from "react";
import { Platform, TurboModuleRegistry } from "react-native";

type CallstackLiquidGlassModule = {
  LiquidGlassView: ComponentType<{
    effect?: "clear" | "regular" | "none";
    tintColor?: string;
    interactive?: boolean;
    style?: object;
    children?: ReactNode;
  }>;
  isLiquidGlassSupported: boolean;
};

let cachedModule: CallstackLiquidGlassModule | null | undefined;

function isCallstackNativeModuleLinked() {
  if (Platform.OS !== "ios") {
    return false;
  }

  return TurboModuleRegistry.get("NativeLiquidGlassModule") != null;
}

/** Lazy-load Callstack liquid glass only when its native module is linked. */
export function getCallstackLiquidGlass(): CallstackLiquidGlassModule | null {
  if (cachedModule !== undefined) {
    return cachedModule;
  }

  if (!isCallstackNativeModuleLinked()) {
    cachedModule = null;
    return null;
  }

  try {
    cachedModule = require("@callstack/liquid-glass") as CallstackLiquidGlassModule;
  } catch {
    cachedModule = null;
  }

  return cachedModule;
}
