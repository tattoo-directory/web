import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const revalidate = 86400; // 24h (ISR)

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

function GlobeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M2 12h20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 2c2.5 2.7 4 6.2 4 10s-1.5 7.3-4 10c-2.5-2.7-4-6.2-4-10s1.5-7.3 4-10Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function PhoneIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3 5.2 2 2 0 0 1 5 3h3a2 2 0 0 1 2 1.7c.1.8.3 1.6.6 2.3a2 2 0 0 1-.5 2.1L9.9 10.3a16 16 0 0 0 3.8 3.8l1.2-1.2a2 2 0 0 1 2.1-.5c.7.3 1.5.5 2.3.6A2 2 0 0 1 22 16.9Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 22s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
        stroke="currentColor"
        strokeWidth="2"
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
  const { data: artists } = await supabase
    .from("artists")
    .select("city_slug, slug")
    .eq("country_code", "FR")
    .eq("is_active", true);

  return (artists ?? []).map((a) => ({ city: a.city_slug, slug: a.slug }));
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
      ? `Découvre ${artistName}, tatoueur à ${cityName}. Styles : ${styles}. Ouvre Instagram et contacte l’artiste.`
      : `Découvre ${artistName}, tatoueur à ${cityName}. Ouvre Instagram et contacte l’artiste.`,
  };
}

export default async function ArtistPage({
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

  const styles = (artist.style_slugs ?? []).slice(0, 8);

  return (
    <main className="min-h-screen bg-white text-black">
      {/* décor léger */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-black/[0.06] via-black/[0.03] to-transparent blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 py-10">
        {/* breadcrumb */}
        <div className="flex items-center gap-3 text-sm">
          <Link
            href={`/france/${city}`}
            className="text-black/70 hover:text-black transition"
          >
            ← Retour à {cityRow.name}
          </Link>
          <span className="text-black/30">/</span>
          <span className="font-medium">{artist.name}</span>
        </div>

        {/* Hero */}
        <div className="mt-8">
          <Badge>Tatoueur à {cityRow.name}</Badge>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            {artist.name}
          </h1>

          {styles.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {styles.map((s: string) => (
                <span
                  key={s}
                  className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-black/70"
                >
                  {slugToLabel(s)}
                </span>
              ))}
            </div>
          )}

          {artist.bio && (
            <div className="mt-6 rounded-3xl border border-black/10 bg-black/[0.02] p-6">
              <div className="text-sm font-semibold">À propos</div>
              <p className="mt-2 text-sm leading-relaxed text-black/70">
                {artist.bio}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {artist.instagram_url ? (
            <a
              href={artist.instagram_url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center justify-between rounded-3xl border border-black/10 bg-white p-5 shadow-sm hover:shadow transition"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl border border-black/10 bg-white">
                  <InstagramIcon className="h-5 w-5 text-black/70" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Instagram</div>
                  <div className="text-xs text-black/55">
                    Voir le profil et les photos
                  </div>
                </div>
              </div>
              <ArrowRightIcon className="h-5 w-5 text-black/60 transition group-hover:translate-x-0.5" />
            </a>
          ) : (
            <div className="flex items-center justify-between rounded-3xl border border-black/10 bg-black/[0.02] p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl border border-black/10 bg-white">
                  <InstagramIcon className="h-5 w-5 text-black/30" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-black/45">
                    Instagram indisponible
                  </div>
                  <div className="text-xs text-black/40">
                    Lien non renseigné
                  </div>
                </div>
              </div>
            </div>
          )}

          {artist.website_url ? (
            <a
              href={artist.website_url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center justify-between rounded-3xl border border-black/10 bg-white p-5 shadow-sm hover:shadow transition"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl border border-black/10 bg-white">
                  <GlobeIcon className="h-5 w-5 text-black/70" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Site web</div>
                  <div className="text-xs text-black/55">
                    Infos, booking, flashs…
                  </div>
                </div>
              </div>
              <ArrowRightIcon className="h-5 w-5 text-black/60 transition group-hover:translate-x-0.5" />
            </a>
          ) : (
            <div className="flex items-center justify-between rounded-3xl border border-black/10 bg-black/[0.02] p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl border border-black/10 bg-white">
                  <GlobeIcon className="h-5 w-5 text-black/30" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-black/45">
                    Site web indisponible
                  </div>
                  <div className="text-xs text-black/40">
                    Lien non renseigné
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Infos pratiques */}
        <div className="mt-8 rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold">Infos pratiques</div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {artist.phone ? (
              <div className="flex items-start gap-3">
                <PhoneIcon className="mt-0.5 h-5 w-5 text-black/60" />
                <div>
                  <div className="text-sm font-medium">Téléphone</div>
                  <div className="text-sm text-black/65">{artist.phone}</div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 text-black/40">
                <PhoneIcon className="mt-0.5 h-5 w-5" />
                <div>
                  <div className="text-sm font-medium">Téléphone</div>
                  <div className="text-sm">Non renseigné</div>
                </div>
              </div>
            )}

            {artist.address ? (
              <div className="flex items-start gap-3">
                <PinIcon className="mt-0.5 h-5 w-5 text-black/60" />
                <div>
                  <div className="text-sm font-medium">Adresse</div>
                  <div className="text-sm text-black/65">{artist.address}</div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 text-black/40">
                <PinIcon className="mt-0.5 h-5 w-5" />
                <div>
                  <div className="text-sm font-medium">Adresse</div>
                  <div className="text-sm">Non renseignée</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* footer */}
        <div className="mt-12 text-xs text-black/45">
          © {new Date().getFullYear()} TattooCityGuide
        </div>
      </div>
    </main>
  );
}