import React, { useMemo, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";
import { Spacing } from "../constants/spacing";
import type { SavedRun } from "../hooks/useRunHistory";
import type { BrewMethod, SimulationOutput } from "../types/simulation";

const METHOD_DISPLAY: Record<BrewMethod, string> = {
  french_press: "French Press",
  v60: "V60",
  kalita: "Kalita Wave",
  espresso: "Espresso",
  moka_pot: "Moka Pot",
  aeropress: "AeroPress",
};

interface RunListItemProps {
  run: SavedRun;
  isSelected: boolean;
  isSelectionMode: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onDeleteConfirm: (id: number) => void;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function RunListItem({
  run,
  isSelected,
  isSelectionMode,
  onPress,
  onLongPress,
  onDeleteConfirm,
}: RunListItemProps) {
  const swipeableRef = useRef<Swipeable>(null);

  const { tds, ey } = useMemo(() => {
    try {
      const output = JSON.parse(run.output_json) as SimulationOutput;
      return { tds: output.tds_percent, ey: output.extraction_yield };
    } catch {
      return { tds: 0, ey: 0 };
    }
  }, [run.output_json]);

  function renderRightActions() {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => {
          swipeableRef.current?.close();
          onDeleteConfirm(run.id);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${run.name}`}
      >
        <Ionicons name="trash-outline" size={20} color="#EAE2D7" />
        <Text style={styles.deleteText}>Delete Run</Text>
      </TouchableOpacity>
    );
  }

  const dateStr = formatDate(run.created_at);

  return (
    <Swipeable ref={swipeableRef} renderRightActions={renderRightActions}>
      <TouchableOpacity
        style={[
          styles.item,
          isSelected && styles.itemSelected,
        ]}
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityLabel={`${run.name}, ${METHOD_DISPLAY[run.method as BrewMethod]}, ${dateStr}, TDS ${tds.toFixed(2)} percent, EY ${ey.toFixed(1)} percent`}
      >
        {isSelectionMode && (
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]} />
        )}
        <View style={styles.leftSection}>
          <Text style={styles.runName} numberOfLines={1}>{run.name}</Text>
          <Text style={styles.runMeta}>
            {METHOD_DISPLAY[run.method as BrewMethod]} {"\u2014"} {dateStr}
          </Text>
        </View>
        <View style={styles.rightSection}>
          <Text style={styles.metricValue}>TDS {tds.toFixed(2)}%</Text>
          <Text style={styles.metricValue}>EY {ey.toFixed(1)}%</Text>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.md,
    height: 72,
    flexDirection: "row",
    alignItems: "center",
  },
  itemSelected: {
    backgroundColor: "#28221F",
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#3B322B",
    backgroundColor: "transparent",
    marginRight: Spacing.sm,
  },
  checkboxSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  leftSection: {
    flex: 1,
  },
  runName: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    lineHeight: 24,
    color: Colors.textPrimary,
  },
  runMeta: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  rightSection: {
    alignItems: "flex-end",
  },
  metricValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
    color: Colors.textPrimary,
    textAlign: "right",
  },
  deleteAction: {
    backgroundColor: Colors.destructive,
    width: 96,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  deleteText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
    color: "#EAE2D7",
    marginTop: 4,
  },
});
