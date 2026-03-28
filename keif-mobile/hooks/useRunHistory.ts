import * as SQLite from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";
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

export function useRunHistory() {
  const dbRef = useRef<SQLite.SQLiteDatabase | null>(null);
  const initializedRef = useRef(false);
  const [runs, setRuns] = useState<SavedRun[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize database
  useEffect(() => {
    (async () => {
      try {
        const db = await SQLite.openDatabaseAsync("keif-runs.db");
        await db.execAsync(CREATE_TABLE_SQL);
        dbRef.current = db;
        initializedRef.current = true;
        // Load initial data
        const rows = await db.getAllAsync<SavedRun>(
          "SELECT * FROM saved_runs WHERE archived = 0 ORDER BY created_at DESC"
        );
        setRuns(rows);
        setCount(rows.length);
        setLoading(false);
      } catch (e) {
        setError(`Database initialization failed: ${e instanceof Error ? e.message : String(e)}`);
        setLoading(false);
      }
    })();
  }, []);

  const reload = useCallback(async () => {
    if (!dbRef.current) return;
    try {
      const rows = await dbRef.current.getAllAsync<SavedRun>(
        "SELECT * FROM saved_runs WHERE archived = 0 ORDER BY created_at DESC"
      );
      setRuns(rows);
      setCount(rows.length);
      setError(null);
    } catch (e) {
      setError(`Failed to load runs: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);

  const save = useCallback(async (
    name: string,
    input: SimulationInput,
    output: SimulationOutput,
  ): Promise<number> => {
    if (!dbRef.current) throw new Error("Database not initialized");
    try {
      const result = await dbRef.current.runAsync(
        "INSERT INTO saved_runs (name, method, created_at, input_json, output_json, archived) VALUES (?, ?, ?, ?, ?, 0)",
        name,
        input.method,
        new Date().toISOString(),
        JSON.stringify(input),
        JSON.stringify(output),
      );
      await reload();
      return result.lastInsertRowId;
    } catch (e) {
      setError(`Failed to save run: ${e instanceof Error ? e.message : String(e)}`);
      return -1;
    }
  }, [reload]);

  const deleteById = useCallback(async (id: number): Promise<void> => {
    if (!dbRef.current) return;
    try {
      await dbRef.current.runAsync("DELETE FROM saved_runs WHERE id = ?", id);
      await reload();
    } catch (e) {
      setError(`Failed to delete run: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [reload]);

  const archiveOlderThan = useCallback(async (days: number): Promise<void> => {
    if (!dbRef.current) return;
    try {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      await dbRef.current.runAsync(
        "UPDATE saved_runs SET archived = 1 WHERE created_at < ? AND archived = 0",
        cutoff,
      );
      await reload();
    } catch (e) {
      setError(`Failed to archive runs: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [reload]);

  return { runs, count, loading, error, save, deleteById, archiveOlderThan, reload };
}
