import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

type LiquidGlassSurfaceProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  isInteractive?: boolean;
};

const USE_NATIVE_LIQUID_GLASS =
  Platform.OS === "ios" && isLiquidGlassAvailable();

const WEB_GLASS_SHELL =
  Platform.OS === "web"
    ? ({
        backgroundColor: "rgba(255,255,255,0.68)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
      } as ViewStyle)
    : null;

export function LiquidGlassSurface({
  children,
  style,
  borderRadius = 999,
  isInteractive = true,
}: LiquidGlassSurfaceProps) {
  const radiusStyle = { borderRadius };

  if (USE_NATIVE_LIQUID_GLASS) {
    return (
      <View style={[styles.shell, radiusStyle, style]}>
        <GlassView
          glassEffectStyle="regular"
          colorScheme="auto"
          isInteractive={isInteractive}
          style={[StyleSheet.absoluteFill, radiusStyle]}
        />
        <View style={[styles.nativeSheen, radiusStyle]} pointerEvents="none" />
        <View style={[styles.nativeEdge, radiusStyle]} pointerEvents="none" />
        <View style={styles.content}>{children}</View>
      </View>
    );
  }

  return (
    <View style={[styles.shell, WEB_GLASS_SHELL, radiusStyle, style]}>
      <BlurView
        intensity={Platform.OS === "ios" ? 88 : 72}
        tint={Platform.OS === "ios" ? "systemUltraThinMaterialLight" : "light"}
        blurMethod="dimezisBlurView"
        style={[StyleSheet.absoluteFill, radiusStyle]}
      />
      <View style={[styles.fallbackTint, radiusStyle]} pointerEvents="none" />
      <View style={[styles.fallbackSheen, radiusStyle]} pointerEvents="none" />
      <View style={[styles.fallbackEdge, radiusStyle]} pointerEvents="none" />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: "hidden",
    backgroundColor:
      Platform.OS === "android" ? "rgba(255,255,255,0.38)" : "transparent",
    shadowColor: "#0f172a",
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  content: {
    position: "relative",
  },
  nativeSheen: {
    ...StyleSheet.absoluteFill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.72)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  nativeEdge: {
    position: "absolute",
    top: 0,
    left: 18,
    right: 18,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  fallbackTint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  fallbackSheen: {
    ...StyleSheet.absoluteFill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.55)",
  },
  fallbackEdge: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.65)",
  },
});
