import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://tattoocityguide.com";
  const now = new Date();

  const items: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now },
    { url: `${baseUrl}/france`, lastModified: now },
  ];

  const { data: regions } = await supabase
    .from("regions")
    .select("slug")
    .eq("country_code", "FR");

  for (const r of regions ?? []) {
    if (!r.slug) continue;

    items.push({
      url: `${baseUrl}/france/regions/${r.slug}`,
      lastModified: now,
    });
  }

  const { data: artists, error } = await supabase
    .from("artists_with_post_count")
    .select("slug, city_slug")
    .gte("post_count", 3);

  if (error) {
    console.error("Sitemap artists fetch error:", error);
    return items;
  }

  const uniqueCitySlugs = [
    ...new Set(
      (artists ?? [])
        .map((a) => a.city_slug)
        .filter((citySlug): citySlug is string => Boolean(citySlug))
    ),
  ];

  for (const citySlug of uniqueCitySlugs) {
    items.push({
      url: `${baseUrl}/france/${citySlug}`,
      lastModified: now,
    });
  }

  for (const artist of artists ?? []) {
    if (!artist.city_slug || !artist.slug) continue;

    items.push({
      url: `${baseUrl}/france/${artist.city_slug}/${artist.slug}`,
      lastModified: now,
    });
  }

  return items;
}