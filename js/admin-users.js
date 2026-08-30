// js/admin-users.js

async function requireAdmin() {
  const auth = await requireAuth();
  if (!auth) return null;

  if (auth.profile.role !== 'admin') {
    window.location.href = 'index.html'; // kick non-admins back to regular dashboard
    return null;
  }
  return auth;
}

async function searchUsers(query) {
  let req = supabaseClient
    .from('profiles')
    .select('id, username, display_name, is_suspended, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (query && query.trim()) {
    req = req.or(`username.ilike.%${query}%,display_name.ilike.%${query}%`);
  }

  const { data: profiles, error } = await req;
  if (error) {
    console.error('User search failed:', error);
    return [];
  }
  if (!profiles || profiles.length === 0) return [];

  // Fetch subscriptions separately (profiles<->subscriptions has two FKs —
  // user_id and activated_by — so nested embedding is ambiguous and fails silently)
  const userIds = profiles.map((p) => p.id);
  const { data: subs, error: subsError } = await supabaseClient
    .from('subscriptions')
    .select('user_id, status, plan_id')
    .in('user_id', userIds);

  if (subsError) {
    console.error('Failed to fetch subscriptions for user list:', subsError);
  }

  return profiles.map((p) => ({
    ...p,
    subscriptions: (subs || []).filter((s) => s.user_id === p.id),
  }));
}

async function fetchUserDetail(userId) {
  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError) return null;

  const { data: subscription } = await supabaseClient
    .from('subscriptions')
    .select('*, plans:plan_id (label)')
    .eq('user_id', userId)
    .maybeSingle();

  return { profile, subscription };
}

async function adminEnableUser(userId, planId) {
  const { error } = await supabaseClient.rpc('admin_activate_subscription', {
    p_user_id: userId,
    p_plan_id: planId,
  });
  if (error) throw error;
}

async function adminDisableUser(userId) {
  const { error } = await supabaseClient.rpc('admin_pause_subscription', {
    p_user_id: userId,
  });
  if (error) throw error;
}

async function adminSuspendUser(userId) {
  const { error } = await supabaseClient.rpc('admin_suspend_user', { p_user_id: userId });
  if (error) throw error;
}

async function adminUnsuspendUser(userId) {
  const { error } = await supabaseClient.rpc('admin_unsuspend_user', { p_user_id: userId });
  if (error) throw error;
}

async function adminDeleteUser(userId) {
  const { data: { session } } = await supabaseClient.auth.getSession();
  const res = await fetch('/api/admin-delete-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ targetUserId: userId }),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Delete failed');
  return result;
}