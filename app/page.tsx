import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <div className="max-w-4xl mx-auto px-6 py-20">

        {/* Header */}
        <div className="mb-16">
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            Discover the best tattoo artists.
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl">
            Explore curated tattoo artists by city. Browse styles,
            open Instagram, and contact your next artist easily.
          </p>
        </div>

        {/* CTA */}
        <div className="mb-20">
          <Link
            href="/france"
            className="inline-block bg-black text-white px-8 py-4 rounded-full text-lg hover:opacity-80 transition"
          >
            Browse France →
          </Link>
        </div>

        {/* Countries Section (future scalable) */}
        <div>
          <h2 className="text-2xl font-semibold mb-6">Available countries</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Link
              href="/france"
              className="border rounded-2xl p-6 hover:shadow-md transition"
            >
              <h3 className="text-xl font-medium mb-2">France</h3>
              <p className="text-gray-500">
                Discover tattoo artists in Paris and more cities soon.
              </p>
            </Link>
          </div>
        </div>

      </div>
    </main>
  );
}
