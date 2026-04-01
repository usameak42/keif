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

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("keif-runs.db");
  }
  return dbPromise;
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
        const db = await getDb();
        const [rowA, rowB] = await Promise.all([
          db.getFirstAsync<SavedRun>("SELECT * FROM saved_runs WHERE id = ?", [idA]),
          db.getFirstAsync<SavedRun>("SELECT * FROM saved_runs WHERE id = ?", [idB]),
        ]);

        if (!rowA || !rowB) {
          setError("Couldn't load runs. One or both runs may have been deleted.");
          return;
        }
        setRunA(parseRow(rowA));
        setRunB(parseRow(rowB));
      } catch (e: unknown) {
        setError(`Couldn't load runs: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [idA, idB]);

  return { runA, runB, loading, error };
}
