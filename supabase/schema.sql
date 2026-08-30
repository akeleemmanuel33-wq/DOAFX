
create extension if not exists "uuid-ossp";

 
create table plans (
  id text primary key,                 -- 'weekly' | 'monthly' | 'yearly'
  label text not null,
  price_ngn numeric not null,
  duration_seconds bigint not null,    -- e.g. weekly = 604800
  created_at timestamptz default now()
);

insert into plans (id, label, price_ngn, duration_seconds) values
  ('weekly', 'Weekly', 15000, 604800),
  ('monthly', 'Monthly', 50000, 2592000),
  ('yearly', 'Yearly', 500000, 31536000);
 
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,       -- immutable after creation, enforced below
  display_name text,
  bio text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

 
create or replace function prevent_username_change()
returns trigger as $$
begin
  if old.username is distinct from new.username then
    raise exception 'Username cannot be changed after account creation';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_prevent_username_change
before update on profiles
for each row execute function prevent_username_change();

 
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', 'New User')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_handle_new_user
after insert on auth.users
for each row execute function handle_new_user();

 
create table subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  plan_id text not null references plans(id),
  status text not null default 'inactive'
    check (status in ('inactive', 'active', 'paused', 'expired')),
  remaining_seconds bigint not null default 0,   -- frozen value while paused/inactive
  last_resumed_at timestamptz,                   -- set whenever status becomes 'active'
  activated_by uuid references profiles(id),     -- which admin enabled it
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_subscriptions_user_id on subscriptions(user_id);
create index idx_subscriptions_status on subscriptions(status);

 
create or replace function get_live_remaining_seconds(sub subscriptions)
returns bigint as $$
begin
  if sub.status = 'active' and sub.last_resumed_at is not null then
    return greatest(0, sub.remaining_seconds - extract(epoch from (now() - sub.last_resumed_at))::bigint);
  else
    return sub.remaining_seconds; -- paused/inactive/expired: frozen value
  end if;
end;
$$ language plpgsql stable;

 
create or replace function admin_activate_subscription(p_user_id uuid, p_plan_id text)
returns void as $$
declare
  v_duration bigint;
begin
  select duration_seconds into v_duration from plans where id = p_plan_id;

  insert into subscriptions (user_id, plan_id, status, remaining_seconds, last_resumed_at, activated_by)
  values (p_user_id, p_plan_id, 'active', v_duration, now(), auth.uid())
  on conflict (user_id) do update
    set plan_id = p_plan_id,
        status = 'active',
        remaining_seconds = v_duration,
        last_resumed_at = now(),
        activated_by = auth.uid(),
        updated_at = now();
end;
$$ language plpgsql security definer;

 
create or replace function admin_pause_subscription(p_user_id uuid)
returns void as $$
declare
  v_sub subscriptions;
  v_frozen bigint;
begin
  select * into v_sub from subscriptions where user_id = p_user_id;
  v_frozen := get_live_remaining_seconds(v_sub);

  update subscriptions
  set status = 'paused',
      remaining_seconds = v_frozen,
      last_resumed_at = null,
      updated_at = now()
  where user_id = p_user_id;
end;
$$ language plpgsql security definer;
 
alter table subscriptions add constraint uq_subscriptions_user_id unique (user_id);

 
create table payment_submissions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  plan_id text not null references plans(id),
  receipt_url text not null,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'confirmed', 'rejected')),
  submitted_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references profiles(id)
);

create index idx_payment_submissions_user_id on payment_submissions(user_id);
create index idx_payment_submissions_status on payment_submissions(status);

 
create table signals (
  id uuid primary key default uuid_generate_v4(),
  pair text not null,                  -- e.g. 'EUR/USD'
  direction text not null check (direction in ('buy', 'sell')),
  entry_price numeric not null,
  stop_loss numeric,
  take_profit numeric,
  status text not null default 'active'
    check (status in ('active', 'closed', 'hit_tp', 'hit_sl')),
  notes text,
  created_by uuid not null references profiles(id),
  created_at timestamptz default now()
);

create index idx_signals_created_at on signals(created_at desc);
create index idx_signals_status on signals(status);

 
create table push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz default now()
);

create index idx_push_subscriptions_user_id on push_subscriptions(user_id);

 
create or replace function touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at before update on profiles
  for each row execute function touch_updated_at();

create trigger trg_subscriptions_updated_at before update on subscriptions
  for each row execute function touch_updated_at();

 
insert into storage.buckets (id, name, public) values ('receipts', 'receipts', false);
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);