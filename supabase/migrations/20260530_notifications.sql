-- Migration: Create notifications table for real-time alerts
-- Run this in the Supabase SQL editor

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) not null,
  type text not null check (type in (
    'new_order', 'order_confirmed', 'order_cancelled', 'low_stock'
  )),
  title text not null,
  message text not null,
  data jsonb default '{}'::jsonb,
  read boolean default false,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.notifications enable row level security;

-- Users can only see their own notifications
create policy "Users view own notifications"
  on notifications for select
  using (user_id = auth.uid());

-- Users can mark their own notifications as read (but not modify content)
create policy "Users update own notifications"
  on notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Note: INSERT is done server-side via service_role key (supabaseAdmin),
-- so no INSERT policy is needed for end users.

-- Enable Realtime for this table
alter publication supabase_realtime add table notifications;

-- Index for fast unread queries
create index if not exists idx_notifications_user_unread
  on notifications(user_id, read, created_at desc);
