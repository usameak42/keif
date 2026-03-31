import { useEffect, useState } from "react";
import { API_BASE_URL } from "../constants/api";

export function useHealthCheck() {
  const [backendReady, setBackendReady] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
        clearTimeout(timeout);
        setBackendReady(res.ok);
      } catch {
        setBackendReady(false);
        // Retry after 5s if backend is cold
        setTimeout(async () => {
          try {
            const res = await fetch(`${API_BASE_URL}/health`);
            setBackendReady(res.ok);
          } catch {
            // Still not ready, user will see banner
          }
        }, 5000);
      }
    };
    check();
  }, []);

  return { backendReady };
}
