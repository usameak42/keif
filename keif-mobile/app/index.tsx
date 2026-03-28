import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../constants/colors";
import { Typography } from "../constants/typography";
import { Spacing } from "../constants/spacing";

export default function RotarySelector() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Choose your brew method</Text>
      <Text style={styles.hint}>Swipe to browse, tap to select</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dominant,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  heading: {
    ...Typography.heading,
    color: Colors.textPrimary,
  },
  hint: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
});
