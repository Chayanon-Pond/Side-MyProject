import { useEffect, useState } from "react";
import { listMakes } from "../api/discovery";

// One request per page load, shared by navbar, footer and home rail.
let cache = null;

const load = () => {
  if (!cache) {
    cache = listMakes().catch((err) => {
      cache = null;
      throw err;
    });
  }
  return cache;
};

/** [{make,count}] from GET /api/makes (cached). */
export function useMakes() {
  const [state, setState] = useState({ makes: [], loading: true, error: null });
  useEffect(() => {
    let alive = true;
    load()
      .then((makes) => alive && setState({ makes, loading: false, error: null }))
      .catch((err) => alive && setState({ makes: [], loading: false, error: err?.message || "Failed to load makes" }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
