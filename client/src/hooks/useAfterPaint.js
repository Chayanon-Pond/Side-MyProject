import { startTransition, useEffect, useState } from "react";

/**
 * False until the frame after `ready` first becomes true has been painted.
 * Lets a page commit and paint its above-the-fold hero (the LCP element) before rendering the
 * heavier below-the-fold sections in a separate task.
 */
export function useAfterPaint(ready = true) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!ready || done) return undefined;
    let timer;
    const frame = requestAnimationFrame(() => {
      // A transition: the deferred sections render time-sliced, not as one long task.
      timer = setTimeout(() => startTransition(() => setDone(true)), 0);
    });
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [ready, done]);
  return done;
}

export default useAfterPaint;
