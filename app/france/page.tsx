import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function ArrowRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M5 12h12m0 0-5-5m5 5-5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default async function FrancePage() {
  const { data: cities, error } = await supabase
    .from("cities_with_artists")
    .select("slug, name, artist_count")
    .order("artist_count", { ascending: false });

  const safeCities = cities ?? [];

  return (
    <main className="min-h-screen bg-white text-black">
      {/* Décor léger */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-black/[0.06] via-black/[0.03] to-transparent blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-medium text-black/70 hover:text-black transition"
          >
            ← Accueil
          </Link>

          <div className="text-xs text-black/45">
            {safeCities.length} ville{safeCities.length > 1 ? "s" : ""}
          </div>
        </div>

        {/* Title */}
        <div className="mt-8 max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Tatoueurs en France
          </h1>
          <p className="mt-3 text-base text-black/65">
            Choisissez une ville pour découvrir des tatoueurs. Nous ajoutons
            progressivement de nouvelles villes.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="font-semibold">Erreur Supabase</div>
            <pre className="mt-2 overflow-auto text-xs">
              {JSON.stringify(error, null, 2)}
            </pre>
          </div>
        )}

        {/* Liste des villes */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight">
            Villes disponibles
          </h2>

          {safeCities.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-black/10 bg-white p-6 text-sm text-black/60 shadow-sm">
              Aucune ville disponible pour le moment.
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {safeCities.map((c) => (
                <Link
                  key={c.slug}
                  href={`/france/${c.slug}`}
                  className="group rounded-3xl border border-black/10 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-base font-semibold">{c.name}</div>
                      <div className="mt-1 text-sm text-black/60">
                        {c.artist_count} tatoueur{c.artist_count > 1 ? "s" : ""}
                      </div>
                    </div>

                    <div className="grid h-10 w-10 place-items-center rounded-2xl border border-black/10 bg-white shadow-sm">
                      <ArrowRightIcon className="h-5 w-5 text-black/70 transition group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <div className="mt-12 text-xs text-black/45">
          © {new Date().getFullYear()} TattooCityGuide
        </div>
      </div>
    </main>
  );
}