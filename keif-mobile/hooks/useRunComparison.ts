import * as SQLite from "expo-sqlite";
import { useEffect, useState } from "react";
import type { SimulationInput, SimulationOutput, BrewMethod } from "../types/simulation";
import type { ParsedRun, SavedRun } from "./useRunHistory";

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
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const db = await SQLite.openDatabaseAsync("keif-runs.db");

        const rowA = await db.getFirstAsync<SavedRun>(
          "SELECT * FROM saved_runs WHERE id = ?",
          idA,
        );
        const rowB = await db.getFirstAsync<SavedRun>(
          "SELECT * FROM saved_runs WHERE id = ?",
          idB,
        );

        if (!rowA || !rowB) {
          setError("Couldn't load runs. One or both runs may have been deleted.");
          setLoading(false);
          return;
        }

        setRunA(parseRow(rowA));
        setRunB(parseRow(rowB));
        setLoading(false);
      } catch (e) {
        setError(`Couldn't load runs: ${e instanceof Error ? e.message : String(e)}`);
        setLoading(false);
      }
    })();
  }, [idA, idB]);

  return { runA, runB, loading, error };
}
