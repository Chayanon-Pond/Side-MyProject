import { useEffect, useState } from "react";

/** Returns `value` after it has stopped changing for `delay` ms. Timer is cleared on unmount. */
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default useDebouncedValue;
