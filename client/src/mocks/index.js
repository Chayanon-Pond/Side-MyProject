/* Loaded only when `import.meta.env.DEV && VITE_USE_MOCKS === "true"` (see main.jsx). */
import { api } from "../lib/apiClient";
import { mockAdapter, mockSession } from "./adapter";

api.defaults.adapter = mockAdapter;

// DEV convenience for screenshots/QA: ?mockLogin=admin|reader signs in a demo account,
// ?theme=apex-light|apex-dark forces a theme, ?nointro skips the intro loader.
const params = new URLSearchParams(window.location.search);
const who = params.get("mockLogin");
if (who) {
  const { token, user } = mockSession(who === "admin" ? "admin@example.com" : "some@gmail.com");
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}
const theme = params.get("theme");
if (theme === "apex-light" || theme === "apex-dark") {
  localStorage.setItem("apex-theme", theme);
  document.documentElement.setAttribute("data-theme", theme);
}
if (params.has("nointro")) sessionStorage.setItem("apex-intro-seen", "1");

console.info("%c[APEX] mock API enabled", "color:#ff6a13;font-weight:600");
