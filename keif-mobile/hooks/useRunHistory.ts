import * as SQLite from "expo-sqlite/legacy";
import type { SQLTransaction, SQLResultSet, SQLError } from "expo-sqlite/legacy";
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

const db = SQLite.openDatabase("keif-runs.db");

export function useRunHistory() {
  const [runs, setRuns] = useState<SavedRun[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    db.transaction((tx: SQLTransaction) => {
      tx.executeSql(
        "SELECT * FROM saved_runs WHERE archived = 0 ORDER BY created_at DESC",
        [],
        (_tx: SQLTransaction, result: SQLResultSet) => {
          const rows = result.rows._array as SavedRun[];
          setRuns(rows);
          setCount(rows.length);
          setError(null);
        },
        (_tx: SQLTransaction, err: SQLError) => {
          setError(`Failed to load runs: ${err.message}`);
          return true;
        },
      );
    });
  }, []);

  // Initialize database: create table then load initial data
  useEffect(() => {
    db.transaction(
      (tx: SQLTransaction) => {
        tx.executeSql(CREATE_TABLE_SQL, [],
          () => {},
          () => true,
        );
      },
      (err: SQLError) => {
        setError(`Database initialization failed: ${err.message}`);
        setLoading(false);
      },
      () => {
        db.transaction((tx: SQLTransaction) => {
          tx.executeSql(
            "SELECT * FROM saved_runs WHERE archived = 0 ORDER BY created_at DESC",
            [],
            (_tx: SQLTransaction, result: SQLResultSet) => {
              const rows = result.rows._array as SavedRun[];
              setRuns(rows);
              setCount(rows.length);
              setLoading(false);
            },
            (_tx: SQLTransaction, err: SQLError) => {
              setError(`Failed to load runs: ${err.message}`);
              setLoading(false);
              return true;
            },
          );
        });
      },
    );
  }, []);

  const save = useCallback((
    name: string,
    input: SimulationInput,
    output: SimulationOutput,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      db.transaction((tx: SQLTransaction) => {
        tx.executeSql(
          "INSERT INTO saved_runs (name, method, created_at, input_json, output_json, archived) VALUES (?, ?, ?, ?, ?, 0)",
          [name, input.method, new Date().toISOString(), JSON.stringify(input), JSON.stringify(output)],
          () => { reload(); resolve(); },
          (_tx: SQLTransaction, err: SQLError) => {
            setError(`Failed to save run: ${err.message}`);
            reject(err);
            return true;
          },
        );
      });
    });
  }, [reload]);

  const deleteById = useCallback((id: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      db.transaction((tx: SQLTransaction) => {
        tx.executeSql(
          "DELETE FROM saved_runs WHERE id = ?",
          [id],
          () => { reload(); resolve(); },
          (_tx: SQLTransaction, err: SQLError) => {
            setError(`Failed to delete run: ${err.message}`);
            reject(err);
            return true;
          },
        );
      });
    });
  }, [reload]);

  const archiveOlderThan = useCallback((days: number): Promise<void> => {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    return new Promise((resolve, reject) => {
      db.transaction((tx: SQLTransaction) => {
        tx.executeSql(
          "UPDATE saved_runs SET archived = 1 WHERE created_at < ? AND archived = 0",
          [cutoff],
          () => { reload(); resolve(); },
          (_tx: SQLTransaction, err: SQLError) => {
            setError(`Failed to archive runs: ${err.message}`);
            reject(err);
            return true;
          },
        );
      });
    });
  }, [reload]);

  return { runs, count, loading, error, save, deleteById, archiveOlderThan, reload };
}
