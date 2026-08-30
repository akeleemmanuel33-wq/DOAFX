

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (_req) => {
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  
  const { data: activeSubs, error: fetchError } = await supabase
    .from("subscriptions")
    .select("id, user_id, remaining_seconds, last_resumed_at, status")
    .eq("status", "active");

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
    });
  }

  const now = Date.now();
  const expiredIds: string[] = [];

  for (const sub of activeSubs ?? []) {
    if (!sub.last_resumed_at) continue;

    const resumedAt = new Date(sub.last_resumed_at).getTime();
    const elapsedSeconds = Math.floor((now - resumedAt) / 1000);
    const liveRemaining = sub.remaining_seconds - elapsedSeconds;

    if (liveRemaining <= 0) {
      expiredIds.push(sub.id);
    }
  }

  if (expiredIds.length > 0) {
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        status: "expired",
        remaining_seconds: 0,
        last_resumed_at: null,
        updated_at: new Date().toISOString(),
      })
      .in("id", expiredIds);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
      });
    }
  }

  return new Response(
    JSON.stringify({
      checked: activeSubs?.length ?? 0,
      expired: expiredIds.length,
      expired_ids: expiredIds,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});