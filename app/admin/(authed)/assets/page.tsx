import { promises as fs } from "node:fs";
import path from "node:path";
import { PageHeader, Card, NoticeCard } from "@/components/admin/ui";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata = { title: "Assets" };

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]);
const CAP = 60;

type Asset = { name: string; url: string };

/** Walk public/media/images and return image files served at /media/... */
async function readSiteMedia(): Promise<Asset[]> {
  const root = path.join(process.cwd(), "public", "media", "images");
  const out: Asset[] = [];

  async function walk(dir: string): Promise<void> {
    if (out.length >= CAP) return;
    let entries: import("node:fs").Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return; // Directory missing or unreadable — treat as empty.
    }
    for (const entry of entries) {
      if (out.length >= CAP) return;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (IMAGE_EXT.has(path.extname(entry.name).toLowerCase())) {
        // public/… is served from the web root, so drop the public prefix.
        const rel = path.relative(path.join(process.cwd(), "public"), full);
        out.push({ name: entry.name, url: `/${rel.split(path.sep).join("/")}` });
      }
    }
  }

  await walk(root);
  return out.slice(0, CAP);
}

/** List the blog-images storage bucket, newest first, as public URLs. */
async function readUploadedImages(): Promise<Asset[] | null> {
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb.storage.from("blog-images").list("", {
      limit: CAP,
      sortBy: { column: "created_at", order: "desc" },
    });
    // A missing bucket (never uploaded to yet) is not an error to surface.
    if (error) {
      if (/bucket/i.test(error.message)) return [];
      return null;
    }
    return (data ?? [])
      .filter((f) => f.id !== null) // folders come back with a null id.
      .map((f) => {
        const { data: pub } = sb.storage.from("blog-images").getPublicUrl(f.name);
        return { name: f.name, url: pub.publicUrl };
      });
  } catch {
    return null;
  }
}

function Grid({ assets }: { assets: Asset[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {assets.map((a) => (
        <div
          key={a.url}
          className="overflow-hidden rounded-lg border border-suth-border-subtle bg-suth-elevated"
        >
          <div className="aspect-square w-full bg-suth-base">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={a.url}
              alt={a.name}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex items-center justify-between gap-2 p-3">
            <span
              className="truncate text-xs text-suth-text-secondary"
              title={a.name}
            >
              {a.name}
            </span>
            <a
              href={a.url}
              download
              className="shrink-0 text-xs text-suth-accent underline underline-offset-4"
            >
              Download
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Media library. Two real sources: the committed marketing media under
 * public/media (served at /media/…), and the blog-image uploads in Supabase
 * Storage. Each list is capped at 60 — this is a browse, not an archive.
 */
export default async function AdminAssetsPage() {
  const [siteMedia, uploaded] = await Promise.all([
    readSiteMedia(),
    readUploadedImages(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Assets"
        description="The media library. Committed marketing images and the photos uploaded from the blog editor, each with a download link."
      />

      <section className="mb-10">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
          Site media
        </h2>
        {siteMedia.length === 0 ? (
          <Card>
            <p className="text-sm text-suth-text-secondary">
              No committed media found under public/media/images.
            </p>
          </Card>
        ) : (
          <>
            <Grid assets={siteMedia} />
            <p className="mt-3 text-xs text-suth-text-tertiary">
              Showing up to {CAP}. These ship with the site under
              public/media/images.
            </p>
          </>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
          Uploaded images
        </h2>
        {uploaded === null ? (
          <NoticeCard
            title="Storage unavailable"
            body="Couldn't reach Supabase Storage just now. Refresh in a moment."
          />
        ) : uploaded.length === 0 ? (
          <Card>
            <p className="text-sm text-suth-text-secondary">
              No uploads yet. Images added from the blog editor land here.
            </p>
          </Card>
        ) : (
          <>
            <Grid assets={uploaded} />
            <p className="mt-3 text-xs text-suth-text-tertiary">
              Showing up to {CAP} from the blog-images bucket.
            </p>
          </>
        )}
      </section>
    </>
  );
}
