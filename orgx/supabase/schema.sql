-- ============================================================
-- OrgX schema — run in Supabase SQL editor
-- Tables: orgs, memberships, tasks, plans, works, attachments,
--         comments, feedbacks
-- Auth:   uses Supabase auth.users
-- Storage bucket: "orgx-files" (created separately via dashboard)
-- ============================================================

-- ─── Helper: updated_at trigger ────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── orgs (companies) ──────────────────────────────────────
create table if not exists public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── memberships (user ↔ org with role) ────────────────────
-- role: 'ceo' | 'admin' | 'worker'
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('ceo','admin','worker')),
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create index if not exists memberships_org_idx on public.memberships(org_id);
create index if not exists memberships_user_idx on public.memberships(user_id);

-- ─── tasks ─────────────────────────────────────────────────
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  title text not null,
  description text default '',
  due_date date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_org_idx on public.tasks(org_id);

-- ─── plans (checklist items) ───────────────────────────────
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  text text not null,
  done boolean not null default false,
  pending_review boolean not null default false,
  primary_assignee_id uuid references public.memberships(id) on delete set null,
  secondary_assignee_id uuid references public.memberships(id) on delete set null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists plans_task_idx on public.plans(task_id);

-- ─── attachments / works (unified) ─────────────────────────
-- kind: 'reference' (task-level) | 'work' (plan-level)
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete cascade,
  kind text not null check (kind in ('reference','work')),
  name text not null,
  size bigint not null,
  mime_type text not null,
  storage_path text not null,    -- path inside the storage bucket
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists attachments_task_idx on public.attachments(task_id);
create index if not exists attachments_plan_idx on public.attachments(plan_id);

-- ─── comments (file-anchored & general) ───────────────────
-- target_type: 'task' | 'attachment'
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  target_type text not null check (target_type in ('task','attachment')),
  task_id uuid references public.tasks(id) on delete cascade,
  attachment_id uuid references public.attachments(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  body text not null,
  pin_x numeric,                 -- 0..1 normalized; null if no pin
  pin_y numeric,
  resolved boolean not null default false,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists comments_target_attachment_idx on public.comments(attachment_id);
create index if not exists comments_target_task_idx on public.comments(task_id);

-- ─── feedbacks (timeline updates per task) ─────────────────
create table if not exists public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists feedbacks_task_idx on public.feedbacks(task_id);

-- ─── updated_at triggers ───────────────────────────────────
drop trigger if exists trg_orgs_updated on public.orgs;
create trigger trg_orgs_updated before update on public.orgs
  for each row execute function public.set_updated_at();

drop trigger if exists trg_tasks_updated on public.tasks;
create trigger trg_tasks_updated before update on public.tasks
  for each row execute function public.set_updated_at();

drop trigger if exists trg_plans_updated on public.plans;
create trigger trg_plans_updated before update on public.plans
  for each row execute function public.set_updated_at();
