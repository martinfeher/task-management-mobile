import type { ReactNode } from "react";

const DEV_INSPECTOR_ENABLED =
  process.env.EXPO_PUBLIC_DEV_INSPECTOR === "true";

type DevInspectorShellProps = {
  children: ReactNode;
};

export function DevInspectorShell({ children }: DevInspectorShellProps) {
  if (!DEV_INSPECTOR_ENABLED) {
    return children;
  }

  const { Inspector, InspectorDevMenu } =
    require("react-native-dev-inspector") as typeof import("react-native-dev-inspector");

  return (
    <Inspector editor="cursor">
      {children}
      <InspectorDevMenu position="top-right" />
    </Inspector>
  );
}
