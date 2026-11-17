import { useId, useRef, useState } from "react";
import { Reorder, useDragControls } from "motion/react";
import { GripVertical, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "../../../lib/toast";
import { uploadImage } from "../../../api/admin";
import { assetUrl } from "../../../lib/assets";
import { getErrorMessage } from "../../../lib/apiClient";
import { withKeys } from "./editorModel";

const MAX_BYTES = 8 * 1024 * 1024;

function Item({ item, onChange, onRemove, index, total, onMove }) {
  const controls = useDragControls();
  const id = useId();
  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      className="flex gap-3 rounded-[6px] border border-line bg-surface p-2"
      whileDrag={{ scale: 1.02, boxShadow: "0 20px 40px -12px rgb(0 0 0 / 0.5)", zIndex: 5 }}
    >
      <button
        type="button"
        onPointerDown={(e) => controls.start(e)}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" && index > 0) {
            e.preventDefault();
            onMove(index, index - 1);
          } else if (e.key === "ArrowDown" && index < total - 1) {
            e.preventDefault();
            onMove(index, index + 1);
          }
        }}
        className="flex w-6 shrink-0 cursor-grab touch-none items-center justify-center text-subtle hover:text-fg active:cursor-grabbing"
        aria-label={`Reorder image ${index + 1} of ${total} (drag, or use arrow keys)`}
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      <img src={assetUrl(item.url)} alt="" className="h-16 w-20 shrink-0 rounded-[2px] object-cover" draggable={false} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <label htmlFor={`${id}-cap`} className="sr-only">
          Caption
        </label>
        <input
          id={`${id}-cap`}
          value={item.caption || ""}
          onChange={(e) => onChange({ ...item, caption: e.target.value })}
          placeholder="Caption"
          className="field-apex !min-h-8 !py-1 text-sm"
        />
        <label htmlFor={`${id}-cred`} className="sr-only">
          Credit
        </label>
        <input
          id={`${id}-cred`}
          value={item.credit || ""}
          onChange={(e) => onChange({ ...item, credit: e.target.value })}
          placeholder="Credit"
          className="field-apex !min-h-8 !py-1 text-xs"
        />
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="self-start p-1 text-subtle hover:text-danger"
        aria-label={`Remove image ${index + 1}`}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </Reorder.Item>
  );
}

/** Upload, caption, credit and drag-to-reorder gallery images. `value` items carry a local `_key`. */
export default function GalleryManager({ value = [], onChange }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(0);

  const onFiles = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    const valid = files.filter((f) => {
      if (!f.type.startsWith("image/")) return false;
      if (f.size > MAX_BYTES) {
        toast.error(`${f.name} is over 8 MB`);
        return false;
      }
      return true;
    });
    if (!valid.length) return;
    setBusy(valid.length);
    const added = [];
    for (const file of valid) {
      try {
        const res = await uploadImage(file);
        added.push({ url: res.url, width: res.width || null, height: res.height || null, caption: "", credit: "" });
      } catch (err) {
        toast.error(getErrorMessage(err, `Couldn't upload ${file.name}`));
      } finally {
        setBusy((n) => n - 1);
      }
    }
    if (added.length) onChange(withKeys([...value, ...added]));
  };

  const move = (from, to) => {
    const next = [...value];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    onChange(next);
  };

  return (
    <div>
      {value.length > 0 && (
        <Reorder.Group axis="y" values={value} onReorder={onChange} className="mb-3 space-y-2">
          {value.map((item, i) => (
            <Item
              key={item._key}
              item={item}
              index={i}
              total={value.length}
              onMove={move}
              onChange={(next) => onChange(value.map((v) => (v._key === item._key ? next : v)))}
              onRemove={() => onChange(value.filter((v) => v._key !== item._key))}
            />
          ))}
        </Reorder.Group>
      )}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy > 0}
        className="flex w-full items-center justify-center gap-2 rounded-[6px] border border-dashed border-line-strong px-3 py-4 text-sm text-muted transition-colors hover:border-muted hover:text-fg disabled:opacity-60"
      >
        {busy > 0 ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Uploading {busy}…
          </>
        ) : (
          <>
            <ImagePlus className="h-4 w-4" aria-hidden="true" /> Add gallery images
          </>
        )}
      </button>
      <label htmlFor="gallery-files" className="sr-only">
        Gallery image files
      </label>
      <input id="gallery-files" ref={fileRef} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} onChange={onFiles} />
    </div>
  );
}
