import { useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Blockquote from "@tiptap/extension-blockquote";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import Placeholder from "@tiptap/extension-placeholder";
import { toast } from "../../../lib/toast";
import {
  AlignCenter,
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  MoveHorizontal,
  PanelLeft,
  PanelRight,
  Quote,
  Redo2,
  TextQuote,
  Undo2,
  Unlink,
  Youtube as YoutubeIcon,
  Maximize2,
} from "lucide-react";
import { uploadImage } from "../../../api/admin";
import { getErrorMessage } from "../../../lib/apiClient";

/** `class` attribute passthrough, limited to the sanitizer allow-list (align-*, pull-quote). */
const classAttr = (allowed) => ({
  class: {
    default: null,
    parseHTML: (el) => {
      const cls = (el.getAttribute("class") || "").split(/\s+/).filter((c) => allowed.test(c));
      return cls.length ? cls.join(" ") : null;
    },
    renderHTML: (attrs) => (attrs.class ? { class: attrs.class } : {}),
  },
});

const ApexBlockquote = Blockquote.extend({
  addAttributes() {
    return { ...this.parent?.(), ...classAttr(/^pull-quote$/) };
  },
});

const ApexImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...classAttr(/^align-(wide|full|left|right|center)$/),
      loading: { default: "lazy", renderHTML: () => ({ loading: "lazy" }) },
    };
  },
});

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function Btn({ onClick, active, disabled, label, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] transition-colors duration-150 disabled:opacity-35 ${
        active ? "bg-papaya text-papaya-contrast" : "text-muted hover:bg-surface-2 hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-1 h-5 w-px shrink-0 bg-line" aria-hidden="true" />;

/**
 * Tiptap v3 editor. Emits sanitizer-friendly HTML through onChange.
 * Loaded lazily by ArticleEditorPage so Tiptap/ProseMirror is its own chunk.
 */
export default function RichEditor({ initialContent = "", onChange, ariaLabelledBy }) {
  const fileRef = useRef(null);
  const [popover, setPopover] = useState(null); // 'link' | 'youtube' | null
  const [popValue, setPopValue] = useState("");
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        blockquote: false,
        code: false,
        codeBlock: false,
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: null } },
      }),
      ApexBlockquote,
      ApexImage.configure({ allowBase64: false }),
      Youtube.configure({ nocookie: false, width: 640, height: 360, modestBranding: true }),
      Placeholder.configure({ placeholder: "Start the story. Lead with what you felt, then prove it." }),
    ],
    content: initialContent,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: "tiptap apex-prose max-w-none px-1 py-6",
        ...(ariaLabelledBy ? { "aria-labelledby": ariaLabelledBy } : { "aria-label": "Article body" }),
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor: ed }) => onChange?.(ed.isEmpty ? "" : ed.getHTML()),
  });

  if (!editor) return <div className="min-h-[420px]" />;

  const openPop = (kind) => {
    setPopValue(kind === "link" ? editor.getAttributes("link").href || "" : "");
    setPopover((p) => (p === kind ? null : kind));
  };

  const applyPop = (e) => {
    e.preventDefault();
    const value = popValue.trim();
    if (popover === "link") {
      if (!value) editor.chain().focus().extendMarkRange("link").unsetLink().run();
      else {
        const href = /^(https?:|mailto:|\/)/i.test(value) ? value : `https://${value}`;
        editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
      }
    } else if (popover === "youtube" && value) {
      const ok = editor.chain().focus().setYoutubeVideo({ src: value }).run();
      if (!ok) {
        toast.error("That doesn't look like a YouTube link");
        return;
      }
    }
    setPopover(null);
  };

  const togglePullQuote = () => {
    const isPull = editor.isActive("blockquote", { class: "pull-quote" });
    if (isPull) editor.chain().focus().toggleBlockquote().run();
    else if (editor.isActive("blockquote")) editor.chain().focus().updateAttributes("blockquote", { class: "pull-quote" }).run();
    else editor.chain().focus().toggleBlockquote().updateAttributes("blockquote", { class: "pull-quote" }).run();
  };

  const toggleQuote = () => {
    if (editor.isActive("blockquote", { class: "pull-quote" }))
      editor.chain().focus().updateAttributes("blockquote", { class: null }).run();
    else editor.chain().focus().toggleBlockquote().run();
  };

  const onPickImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    if (file.size > MAX_IMAGE_BYTES) return toast.error("Images must be under 8 MB");
    setUploading(true);
    try {
      const res = await uploadImage(file);
      editor
        .chain()
        .focus()
        .setImage({ src: res.url, alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "), width: res.width, height: res.height })
        .run();
    } catch (err) {
      toast.error(getErrorMessage(err, "Image upload failed"));
    } finally {
      setUploading(false);
    }
  };

  const imageActive = editor.isActive("image");
  const imgClass = editor.getAttributes("image").class || "";
  const setAlign = (cls) =>
    editor.chain().focus().updateAttributes("image", { class: imgClass === cls ? null : cls }).run();

  return (
    <div className="rounded-[6px] border border-line bg-surface">
      <div
        role="toolbar"
        aria-label="Formatting"
        className="sticky top-16 z-10 flex flex-wrap items-center gap-0.5 rounded-t-[6px] border-b border-line bg-surface/95 px-2 py-1.5 backdrop-blur"
      >
        <Btn label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-4 w-4" aria-hidden="true" />
        </Btn>
        <Btn label="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="h-4 w-4" aria-hidden="true" />
        </Btn>
        <Sep />
        <Btn label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" aria-hidden="true" />
        </Btn>
        <Btn label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" aria-hidden="true" />
        </Btn>
        <Btn label="Link" active={editor.isActive("link") || popover === "link"} onClick={() => openPop("link")}>
          <Link2 className="h-4 w-4" aria-hidden="true" />
        </Btn>
        {editor.isActive("link") && (
          <Btn label="Remove link" onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}>
            <Unlink className="h-4 w-4" aria-hidden="true" />
          </Btn>
        )}
        <Sep />
        <Btn label="Bulleted list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" aria-hidden="true" />
        </Btn>
        <Btn label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" aria-hidden="true" />
        </Btn>
        <Btn label="Quote" active={editor.isActive("blockquote") && !editor.isActive("blockquote", { class: "pull-quote" })} onClick={toggleQuote}>
          <Quote className="h-4 w-4" aria-hidden="true" />
        </Btn>
        <Btn label="Pull quote" active={editor.isActive("blockquote", { class: "pull-quote" })} onClick={togglePullQuote}>
          <TextQuote className="h-4 w-4" aria-hidden="true" />
        </Btn>
        <Sep />
        <Btn label={uploading ? "Uploading image" : "Insert image"} disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
        </Btn>
        <Btn label="Embed YouTube video" active={popover === "youtube"} onClick={() => openPop("youtube")}>
          <YoutubeIcon className="h-4 w-4" aria-hidden="true" />
        </Btn>
        {imageActive && (
          <>
            <Sep />
            <span className="meta px-1">Image</span>
            <Btn label="Float left" active={imgClass === "align-left"} onClick={() => setAlign("align-left")}>
              <PanelLeft className="h-4 w-4" aria-hidden="true" />
            </Btn>
            <Btn label="Centered" active={imgClass === "align-center"} onClick={() => setAlign("align-center")}>
              <AlignCenter className="h-4 w-4" aria-hidden="true" />
            </Btn>
            <Btn label="Float right" active={imgClass === "align-right"} onClick={() => setAlign("align-right")}>
              <PanelRight className="h-4 w-4" aria-hidden="true" />
            </Btn>
            <Btn label="Wide" active={imgClass === "align-wide"} onClick={() => setAlign("align-wide")}>
              <MoveHorizontal className="h-4 w-4" aria-hidden="true" />
            </Btn>
            <Btn label="Full bleed" active={imgClass === "align-full"} onClick={() => setAlign("align-full")}>
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
            </Btn>
          </>
        )}
        <span className="ml-auto flex">
          <Btn label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
            <Undo2 className="h-4 w-4" aria-hidden="true" />
          </Btn>
          <Btn label="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
            <Redo2 className="h-4 w-4" aria-hidden="true" />
          </Btn>
        </span>

        {popover && (
          <form onSubmit={applyPop} className="flex w-full items-center gap-2 border-t border-line px-1 pb-1 pt-2">
            <label htmlFor="rte-pop" className="meta shrink-0">
              {popover === "link" ? "Link URL" : "YouTube URL"}
            </label>
            <input
              id="rte-pop"
              autoFocus
              value={popValue}
              onChange={(e) => setPopValue(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setPopover(null)}
              placeholder={popover === "link" ? "https://… (empty to remove)" : "https://youtube.com/watch?v=…"}
              className="field-apex !min-h-9 flex-1 !py-1.5 text-sm"
            />
            <button type="submit" className="btn-apex btn-primary-apex !min-h-9 !px-3">
              Apply
            </button>
            <button type="button" onClick={() => setPopover(null)} className="btn-apex btn-quiet-apex !min-h-9 !px-3">
              Cancel
            </button>
          </form>
        )}

        {imageActive && (
          <div className="flex w-full items-center gap-2 border-t border-line px-1 pb-1 pt-2">
            <label htmlFor="rte-alt" className="meta shrink-0">
              Alt text
            </label>
            <input
              id="rte-alt"
              value={editor.getAttributes("image").alt || ""}
              onChange={(e) => editor.chain().updateAttributes("image", { alt: e.target.value }).run()}
              placeholder="Describe the image"
              className="field-apex !min-h-9 flex-1 !py-1.5 text-sm"
            />
          </div>
        )}
      </div>

      <label htmlFor="rte-file" className="sr-only">
        Upload image into article
      </label>
      <input id="rte-file" ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={onPickImage} />

      <div className="px-4 md:px-8">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
