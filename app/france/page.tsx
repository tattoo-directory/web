import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function FrancePage() {
  const { data: cities, error } = await supabase
    .from("cities")
    .select("slug, name")
    .eq("country_code", "FR")
    .order("name", { ascending: true });

  return (
    <main style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <h1>Tatoueurs en France</h1>
      <p>Choisis une ville pour découvrir des tatoueurs.</p>

      {error && <pre>{JSON.stringify(error, null, 2)}</pre>}

      <ul style={{ marginTop: 24 }}>
        {(cities ?? []).map((c) => (
          <li key={c.slug} style={{ marginBottom: 12 }}>
            <Link href={`/france/${c.slug}`}>{c.name} →</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
