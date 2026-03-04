import Link from "next/link";
import Image from "next/image";

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

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-black/10 bg-black/3 px-3 py-1 text-xs font-medium text-black/80">
      {children}
    </span>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-black">
      {/* Décor */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-linear-to-tr from-black/6 via-black/3 to-transparent blur-3xl" />
      </div>

      <div className="relative">
        {/* Header */}
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Link href="/" className="inline-flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl border border-black/10 bg-white shadow-sm">
      <Image src="/favicon.png" alt="TattooCityGuide" width={20} height={20} />
      </div>
            <span className="text-sm font-semibold tracking-tight">
              TattooCityGuide
            </span>
          </Link>

          <Link
            href="/france"
            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:shadow transition"
          >
            Parcourir
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </header>

        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pt-10 pb-14">
          <div className="grid gap-10 md:grid-cols-12 md:items-center">
            <div className="md:col-span-7 md:col-start-1 md:col-end-13">
              <Badge>Annuaire de tatoueurs • France</Badge>

              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
                Découvrez les meilleurs tatoueurs.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-relaxed text-black/65 sm:text-lg">
                Explorez des tatoueurs par ville et par style. Accédez à leur
                Instagram et trouvez facilement votre prochain artiste.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/france"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition"
                >
                  Parcourir les tatoueurs
                  <ArrowRightIcon className="h-4 w-4 text-white" />
                </Link>

                <Link
                  href="/france/paris"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-black shadow-sm hover:shadow transition"
                >
                  Voir les tatoueurs à Paris
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>

              {/* Avantages */}
              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
                  <div className="text-sm font-semibold">Artistes sélectionnés</div>
                  <div className="mt-1 text-sm text-black/60">
                    Une sélection de tatoueurs inspirants.
                  </div>
                </div>

                <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
                  <div className="text-sm font-semibold">Par ville</div>
                  <div className="mt-1 text-sm text-black/60">
                    Trouvez facilement près de chez vous.
                  </div>
                </div>

                <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
                  <div className="text-sm font-semibold">Contact direct</div>
                  <div className="mt-1 text-sm text-black/60">
                    Instagram, adresse ou téléphone.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Villes disponibles */}
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <h2 className="text-2xl font-semibold tracking-tight">
            Villes disponibles
          </h2>

          <p className="mt-2 max-w-2xl text-sm text-black/60">
            Nous ajoutons progressivement des villes pour découvrir les meilleurs
            tatoueurs partout en France.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Paris */}
            <Link
              href="/france/paris"
              className="group rounded-3xl border border-black/10 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">Paris</div>
                  <p className="text-sm text-black/60">
                    Découvrez les tatoueurs à Paris.
                  </p>
                </div>

                <ArrowRightIcon className="h-5 w-5 text-black/70 group-hover:translate-x-1 transition" />
              </div>
            </Link>

            {/* Lyon */}
            <div className="rounded-3xl border border-dashed border-black/15 bg-white p-6">
              <div className="text-lg font-semibold text-black/70">Lyon</div>
              <p className="text-sm text-black/55">Bientôt disponible</p>
            </div>

            {/* Marseille */}
            <div className="rounded-3xl border border-dashed border-black/15 bg-white p-6">
              <div className="text-lg font-semibold text-black/70">Marseille</div>
              <p className="text-sm text-black/55">Bientôt disponible</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}