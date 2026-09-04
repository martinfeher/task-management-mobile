import {
  GreatVibes_400Regular,
  useFonts as useGreatVibesFonts,
} from "@expo-google-fonts/great-vibes";
import {
  Inter_400Regular,
  Inter_400Regular_Italic,
  Inter_700Bold,
  Inter_700Bold_Italic,
  useFonts as useInterFonts,
} from "@expo-google-fonts/inter";
import {
  Lora_400Regular,
  Lora_400Regular_Italic,
  Lora_700Bold,
  Lora_700Bold_Italic,
  useFonts as useLoraFonts,
} from "@expo-google-fonts/lora";
import { useFonts as useExpoFonts } from "expo-font";

export function useDetailFonts() {
  const [interLoaded] = useInterFonts({
    Inter_400Regular,
    Inter_700Bold,
    Inter_400Regular_Italic,
    Inter_700Bold_Italic,
  });

  const [loraLoaded] = useLoraFonts({
    Lora_400Regular,
    Lora_700Bold,
    Lora_400Regular_Italic,
    Lora_700Bold_Italic,
  });

  const [greatVibesLoaded] = useGreatVibesFonts({
    GreatVibes_400Regular,
  });

  const [sfProLoaded] = useExpoFonts({
    "SFProText-Regular": require("../../assets/fonts/sf-pro/SF-Pro-Text-Regular.otf"),
    "SFProText-Medium": require("../../assets/fonts/sf-pro/SF-Pro-Text-Medium.otf"),
    "SFProText-Semibold": require("../../assets/fonts/sf-pro/SF-Pro-Text-Semibold.otf"),
    "SFProText-Bold": require("../../assets/fonts/sf-pro/SF-Pro-Text-Bold.otf"),
    "SFProText-RegularItalic": require("../../assets/fonts/sf-pro/SF-Pro-Text-RegularItalic.otf"),
    "SFProText-MediumItalic": require("../../assets/fonts/sf-pro/SF-Pro-Text-MediumItalic.otf"),
    "SFProText-SemiboldItalic": require("../../assets/fonts/sf-pro/SF-Pro-Text-SemiboldItalic.otf"),
    "SFProText-BoldItalic": require("../../assets/fonts/sf-pro/SF-Pro-Text-BoldItalic.otf"),
  });

  return interLoaded && loraLoaded && greatVibesLoaded && sfProLoaded;
}
