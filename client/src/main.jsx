import { StrictMode, startTransition } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./app/App.jsx";
import { releaseBootHero } from "./lib/bootHero";

async function boot() {
  // DEV-only mock API. `import.meta.env.DEV` is statically false in production builds,
  // so Rollup drops this branch and the mocks never reach the production bundle.
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === "true") {
    await import("./mocks/index.js");
  }
  const root = createRoot(document.getElementById("root"));
  // Concurrent (time-sliced) first render: React yields to the browser every few ms instead of
  // blocking the main thread for the whole tree, which keeps input responsive while booting (TBT).
  startTransition(() => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  });
}

boot();
// Safety net: the early cover layer from index.html never outlives a slow or failed hero.
setTimeout(releaseBootHero, 8000);
