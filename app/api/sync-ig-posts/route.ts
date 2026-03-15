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
  shortCode?: string;
  owner?: {
    username?: string;
  };
};

type ApifyItem = ApifyPost & {
  userName?: string;
  igHandle?: string;
  handle?: string;
  profileHandle?: string;
  user?: { username?: string };
};

const TARGET_POST_COUNT_MAX = 6;
const BANNED_HANDLES = new Set([
  "p",
  "reel",
  "reels",
  "explore",
  "stories",
  "accounts",
  "tv",
]);

function normalizeHandle(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, "")
    .replace(/^@/, "")
    .replace(/\/$/, "")
    .replace(/\/.*$/, "");
}

function extractHandleFromInstagramUrl(url: string | null | undefined) {
  const value = String(url ?? "").trim();
  const match = value.match(/instagram\.com\/([^/?#]+)/i);
  const handle = match?.[1] ? normalizeHandle(match[1]) : "";

  if (!handle || BANNED_HANDLES.has(handle)) return "";
  return handle;
}

function getApifyItemHandle(item: ApifyItem) {
  const raw =
    item.ownerUsername ||
    item.username ||
    item.userName ||
    item.igHandle ||
    item.handle ||
    item.profileHandle ||
    item.owner?.username ||
    item.user?.username ||
    extractHandleFromInstagramUrl(item.inputUrl);

  const handle = normalizeHandle(raw);

  if (!handle || BANNED_HANDLES.has(handle)) return "";
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

async function fetchAllRows<T>(
  table: string,
  columns: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queryBuilder?: (q: any) => any
): Promise<T[]> {
  const pageSize = 1000;
  let from = 0;
  let all: T[] = [];

  while (true) {
    let query = supabase.from(table).select(columns).range(from, from + pageSize - 1);

    if (queryBuilder) {
      query = queryBuilder(query) ?? query;
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    const batch = (data ?? []) as T[];
    all = all.concat(batch);

    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return all;
}

async function fetchJsonWithTimeout(
  url: string,
  init?: RequestInit,
  ms = 20000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);

  try {
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
    const res = await fetch(url, {
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchAllApifyPosts(datasetId: string): Promise<ApifyItem[]> {
  const all: ApifyItem[] = [];
  const limit = 100;
  let offset = 0;

  while (true) {
    const url =
      `https://api.apify.com/v2/datasets/${datasetId}/items` +
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

    let batch: ApifyItem[];
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

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const datasetId = body.datasetId || process.env.APIFY_DATASET_ID;

  if (!datasetId) {
    return NextResponse.json(
      { error: "Missing datasetId (pass in body or set APIFY_DATASET_ID)" },
      { status: 400 }
    );
  }

  try {
    const start = Date.now();

    const artists = await fetchAllRows<{
      id: number;
      instagram_handle: string | null;
      instagram_url: string | null;
    }>(
      "artists",
      "id, instagram_handle, instagram_url",
      (q) => q.eq("is_active", true)
    );

    const existingPosts = await fetchAllRows<{
      artist_id: number;
    }>("artist_ig_posts", "artist_id");

    const postCountByArtistId = new Map<number, number>();

    for (const row of existingPosts) {
      postCountByArtistId.set(
        row.artist_id,
        (postCountByArtistId.get(row.artist_id) ?? 0) + 1
      );
    }

    const newArtistByHandle = new Map<string, number>();

    for (const artist of artists) {
      const handle =
        normalizeHandle(artist.instagram_handle) ||
        extractHandleFromInstagramUrl(artist.instagram_url);

      if (!handle) continue;

      const postCount = postCountByArtistId.get(artist.id) ?? 0;
      if (postCount >= TARGET_POST_COUNT_MAX) continue;

      if (
        [
          "zone_47_tattoo",
          "zombi_kitsch",
          "zerokilltattoo",
          "zazartattoo",
          "zanzare_tattoo",
          "zalywink",
          "yvanpec",
          "yusha.tattoo",
        ].includes(handle)
      ) {
        console.log("[BUILD TARGET]", {
          artistId: artist.id,
          dbHandle: artist.instagram_handle,
          dbUrl: artist.instagram_url,
          normalizedHandle: handle,
          postCount,
          willBeIncluded: postCount < TARGET_POST_COUNT_MAX,
        });
      }

      newArtistByHandle.set(handle, artist.id);
    }

    console.log("TARGET HANDLE COUNT BEFORE APIFY:", newArtistByHandle.size);
    console.log(
      "TARGET HANDLE SAMPLE:",
      Array.from(newArtistByHandle.keys()).slice(0, 100)
    );

    const debugTargetHandles = [
      "zone_47_tattoo",
      "zombi_kitsch",
      "zerokilltattoo",
      "zazartattoo",
      "zanzare_tattoo",
      "zalywink",
      "yvanpec",
      "yusha.tattoo",
    ];

    for (const h of debugTargetHandles) {
      console.log("[TARGET MAP CHECK]", h, {
        present: newArtistByHandle.has(h),
        artistId: newArtistByHandle.get(h) ?? null,
      });
    }

    const items = await fetchAllApifyPosts(datasetId);

    console.log("APIFY TOTAL ITEMS:", items.length);

    const rawHandles = new Map<string, number>();

    for (const item of items) {
      const rawHandle = getApifyItemHandle(item);
      if (!rawHandle) continue;
      rawHandles.set(rawHandle, (rawHandles.get(rawHandle) ?? 0) + 1);
    }

    console.log("APIFY UNIQUE RAW HANDLES:", rawHandles.size);
    console.log(
      "APIFY TOP HANDLES:",
      Array.from(rawHandles.entries()).sort((a, b) => b[1] - a[1]).slice(0, 50)
    );

    const postsByHandle = new Map<string, ApifyItem[]>();

    for (const item of items) {
      const handle = getApifyItemHandle(item);

      if (!handle) continue;
      if (!newArtistByHandle.has(handle)) continue;

      const arr = postsByHandle.get(handle) ?? [];
      arr.push(item);
      postsByHandle.set(handle, arr);
    }

    for (const [handle, arr] of postsByHandle.entries()) {
      arr.sort((a, b) => {
        const ta = new Date(a.timestamp ?? 0).getTime();
        const tb = new Date(b.timestamp ?? 0).getTime();
        return tb - ta;
      });

      postsByHandle.set(handle, arr.slice(0, TARGET_POST_COUNT_MAX));
    }

    console.log("POSTS BY HANDLE COUNT:", postsByHandle.size);
    console.log(
      "MATCHED TARGET HANDLES SAMPLE:",
      Array.from(postsByHandle.keys()).slice(0, 50)
    );

    const debugHandles = [
      "zone_47_tattoo",
      "zombi_kitsch",
      "zerokilltattoo",
      "zazartattoo",
      "zanzare_tattoo",
      "zalywink",
      "yvanpec",
      "yusha.tattoo",
    ];

    for (const h of debugHandles) {
      console.log("[DEBUG HANDLE CHECK]", h, {
        inTarget: newArtistByHandle.has(h),
        inApify: postsByHandle.has(h),
        postCount: postsByHandle.get(h)?.length ?? 0,
      });
    }

    const apifyHandles = new Set(postsByHandle.keys());
    const matchedByHandle = new Map<string, number>();
    const matchedArtistIds = new Set<number>();

    let uploaded = 0;
    let skipped = 0;

    const artistIdsToProcess = Array.from(newArtistByHandle.values());

    const existingPostsForArtists = await fetchAllRows<{
      artist_id: number;
      shortcode: string | null;
    }>(
      "artist_ig_posts",
      "artist_id, shortcode",
      (q) => q.in("artist_id", artistIdsToProcess)
    );

    const existingShortcodesByArtistId = new Map<number, Set<string>>();

    for (const row of existingPostsForArtists) {
      if (!row.shortcode) continue;

      const current =
        existingShortcodesByArtistId.get(row.artist_id) ?? new Set<string>();
      current.add(row.shortcode);
      existingShortcodesByArtistId.set(row.artist_id, current);
    }

    console.log("PRELOADED EXISTING POSTS:", existingPostsForArtists.length);
    console.log("ARTISTS TO PROCESS:", artistIdsToProcess.length);

    let artistIndex = 0;
    const totalArtists = newArtistByHandle.size;
    let matchedSamples = 0;

    for (const [handle, artistId] of newArtistByHandle.entries()) {
      artistIndex++;

      if (artistIndex % 50 === 0) {
        console.log(`[PROGRESS] ${artistIndex}/${totalArtists}`);
      }

      const artistPosts = postsByHandle.get(handle) ?? [];
      if (artistPosts.length === 0) continue;

      if (artistPosts.length < TARGET_POST_COUNT_MAX) {
        console.log(
          `[PARTIAL ARTIST] handle=${handle}, count=${artistPosts.length}`
        );
      }

      const existingShortcodes =
        existingShortcodesByArtistId.get(artistId) ?? new Set<string>();

      for (const post of artistPosts) {
        if (matchedSamples < 10) {
          console.log("[MATCHED]", {
            artistId,
            handle,
            postUrl: post.url,
            displayUrl: post.displayUrl,
          });
          matchedSamples++;
        }

        const igPostUrl = post.url;
        const imgUrl = post.displayUrl;

        if (typeof igPostUrl !== "string" || typeof imgUrl !== "string") {
          console.log("[SKIP missing data]", {
            artistId,
            handle,
            igPostUrl,
            imgUrl,
          });
          skipped++;
          continue;
        }

        const shortcode = post.shortCode || extractShortcode(igPostUrl);

        if (!shortcode) {
          console.log("[SKIP missing shortcode]", {
            artistId,
            handle,
            igPostUrl,
            imgUrl,
          });
          skipped++;
          continue;
        }

        if (existingShortcodes.has(shortcode)) {
          console.log("[SKIP already exists]", { artistId, handle, shortcode });
          continue;
        }

        matchedArtistIds.add(artistId);
        matchedByHandle.set(handle, (matchedByHandle.get(handle) ?? 0) + 1);

        let imgRes: Response;
        try {
          imgRes = await fetchBufferWithTimeout(imgUrl, 8000);
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

        const { error: uploadError } = await supabase.storage
          .from("ig")
          .upload(path, buffer, {
            contentType: contentType ?? "image/jpeg",
            upsert: false,
          });

        if (uploadError) {
          const statusCode =
            typeof uploadError === "object" &&
            uploadError &&
            "statusCode" in uploadError
              ? String(
                  (uploadError as { statusCode?: string | number }).statusCode
                )
              : "";

          if (statusCode !== "409") {
            console.log("[SKIP upload error]", {
              artistId,
              handle,
              shortcode,
              path,
              error: uploadError,
            });
            skipped++;
            continue;
          }

          console.log("[UPLOAD already exists]", {
            artistId,
            handle,
            shortcode,
            path,
          });
        }

        const { error: insertError } = await supabase
          .from("artist_ig_posts")
          .insert({
            artist_id: artistId,
            shortcode,
            ig_post_url: igPostUrl,
            image_path: path,
            taken_at: post.timestamp ?? null,
          });

        if (insertError) {
          console.log("[SKIP insert error]", {
            artistId,
            handle,
            shortcode,
            error: insertError,
          });
          skipped++;
          continue;
        }

        existingShortcodes.add(shortcode);
        existingShortcodesByArtistId.set(artistId, existingShortcodes);

        uploaded++;
      }
    }

    console.log(
      "TOP MATCHED HANDLES:",
      Array.from(matchedByHandle.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 100)
    );

    const targetHandles = new Set(newArtistByHandle.keys());
    const intersection = Array.from(apifyHandles).filter((h) =>
      targetHandles.has(h)
    );

    console.log("TARGET HANDLE COUNT:", targetHandles.size);
    console.log("APIFY UNIQUE HANDLE COUNT:", apifyHandles.size);
    console.log("INTERSECTION COUNT:", intersection.length);
    console.log("SYNC TIME:", (Date.now() - start) / 1000, "seconds");

    return NextResponse.json({
      ok: true,
      uploaded,
      skipped,
      unmatched: 0,
      artistsMatched: matchedArtistIds.size,
    });
  } catch (error: unknown) {
    console.error("sync-ig-posts fatal error:", error);

    const message =
      error instanceof Error ? error.message : "Unknown server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}