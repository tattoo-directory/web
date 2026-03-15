"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";

type PostRow = {
  id: number;
  artist_id: number;
  shortcode: string | null;
  ig_post_url: string | null;
  image_path: string | null;
  taken_at: string | null;
  created_at: string | null;
  hidden: boolean;
  image_url: string | null;
  artists?: {
    id: number;
    name: string;
    city_slug: string | null;
    slug: string | null;
  } | null;
};

type Props = {
  initialPosts: PostRow[];
};

export default function ReviewClient({ initialPosts }: Props) {
  const [posts, setPosts] = useState<PostRow[]>(initialPosts);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastAction, setLastAction] = useState<string>("");

  const current = posts[index] ?? null;

  const total = posts.length;
  const progress = total === 0 ? 0 : Math.round(((index + 1) / total) * 100);

  const visiblePosts = posts.slice(index, index + 12);

  const goNext = useCallback(() => {
    setIndex((prev) => Math.min(prev + 1, posts.length - 1));
  }, [posts.length]);

  const goPrev = useCallback(() => {
    setIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const updatePost = useCallback(
    async (postId: number, hidden: boolean, reviewed: boolean) => {
      setLoading(true);

      const res = await fetch("/api/admin/ig-posts", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: postId, hidden, reviewed }),
      });

      const json = await res.json();
      setLoading(false);

      if (!res.ok) {
        alert(json.error || "Erreur");
        return false;
      }

      return true;
    },
    []
  );

  const markTattoo = useCallback(async () => {
    if (loading || visiblePosts.length === 0) return;

    setLoading(true);

    const results = await Promise.all(
      visiblePosts.map((post) => updatePost(post.id, false, true))
    );

    setLoading(false);

    if (results.some((ok) => !ok)) {
      setLastAction("Erreur pendant la validation du lot");
      return;
    }

    const visibleIds = new Set(visiblePosts.map((post) => post.id));
    setLastAction("Lot validé / tattoo");
    setPosts((prev) => prev.filter((post) => !visibleIds.has(post.id)));
  }, [loading, visiblePosts, updatePost]);

  const markNonTattoo = useCallback(async () => {
    if (!current || loading) return;

    const ok = await updatePost(current.id, true, true);
    if (!ok) return;

    setLastAction("Non tattoo / masqué");
    setPosts((prev) => prev.filter((post) => post.id !== current.id));
  }, [current, loading, updatePost]);

  const markGridPostNonTattoo = useCallback(
    async (postId: number) => {
      if (loading) return;

      const ok = await updatePost(postId, true, true);
      if (!ok) return;

      setLastAction("Non tattoo / masqué");

      setPosts((prev) => prev.filter((post) => post.id !== postId));
    },
    [loading, updatePost]
  );

  const unhideCurrent = useCallback(async () => {
    if (!current || loading) return;

    const ok = await updatePost(current.id, false, true);
    if (!ok) return;

    setLastAction("Remis visible");
  }, [current, loading, updatePost]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      const key = event.key.toLowerCase();

      if (key === "arrowright") {
        event.preventDefault();
        goNext();
      }

      if (key === "arrowleft") {
        event.preventDefault();
        goPrev();
      }

      if (key === "t") {
        event.preventDefault();
        void markTattoo();
      }

      if (key === "n") {
        event.preventDefault();
        void markNonTattoo();
      }

      if (key === "u") {
        event.preventDefault();
        void unhideCurrent();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev, markTattoo, markNonTattoo, unhideCurrent]);

  if (!current) {
    return (
      <main className="min-h-screen bg-black text-white p-8">
        <h1 className="text-3xl font-bold mb-4">Review terminée</h1>
        <p>Tous les posts chargés ont été traités.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold">Review Instagram posts</h1>
            <p className="text-sm text-gray-300 mt-1">
              {index + 1} / {total} — {progress}%
            </p>
          </div>

          <div className="text-right text-sm text-gray-300">
            <div>T = tattoo</div>
            <div>N = non tattoo</div>
            <div>← / → = navigation</div>
          </div>
        </div>

        <div className="mb-4 h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
          <div className="grid grid-cols-4 gap-4">
            {visiblePosts.map((post) => (
              <div
                key={post.id}
                className="relative aspect-square cursor-pointer bg-zinc-900 rounded-lg overflow-hidden"
                onClick={() => void markGridPostNonTattoo(post.id)}
              >
                {post.image_url ? (
                  <Image
                    src={post.image_url}
                    alt=""
                    fill
                    className="object-cover rounded-lg"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                    Pas d&apos;image
                  </div>
                )}
              </div>
            ))}
          </div>

          <aside className="bg-zinc-900 rounded-2xl p-5">
            <div className="mb-4">
              <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">
                Artiste
              </div>
              <div className="text-lg font-semibold">
                {current.artists?.name || "Inconnu"}
              </div>
              <div className="text-sm text-gray-400">
                {current.artists?.city_slug || "—"}
              </div>
            </div>

            <div className="mb-4 text-sm text-gray-300 space-y-1">
              <div>Post ID : {current.id}</div>
              <div>Artist ID : {current.artist_id}</div>
              {current.shortcode ? <div>Shortcode : {current.shortcode}</div> : null}
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => void markTattoo()}
                disabled={loading}
                className="w-full rounded-xl px-4 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 font-medium"
              >
                Tattoo (T)
              </button>

              <button
                onClick={() => void markNonTattoo()}
                disabled={loading}
                className="w-full rounded-xl px-4 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 font-medium"
              >
                Non tattoo (N)
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={goPrev}
                  disabled={loading || index === 0}
                  className="rounded-xl px-4 py-3 bg-white/10 hover:bg-white/20 disabled:opacity-50"
                >
                  Précédent
                </button>

                <button
                  onClick={goNext}
                  disabled={loading || index >= total - 1}
                  className="rounded-xl px-4 py-3 bg-white/10 hover:bg-white/20 disabled:opacity-50"
                >
                  Suivant
                </button>
              </div>

              {current.ig_post_url ? (
                <a
                  href={current.ig_post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm underline text-gray-300 mt-2"
                >
                  Voir sur Instagram
                </a>
              ) : null}
            </div>

            <div className="mt-5 text-sm text-gray-400">
              {loading ? "Enregistrement..." : lastAction || "Prêt"}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
