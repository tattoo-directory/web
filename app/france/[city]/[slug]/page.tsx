import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const revalidate = 86400; // 24h (ISR)

export async function generateStaticParams() {
  const { data: artists } = await supabase
    .from("artists")
    .select("city_slug, slug")
    .eq("country_code", "FR")
    .eq("is_active", true);

  return (artists ?? []).map((a) => ({
    city: a.city_slug,
    slug: a.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; slug: string }>;
}) {
  const { city, slug } = await params;

  const { data: cityRow } = await supabase
    .from("cities")
    .select("name")
    .eq("country_code", "FR")
    .eq("slug", city)
    .single();

  const cityName = cityRow?.name ?? city;

  const { data: artist } = await supabase
    .from("artists")
    .select("name, style_slugs")
    .eq("country_code", "FR")
    .eq("city_slug", city)
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  const artistName = artist?.name ?? slug;
  const styles = (artist?.style_slugs ?? []).slice(0, 4).join(", ");

  return {
    title: `${artistName} (${cityName}) | TattooCityGuide`,
    description: styles
      ? `Découvre ${artistName}, tatoueur à ${cityName}. Styles: ${styles}. Ouvre Instagram et contacte l’artiste.`
      : `Découvre ${artistName}, tatoueur à ${cityName}. Ouvre Instagram et contacte l’artiste.`,
  };
}

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ city: string; slug: string }>;
}) {
  const { city, slug } = await params;

  // Vérifie que la ville existe (et récupère son nom propre)
  const { data: cityRow } = await supabase
    .from("cities")
    .select("name")
    .eq("country_code", "FR")
    .eq("slug", city)
    .single();

  if (!cityRow) return notFound();

  const { data: artist, error } = await supabase
    .from("artists")
    .select(
      "id, name, slug, instagram_handle, instagram_url, phone, website_url, address, bio, style_slugs"
    )
    .eq("country_code", "FR")
    .eq("city_slug", city)
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error || !artist) return notFound();

  return (
    <main style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <Link href={`/france/${city}`}>← Retour à {cityRow.name}</Link>

      <h1 style={{ marginTop: 16 }}>{artist.name}</h1>

      <div style={{ marginTop: 8, opacity: 0.8 }}>
        {(artist.style_slugs ?? []).join(" · ")}
      </div>

      {artist.bio && <p style={{ marginTop: 16 }}>{artist.bio}</p>}

      <div style={{ marginTop: 20, display: "grid", gap: 10 }}>
        {artist.instagram_url && (
          <a href={artist.instagram_url} target="_blank" rel="noreferrer">
            Voir Instagram →
          </a>
        )}

        {artist.website_url && (
          <a href={artist.website_url} target="_blank" rel="noreferrer">
            Site web →
          </a>
        )}

        {artist.phone && <div>📞 {artist.phone}</div>}
        {artist.address && <div>📍 {artist.address}</div>}
      </div>
    </main>
  );
}
