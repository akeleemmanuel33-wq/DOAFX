// api/admin-delete-user.js
//
// Deletes a user account entirely (auth + profile via cascade).
// Requires SUPABASE_SERVICE_ROLE_KEY as a Vercel environment variable
// (Project Settings -> Environment Variables). NEVER expose this key
// to the client — it bypasses RLS completely.
//
// This function verifies the CALLER is an authenticated admin before
// performing the deletion, using their own access token.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { targetUserId } = req.body;
  const authHeader = req.headers.authorization; // 'Bearer <caller's access token>'

  if (!targetUserId || !authHeader) {
    return res.status(400).json({ error: 'Missing targetUserId or auth token' });
  }

  const callerToken = authHeader.replace('Bearer ', '');

  // Verify the caller's identity + admin role using their own token
  const supabaseAsCaller = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: `Bearer ${callerToken}` } },
  });

  const { data: { user: caller }, error: callerError } = await supabaseAsCaller.auth.getUser(callerToken);

  if (callerError || !caller) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single();

  if (callerProfile?.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete accounts' });
  }

  // Perform the deletion — cascades to profiles/subscriptions/etc via FK
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId);

  if (deleteError) {
    return res.status(500).json({ error: deleteError.message });
  }

  return res.status(200).json({ success: true });
}