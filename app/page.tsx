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

function StarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 3.5 14.6 9l5.4.6-4 3.7 1.1 5.2L12 16.6 7 18.5l1.1-5.2-4-3.7L9.4 9 12 3.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function MapPinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 3.5a6 6 0 0 0-6 6c0 3.9 3.6 7.7 5.2 9.2.4.4 1.1.4 1.6 0C14.4 17.2 18 13.4 18 9.5a6 6 0 0 0-6-6Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="9.5" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function ChatBubbleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M5 6.5A3.5 3.5 0 0 1 8.5 3h7A3.5 3.5 0 0 1 19 6.5v4A3.5 3.5 0 0 1 15.5 14H11l-3.5 3.5V14"
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
    <span className="inline-flex items-center rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-xs font-medium text-black/75">
      {children}
    </span>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-black/[0.02] px-4 py-3 sm:px-5 sm:py-4">
      <div className="flex items-start gap-3">
        <div className="mt-[1px] grid h-7 w-7 place-items-center rounded-full bg-white text-black/70 shadow-sm">
          {icon}
        </div>
        <div>
          <div className="text-sm font-semibold text-black/85">{title}</div>
          <div className="mt-1 text-sm leading-6 text-black/60">
            {description}
          </div>
        </div>
      </div>
    </div>
  );
}

function CityCard({
  href,
  name,
  description,
}: {
  href: string;
  name: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-black/10 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-semibold tracking-tight">{name}</div>
          <p className="mt-2 text-sm leading-6 text-black/60">{description}</p>
        </div>

        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-black/10 bg-white shadow-sm">
          <ArrowRightIcon className="h-5 w-5 text-black/70 transition group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fcfcfc] text-black">
      {/* Décor léger */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-gradient-to-br from-black/[0.05] via-black/[0.025] to-transparent blur-3xl" />
      </div>

      <div className="relative">
        {/* Header */}
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-black/10 bg-white shadow-sm">
              <Image
                src="/favicon.png"
                alt="TattooCityGuide"
                width={20}
                height={20}
              />
            </div>
            <span className="text-sm font-semibold tracking-tight">
              TattooCityGuide
            </span>
          </Link>

          <Link
            href="/france"
            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:shadow-md"
          >
            Parcourir
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </header>

        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pb-14 pt-10 sm:pt-14">
          <div className="max-w-4xl">
            <Badge>Annuaire de tatoueurs • France</Badge>

            <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl md:leading-[1.02]">
              Découvrez les meilleurs tatoueurs en France.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-black/65 sm:text-lg">
              Explorez des tatoueurs par ville et par style. Accédez rapidement
              à leur Instagram et trouvez plus facilement le bon artiste pour
              votre prochain tatouage.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href="/france"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              >
                Parcourir les tatoueurs
                <ArrowRightIcon className="h-4 w-4 text-white" />
              </Link>

              <Link
                href="/france/paris"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-black shadow-sm transition hover:shadow-md"
              >
                Voir les tatoueurs à Paris
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Avantages */}
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              title="Tatoueurs sélectionnés"
              description="Une sélection d’artistes inspirants à découvrir ville par ville."
              icon={<StarIcon className="h-4 w-4" />}
            />
            <FeatureCard
              title="Recherche par ville"
              description="Trouvez plus facilement un tatoueur près de chez vous ou pour un futur déplacement."
              icon={<MapPinIcon className="h-4 w-4" />}
            />
            <FeatureCard
              title="Contact direct"
              description="Accédez rapidement à Instagram, à l’adresse du studio ou aux informations utiles."
              icon={<ChatBubbleIcon className="h-4 w-4" />}
            />
          </div>
        </section>

        {/* Villes */}
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-sm backdrop-blur-sm sm:p-8">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Villes disponibles
              </h2>

              <p className="mt-3 text-sm leading-7 text-black/60 sm:text-base">
                Commencez par explorer les principales villes déjà disponibles
                dans l’annuaire. D’autres destinations seront ajoutées
                progressivement.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              <CityCard
                href="/france/paris"
                name="Paris"
                description="Découvrez une sélection de tatoueurs à Paris, par style et par univers."
              />

              <CityCard
                href="/france/lyon"
                name="Lyon"
                description="Explorez les tatoueurs présents à Lyon et trouvez l’artiste qui vous correspond."
              />

              <CityCard
                href="/france/marseille"
                name="Marseille"
                description="Parcourez les tatoueurs à Marseille et accédez facilement à leurs profils."
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}