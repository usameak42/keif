import * as SQLite from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";
import type { SimulationInput, SimulationOutput, BrewMethod } from "../types/simulation";

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

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS saved_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    method TEXT NOT NULL,
    created_at TEXT NOT NULL,
    input_json TEXT NOT NULL,
    output_json TEXT NOT NULL,
    archived INTEGER NOT NULL DEFAULT 0
  )
`;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("keif-runs.db");
  }
  return dbPromise;
}

export function useRunHistory() {
  const [runs, setRuns] = useState<SavedRun[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<SavedRun>(
        "SELECT * FROM saved_runs WHERE archived = 0 ORDER BY created_at DESC",
      );
      setRuns(rows);
      setCount(rows.length);
      setError(null);
    } catch (e: unknown) {
      setError(`Failed to load runs: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const db = await getDb();
        await db.execAsync(CREATE_TABLE_SQL);
        const rows = await db.getAllAsync<SavedRun>(
          "SELECT * FROM saved_runs WHERE archived = 0 ORDER BY created_at DESC",
        );
        setRuns(rows);
        setCount(rows.length);
      } catch (e: unknown) {
        setError(`Database initialization failed: ${e instanceof Error ? e.message : String(e)}`);
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
      const db = await getDb();
      await db.runAsync(
        "INSERT INTO saved_runs (name, method, created_at, input_json, output_json, archived) VALUES (?, ?, ?, ?, ?, 0)",
        [name, input.method, new Date().toISOString(), JSON.stringify(input), JSON.stringify(output)],
      );
      await reload();
    } catch (e: unknown) {
      setError(`Failed to save run: ${e instanceof Error ? e.message : String(e)}`);
      throw e;
    }
  }, [reload]);

  const deleteById = useCallback(async (id: number): Promise<void> => {
    try {
      const db = await getDb();
      await db.runAsync("DELETE FROM saved_runs WHERE id = ?", [id]);
      await reload();
    } catch (e: unknown) {
      setError(`Failed to delete run: ${e instanceof Error ? e.message : String(e)}`);
      throw e;
    }
  }, [reload]);

  const archiveOlderThan = useCallback(async (days: number): Promise<void> => {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    try {
      const db = await getDb();
      await db.runAsync(
        "UPDATE saved_runs SET archived = 1 WHERE created_at < ? AND archived = 0",
        [cutoff],
      );
      await reload();
    } catch (e: unknown) {
      setError(`Failed to archive runs: ${e instanceof Error ? e.message : String(e)}`);
      throw e;
    }
  }, [reload]);

  return { runs, count, loading, error, save, deleteById, archiveOlderThan, reload };
}
