import { StyleSheet, View } from "react-native";

import { TaskDetailScreen } from "@/components/task-detail-screen";

export default function TaskModalRoute() {
  return (
    <View style={styles.root}>
      <TaskDetailScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
