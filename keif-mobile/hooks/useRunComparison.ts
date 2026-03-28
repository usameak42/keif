import * as SQLite from "expo-sqlite/legacy";
import type { SQLTransaction, SQLResultSet, SQLError } from "expo-sqlite/legacy";
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

const db = SQLite.openDatabase("keif-runs.db");

export function useRunComparison(idA: number, idB: number): ComparisonResult {
  const [runA, setRunA] = useState<ParsedRun | null>(null);
  const [runB, setRunB] = useState<ParsedRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    let rowA: SavedRun | null = null;
    let rowB: SavedRun | null = null;

    db.transaction(
      (tx: SQLTransaction) => {
        tx.executeSql(
          "SELECT * FROM saved_runs WHERE id = ?",
          [idA],
          (_tx: SQLTransaction, result: SQLResultSet) => {
            rowA = result.rows.length > 0 ? (result.rows.item(0) as SavedRun) : null;
          },
          (_tx: SQLTransaction, err: SQLError) => {
            setError(`Couldn't load run A: ${err.message}`);
            return true;
          },
        );
        tx.executeSql(
          "SELECT * FROM saved_runs WHERE id = ?",
          [idB],
          (_tx: SQLTransaction, result: SQLResultSet) => {
            rowB = result.rows.length > 0 ? (result.rows.item(0) as SavedRun) : null;
          },
          (_tx: SQLTransaction, err: SQLError) => {
            setError(`Couldn't load run B: ${err.message}`);
            return true;
          },
        );
      },
      (err: SQLError) => {
        setError(`Couldn't load runs: ${err.message}`);
        setLoading(false);
      },
      () => {
        if (!rowA || !rowB) {
          setError("Couldn't load runs. One or both runs may have been deleted.");
          setLoading(false);
          return;
        }
        setRunA(parseRow(rowA));
        setRunB(parseRow(rowB));
        setLoading(false);
      },
    );
  }, [idA, idB]);

  return { runA, runB, loading, error };
}
