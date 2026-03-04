import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;

  const { data: cityRow } = await supabase
    .from("cities")
    .select("name")
    .eq("country_code", "FR")
    .eq("slug", city)
    .single();

  const cityName = cityRow?.name ?? city;

  return {
    title: `Tatoueurs à ${cityName} | TattooCityGuide`,
    description: `Découvre des tatoueurs à ${cityName}. Parcours les styles, ouvre Instagram et contacte facilement l’artiste.`,
  };
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;

  const { data: cityRow } = await supabase
    .from("cities")
    .select("name")
    .eq("country_code", "FR")
    .eq("slug", city)
    .single();

  if (!cityRow) return notFound();

  const { data: artists, error } = await supabase
    .from("artists")
    .select("id, name, slug, instagram_url, style_slugs")
    .eq("country_code", "FR")
    .eq("city_slug", city)
    .eq("is_active", true)
    .order("id", { ascending: true });

  return (
    <main style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <h1>Tatoueurs à {cityRow.name}</h1>
      <p>Choisis un artiste, vois son Insta, et contacte-le.</p>

      {error && <pre>{JSON.stringify(error, null, 2)}</pre>}

      <ul style={{ marginTop: 24 }}>
        {(artists ?? []).map((a) => (
          <li key={a.id} style={{ marginBottom: 16 }}>
            <Link href={`/france/${city}/${a.slug}`}>
            <div style={{ fontWeight: 600 }}>{a.name}</div>
            </Link>
            <div style={{ opacity: 0.8, fontSize: 14 }}>
              {(a.style_slugs ?? []).join(" · ")}
            </div>
            <div style={{ marginTop: 6, display: "flex", gap: 12 }}>
              <a href={a.instagram_url ?? "#"} target="_blank" rel="noreferrer">
                Instagram →
              </a>
              <Link href={`/france/${city}/${a.slug}`}>Voir la page →</Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
