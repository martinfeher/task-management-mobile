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

export function NotesFormatAccessory(_props: NotesFormatAccessoryProps) {
  return null;
}
