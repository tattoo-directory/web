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
  inputUrl?: string;
  owner?: {
    username?: string;
  };
};

function normalizeHandle(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
}

function extractHandleFromInstagramUrl(url: string | null | undefined) {
  const value = String(url ?? "").trim();
  const match = value.match(/instagram\.com\/([^/?#]+)/i);
  const handle = match?.[1] ? normalizeHandle(match[1]) : "";

  const banned = new Set([
    "p",
    "reel",
    "reels",
    "explore",
    "stories",
    "accounts",
    "tv",
  ]);

  if (!handle || banned.has(handle)) return "";
  return handle;
}

function getApifyHandle(post: ApifyPost) {
  const handle = normalizeHandle(
    post.ownerUsername ||
      post.owner?.username ||
      post.username ||
      extractHandleFromInstagramUrl(post.inputUrl)
  );

  const banned = new Set([
    "p",
    "reel",
    "reels",
    "explore",
    "stories",
    "accounts",
    "tv",
  ]);

  if (!handle || banned.has(handle)) return "";
  return handle;
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

async function fetchJsonWithTimeout(
  url: string,
  init?: RequestInit,
  ms = 20000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);

  try {
    console.log(`fetchJsonWithTimeout url=${url} ms=${ms}`);
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchBufferWithTimeout(
  url: string,
  ms = 20000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);

  try {
    console.log(`fetchBufferWithTimeout url=${url} ms=${ms}`);
    const res = await fetch(url, {
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchAllApifyPosts(): Promise<ApifyPost[]> {
  const all: ApifyPost[] = [];
  const limit = 100;
  let offset = 0;

  while (true) {
    const url =
      `https://api.apify.com/v2/datasets/${process.env.APIFY_DATASET_ID}/items` +
      `?clean=true&format=json&offset=${offset}&limit=${limit}`;

    console.log(`[APIFY] fetching offset=${offset} limit=${limit}`);

    let res: Response;
    try {
      res = await fetchJsonWithTimeout(
        url,
        {
          headers: {
            Authorization: `Bearer ${process.env.APIFY_TOKEN}`,
          },
          cache: "no-store",
        },
        20000
      );
    } catch (error) {
      console.error(`[APIFY] fetch failed at offset=${offset}`, error);
      throw error;
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Apify fetch failed: ${res.status} - ${text}`);
    }

    let batch: ApifyPost[];
    try {
      batch = await res.json();
    } catch (error) {
      console.error(`[APIFY] json parse failed at offset=${offset}`, error);
      throw error;
    }

    console.log(`[APIFY] fetched batch size=${batch.length}`);

    all.push(...batch);

    if (batch.length < limit) break;
    offset += limit;
  }

  return all;
}

export async function POST() {
  try {
    console.log("sync-ig-posts started");

    const { data: artists, error: aErr } = await supabase
      .from("artists")
      .select("id, instagram_handle, instagram_url")
      .eq("is_active", true);

    if (aErr) {
      return NextResponse.json({ error: aErr.message }, { status: 500 });
    }

    console.log("artists fetched:", artists?.length ?? 0);

    const { data: existingPosts, error: existingErr } = await supabase
      .from("artist_ig_posts")
      .select("artist_id");

    if (existingErr) {
      throw new Error(existingErr.message);
    }

    const existingArtistIds = new Set(
      (existingPosts ?? []).map((row) => row.artist_id)
    );

    const newArtistByHandle = new Map<string, number>();
    for (const a of artists ?? []) {
      const handle =
        normalizeHandle(a.instagram_handle) ||
        extractHandleFromInstagramUrl(a.instagram_url);

      if (!handle) continue;
      if (existingArtistIds.has(a.id)) continue;
      newArtistByHandle.set(handle, a.id);
    }

    console.log("new artists to process:", newArtistByHandle.size);
    console.log(
      "sample artist handles:",
      Array.from(newArtistByHandle.keys()).slice(0, 20)
    );

    const items = await fetchAllApifyPosts();
    console.log("apify items total:", items.length);
    console.log("first apify item:", JSON.stringify(items[0], null, 2));
    console.log(
      "sample apify handles:",
      items.map((it) => getApifyHandle(it)).filter(Boolean).slice(0, 20)
    );

    let uploaded = 0;
    let skipped = 0;
    let unmatched = 0;
    let unmatchedSamples = 0;
    let matchedSamples = 0;

    const seenArtistIds = new Set<number>();

    for (const it of items) {
      const handle = getApifyHandle(it);
      if (!handle) {
        skipped++;
        continue;
      }

      const artistId = newArtistByHandle.get(handle);
      if (!artistId) {
        unmatched++;
        if (unmatchedSamples < 15) {
          console.log("[UNMATCHED]", {
            handle,
            ownerUsername: it.ownerUsername,
            username: it.username,
            ownerNested: it.owner?.username,
            inputUrl: it.inputUrl,
            postUrl: it.url,
          });
          unmatchedSamples++;
        }
        continue;
      }

      if (matchedSamples < 10) {
        console.log("[MATCHED]", {
          artistId,
          handle,
          postUrl: it.url,
          displayUrl: it.displayUrl,
        });
        matchedSamples++;
      }

      if (!seenArtistIds.has(artistId)) {
        seenArtistIds.add(artistId);

        const { data: oldPosts, error: oldErr } = await supabase
          .from("artist_ig_posts")
          .select("id, image_path")
          .eq("artist_id", artistId);

        if (oldErr) {
          console.error("old posts fetch error", oldErr);
          throw new Error(oldErr.message);
        }

        for (const oldPost of oldPosts ?? []) {
          if (oldPost.image_path) {
            const { error: removeErr } = await supabase.storage
              .from("ig")
              .remove([oldPost.image_path]);

            if (removeErr) {
              console.error("storage remove error", removeErr);
            }
          }
        }

        const { error: deleteErr } = await supabase
          .from("artist_ig_posts")
          .delete()
          .eq("artist_id", artistId);

        if (deleteErr) {
          console.error("delete old posts error", deleteErr);
          throw new Error(deleteErr.message);
        }
      }

      const igPostUrl: string | null = it.url ?? null;
      const imgUrl: string | null = it.displayUrl ?? null;
      const shortcode = igPostUrl ? extractShortcode(igPostUrl) : null;

      if (!igPostUrl || !imgUrl || !shortcode) {
        console.log("[SKIP missing data]", {
          artistId,
          handle,
          igPostUrl,
          imgUrl,
          shortcode,
        });
        skipped++;
        continue;
      }

      let imgRes: Response;

      try {
        imgRes = await fetchBufferWithTimeout(imgUrl, 15000);
      } catch (error) {
        console.log("[SKIP image fetch error]", {
          artistId,
          handle,
          shortcode,
          imgUrl,
          error,
        });
        skipped++;
        continue;
      }

      if (!imgRes.ok) {
        console.log("[SKIP image bad response]", {
          artistId,
          handle,
          shortcode,
          status: imgRes.status,
          imgUrl,
        });
        skipped++;
        continue;
      }

      const contentType = imgRes.headers.get("content-type");
      const ext = guessExt(contentType);

      let buffer: Buffer;
      try {
        buffer = Buffer.from(await imgRes.arrayBuffer());
      } catch (error) {
        console.error(
          `[IMG] arrayBuffer failed artist=${artistId} shortcode=${shortcode}`,
          error
        );
        skipped++;
        continue;
      }

      const path = `${artistId}/${shortcode}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("ig")
        .upload(path, buffer, {
          contentType: contentType ?? "image/jpeg",
          upsert: true,
        });

      if (upErr) {
        console.log("[SKIP upload error]", {
          artistId,
          handle,
          shortcode,
          path,
          error: upErr,
        });
        skipped++;
        continue;
      }

      const { error: insErr } = await supabase
        .from("artist_ig_posts")
        .insert({
          artist_id: artistId,
          shortcode,
          ig_post_url: igPostUrl,
          image_path: path,
          taken_at: it.timestamp ?? null,
        });

      if (insErr) {
        console.log("[SKIP insert error]", {
          artistId,
          handle,
          shortcode,
          error: insErr,
        });
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
  } catch (error: unknown) {
    console.error("sync-ig-posts fatal error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}