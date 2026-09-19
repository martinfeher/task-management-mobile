import { Button, Divider, Host, VStack } from "@expo/ui/swift-ui";
import {
  buttonStyle,
  frame,
  glassEffect,
  padding,
} from "@expo/ui/swift-ui/modifiers";

type ListsCreateSubmenuProps = {
  onCreateList: () => void;
  onCreateFolder: () => void;
  onCreateLabel: () => void;
};

export function ListsCreateSubmenu({
  onCreateList,
  onCreateFolder,
  onCreateLabel,
}: ListsCreateSubmenuProps) {
  return (
    <Host matchContents={{ horizontal: true, vertical: true }}>
      <VStack
        alignment="leading"
        spacing={0}
        modifiers={[
          glassEffect({
            shape: "roundedRectangle",
            cornerRadius: 15,
            glass: {
              variant: "regular",
              interactive: true,
            },
          }),
          frame({ minWidth: 132 }),
        ]}
      >
        <Button
          label="List"
          onPress={onCreateList}
          modifiers={[
            buttonStyle("plain"),
            frame({ minHeight: 49 }),
            padding({ horizontal: 16 }),
          ]}
        />
        <Divider />
        <Button
          label="Folder"
          onPress={onCreateFolder}
          modifiers={[
            buttonStyle("plain"),
            frame({ minHeight: 49 }),
            padding({ horizontal: 16 }),
          ]}
        />
        <Divider />
        <Button
          label="Label"
          onPress={onCreateLabel}
          modifiers={[
            buttonStyle("plain"),
            frame({ minHeight: 49 }),
            padding({ horizontal: 16 }),
          ]}
        />
      </VStack>
    </Host>
  );
}
