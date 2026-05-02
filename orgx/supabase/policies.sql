-- ============================================================
-- OrgX Row Level Security policies
-- Rule of thumb:
--   * read: any member of the org can read its data
--   * write tasks/plans/attachments/feedbacks: any member
--   * delete plans / approve plan completion: only ceo or admin
--   * update memberships / org name: only ceo
-- ============================================================

-- helper: is the current user a member of this org?
create or replace function public.is_org_member(_org uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = _org and m.user_id = auth.uid()
  );
$$;

-- helper: current user role in this org
create or replace function public.org_role(_org uuid)
returns text language sql stable as $$
  select role from public.memberships m
  where m.org_id = _org and m.user_id = auth.uid()
  limit 1;
$$;

-- ─── enable RLS ────────────────────────────────────────────
alter table public.orgs        enable row level security;
alter table public.memberships enable row level security;
alter table public.tasks       enable row level security;
alter table public.plans       enable row level security;
alter table public.attachments enable row level security;
alter table public.comments    enable row level security;
alter table public.feedbacks   enable row level security;

-- ─── orgs ──────────────────────────────────────────────────
create policy orgs_select on public.orgs for select
  using (public.is_org_member(id) or owner_id = auth.uid());

create policy orgs_insert on public.orgs for insert
  with check (owner_id = auth.uid());

create policy orgs_update on public.orgs for update
  using (public.org_role(id) = 'ceo' or owner_id = auth.uid());

create policy orgs_delete on public.orgs for delete
  using (owner_id = auth.uid());

-- ─── memberships ──────────────────────────────────────────
create policy memberships_select on public.memberships for select
  using (public.is_org_member(org_id));

create policy memberships_insert on public.memberships for insert
  with check (
    -- ceo can add anyone, OR the new member is the user themselves joining
    public.org_role(org_id) = 'ceo' or user_id = auth.uid()
  );

create policy memberships_update on public.memberships for update
  using (public.org_role(org_id) = 'ceo');

create policy memberships_delete on public.memberships for delete
  using (public.org_role(org_id) = 'ceo' and user_id <> auth.uid());

-- ─── tasks ────────────────────────────────────────────────
create policy tasks_select on public.tasks for select
  using (public.is_org_member(org_id));
create policy tasks_insert on public.tasks for insert
  with check (public.is_org_member(org_id));
create policy tasks_update on public.tasks for update
  using (public.is_org_member(org_id));
create policy tasks_delete on public.tasks for delete
  using (public.org_role(org_id) in ('ceo','admin'));

-- ─── plans ────────────────────────────────────────────────
create policy plans_select on public.plans for select
  using (public.is_org_member((select org_id from public.tasks where id = task_id)));
create policy plans_insert on public.plans for insert
  with check (public.is_org_member((select org_id from public.tasks where id = task_id)));
create policy plans_update on public.plans for update
  using (public.is_org_member((select org_id from public.tasks where id = task_id)));
create policy plans_delete on public.plans for delete
  using (public.org_role((select org_id from public.tasks where id = task_id)) in ('ceo','admin'));

-- ─── attachments ──────────────────────────────────────────
create policy attachments_select on public.attachments for select
  using (public.is_org_member((select org_id from public.tasks where id = task_id)));
create policy attachments_insert on public.attachments for insert
  with check (public.is_org_member((select org_id from public.tasks where id = task_id)));
create policy attachments_delete on public.attachments for delete
  using (public.is_org_member((select org_id from public.tasks where id = task_id)));

-- ─── comments ─────────────────────────────────────────────
create policy comments_select on public.comments for select
  using (public.is_org_member(org_id));
create policy comments_insert on public.comments for insert
  with check (public.is_org_member(org_id));
create policy comments_update on public.comments for update
  using (public.is_org_member(org_id));    -- needed for resolve toggle
create policy comments_delete on public.comments for delete
  using (author_id = auth.uid() or public.org_role(org_id) in ('ceo','admin'));

-- ─── feedbacks ────────────────────────────────────────────
create policy feedbacks_select on public.feedbacks for select
  using (public.is_org_member((select org_id from public.tasks where id = task_id)));
create policy feedbacks_insert on public.feedbacks for insert
  with check (public.is_org_member((select org_id from public.tasks where id = task_id)));
create policy feedbacks_delete on public.feedbacks for delete
  using (
    author_id = auth.uid()
    or public.org_role((select org_id from public.tasks where id = task_id)) in ('ceo','admin')
  );

-- ─── Storage bucket policy (run after creating bucket "orgx-files") ─
-- In Storage > Policies for bucket "orgx-files":
--
-- read:   bucket_id = 'orgx-files'
--           and exists (select 1 from public.attachments a
--                       join public.tasks t on t.id = a.task_id
--                       where a.storage_path = name
--                         and public.is_org_member(t.org_id))
--
-- insert: bucket_id = 'orgx-files' and auth.role() = 'authenticated'
--
-- delete: bucket_id = 'orgx-files'
--           and exists (select 1 from public.attachments a
--                       join public.tasks t on t.id = a.task_id
--                       where a.storage_path = name
--                         and public.is_org_member(t.org_id))
