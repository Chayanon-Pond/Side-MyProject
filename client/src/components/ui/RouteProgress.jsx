import { useEffect, useState } from "react";
import { useNavigation } from "react-router-dom";

/** Thin Papaya bar while a route chunk/navigation is pending (only after 120ms, so fast navigations stay quiet). */
export default function RouteProgress() {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!busy) {
      setVisible(false);
      return undefined;
    }
    const t = setTimeout(() => setVisible(true), 120);
    return () => clearTimeout(t);
  }, [busy]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-0.5 overflow-hidden"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 300ms" }}
    >
      <div className="h-full w-1/3 bg-papaya" style={{ animation: visible ? "apex-route 1.1s cubic-bezier(.2,.8,.2,1) infinite" : "none" }} />
      <style>{`@keyframes apex-route{0%{transform:translateX(-100%)}100%{transform:translateX(320%)}}`}</style>
    </div>
  );
}
