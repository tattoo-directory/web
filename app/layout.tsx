import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TattooCityGuide — Trouvez les meilleurs tatoueurs",
  description:
    "Découvrez les meilleurs tatoueurs en France. Explorez les artistes par ville, consultez leur Instagram et trouvez facilement votre prochain tatouage.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link
              href="/"
              className="inline-flex items-center gap-3 text-sm font-semibold tracking-tight text-black"
            >
              <div className="grid h-9 w-9 place-items-center rounded-xl border border-black/10 bg-white shadow-sm">
                <Image
                  src="/favicon.png"
                  alt="TattooCityGuide"
                  width={20}
                  height={20}
                />
              </div>
              <span>TattooCityGuide</span>
            </Link>

            <nav className="flex gap-5 text-xs sm:text-sm text-black/65">
              <Link
                href="/france"
                className="hover:text-black transition-colors"
              >
                Villes
              </Link>
              <Link
                href="/france/regions"
                className="hover:text-black transition-colors"
              >
                Régions
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}