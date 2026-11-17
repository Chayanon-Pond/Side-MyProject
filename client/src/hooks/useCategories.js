import { useCallback, useEffect, useState } from "react";
import { listCategories } from "../api/categories";
import { getErrorMessage, isAbortError } from "../lib/apiClient";

/** Categories from GET /api/categories, with loading/error state and abort on unmount. */
export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    listCategories({ signal: controller.signal })
      .then((data) => setCategories(data))
      .catch((err) => {
        if (isAbortError(err)) return;
        setCategories([]);
        setError(getErrorMessage(err, "Failed to load categories"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return { categories, loading, error, reload };
}

export default useCategories;
