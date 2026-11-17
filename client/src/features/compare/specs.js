/** Spec sheet metrics, units and which direction wins. */
export const SPEC_METRICS = [
  { key: "power_hp", label: "Power", unit: "hp", better: "high", decimals: 0 },
  { key: "torque_nm", label: "Torque", unit: "Nm", better: "high", decimals: 0 },
  { key: "zero_to_100_s", label: "0–100 km/h", unit: "s", better: "low", decimals: 1 },
  { key: "top_speed_kmh", label: "Top speed", unit: "km/h", better: "high", decimals: 0 },
  { key: "weight_kg", label: "Weight", unit: "kg", better: "low", decimals: 0 },
  { key: "price_usd", label: "Price", unit: "USD", better: "low", decimals: 0, money: true },
];

export const SPEC_TEXT = [
  { key: "engine", label: "Engine" },
  { key: "drivetrain", label: "Drivetrain" },
  { key: "year", label: "Model year" },
  { key: "model", label: "Model" },
];

const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));

export const hasSpecs = (specs) =>
  Boolean(specs) && [...SPEC_METRICS, ...SPEC_TEXT].some(({ key }) => specs[key] !== null && specs[key] !== undefined && specs[key] !== "");

export const formatSpec = (metric, value) => {
  const n = num(value);
  if (n === null || Number.isNaN(n)) return "—";
  if (metric.money) return `$${Math.round(n).toLocaleString("en-US")}`;
  return n.toLocaleString("en-US", { minimumFractionDigits: metric.decimals, maximumFractionDigits: metric.decimals });
};

/** Index of the winner (0|1) for a metric, or null on tie/missing. */
export const winnerOf = (metric, a, b) => {
  const x = num(a);
  const y = num(b);
  if (x === null || y === null || x === y) return null;
  return metric.better === "high" ? (x > y ? 0 : 1) : x < y ? 0 : 1;
};

/** Bar length 0..1 for a value relative to the pair (lower-is-better metrics are inverted so the winner is longer). */
export const barShare = (metric, value, other) => {
  const x = num(value);
  const y = num(other);
  if (x === null) return 0;
  if (y === null) return 0.85;
  const max = Math.max(x, y);
  const min = Math.min(x, y);
  if (metric.better === "high") return x / max;
  return min / x; // lower wins → shorter value gets full bar
};

/** Bar length for a single car against a fixed reference scale (spec sheet card). */
export const SPEC_SCALE = { power_hp: 1000, torque_nm: 1000, zero_to_100_s: 6, top_speed_kmh: 400, weight_kg: 2500, price_usd: 600000 };
