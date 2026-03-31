import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import type { SimulationInput, SimulationOutput, BrewMethod } from "../types/simulation";
import type { ParsedRun, SavedRun } from "./useRunHistory";

const STORAGE_KEY = "keif_run_history";

export interface ComparisonResult {
  runA: ParsedRun | null;
  runB: ParsedRun | null;
  loading: boolean;
  error: string | null;
}

function parseRow(row: SavedRun): ParsedRun {
  return {
    id: row.id,
    name: row.name,
    method: row.method as BrewMethod,
    created_at: row.created_at,
    input: JSON.parse(row.input_json) as SimulationInput,
    output: JSON.parse(row.output_json) as SimulationOutput,
  };
}

export function useRunComparison(idA: number, idB: number): ComparisonResult {
  const [runA, setRunA] = useState<ParsedRun | null>(null);
  const [runB, setRunB] = useState<ParsedRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) {
          setError("Couldn't load runs. No saved runs found.");
          setRunA(null);
          setRunB(null);
          return;
        }

        const allRuns = JSON.parse(raw) as SavedRun[];
        const rowA = allRuns.find((r) => r.id === idA) ?? null;
        const rowB = allRuns.find((r) => r.id === idB) ?? null;

        if (!rowA || !rowB) {
          setError("Couldn't load runs. One or both runs may have been deleted.");
          setRunA(null);
          setRunB(null);
        } else {
          setRunA(parseRow(rowA));
          setRunB(parseRow(rowB));
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(`Couldn't load runs: ${message}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [idA, idB]);

  return { runA, runB, loading, error };
}
