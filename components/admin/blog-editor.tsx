"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveBlogPost,
  setBlogPostStatus,
  discardBlogOverride,
  type BlogEditorInput,
} from "@/lib/admin/blog-actions";
import { ActionModal, ModalButton } from "@/components/admin/action-modal";

/**
 * The whole blog editor, built for Ben rather than for a CMS audience:
 * every field is a plain label in plain words, the words themselves are
 * one big writing box, and images arrive by dropping them on the page.
 *
 * Slug rule: locked once a post exists. Renaming a live URL breaks every
 * link already shared and there is deliberately no button for it.
 */

const CATEGORY_OPTIONS: Array<[string, string]> = [
  ["first-race", "First race"],
  ["training", "Training"],
  ["technique", "Technique"],
  ["nutrition", "Nutrition"],
  ["race-day", "Race day"],
  ["recovery", "Recovery"],
];

export type BlogEditorInitial = BlogEditorInput & {
  isNew: boolean;
  hasOverride: boolean;
  isFilePost: boolean;
};

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function BlogEditor({ initial }: { initial: BlogEditorInitial }) {
  const router = useRouter();
  const [form, setForm] = useState<BlogEditorInput>(initial);
  const [slugTouched, setSlugTouched] = useState(!initial.isNew);
  const [tagsText, setTagsText] = useState(initial.tags.join(", "));
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [dragOver, setDragOver] = useState<"hero" | "body" | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const set = <K extends keyof BlogEditorInput>(
    key: K,
    value: BlogEditorInput[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  async function upload(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/blog/upload", { method: "POST", body: fd });
    const d = (await res.json()) as { ok: boolean; url?: string; error?: string };
    if (!d.ok || !d.url) {
      setError(d.error ?? "The image didn't upload.");
      return null;
    }
    return d.url;
  }

  async function onDropHero(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy("image");
    setError(null);
    const url = await upload(file);
    if (url) set("heroImage", url);
    setBusy(null);
  }

  async function onDropBody(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy("image");
    setError(null);
    const url = await upload(file);
    if (url) {
      const md = `\n\n![${file.name.replace(/\.[a-z]+$/i, "")}](${url})\n\n`;
      const el = bodyRef.current;
      const at = el ? el.selectionStart : form.content.length;
      set("content", form.content.slice(0, at) + md + form.content.slice(at));
    }
    setBusy(null);
  }

  async function save(status: BlogEditorInput["status"]) {
    setBusy(status);
    setError(null);
    setMessage(null);
    const payload: BlogEditorInput = {
      ...form,
      status,
      tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean),
    };
    const res = await saveBlogPost(payload);
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setForm((f) => ({ ...f, status }));
    setMessage(
      status === "published"
        ? "Saved and live."
        : status === "hidden"
          ? "Saved and hidden from the site."
          : "Draft saved. Nothing changes on the site until you publish.",
    );
    if (initial.isNew) {
      router.replace(`/admin/blog/edit/${payload.slug}`);
    }
    router.refresh();
  }

  async function toggleHidden() {
    const next = form.status === "hidden" ? "published" : "hidden";
    setBusy("visibility");
    setError(null);
    const res = await setBlogPostStatus(form.slug, next);
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setForm((f) => ({ ...f, status: next }));
    setMessage(next === "hidden" ? "Hidden from the site." : "Back on the site.");
    router.refresh();
  }

  async function discard() {
    setBusy("discard");
    setError(null);
    const res = await discardBlogOverride(form.slug);
    setBusy(null);
    setConfirmDiscard(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push("/admin/blog");
    router.refresh();
  }

  const inputCls =
    "h-12 w-full rounded-lg border border-suth-border bg-suth-base px-3 text-[16px] text-suth-text outline-none focus:border-suth-accent";
  const labelCls =
    "block font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary";

  return (
    <div className="space-y-6">
      {/* Status strip: what state this post is in, in words. */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-suth-border bg-suth-elevated p-4">
        <span
          className={`rounded-pill px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${
            form.status === "published"
              ? "bg-emerald-500/15 text-emerald-300"
              : form.status === "hidden"
                ? "bg-suth-danger/15 text-suth-danger"
                : "bg-amber-500/15 text-amber-300"
          }`}
        >
          {form.status === "published"
            ? "Live on the site"
            : form.status === "hidden"
              ? "Hidden from the site"
              : "Draft, not on the site"}
        </span>
        {initial.isFilePost && !initial.hasOverride ? (
          <span className="text-xs text-suth-text-tertiary">
            Built-in post. Your first save makes an editable copy that takes
            over from it.
          </span>
        ) : null}
        {message ? (
          <span aria-live="polite" className="text-sm text-suth-accent">
            {message}
          </span>
        ) : null}
        {error ? (
          <span aria-live="polite" className="text-sm text-suth-danger">
            {error}
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="be-title" className={labelCls}>
            Title
          </label>
          <input
            id="be-title"
            value={form.title}
            onChange={(e) => {
              set("title", e.target.value);
              if (!slugTouched) set("slug", slugify(e.target.value));
            }}
            className={`${inputCls} mt-2 text-lg font-semibold`}
            placeholder="What the post is called"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="be-slug" className={labelCls}>
            Web address
          </label>
          <div className="mt-2 flex items-center gap-2">
            <span className="shrink-0 text-sm text-suth-text-tertiary">
              suthperformance.com/blog/
            </span>
            <input
              id="be-slug"
              value={form.slug}
              disabled={!initial.isNew}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", slugify(e.target.value));
              }}
              className={`${inputCls} disabled:opacity-60`}
            />
          </div>
          {!initial.isNew ? (
            <p className="mt-1 text-xs text-suth-text-tertiary">
              Locked once a post exists, so links people already have keep
              working.
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="be-category" className={labelCls}>
            Category
          </label>
          <select
            id="be-category"
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            className={`${inputCls} mt-2`}
          >
            {CATEGORY_OPTIONS.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="be-date" className={labelCls}>
            Publish date
          </label>
          <input
            id="be-date"
            type="date"
            value={form.publishedAt}
            onChange={(e) => set("publishedAt", e.target.value)}
            className={`${inputCls} mt-2`}
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="be-excerpt" className={labelCls}>
            One-line summary, shown on the blog page
          </label>
          <textarea
            id="be-excerpt"
            value={form.excerpt}
            onChange={(e) => set("excerpt", e.target.value)}
            rows={2}
            className="mt-2 w-full rounded-lg border border-suth-border bg-suth-base px-3 py-2.5 text-[16px] text-suth-text outline-none focus:border-suth-accent"
          />
        </div>

        <div>
          <label htmlFor="be-tags" className={labelCls}>
            Tags, separated by commas
          </label>
          <input
            id="be-tags"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            className={`${inputCls} mt-2`}
            placeholder="sled push, technique"
          />
        </div>

        <div className="flex items-end pb-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-suth-text">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => set("featured", e.target.checked)}
              className="size-4 accent-[var(--color-suth-accent,#B4F03C)]"
            />
            Feature this at the top of the blog page
          </label>
        </div>
      </div>

      {/* Hero image: current picture plus a drop zone. */}
      <div>
        <span className={labelCls}>Main picture</span>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver("hero");
          }}
          onDragLeave={() => setDragOver(null)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(null);
            void onDropHero(e.dataTransfer.files);
          }}
          className={`mt-2 flex flex-wrap items-center gap-4 rounded-xl border-2 border-dashed p-4 transition-colors ${
            dragOver === "hero"
              ? "border-suth-accent bg-suth-accent/5"
              : "border-suth-border"
          }`}
        >
          {form.heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.heroImage}
              alt={form.heroAlt || "Post image"}
              className="h-24 w-40 rounded-lg object-cover"
            />
          ) : null}
          <div className="min-w-48 flex-1">
            <p className="text-sm text-suth-text-secondary">
              Drop a photo here{busy === "image" ? " — uploading…" : ""}, or
            </p>
            <label className="mt-1 inline-block cursor-pointer text-sm text-suth-accent underline underline-offset-4">
              choose one from this device
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void onDropHero(e.target.files)}
              />
            </label>
          </div>
          <div className="w-full md:w-72">
            <label htmlFor="be-heroalt" className={labelCls}>
              What the picture shows
            </label>
            <input
              id="be-heroalt"
              value={form.heroAlt}
              onChange={(e) => set("heroAlt", e.target.value)}
              className={`${inputCls} mt-2`}
              placeholder="An athlete pushing a sled"
            />
          </div>
        </div>
      </div>

      {/* The words. Drop an image anywhere in here to insert it. */}
      <div>
        <label htmlFor="be-content" className={labelCls}>
          The post. Drop an image into the box to add it where the cursor is.
        </label>
        <textarea
          id="be-content"
          ref={bodyRef}
          value={form.content}
          onChange={(e) => set("content", e.target.value)}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("Files")) {
              e.preventDefault();
              setDragOver("body");
            }
          }}
          onDragLeave={() => setDragOver(null)}
          onDrop={(e) => {
            if (e.dataTransfer.files.length) {
              e.preventDefault();
              setDragOver(null);
              void onDropBody(e.dataTransfer.files);
            }
          }}
          rows={26}
          className={`mt-2 w-full rounded-xl border bg-suth-base px-4 py-3 font-mono text-[14px] leading-relaxed text-suth-text outline-none transition-colors focus:border-suth-accent ${
            dragOver === "body" ? "border-suth-accent" : "border-suth-border"
          }`}
          placeholder={
            "Write in plain text.\n\n## A heading looks like this\n\nParagraphs are just paragraphs. **Bold** and *italics* work too."
          }
        />
      </div>

      {/* Actions: full-width and thumbable on a phone. */}
      <div className="sticky bottom-0 -mx-1 flex flex-col gap-2 border-t border-suth-border bg-suth-base/95 px-1 py-4 backdrop-blur md:flex-row md:items-center">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void save("published")}
          className="inline-flex h-12 items-center justify-center rounded-pill bg-suth-accent px-6 text-sm font-semibold text-[#0A0A0A] hover:bg-suth-accent-hover disabled:opacity-50"
        >
          {busy === "published"
            ? "Publishing…"
            : form.status === "published"
              ? "Save changes"
              : "Publish to the site"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void save("draft")}
          className="inline-flex h-12 items-center justify-center rounded-pill border border-suth-border px-6 text-sm text-suth-text hover:border-suth-border-strong disabled:opacity-50"
        >
          {busy === "draft" ? "Saving…" : "Save as draft"}
        </button>
        {!initial.isNew ? (
          <a
            href={`/admin/blog/preview/${form.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 items-center justify-center rounded-pill border border-suth-border px-6 text-sm text-suth-text hover:border-suth-border-strong"
          >
            Preview ↗
          </a>
        ) : null}
        <div className="flex-1" />
        {!initial.isNew ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void toggleHidden()}
            className="inline-flex h-12 items-center justify-center rounded-pill border border-suth-border px-5 text-sm text-suth-text-secondary hover:border-suth-border-strong hover:text-suth-text disabled:opacity-50"
          >
            {busy === "visibility"
              ? "Working…"
              : form.status === "hidden"
                ? "Put back on the site"
                : "Hide from the site"}
          </button>
        ) : null}
        {initial.hasOverride ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => setConfirmDiscard(true)}
            className="inline-flex h-12 items-center justify-center rounded-pill px-4 text-sm text-suth-danger hover:underline disabled:opacity-50"
          >
            {initial.isFilePost ? "Discard my edits" : "Delete this post"}
          </button>
        ) : null}
      </div>

      <ActionModal
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        eyebrow="Blog"
        title={initial.isFilePost ? "Discard your edits?" : "Delete this post?"}
        tone="danger"
        footer={
          <>
            <ModalButton onClick={() => setConfirmDiscard(false)}>
              Keep it
            </ModalButton>
            <ModalButton variant="danger" onClick={() => void discard()}>
              {busy === "discard"
                ? "Working…"
                : initial.isFilePost
                  ? "Discard edits"
                  : "Delete post"}
            </ModalButton>
          </>
        }
      >
        <p className="text-sm text-suth-text-secondary">
          {initial.isFilePost
            ? "The post goes back to its original built-in version. Your edited words are gone for good."
            : "This post only exists here, so deleting it removes it completely. There is no undo."}
        </p>
      </ActionModal>
    </div>
  );
}
