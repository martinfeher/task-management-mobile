import { Platform } from "react-native";
import { PiNoteLight } from "react-icons/pi";
import Svg, { Path } from "react-native-svg";

const PI_NOTE_LIGHT_PATH =
  "M90,96a6,6,0,0,1,6-6h64a6,6,0,0,1,0,12H96A6,6,0,0,1,90,96Zm6,38h64a6,6,0,0,0,0-12H96a6,6,0,0,0,0,12Zm32,20H96a6,6,0,0,0,0,12h32a6,6,0,0,0,0-12ZM222,48V156.69a13.94,13.94,0,0,1-4.1,9.9L166.59,217.9a13.94,13.94,0,0,1-9.9,4.1H48a14,14,0,0,1-14-14V48A14,14,0,0,1,48,34H208A14,14,0,0,1,222,48ZM48,210H154V160a6,6,0,0,1,6-6h50V48a2,2,0,0,0-2-2H48a2,2,0,0,0-2,2V208A2,2,0,0,0,48,210Zm153.52-44H166v35.52Z";

type PiNoteLightIconProps = {
  size?: number;
  color?: string;
};

export function PiNoteLightIcon({
  size = 21,
  color = "#b4b4bf",
}: PiNoteLightIconProps) {
  if (Platform.OS === "web") {
    return (
      <PiNoteLight
        size={size}
        color={color}
        style={{ transform: "scaleX(0.785)" }}
      />
    );
  }

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      style={{ transform: [{ scaleX: 0.785 }] }}
    >
      <Path d={PI_NOTE_LIGHT_PATH} fill={color} />
    </Svg>
  );
}
