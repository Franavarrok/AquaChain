import { useEffect, useRef, useState, useCallback } from "react";

interface UsePollingResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => void;
}

/**
 * Hook genérico que ejecuta `fetchFn` inmediatamente y luego cada `intervalMs`.
 * Simula "tiempo real" mediante polling, suficiente para una demo de hackatón
 * sin necesidad de WebSockets.
 */
export function usePolling<T>(fetchFn: () => Promise<T>, intervalMs = 4000): UsePollingResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const fetchOnce = useCallback(async () => {
    try {
      const result = await fetchFnRef.current();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido al obtener datos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOnce();
    const handle = setInterval(fetchOnce, intervalMs);
    return () => clearInterval(handle);
  }, [fetchOnce, intervalMs]);

  return { data, error, loading, refetch: fetchOnce };
}
