import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)");
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

if (!process.env.APIFY_DATASET_ID) {
  throw new Error("Missing APIFY_DATASET_ID");
}

if (!process.env.APIFY_TOKEN) {
  throw new Error("Missing APIFY_TOKEN");
}

const supabase = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

type ApifyPost = {
  ownerUsername?: string;
  username?: string;
  url?: string;
  displayUrl?: string;
  timestamp?: string;
};

function normalizeHandle(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
}

function extractShortcode(postUrl: string) {
  const m = postUrl.match(/instagram\.com\/p\/([^/?#]+)\//);
  return m?.[1] ?? null;
}

function guessExt(contentType: string | null) {
  if (!contentType) return "jpg";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  return "jpg";
}

export async function POST() {
  const { data: artists, error: aErr } = await supabase
    .from("artists")
    .select("id, instagram_handle")
    .eq("is_active", true)
    .not("instagram_handle", "is", null);

  if (aErr) {
    return NextResponse.json({ error: aErr.message }, { status: 500 });
  }

  const artistByHandle = new Map<string, number>();
  for (const a of artists ?? []) {
    const h = normalizeHandle(a.instagram_handle);
    if (h) artistByHandle.set(h, a.id);
  }

  const apifyUrl = `https://api.apify.com/v2/datasets/${process.env.APIFY_DATASET_ID}/items?clean=true&format=json`;

  const apifyRes = await fetch(apifyUrl, {
    headers: {
      Authorization: `Bearer ${process.env.APIFY_TOKEN}`,
    },
    cache: "no-store",
  });

  if (!apifyRes.ok) {
    return NextResponse.json(
      { error: `Apify fetch failed: ${apifyRes.status}` },
      { status: 500 }
    );
  }

  const items: ApifyPost[] = await apifyRes.json();

  let uploaded = 0;
  let skipped = 0;
  let unmatched = 0;

  const seenArtistIds = new Set<number>();

  for (const it of items) {
    const handle = normalizeHandle(it.ownerUsername || it.username);
    if (!handle) {
      skipped++;
      continue;
    }

    const artistId = artistByHandle.get(handle);
    if (!artistId) {
      unmatched++;
      continue;
    }

    if (!seenArtistIds.has(artistId)) {
      seenArtistIds.add(artistId);

      const { data: oldPosts } = await supabase
        .from("artist_ig_posts")
        .select("id, image_path")
        .eq("artist_id", artistId);

      for (const oldPost of oldPosts ?? []) {
        if (oldPost.image_path) {
          await supabase.storage.from("ig").remove([oldPost.image_path]);
        }
      }

      await supabase.from("artist_ig_posts").delete().eq("artist_id", artistId);
    }

    const igPostUrl: string | null = it.url ?? null;
    const imgUrl: string | null = it.displayUrl ?? null;
    const shortcode = igPostUrl ? extractShortcode(igPostUrl) : null;

    if (!igPostUrl || !imgUrl || !shortcode) {
      skipped++;
      continue;
    }

    const imgRes = await fetch(imgUrl);
    if (!imgRes.ok) {
      skipped++;
      continue;
    }

    const contentType = imgRes.headers.get("content-type");
    const ext = guessExt(contentType);
    const buffer = Buffer.from(await imgRes.arrayBuffer());

    const path = `${artistId}/${shortcode}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("ig")
      .upload(path, buffer, {
        contentType: contentType ?? "image/jpeg",
        upsert: true,
      });

    if (upErr) {
      skipped++;
      continue;
    }

    const { error: insErr } = await supabase.from("artist_ig_posts").insert({
      artist_id: artistId,
      shortcode,
      ig_post_url: igPostUrl,
      image_path: path,
      taken_at: it.timestamp ?? null,
    });

    if (insErr) {
      skipped++;
      continue;
    }

    uploaded++;
  }

  return NextResponse.json({
    ok: true,
    uploaded,
    skipped,
    unmatched,
    artistsMatched: seenArtistIds.size,
  });
}