import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import ReviewClient from "@/app/admin/ig-posts/review-client";

export const dynamic = "force-dynamic";

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

export default async function AdminIgPostsPage() {
  if (process.env.ADMIN_ENABLED !== "true") {
    notFound();
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase env vars");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase
  .from("artist_ig_posts")
  .select(`
    id,
    artist_id,
    shortcode,
    ig_post_url,
    image_path,
    taken_at,
    created_at,
    hidden,
    artists (
      id,
      name,
      city_slug,
      slug
    )
  `)
  .eq("reviewed", false)
  .eq("hidden", false)
  .order("id", { ascending: true })
  .limit(2000);

  if (error) {
    throw new Error(error.message);
  }

  const raw = (data ?? []) as unknown as Omit<PostRow, "image_url">[];
  const posts: PostRow[] = raw.map((row) => ({
    ...row,
    image_url: row.image_path
      ? supabase.storage.from("ig").getPublicUrl(row.image_path).data.publicUrl
      : null,
  }));

  return <ReviewClient initialPosts={posts} />;
}
