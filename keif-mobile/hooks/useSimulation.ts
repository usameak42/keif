import { useState, useCallback } from "react";
import { API_BASE_URL } from "../constants/api";
import type { SimulationInput, SimulationOutput } from "../types/simulation";

export function useSimulation() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const simulate = useCallback(async (input: SimulationInput) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (res.status === 422) {
        const body = await res.json();
        // FastAPI returns { detail: [...] } for validation errors
        const detail = body.detail;
        if (Array.isArray(detail)) {
          setError(detail.map((d: any) => d.msg ?? d).join("; "));
        } else {
          setError(typeof detail === "string" ? detail : "Validation error");
        }
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SimulationOutput = await res.json();
      setResult(data);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);
  const clearResult = useCallback(() => setResult(null), []);

  return { simulate, loading, result, error, clearError, clearResult };
}
