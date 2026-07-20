-- ============================================================
-- POLY Profile 스키마 (네오익스 공유 Supabase, poly_ 접두사)
-- Supabase Dashboard → SQL Editor에서 전체 실행
-- ============================================================

-- 관리자 판별 (검수 승인 권한)
create or replace function poly_is_admin() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() ->> 'email') in ('wjdrua7315@gmail.com'), false)
$$;

-- ── 역할 (정치인 / 유권자) ─────────────────────────────────
create table if not exists poly_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role in ('politician','voter')),
  created_at timestamptz not null default now()
);
alter table poly_users enable row level security;
drop policy if exists poly_users_own on poly_users;
create policy poly_users_own on poly_users
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── 프로필 ────────────────────────────────────────────────
create table if not exists poly_pages (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null unique references auth.users(id) on delete cascade,
  slug        text not null unique check (slug ~ '^[a-z0-9][a-z0-9_-]{1,29}$'),
  name        text not null check (char_length(name) between 1 and 20),
  party       text not null default '',
  party_color text not null default '#e8412e',
  title       text not null default '',   -- 직책 (예: 고양특례시의회 의원)
  district    text not null default '',   -- 지역구 (예: 화정1동 화정2동 행신3동)
  motto       text not null default '',
  motto_sub   text not null default '',
  photo_url   text not null default '',
  sns         jsonb not null default '{}'::jsonb,  -- {youtube,instagram,facebook,blog,kakao}
  donate      jsonb not null default '{}'::jsonb,  -- {site_url,sms_phone,sms_body}
  stats       jsonb not null default '{}'::jsonb,  -- {s1_num,s1_label,s2_num,s2_label,s3_num,s3_label}
  blocks      jsonb not null default '[]'::jsonb,  -- [{type,hidden,data}]
  verified    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table poly_pages enable row level security;
drop policy if exists poly_pages_read   on poly_pages;
drop policy if exists poly_pages_insert on poly_pages;
drop policy if exists poly_pages_update on poly_pages;
create policy poly_pages_read   on poly_pages for select using (true);
create policy poly_pages_insert on poly_pages for insert to authenticated with check (owner = auth.uid());
create policy poly_pages_update on poly_pages for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

-- verified 컬럼은 소유자가 직접 못 바꾸게 방어 + updated_at 자동
create or replace function poly_pages_guard() returns trigger
language plpgsql security definer as $$
begin
  if (new.verified is distinct from old.verified) and not poly_is_admin() then
    new.verified := old.verified;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists poly_pages_bu on poly_pages;
create trigger poly_pages_bu before update on poly_pages
  for each row execute function poly_pages_guard();

-- ── 인증 서류 (의원신분증·당선증) ──────────────────────────
create table if not exists poly_verifications (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references poly_pages(id) on delete cascade,
  doc_type    text not null check (doc_type in ('id_card','election_cert','party_cert','other')),
  doc_path    text not null,               -- poly-docs 버킷 내 경로
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  note        text not null default '',
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table poly_verifications enable row level security;
drop policy if exists poly_verif_insert on poly_verifications;
drop policy if exists poly_verif_select on poly_verifications;
drop policy if exists poly_verif_admin  on poly_verifications;
create policy poly_verif_insert on poly_verifications for insert to authenticated
  with check (exists (select 1 from poly_pages p where p.id = profile_id and p.owner = auth.uid()));
create policy poly_verif_select on poly_verifications for select to authenticated
  using (poly_is_admin() or exists (select 1 from poly_pages p where p.id = profile_id and p.owner = auth.uid()));
create policy poly_verif_admin on poly_verifications for update to authenticated
  using (poly_is_admin());

-- 검수 승인/반려 (관리자 전용)
create or replace function poly_review_verification(p_id uuid, p_approve boolean, p_note text default '')
returns void language plpgsql security definer as $$
begin
  if not poly_is_admin() then raise exception 'not admin'; end if;
  update poly_verifications
     set status = case when p_approve then 'approved' else 'rejected' end,
         note = coalesce(p_note,''), reviewed_at = now()
   where id = p_id;
  if p_approve then
    update poly_pages set verified = true
     where id = (select profile_id from poly_verifications where id = p_id);
  end if;
end $$;

-- ── 방명록 ────────────────────────────────────────────────
create table if not exists poly_guestbook (
  id         bigserial primary key,
  profile_id uuid not null references poly_pages(id) on delete cascade,
  author     text not null check (char_length(author) between 1 and 20),
  body       text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);
alter table poly_guestbook enable row level security;
drop policy if exists poly_gb_read   on poly_guestbook;
drop policy if exists poly_gb_insert on poly_guestbook;
drop policy if exists poly_gb_delete on poly_guestbook;
create policy poly_gb_read   on poly_guestbook for select using (true);
create policy poly_gb_insert on poly_guestbook for insert with check (true);
create policy poly_gb_delete on poly_guestbook for delete to authenticated
  using (poly_is_admin() or exists (select 1 from poly_pages p where p.id = profile_id and p.owner = auth.uid()));

-- ── 방문/클릭 이벤트 (통계) ─────────────────────────────────
create table if not exists poly_events (
  id         bigserial primary key,
  profile_id uuid not null references poly_pages(id) on delete cascade,
  kind       text not null check (kind in ('view','click')),
  label      text not null default '',
  created_at timestamptz not null default now()
);
alter table poly_events enable row level security;
drop policy if exists poly_ev_select on poly_events;
create policy poly_ev_select on poly_events for select to authenticated
  using (poly_is_admin() or exists (select 1 from poly_pages p where p.id = profile_id and p.owner = auth.uid()));

-- 집계는 RPC로만 기록 (anon 직접 insert 차단)
create or replace function poly_track(p_slug text, p_kind text, p_label text default '')
returns void language plpgsql security definer as $$
declare pid uuid;
begin
  if p_kind not in ('view','click') then return; end if;
  select id into pid from poly_pages where slug = p_slug;
  if pid is null then return; end if;
  insert into poly_events(profile_id, kind, label) values (pid, p_kind, left(coalesce(p_label,''), 40));
end $$;
grant execute on function poly_track(text, text, text) to anon, authenticated;

-- ── 스토리지 버킷 ──────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('poly-photos','poly-photos', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('poly-docs','poly-docs', false)
  on conflict (id) do nothing;

-- 사진: 누구나 읽기(공개 버킷), 본인 폴더에만 업로드/수정
drop policy if exists poly_photos_insert on storage.objects;
drop policy if exists poly_photos_update on storage.objects;
drop policy if exists poly_photos_delete on storage.objects;
create policy poly_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'poly-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy poly_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'poly-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy poly_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'poly-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- 서류: 본인 폴더 업로드, 읽기는 본인+관리자
drop policy if exists poly_docs_insert on storage.objects;
drop policy if exists poly_docs_read   on storage.objects;
create policy poly_docs_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'poly-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy poly_docs_read on storage.objects for select to authenticated
  using (bucket_id = 'poly-docs' and (poly_is_admin() or (storage.foldername(name))[1] = auth.uid()::text));
