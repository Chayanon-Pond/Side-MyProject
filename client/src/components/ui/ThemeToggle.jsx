import { AnimatePresence, m } from "motion/react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../lib/theme";

/** Sun/moon icon button that swaps with a short rotate+fade. */
export default function ThemeToggle({ className = "", withLabel = false }) {
  const { isDark, toggle } = useTheme();
  const visible = isDark ? "Dark" : "Light";
  const next = isDark ? "light" : "dark";
  // When a text label is shown, the accessible name must start with it (WCAG 2.5.3 label-in-name).
  const label = withLabel ? `${visible} theme, switch to ${next}` : `Switch to ${next} theme`;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-[2px] px-2.5 transition-colors duration-150 hover:bg-current/10 ${className}`}
    >
      <span className="relative block h-[18px] w-[18px]" aria-hidden="true">
        <AnimatePresence initial={false} mode="popLayout">
          <m.span
            key={isDark ? "moon" : "sun"}
            className="absolute inset-0"
            initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {isDark ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
          </m.span>
        </AnimatePresence>
      </span>
      {withLabel && <span className="text-sm">{visible}</span>}
    </button>
  );
}
