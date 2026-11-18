import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { readAuthToken } from "@/lib/auth-token-storage";
import { resolvePreviewImageUrl } from "@/lib/task-preview-image";

type TaskRowPreviewImageProps = {
  /** API path (or absolute URL) of the image. */
  path: string;
  /** Side length of the square thumbnail. */
  size: number;
};

/**
 * Square thumbnail of the first image in a task's content. Task images are
 * served only to signed-in users, so the bearer token is sent with the request.
 */
export function TaskRowPreviewImage({ path, size }: TaskRowPreviewImageProps) {
  const [token, setToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void readAuthToken().then((value) => {
      if (active) setToken(value);
    });
    return () => {
      active = false;
    };
  }, []);

  const source = useMemo(() => {
    if (token === undefined) return null;
    return {
      uri: resolvePreviewImageUrl(path),
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    };
  }, [path, token]);

  return (
    <View
      pointerEvents="none"
      style={[styles.frame, { width: size, height: size }]}
    >
      {source ? (
        <Image
          source={source}
          style={styles.image}
          contentFit="cover"
          cachePolicy="disk"
          transition={120}
          recyclingKey={path}
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
