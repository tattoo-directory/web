import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ApifyPost = {
  ownerUsername?: string;
  url?: string;
  displayUrl?: string;
  thumbnailUrl?: string;
  timestamp?: string;
  likesCount?: number;
};

type IgPost = {
  url: string;
  displayUrl: string;
  timestamp?: string;
  likesCount?: number | null;
};

export async function GET() {
  // pratique pour tester dans le navigateur
  return NextResponse.json({
    ok: true,
    message: "Use POST to sync Apify dataset into Supabase (artists.ig_posts).",
  });
}

export async function POST() {
  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  const APIFY_DATASET_ID = process.env.APIFY_DATASET_ID;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!APIFY_TOKEN || !APIFY_DATASET_ID || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Missing env vars. Need APIFY_TOKEN, APIFY_DATASET_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY",
      },
      { status: 500 }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1) Fetch dataset items from Apify
  const apifyUrl = `https://api.apify.com/v2/datasets/${APIFY_DATASET_ID}/items?clean=true&format=json&token=${APIFY_TOKEN}`;
  const apifyRes = await fetch(apifyUrl, { cache: "no-store" });

  if (!apifyRes.ok) {
    const text = await apifyRes.text();
    return NextResponse.json(
      { ok: false, error: "Apify fetch failed", status: apifyRes.status, body: text.slice(0, 500) },
      { status: 500 }
    );
  }

  const items = (await apifyRes.json()) as ApifyPost[];

  // 2) Group by ownerUsername
  const byUser = new Map<string, ApifyPost[]>();
  for (const p of items) {
    const u = (p.ownerUsername ?? "").trim().toLowerCase();
    if (!u || !p.url) continue;
    if (!byUser.has(u)) byUser.set(u, []);
    byUser.get(u)!.push(p);
  }

  // 3) Update each artist row by instagram_handle == ownerUsername
  let artistsUpdated = 0;
  let artistsNotFound = 0;

  for (const [username, posts] of byUser.entries()) {
    // Keep only image posts that have displayUrl/thumbnailUrl
    const igPosts = posts
  .map((p): IgPost | null => {
    const img = p.displayUrl ?? p.thumbnailUrl;
    if (!p.url || !img) return null;
    return {
      url: p.url,
      displayUrl: img,
      timestamp: p.timestamp,
      likesCount: typeof p.likesCount === "number" ? p.likesCount : null,
    };
  })
  .filter((x): x is IgPost => x !== null)
  .sort((a, b) => (b.timestamp ?? "").localeCompare(a.timestamp ?? ""))
  .slice(0, 6);

    if (igPosts.length === 0) continue;

    // Do we have an artist with this instagram_handle?
    const { data: found, error: findErr } = await supabase
      .from("artists")
      .select("id")
      .eq("instagram_handle", username)
      .limit(1);

    if (findErr) {
      // ignore and continue
      continue;
    }
    if (!found || found.length === 0) {
      artistsNotFound += 1;
      continue;
    }

    const { error: upErr } = await supabase
      .from("artists")
      .update({ ig_posts: igPosts })
      .eq("instagram_handle", username);

    if (!upErr) artistsUpdated += 1;
  }

  return NextResponse.json({
    ok: true,
    totalItems: items.length,
    usersInDataset: byUser.size,
    artistsUpdated,
    artistsNotFound,
  });
}