import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import type { SimulationInput, SimulationOutput, BrewMethod } from "../types/simulation";

const STORAGE_KEY = "keif_run_history";

export interface SavedRun {
  id: number;
  name: string;
  method: BrewMethod;
  created_at: string;      // ISO 8601
  input_json: string;
  output_json: string;
  archived: number;        // 0 or 1
}

export interface ParsedRun {
  id: number;
  name: string;
  method: BrewMethod;
  created_at: string;
  input: SimulationInput;
  output: SimulationOutput;
}

async function loadAllRuns(): Promise<SavedRun[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as SavedRun[];
}

async function saveAllRuns(runs: SavedRun[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
}

export function useRunHistory() {
  const [runs, setRuns] = useState<SavedRun[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const allRuns = await loadAllRuns();
      const active = allRuns
        .filter((r) => r.archived === 0)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      setRuns(active);
      setCount(active.length);
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to load runs: ${message}`);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const allRuns = await loadAllRuns();
        const active = allRuns
          .filter((r) => r.archived === 0)
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
        setRuns(active);
        setCount(active.length);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(`Storage initialization failed: ${message}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = useCallback(async (
    name: string,
    input: SimulationInput,
    output: SimulationOutput,
  ): Promise<void> => {
    try {
      const allRuns = await loadAllRuns();
      const newRun: SavedRun = {
        id: Date.now(),
        name,
        method: input.method,
        created_at: new Date().toISOString(),
        input_json: JSON.stringify(input),
        output_json: JSON.stringify(output),
        archived: 0,
      };
      allRuns.push(newRun);
      await saveAllRuns(allRuns);
      await reload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to save run: ${message}`);
      throw err;
    }
  }, [reload]);

  const deleteById = useCallback(async (id: number): Promise<void> => {
    try {
      const allRuns = await loadAllRuns();
      const filtered = allRuns.filter((r) => r.id !== id);
      await saveAllRuns(filtered);
      await reload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to delete run: ${message}`);
      throw err;
    }
  }, [reload]);

  const archiveOlderThan = useCallback(async (days: number): Promise<void> => {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    try {
      const allRuns = await loadAllRuns();
      const updated = allRuns.map((r) =>
        r.created_at < cutoff && r.archived === 0
          ? { ...r, archived: 1 as const }
          : r
      );
      await saveAllRuns(updated);
      await reload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to archive runs: ${message}`);
      throw err;
    }
  }, [reload]);

  return { runs, count, loading, error, save, deleteById, archiveOlderThan, reload };
}
