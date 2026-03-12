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

  const { data: cities } = await supabase
    .from("cities")
    .select("slug")
    .eq("country_code", "FR");

  const { data: artists } = await supabase
    .from("artists")
    .select("slug, city_slug")
    .eq("country_code", "FR")
    .eq("is_active", true);

  for (const c of cities ?? []) {
    items.push({ url: `${baseUrl}/france/${c.slug}`, lastModified: now });
  }

  for (const a of artists ?? []) {
    items.push({
      url: `${baseUrl}/france/${a.city_slug}/${a.slug}`,
      lastModified: now,
    });
  }

  return items;
}
