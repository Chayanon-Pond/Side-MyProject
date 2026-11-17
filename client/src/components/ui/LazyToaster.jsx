import { useEffect } from "react";
import { Toaster } from "sonner";
import { markToasterReady } from "../../lib/toast";

/** sonner's Toaster (its own chunk). Signals readiness after mount so queued toasts are shown. */
export default function LazyToaster({ theme }) {
  useEffect(() => {
    // Toaster subscribes in its own effect, which runs before this parent effect.
    markToasterReady();
  }, []);
  return (
    <Toaster
      theme={theme}
      position="bottom-right"
      closeButton
      toastOptions={{ classNames: { toast: "font-sans", description: "text-muted" } }}
    />
  );
}
