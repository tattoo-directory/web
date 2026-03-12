import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Image from "next/image";

type IgPost = {
  url: string;
  displayUrl?: string | null;
  thumbnailUrl?: string | null;
};

type ArtistRow = {
  id: number;
  name: string;
  slug: string;
  instagram_url: string | null;
};

const PAGE_SIZE = 50;

const popularCities = [
  { name: "Paris", slug: "paris" },
  { name: "Lyon", slug: "lyon" },
  { name: "Marseille", slug: "marseille" },
  { name: "Bordeaux", slug: "bordeaux" },
  { name: "Toulouse", slug: "toulouse" },
  { name: "Nice", slug: "nice" },
];

export const revalidate = 86400; // 24h (ISR)

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

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M17.5 6.5h.01"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-xs font-medium text-black/80">
      {children}
    </span>
  );
}

function slugToLabel(slug: string) {
  return slug
    .replaceAll("-", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export async function generateStaticParams() {
  const { data: cities } = await supabase
    .from("cities")
    .select("slug")
    .eq("country_code", "FR");

  return (cities ?? []).map((c) => ({ city: c.slug }));
}

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
  searchParams,
}: {
  params: Promise<{ city: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ city }, search] = await Promise.all([params, searchParams]);
  const currentPage = Math.max(1, Number(search?.page) || 1);

  const { data: cityRow } = await supabase
    .from("cities")
    .select("name")
    .eq("country_code", "FR")
    .eq("slug", city)
    .single();

  if (!cityRow) return notFound();

  const { data: artists, error, count } = await supabase
    .from("artists")
    .select("id, name, slug, instagram_url", { count: "exact" })
    .eq("country_code", "FR")
    .eq("city_slug", city)
    .eq("is_active", true)
    .order("id", { ascending: true })
    .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);

  const artistIds = (artists ?? []).map((a) => a.id);

  const totalArtists = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalArtists / PAGE_SIZE));

  const { data: igPosts } = await supabase
    .from("artist_ig_posts")
    .select("artist_id, shortcode, ig_post_url, image_path, taken_at")
    .in("artist_id", artistIds)
    .order("taken_at", { ascending: false });

  const postsByArtistId = new Map<number, typeof igPosts>();

  for (const p of igPosts ?? []) {
    const arr = postsByArtistId.get(p.artist_id) ?? [];
    if (arr.length < 6) arr.push(p); // ✅ max 6 images
    postsByArtistId.set(p.artist_id, arr);
  }

  const safeArtists: ArtistRow[] = (artists ?? []) as ArtistRow[];

  return (
    <main className="min-h-screen bg-white text-black">
      {/* Décor léger */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-black/[0.06] via-black/[0.03] to-transparent blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-10">
        {/* Breadcrumb / top bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/france"
              className="text-black/70 hover:text-black transition"
            >
              ← France
            </Link>
            <span className="text-black/30">/</span>
            <span className="font-medium">{cityRow.name}</span>
          </div>

          <Badge>
            {totalArtists} artiste{totalArtists > 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Header + intro */}
        <section className="mt-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
              Tatoueurs à {cityRow.name}
            </h1>

            <p className="mt-4 text-base leading-7 text-zinc-600 sm:text-lg">
              Parcourez les artistes, consultez leur Instagram et accédez à leur page
              détaillée.
            </p>
          </div>

          <div className="mt-10 max-w-4xl rounded-3xl border border-zinc-200 bg-zinc-50/80 p-6 sm:p-8">
            <div className="mb-3 inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
              Guide local
            </div>

            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
              Trouver un tatoueur à {cityRow.name}
            </h2>

            <p className="mt-4 text-sm leading-7 text-zinc-600 sm:text-base">
              {cityRow.name} possède une scène tattoo dynamique avec de nombreux artistes
              spécialisés dans différents styles comme le fineline, le blackwork, le
              réalisme ou encore le traditionnel. Sur cette page, vous pouvez découvrir
              plusieurs tatoueurs situés à {cityRow.name} et consulter leurs réalisations
              directement depuis leurs profils.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {["Fineline", "Blackwork", "Réalisme", "Traditionnel"].map((style) => (
                <span
                  key={style}
                  className="rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200"
                >
                  {style}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-12 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
                Tatoueurs à découvrir
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                Une sélection d’artistes basés à {cityRow.name}.
              </p>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="font-semibold">Erreur Supabase</div>
            <pre className="mt-2 overflow-auto text-xs">
              {JSON.stringify(error, null, 2)}
            </pre>
          </div>
        )}

        {/* Empty state */}
        {!error && safeArtists.length === 0 && (
          <div className="mt-10 rounded-3xl border border-black/10 bg-white p-8 shadow-sm">
            <div className="text-lg font-semibold">
              Aucun artiste pour l’instant
            </div>
            <p className="mt-2 text-sm text-black/60">
              Nous ajoutons de nouveaux tatoueurs régulièrement. Revenez bientôt.
            </p>
            <div className="mt-5">
              <Link
                href="/france"
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:shadow transition"
              >
                Voir d’autres villes
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Artists grid */}
        {safeArtists.length > 0 && (
          <section className="mt-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {safeArtists.map((a: ArtistRow) => {
                const posts = postsByArtistId.get(a.id) ?? [];
                const hasInstagram = Boolean(a.instagram_url);

                const heroPost = posts[0];
                const thumbPosts = posts.slice(1, 4);

                const heroUrl = heroPost
                  ? supabase.storage.from("ig").getPublicUrl(heroPost.image_path).data.publicUrl
                  : null;

                return (
                  <article
                    key={a.id}
                    className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="p-4">
                      <Link
                        href={`/france/${city}/${a.slug}`}
                        className="block overflow-hidden rounded-[22px] bg-black/[0.03]"
                      >
                        {heroUrl ? (
                          <Image
                            src={heroUrl}
                            alt={`Tatouage par ${a.name}`}
                            width={800}
                            height={1000}
                            className="aspect-[4/5] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                          />
                        ) : (
                          <div className="aspect-[4/5] w-full bg-black/[0.04]" />
                        )}
                      </Link>

                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {thumbPosts.length > 0 ? (
                          thumbPosts.map((p) => {
                            const imgUrl =
                              supabase.storage.from("ig").getPublicUrl(p.image_path).data.publicUrl;

                            return (
                              <a
                                key={p.shortcode}
                                href={p.ig_post_url}
                                target="_blank"
                                rel="noreferrer"
                                className="block overflow-hidden rounded-2xl bg-black/[0.03]"
                              >
                                <Image
                                  src={imgUrl}
                                  alt={`Post Instagram de ${a.name}`}
                                  width={240}
                                  height={240}
                                  className="aspect-square w-full object-cover transition duration-300 hover:scale-[1.03]"
                                  loading="lazy"
                                />
                              </a>
                            );
                          })
                        ) : (
                          Array.from({ length: 3 }).map((_, i) => (
                            <div
                              key={i}
                              className="aspect-square rounded-2xl bg-black/[0.04]"
                            />
                          ))
                        )}
                      </div>

                      <div className="mt-4 flex flex-1 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <Link
                              href={`/france/${city}/${a.slug}`}
                              className="text-lg font-semibold tracking-tight hover:underline"
                            >
                              {a.name}
                            </Link>
                            <p className="mt-1 text-sm text-black/55">
                              Portfolio tatouage à {cityRow.name}
                            </p>
                          </div>

                          <Link
                            href={`/france/${city}/${a.slug}`}
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-black/10 bg-white shadow-sm transition group-hover:translate-x-0.5"
                            aria-label={`Voir la page de ${a.name}`}
                          >
                            <ArrowRightIcon className="h-5 w-5 text-black/65" />
                          </Link>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {hasInstagram ? (
                            <a
                              href={a.instagram_url!}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:shadow"
                            >
                              <InstagramIcon className="h-4 w-4" />
                              Instagram
                              <ArrowRightIcon className="h-4 w-4" />
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/[0.02] px-4 py-2 text-sm font-semibold text-black/35">
                              <InstagramIcon className="h-4 w-4" />
                              Instagram indisponible
                            </span>
                          )}

                          <Link
                            href={`/france/${city}/${a.slug}`}
                            className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                          >
                            Voir la page
                            <ArrowRightIcon className="h-4 w-4 text-white" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between gap-4 text-xs text-black/65">
            <p>
              Page {currentPage} sur {totalPages} • {totalArtists} artiste
              {totalArtists > 1 ? "s" : ""}
            </p>
            <div className="flex gap-2">
              {currentPage > 1 && (
                <Link
                  href={`/france/${city}?page=${currentPage - 1}`}
                  className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-3 py-1.5 font-medium shadow-sm hover:shadow transition"
                >
                  ← Page précédente
                </Link>
              )}
              {currentPage < totalPages && (
                <Link
                  href={`/france/${city}?page=${currentPage + 1}`}
                  className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-3 py-1.5 font-medium shadow-sm hover:shadow transition"
                >
                  Page suivante →
                </Link>
              )}
            </div>
          </div>
        )}

        <section className="mt-16 border-t border-black/10 pt-8">
          <h2 className="text-xl font-semibold mb-2">
            Autres villes populaires
          </h2>

          <p className="mb-4 text-sm text-gray-600">
            Découvrez aussi des tatoueurs dans d&apos;autres villes françaises.
          </p>

          <div className="flex flex-wrap gap-3">
            {popularCities
              .filter((c) => c.slug !== city)
              .map((c) => (
              <Link
                key={c.slug}
                href={`/france/${c.slug}`}
                className="px-4 py-2 rounded-lg border border-black/10 text-sm hover:bg-black hover:text-white transition"
              >
                Tatoueurs à {c.name}
              </Link>
            ))}
          </div>
        </section>

        {/* Footer mini */}
        <div className="mt-12 text-xs text-black/45">
          © 2026 TattooCityGuide
        </div>
      </div>
    </main>
  );
}