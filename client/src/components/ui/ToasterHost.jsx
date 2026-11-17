import { lazy, Suspense, useEffect, useState } from "react";
import { onToasterMountRequest } from "../../lib/toast";

const LazyToaster = lazy(() => import("./LazyToaster"));

/** Mounts sonner's <Toaster/> on the first toast, or when the browser is idle after load. */
export default function ToasterHost({ theme }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    onToasterMountRequest(() => setMounted(true));
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 2000));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const handle = idle(() => setMounted(true), { timeout: 4000 });
    return () => cancel(handle);
  }, []);

  if (!mounted) return null;
  return (
    <Suspense fallback={null}>
      <LazyToaster theme={theme} />
    </Suspense>
  );
}
