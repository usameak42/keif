import React, { useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useSimulationResult } from "../context/SimulationResultContext";
import { useRunHistory } from "../hooks/useRunHistory";
import { BackButton } from "../components/BackButton";
import { ErrorCard } from "../components/ErrorCard";
import { SaveRunPrompt } from "../components/SaveRunPrompt";
import { RunListItem } from "../components/RunListItem";
import { ArchiveBanner } from "../components/ArchiveBanner";
import { EmptyState } from "../components/EmptyState";
import { DeleteConfirmModal } from "../components/DeleteConfirmModal";
import { Colors } from "../constants/colors";
import { Typography } from "../constants/typography";
import { Spacing } from "../constants/spacing";

export default function HistoryScreen() {
  const router = useRouter();
  const { currentInput, currentOutput, currentRunSaved, setCurrentRunSaved } = useSimulationResult();
  const { runs, count, loading, error, save, deleteById, archiveOlderThan, reload } = useRunHistory();

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [showArchiveDismissed, setShowArchiveDismissed] = useState(false);

  const showSavePrompt = !currentRunSaved && currentOutput !== null;

  async function handleSave(name: string) {
    if (!currentInput || !currentOutput) return;
    await save(name, currentInput, currentOutput);
    setCurrentRunSaved(true);
  }

  function handleLongPress(id: number) {
    if (!selectionMode) {
      setSelectionMode(true);
      setSelectedIds([id]);
    }
  }

  function handlePress(id: number) {
    if (selectionMode) {
      setSelectedIds((prev) => {
        if (prev.includes(id)) {
          return prev.filter((x) => x !== id);
        }
        if (prev.length >= 2) return prev;
        return [...prev, id];
      });
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <BackButton label="Back" onPress={() => router.back()} />
        {selectionMode && (
          <TouchableOpacity
            onPress={() => {
              setSelectionMode(false);
              setSelectedIds([]);
            }}
          >
            <Text style={styles.exitSelection}>Exit Selection</Text>
          </TouchableOpacity>
        )}
      </View>

      {error && <View style={styles.errorWrap}><ErrorCard message={error} onRetry={reload} /></View>}

      <FlatList
        data={runs}
        keyExtractor={(item) => item.id.toString()}
        initialNumToRender={15}
        windowSize={10}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Run History</Text>
            <Text style={styles.countBadge}>{count} runs</Text>
            {count > 100 && !showArchiveDismissed && (
              <ArchiveBanner
                count={count}
                onArchive={() => archiveOlderThan(30)}
                onDismiss={() => setShowArchiveDismissed(true)}
              />
            )}
            {showSavePrompt && (
              <SaveRunPrompt
                method={currentInput!.method}
                onSave={handleSave}
                onSkip={() => setCurrentRunSaved(true)}
              />
            )}
          </View>
        }
        ListEmptyComponent={loading ? null : <EmptyState />}
        renderItem={({ item }) => (
          <RunListItem
            run={item}
            isSelected={selectedIds.includes(item.id)}
            isSelectionMode={selectionMode}
            onPress={() => handlePress(item.id)}
            onLongPress={() => handleLongPress(item.id)}
            onDeleteConfirm={(id) => setDeleteTarget(id)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        contentContainerStyle={styles.listContent}
        style={styles.list}
      />

      {selectionMode && (
        <View style={styles.compareBar}>
          <TouchableOpacity
            style={[styles.compareButton, selectedIds.length !== 2 && styles.compareButtonDisabled]}
            disabled={selectedIds.length !== 2}
            onPress={() =>
              router.push({
                pathname: "/compare",
                params: { runAId: selectedIds[0], runBId: selectedIds[1] },
              })
            }
          >
            <Text
              style={[
                styles.compareButtonText,
                selectedIds.length !== 2 && styles.compareButtonTextDisabled,
              ]}
            >
              {selectedIds.length === 2 ? "Compare Runs" : "Select 2 runs to compare"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <DeleteConfirmModal
        visible={deleteTarget !== null}
        onDelete={async () => {
          await deleteById(deleteTarget!);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.dominant,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  exitSelection: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  errorWrap: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
  },
  title: {
    ...Typography.heading,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  countBadge: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  compareBar: {
    backgroundColor: Colors.dominant,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  compareButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  compareButtonDisabled: {
    backgroundColor: Colors.borderSubtle,
  },
  compareButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 24,
    color: "#16100D",
  },
  compareButtonTextDisabled: {
    color: Colors.textSecondary,
  },
});
