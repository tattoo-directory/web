import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 86400;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type RegionRow = {
  slug: string;
  name: string;
};

export default async function RegionsPage() {
  const { data: regions, error } = await supabase
    .from("regions")
    .select("slug, name")
    .eq("country_code", "FR")
    .order("name", { ascending: true });

  if (error) {
    return (
      <main className="min-h-screen bg-white px-6 py-10 text-black">
        <h1 className="text-3xl font-bold">Régions</h1>
        <p className="mt-4">Erreur lors du chargement des régions.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-black">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Régions de France
        </h1>

        <p className="mt-3 max-w-2xl text-sm text-black/70 md:text-base">
          Explorez les tatoueurs par région pour trouver plus facilement des
          artistes près de chez vous.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(regions as RegionRow[] | null)?.map((region) => (
            <Link
              key={region.slug}
              href={`/france/regions/${region.slug}`}
              className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="text-lg font-semibold">{region.name}</div>
              <div className="mt-1 text-sm text-black/60">
                Voir les tatoueurs de la région
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}