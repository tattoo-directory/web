import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)");
}

const supabase = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ApifyPost = {
  ownerUsername?: string;
  url?: string;
  displayUrl?: string;
  timestamp?: string;
};

function extractShortcode(postUrl: string) {
  // ex: https://www.instagram.com/p/lqQYFGrNuR/
  const m = postUrl.match(/instagram\.com\/p\/([^/]+)\//);
  return m?.[1] ?? null;
}

function guessExt(contentType: string | null) {
  if (!contentType) return "jpg";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  return "jpg";
}

export async function POST() {
  // 1) artistes actifs avec handle
  const { data: artists, error: aErr } = await supabase
    .from("artists")
    .select("id, instagram_handle")
    .eq("is_active", true)
    .not("instagram_handle", "is", null);

  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

  // index artistes par handle (sans @)
  const artistByHandle = new Map<string, number>();
  for (const a of artists ?? []) {
    const h = String(a.instagram_handle).replace("@", "").toLowerCase();
    artistByHandle.set(h, a.id);
  }

  // 2) récup items Apify dataset
  const apifyUrl = `https://api.apify.com/v2/datasets/${process.env.APIFY_DATASET_ID}/items?clean=true&format=json`;
  const apifyRes = await fetch(apifyUrl, {
    headers: { Authorization: `Bearer ${process.env.APIFY_TOKEN}` },
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

  // 3) pour chaque item : map vers artist_id, télécharge, upload, insert
  for (const it of items) {
    const handle = String(it.ownerUsername ?? "").toLowerCase();
    if (!handle) continue;

    const artistId = artistByHandle.get(handle);
    if (!artistId) {
      unmatched++;
      continue;
    }

    const igPostUrl: string | null = it.url ?? null;
    const imgUrl: string | null = it.displayUrl ?? null;
    const shortcode = igPostUrl ? extractShortcode(igPostUrl) : null;

    if (!igPostUrl || !imgUrl || !shortcode) continue;

    // déjà en base ?
    const { data: exists } = await supabase
      .from("artist_ig_posts")
      .select("id")
      .eq("artist_id", artistId)
      .eq("shortcode", shortcode)
      .maybeSingle();

    if (exists?.id) {
      skipped++;
      continue;
    }

    // download image
    const imgRes = await fetch(imgUrl);
    if (!imgRes.ok) continue;

    const contentType = imgRes.headers.get("content-type");
    const ext = guessExt(contentType);
    const buffer = Buffer.from(await imgRes.arrayBuffer());

    // upload storage
    const path = `${artistId}/${shortcode}.${ext}`;
    const { error: upErr } = await supabase.storage.from("ig").upload(path, buffer, {
      contentType: contentType ?? "image/jpeg",
      upsert: false,
    });

    if (upErr) {
      skipped++;
      continue;
    }

    // insert DB
    const { error: insErr } = await supabase.from("artist_ig_posts").insert({
      artist_id: artistId,
      shortcode,
      ig_post_url: igPostUrl,
      image_path: path,
      taken_at: it.timestamp ?? null, // déjà ISO string
    });

    if (!insErr) uploaded++;
  }

  return NextResponse.json({ ok: true, uploaded, skipped, unmatched });
}