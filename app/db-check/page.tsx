"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function DbCheckPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const res = await supabase
        .from("cities")
        .select("*")
        .eq("country_code", "FR")
        .eq("slug", "paris")
        .single();

      setData(res.data);
      setError(res.error);
    })();
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>Supabase DB check</h1>
      {error ? (
        <pre>{JSON.stringify(error, null, 2)}</pre>
      ) : (
        <pre>{JSON.stringify(data, null, 2)}</pre>
      )}
    </main>
  );
}
