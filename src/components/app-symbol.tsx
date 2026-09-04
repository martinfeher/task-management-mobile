import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolView, type SymbolWeight } from "expo-symbols";
import { Platform, View, type ViewProps } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";

type MaterialIconName = keyof typeof MaterialIcons.glyphMap;

type AppSymbolProps = ViewProps & {
  ios: SFSymbol | string;
  android: MaterialIconName | string;
  web?: MaterialIconName | string;
  tintColor?: string;
  size?: number;
  weight?: SymbolWeight;
};

export function AppSymbol({
  ios,
  android,
  web,
  tintColor,
  size = 24,
  weight,
  style,
  ...viewProps
}: AppSymbolProps) {
  const iconName = (
    Platform.OS === "web" ? (web ?? android) : android
  ) as MaterialIconName;
  const fallback = (
    <MaterialIcons name={iconName} color={tintColor} size={size} />
  );

  if (Platform.OS === "ios") {
    return (
      <View style={style} {...viewProps}>
        <SymbolView
          name={ios as SFSymbol}
          tintColor={tintColor}
          size={size}
          weight={weight}
          fallback={fallback}
        />
      </View>
    );
  }

  return (
    <View style={style} {...viewProps}>
      {fallback}
    </View>
  );
}
