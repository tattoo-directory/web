import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function isAdminEnabled() {
  return process.env.ADMIN_ENABLED === "true";
}

export async function PATCH(req: NextRequest) {
  if (!isAdminEnabled()) {
    return NextResponse.json({ error: "Admin disabled" }, { status: 404 });
  }

  const body = await req.json();
  const { id, hidden, reviewed } = body as {
    id?: number;
    hidden?: boolean;
    reviewed?: boolean;
  };

  if (!id || typeof hidden !== "boolean") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const updatePayload: { hidden: boolean; reviewed?: boolean } = { hidden };
  if (typeof reviewed === "boolean") updatePayload.reviewed = reviewed;

  const { error } = await supabase
    .from("artist_ig_posts")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
