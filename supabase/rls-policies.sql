alter table profiles enable row level security;
alter table subscriptions enable row level security;
alter table payment_submissions enable row level security;
alter table signals enable row level security;
alter table push_subscriptions enable row level security;
alter table plans enable row level security;


create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql stable security definer;


create policy "plans_public_read" on plans
  for select using (true);

create policy "plans_admin_write" on plans
  for all using (is_admin()) with check (is_admin());


create policy "profiles_self_read" on profiles
  for select using (id = auth.uid() or is_admin());

create policy "profiles_self_update" on profiles
  for update using (id = auth.uid() or is_admin());
 

create policy "profiles_admin_search" on profiles
  for select using (is_admin());

 
create policy "subscriptions_self_read" on subscriptions
  for select using (user_id = auth.uid() or is_admin());


create policy "subscriptions_admin_all" on subscriptions
  for all using (is_admin()) with check (is_admin());

 
create policy "payments_self_insert" on payment_submissions
  for insert with check (user_id = auth.uid());

create policy "payments_self_read" on payment_submissions
  for select using (user_id = auth.uid() or is_admin());

create policy "payments_admin_update" on payment_submissions
  for update using (is_admin());

 
create policy "signals_admin_insert" on signals
  for insert with check (is_admin());

create policy "signals_admin_update" on signals
  for update using (is_admin());

create policy "signals_eligible_read" on signals
  for select using (
    is_admin()
    or exists (
      select 1 from subscriptions s
      where s.user_id = auth.uid()
        and s.status = 'active'
        and get_live_remaining_seconds(s) > 0
    )
  );

 
create policy "push_self_insert" on push_subscriptions
  for insert with check (user_id = auth.uid());

create policy "push_self_read" on push_subscriptions
  for select using (user_id = auth.uid() or is_admin());

create policy "push_self_delete" on push_subscriptions
  for delete using (user_id = auth.uid());


create policy "receipts_own_upload" on storage.objects
  for insert with check (
    bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "receipts_own_read" on storage.objects
  for select using (
    bucket_id = 'receipts' and (
      (storage.foldername(name))[1] = auth.uid()::text or is_admin()
    )
  );

 
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_own_write" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_own_update" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );