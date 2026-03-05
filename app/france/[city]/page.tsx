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
  style_slugs: string[] | null;
  ig_posts: IgPost[] | null;
};

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
    .select("id, name, slug, instagram_url, style_slugs, ig_posts")
    .eq("country_code", "FR")
    .eq("city_slug", city)
    .eq("is_active", true)
    .order("id", { ascending: true });

  const artistIds = (artists ?? []).map((a) => a.id);

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
            {safeArtists.length} artiste{safeArtists.length > 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Header */}
        <div className="mt-8 max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Tatoueurs à {cityRow.name}
          </h1>
          <p className="mt-3 text-base text-black/65">
            Parcourez les artistes, consultez leur Instagram et accédez à leur
            page détaillée.
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
          <section className="mt-10">
            <h2 className="text-lg font-semibold tracking-tight">
              Artistes disponibles
            </h2>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {safeArtists.map((a: ArtistRow) => {
              const miniPosts = postsByArtistId.get(a.id) ?? [];
                const styles = (a.style_slugs ?? []).slice(0, 4);
                const hasInstagram = Boolean(a.instagram_url);

                return (
                  <div
                    key={a.id}
                    className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Link
                          href={`/france/${city}/${a.slug}`}
                          className="text-base font-semibold hover:underline"
                        >
                          {a.name}
                        </Link>

                        {styles.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {styles.map((s) => (
                              <span
                                key={s}
                                className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-xs text-black/70"
                              >
                                {slugToLabel(s)}
                              </span>
                            ))}
                            <div className="mt-4 grid grid-cols-3 gap-2">
  {miniPosts.length > 0 ? (
    miniPosts.map((p) => {
      const imgUrl =
        supabase.storage.from("ig").getPublicUrl(p.image_path).data.publicUrl;

      return (
        <a
          key={p.shortcode}
          href={p.ig_post_url}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden rounded-xl border border-black/10"
        >
          <Image
            src={imgUrl}
            alt=""
            width={240}
            height={240}
            className="aspect-square w-full object-cover"
            loading="lazy"
          />
        </a>
      );
    })
  ) : (
    Array.from({ length: 6 }).map((_, i) => (
      <div
        key={i}
        className="aspect-square w-full rounded-xl border border-black/10 bg-black/[0.02]"
      />
    ))
  )}
</div>
                          </div>
                        ) : (
                          <div className="mt-3 text-sm text-black/50">
                            Styles non renseignés
                          </div>
                        )}
                      </div>

                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-black/10 bg-white shadow-sm">
                        <ArrowRightIcon className="h-5 w-5 text-black/60" />
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {hasInstagram ? (
                        <a
                          href={a.instagram_url!}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:shadow transition"
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
                        className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition"
                      >
                        Voir la page
                        <ArrowRightIcon className="h-4 w-4 text-white" />
                      </Link>
                    </div>
                    {/* Instagram preview */}

                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Footer mini */}
        <div className="mt-12 text-xs text-black/45">
          © {new Date().getFullYear()} TattooCityGuide
        </div>
      </div>
    </main>
  );
}