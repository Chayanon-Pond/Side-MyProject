import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { X } from "lucide-react";
import { EASE } from "../../lib/motion";

/** Generic confirm dialog (deleting articles, categories, comments). Esc closes, focus starts on Cancel. */
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  itemType = "item",
  title,
  message,
  confirmLabel = "Delete",
  busy = false,
}) => {
  const cancelRef = useRef(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => cancelRef.current?.focus(), 30);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          className="fixed inset-0 z-[85] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
          <m.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            aria-describedby="confirm-modal-desc"
            className="relative w-full max-w-sm rounded-[12px] border border-line bg-surface p-6 text-fg shadow-2xl"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 4 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id="confirm-modal-title" className="font-display text-xl font-semibold">
                {title || `Delete ${itemType}?`}
              </h2>
              <button type="button" onClick={onClose} className="text-muted hover:text-fg" aria-label="Close dialog">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <p id="confirm-modal-desc" className="mt-2 text-sm text-muted">
              {message || `This ${itemType} will be permanently deleted. This can't be undone.`}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button ref={cancelRef} type="button" onClick={onClose} className="btn-apex btn-quiet-apex">
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || working}
                onClick={async () => {
                  setWorking(true);
                  try {
                    await onConfirm();
                  } finally {
                    setWorking(false);
                    onClose();
                  }
                }}
                className="btn-apex btn-danger-apex"
              >
                {busy || working ? "Working…" : confirmLabel}
              </button>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmModal;
