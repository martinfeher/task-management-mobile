import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppSymbol } from "@/components/app-symbol";

type TaskImageLightboxProps = {
  /** Image URIs shown in the gallery, in display order. */
  images: string[];
  /** Index of the image to open first; `null` keeps the lightbox closed. */
  initialIndex: number | null;
  title?: string | null;
  onClose: () => void;
};

/**
 * Full-screen image preview opened when the user taps an image in the task
 * content. Swipe horizontally to move between images, pinch to zoom (iOS),
 * tap the backdrop or the close button to dismiss.
 */
export function TaskImageLightbox({
  images,
  initialIndex,
  title,
  onClose,
}: TaskImageLightboxProps) {
  const visible = initialIndex !== null && images.length > 0;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(initialIndex ?? 0);

  useEffect(() => {
    if (initialIndex === null) return;
    setIndex(Math.min(Math.max(initialIndex, 0), images.length - 1));
    // Only re-run when the lightbox is (re)opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIndex]);

  const handleMomentumEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    setIndex(Math.min(Math.max(next, 0), images.length - 1));
  };

  const showCounter = images.length > 1;
  const trimmedTitle = title?.trim() ?? "";

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      supportedOrientations={["portrait", "landscape"]}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={images.length > 1}
          onMomentumScrollEnd={handleMomentumEnd}
          contentOffset={{ x: (initialIndex ?? 0) * width, y: 0 }}
          style={StyleSheet.absoluteFill}
        >
          {images.map((uri, pageIndex) => (
            <ScrollView
              key={`${uri}-${pageIndex}`}
              style={{ width, height }}
              contentContainerStyle={styles.page}
              maximumZoomScale={Platform.OS === "ios" ? 4 : 1}
              minimumZoomScale={1}
              centerContent
              bouncesZoom
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close image preview"
                onPress={onClose}
                style={[
                  styles.imagePressable,
                  {
                    width,
                    height: height - insets.top - insets.bottom - 96,
                  },
                ]}
              >
                <Image
                  source={{ uri }}
                  style={styles.image}
                  contentFit="contain"
                  transition={150}
                />
              </Pressable>
            </ScrollView>
          ))}
        </ScrollView>

        <View
          pointerEvents="box-none"
          style={[styles.header, { paddingTop: insets.top + 8 }]}
        >
          <View style={styles.titleSlot}>
            {trimmedTitle ? (
              <View style={styles.titlePill}>
                <Text numberOfLines={1} style={styles.titleText}>
                  {trimmedTitle.charAt(0).toLocaleUpperCase() +
                    trimmedTitle.slice(1)}
                  {showCounter ? `  ·  ${index + 1}/${images.length}` : ""}
                </Text>
              </View>
            ) : showCounter ? (
              <View style={styles.titlePill}>
                <Text style={styles.titleText}>
                  {index + 1}/{images.length}
                </Text>
              </View>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close image preview"
            hitSlop={10}
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.closeButtonPressed,
            ]}
          >
            <AppSymbol ios="xmark" android="close" size={15} tintColor="#ffffff" />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.88)",
  },
  page: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  imagePressable: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 6,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    gap: 12,
  },
  titleSlot: {
    flex: 1,
    flexDirection: "row",
  },
  titlePill: {
    maxWidth: "100%",
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  titleText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#27272a",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(39, 39, 42, 0.75)",
  },
  closeButtonPressed: {
    backgroundColor: "rgba(39, 39, 42, 0.92)",
  },
});
