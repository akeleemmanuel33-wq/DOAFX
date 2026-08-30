// api/send-push.js
//
// Triggered by a Supabase Database Webhook on INSERT to the `signals` table.
// Sends a Web Push notification to every currently-active, non-suspended
// subscriber's registered devices.
//
// Setup:
// 1. Add env vars in Vercel: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
//    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// 2. Supabase Dashboard -> Database -> Webhooks -> Create a new webhook:
//    - Table: signals
//    - Events: Insert
//    - Type: HTTP Request
//    - URL: https://your-domain.vercel.app/api/send-push
//    - Method: POST

import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

webpush.setVapidDetails(
  'mailto:support@doafx.com', // replace with your real support email
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Supabase Database Webhooks send the inserted row under `record`
  const signal = req.body?.record;
  if (!signal) {
    return res.status(400).json({ error: 'No signal record in payload' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Find every push subscription belonging to a currently-active,
  // non-suspended subscriber
  const { data: eligibleSubs, error: subError } = await supabase
    .from('subscriptions')
    .select('user_id, status, remaining_seconds, last_resumed_at, profiles!inner(is_suspended)')
    .eq('status', 'active')
    .eq('profiles.is_suspended', false);

  if (subError) {
    return res.status(500).json({ error: subError.message });
  }

  // Filter to those whose live remaining time is actually > 0
  // (mirrors the get_live_remaining_seconds SQL logic)
  const now = Date.now();
  const eligibleUserIds = (eligibleSubs || [])
    .filter((s) => {
      if (!s.last_resumed_at) return false;
      const elapsed = Math.floor((now - new Date(s.last_resumed_at).getTime()) / 1000);
      return s.remaining_seconds - elapsed > 0;
    })
    .map((s) => s.user_id);

  if (eligibleUserIds.length === 0) {
    return res.status(200).json({ sent: 0, message: 'No eligible subscribers' });
  }

  const { data: pushSubs, error: pushError } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', eligibleUserIds);

  if (pushError) {
    return res.status(500).json({ error: pushError.message });
  }

  const payload = JSON.stringify({
    title: `New Signal: ${signal.pair} — ${signal.direction.toUpperCase()}`,
    body: `Entry ${signal.entry_price}${signal.stop_loss ? ` · SL ${signal.stop_loss}` : ''}${signal.take_profit ? ` · TP ${signal.take_profit}` : ''}`,
    url: '/dashboard/index.html',
  });

  const results = await Promise.allSettled(
    (pushSubs || []).map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth_key },
        },
        payload
      )
    )
  );

  // Clean up subscriptions that are no longer valid (410 Gone / 404)
  const toRemove = [];
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      const statusCode = result.reason?.statusCode;
      if (statusCode === 410 || statusCode === 404) {
        toRemove.push(pushSubs[i].id);
      }
    }
  });

  if (toRemove.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', toRemove);
  }

  const sentCount = results.filter((r) => r.status === 'fulfilled').length;

  return res.status(200).json({
    sent: sentCount,
    failed: results.length - sentCount,
    cleaned: toRemove.length,
  });
}