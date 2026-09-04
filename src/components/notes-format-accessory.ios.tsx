import { InputAccessoryView } from "react-native";

import { TextFormatToolbar } from "@/components/text-format-toolbar";
import type { TextFormatAction } from "@/lib/text-format";

export const NOTES_FORMAT_ACCESSORY_ID = "task-notes-format-toolbar";

type NotesFormatAccessoryProps = {
  visible: boolean;
  onFormat: (
    action: TextFormatAction,
    options?: { linkUrl?: string; color?: string; fontSize?: number },
  ) => void;
  onDismiss: () => void;
};

export function NotesFormatAccessory({
  visible,
  onFormat,
  onDismiss,
}: NotesFormatAccessoryProps) {
  return (
    <InputAccessoryView nativeID={NOTES_FORMAT_ACCESSORY_ID}>
      <TextFormatToolbar
        visible={visible}
        layout="accessory"
        variant="glass"
        onFormat={onFormat}
        onDismiss={onDismiss}
      />
    </InputAccessoryView>
  );
}
