-- ============================================================
-- 기도의 동반자 (pray-app) — Supabase 스키마
-- 네오익스 통합계정 공유 풀(auth.users) 위에 pray_ 접두사 테이블.
-- Supabase SQL Editor에 통째로 붙여넣어 실행 (idempotent).
-- ============================================================

-- ── 확장 ──
create extension if not exists pgcrypto;

-- ============================================================
-- 1. 프로필
-- ============================================================
create table if not exists pray_profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '기도의 동반자',
  avatar_url   text,
  church       text,
  phone_hash   text,               -- 친구찾기 매칭용 (원문 전화번호는 저장 안 함)
  created_at   timestamptz not null default now()
);
create index if not exists pray_profiles_phone_hash_idx on pray_profiles(phone_hash);

-- ============================================================
-- 2. 이웃 (양방향 수락제) — 요청자 user_id → 대상 neighbor_id
-- ============================================================
create table if not exists pray_neighbors (
  user_id     uuid not null references auth.users(id) on delete cascade,
  neighbor_id uuid not null references auth.users(id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending','accepted')),
  created_at  timestamptz not null default now(),
  primary key (user_id, neighbor_id),
  check (user_id <> neighbor_id)
);

-- ============================================================
-- 3. 클럽 (교회 · 모임 · 중보기도회)
-- ============================================================
create table if not exists pray_clubs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  join_code   text not null unique default upper(substr(encode(gen_random_bytes(4),'hex'),1,6)),
  created_at  timestamptz not null default now()
);

create table if not exists pray_club_members (
  club_id   uuid not null references pray_clubs(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

-- ============================================================
-- 4. 기도제목
-- period: urgent(긴급·오늘) / week(이번주) / period(올해·이번달)
-- visibility: private(나만) / neighbors(이웃) / clubs(선택 클럽)
-- ============================================================
create table if not exists pray_prayers (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  body        text,
  period      text not null default 'period' check (period in ('urgent','week','period')),
  visibility  text not null default 'private' check (visibility in ('private','neighbors','clubs')),
  due_date    date,
  answered_at timestamptz,          -- 응답된 기도 표시
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists pray_prayers_author_idx on pray_prayers(author_id);

-- 어떤 클럽에 공유했는지 (visibility='clubs'일 때)
create table if not exists pray_prayer_shares (
  prayer_id uuid not null references pray_prayers(id) on delete cascade,
  club_id   uuid not null references pray_clubs(id) on delete cascade,
  primary key (prayer_id, club_id)
);

-- ============================================================
-- 5. 내 기도함 (내 것 + 남의 것을 담아 매일 기도)
-- ============================================================
create table if not exists pray_box_items (
  user_id   uuid not null references auth.users(id) on delete cascade,
  prayer_id uuid not null references pray_prayers(id) on delete cascade,
  added_at  timestamptz not null default now(),
  primary key (user_id, prayer_id)
);

-- ============================================================
-- 6. 기도 기록 (스와이프 체크 → 하루 1회) — 통계/연속일수
-- ============================================================
create table if not exists pray_logs (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  prayer_id uuid not null references pray_prayers(id) on delete cascade,
  prayed_on date not null default (now() at time zone 'Asia/Seoul')::date,
  created_at timestamptz not null default now(),
  unique (user_id, prayer_id, prayed_on)
);
create index if not exists pray_logs_user_day_idx on pray_logs(user_id, prayed_on);

-- ============================================================
-- 7. 기도마당 (커뮤니티) — 익명 게시 지원
-- ============================================================
create table if not exists pray_community_posts (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references auth.users(id) on delete cascade,
  is_anonymous  boolean not null default true,
  title         text not null,
  body          text not null,
  amen_count    int not null default 0,
  comment_count int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists pray_community_posts_created_idx on pray_community_posts(created_at desc);

create table if not exists pray_community_comments (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references pray_community_posts(id) on delete cascade,
  author_id    uuid not null references auth.users(id) on delete cascade,
  is_anonymous boolean not null default true,
  body         text not null,
  created_at   timestamptz not null default now()
);
create index if not exists pray_community_comments_post_idx on pray_community_comments(post_id);

create table if not exists pray_community_reactions (
  post_id  uuid not null references pray_community_posts(id) on delete cascade,
  user_id  uuid not null references auth.users(id) on delete cascade,
  kind     text not null default 'amen',
  primary key (post_id, user_id, kind)
);

create table if not exists pray_reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('post','comment')),
  target_id   uuid not null,
  reason      text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 헬퍼 함수 (SECURITY DEFINER — RLS 재귀 회피)
-- ============================================================
create or replace function pray_are_neighbors(a uuid, b uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from pray_neighbors
    where status = 'accepted'
      and ((user_id = a and neighbor_id = b) or (user_id = b and neighbor_id = a))
  );
$$;

create or replace function pray_is_club_member(p_club uuid, p_user uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from pray_club_members where club_id = p_club and user_id = p_user);
$$;

-- 기도제목 열람 권한: 내 것 / 이웃공개+이웃 / 클럽공개+내가 속한 클럽에 공유됨
create or replace function pray_can_see_prayer(p_id uuid, p_viewer uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from pray_prayers pr where pr.id = p_id and (
      pr.author_id = p_viewer
      or (pr.visibility = 'neighbors' and pray_are_neighbors(p_viewer, pr.author_id))
      or (pr.visibility = 'clubs' and exists (
            select 1 from pray_prayer_shares s
            join pray_club_members m on m.club_id = s.club_id
            where s.prayer_id = pr.id and m.user_id = p_viewer))
    )
  );
$$;

-- 정책 상호 재귀 방지용 definer 함수 (pray-rls-fix.sql)
create or replace function pray_is_prayer_author(p_prayer uuid, p_user uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from pray_prayers where id = p_prayer and author_id = p_user);
$$;

create or replace function pray_prayer_shared_with(p_prayer uuid, p_user uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from pray_prayer_shares s
    join pray_club_members m on m.club_id = s.club_id
    where s.prayer_id = p_prayer and m.user_id = p_user
  );
$$;

-- 친구찾기: 연락처 전화번호 해시 목록으로 가입자 매칭 (프로필 전체 노출 없이)
create or replace function pray_find_by_phone_hashes(hashes text[])
returns table (id uuid, display_name text, avatar_url text, church text)
language sql security definer stable set search_path = public as $$
  select p.id, p.display_name, p.avatar_url, p.church
  from pray_profiles p
  where p.phone_hash = any(hashes) and p.id <> auth.uid();
$$;

-- ============================================================
-- 카운터 트리거 (amen / comment)
-- ============================================================
create or replace function pray_bump_counts() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'pray_community_reactions' then
    if tg_op = 'INSERT' then update pray_community_posts set amen_count = amen_count + 1 where id = new.post_id;
    elsif tg_op = 'DELETE' then update pray_community_posts set amen_count = greatest(amen_count - 1, 0) where id = old.post_id; end if;
  elsif tg_table_name = 'pray_community_comments' then
    if tg_op = 'INSERT' then update pray_community_posts set comment_count = comment_count + 1 where id = new.post_id;
    elsif tg_op = 'DELETE' then update pray_community_posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id; end if;
  end if;
  return null;
end;
$$;

drop trigger if exists pray_reactions_count on pray_community_reactions;
create trigger pray_reactions_count after insert or delete on pray_community_reactions
  for each row execute function pray_bump_counts();

drop trigger if exists pray_comments_count on pray_community_comments;
create trigger pray_comments_count after insert or delete on pray_community_comments
  for each row execute function pray_bump_counts();

-- updated_at 자동 갱신
create or replace function pray_touch_updated() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists pray_prayers_touch on pray_prayers;
create trigger pray_prayers_touch before update on pray_prayers
  for each row execute function pray_touch_updated();

-- 신규 가입 시 pray_profiles 자동 생성 (NEOIX 계정 최초 진입)
create or replace function pray_ensure_profile()
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid := auth.uid();
begin
  insert into pray_profiles (id, display_name)
  values (v_id, coalesce((select raw_user_meta_data->>'display_name' from auth.users where id = v_id), '기도의 동반자'))
  on conflict (id) do nothing;
  return v_id;
end;
$$;

-- ============================================================
-- RLS
-- ============================================================
alter table pray_profiles           enable row level security;
alter table pray_neighbors          enable row level security;
alter table pray_clubs              enable row level security;
alter table pray_club_members       enable row level security;
alter table pray_prayers            enable row level security;
alter table pray_prayer_shares      enable row level security;
alter table pray_box_items          enable row level security;
alter table pray_logs               enable row level security;
alter table pray_community_posts    enable row level security;
alter table pray_community_comments enable row level security;
alter table pray_community_reactions enable row level security;
alter table pray_reports            enable row level security;

-- 프로필: 내 것 + 이웃 + 같은 클럽 사람만 조회 (친구찾기는 RPC로 우회)
drop policy if exists pray_profiles_sel on pray_profiles;
create policy pray_profiles_sel on pray_profiles for select using (
  id = auth.uid()
  or pray_are_neighbors(auth.uid(), id)
  or exists (select 1 from pray_club_members m1
             join pray_club_members m2 on m1.club_id = m2.club_id
             where m1.user_id = auth.uid() and m2.user_id = pray_profiles.id)
);
drop policy if exists pray_profiles_ins on pray_profiles;
create policy pray_profiles_ins on pray_profiles for insert with check (id = auth.uid());
drop policy if exists pray_profiles_upd on pray_profiles;
create policy pray_profiles_upd on pray_profiles for update using (id = auth.uid());

-- 이웃: 내가 낀 관계만
drop policy if exists pray_neighbors_sel on pray_neighbors;
create policy pray_neighbors_sel on pray_neighbors for select using (
  user_id = auth.uid() or neighbor_id = auth.uid()
);
drop policy if exists pray_neighbors_ins on pray_neighbors;
create policy pray_neighbors_ins on pray_neighbors for insert with check (user_id = auth.uid());
drop policy if exists pray_neighbors_upd on pray_neighbors; -- 상대가 내 요청을 수락
create policy pray_neighbors_upd on pray_neighbors for update using (neighbor_id = auth.uid());
drop policy if exists pray_neighbors_del on pray_neighbors;
create policy pray_neighbors_del on pray_neighbors for delete using (
  user_id = auth.uid() or neighbor_id = auth.uid()
);

-- 클럽: 멤버면 조회, 소유자면 수정
drop policy if exists pray_clubs_sel on pray_clubs;
create policy pray_clubs_sel on pray_clubs for select using (
  owner_id = auth.uid() or pray_is_club_member(id, auth.uid())
);
drop policy if exists pray_clubs_ins on pray_clubs;
create policy pray_clubs_ins on pray_clubs for insert with check (owner_id = auth.uid());
drop policy if exists pray_clubs_upd on pray_clubs;
create policy pray_clubs_upd on pray_clubs for update using (owner_id = auth.uid());
drop policy if exists pray_clubs_del on pray_clubs;
create policy pray_clubs_del on pray_clubs for delete using (owner_id = auth.uid());

-- 클럽 멤버: 같은 클럽 멤버끼리 조회, 본인 가입/탈퇴
drop policy if exists pray_club_members_sel on pray_club_members;
create policy pray_club_members_sel on pray_club_members for select using (
  user_id = auth.uid() or pray_is_club_member(club_id, auth.uid())
);
drop policy if exists pray_club_members_ins on pray_club_members;
create policy pray_club_members_ins on pray_club_members for insert with check (user_id = auth.uid());
drop policy if exists pray_club_members_del on pray_club_members;
create policy pray_club_members_del on pray_club_members for delete using (
  user_id = auth.uid() or exists (select 1 from pray_clubs c where c.id = club_id and c.owner_id = auth.uid())
);

-- 기도제목: 열람 권한 함수로 통제 / 작성·수정·삭제는 본인만
drop policy if exists pray_prayers_sel on pray_prayers;
-- ⚠️ shares 서브쿼리 직접 참조 금지 (shares_sel과 상호 재귀 42P17) — definer 함수 사용
create policy pray_prayers_sel on pray_prayers for select using (
  author_id = auth.uid()
  or (visibility = 'neighbors' and pray_are_neighbors(auth.uid(), author_id))
  or (visibility = 'clubs' and pray_prayer_shared_with(id, auth.uid()))
);
drop policy if exists pray_prayers_ins on pray_prayers;
create policy pray_prayers_ins on pray_prayers for insert with check (author_id = auth.uid());
drop policy if exists pray_prayers_upd on pray_prayers;
create policy pray_prayers_upd on pray_prayers for update using (author_id = auth.uid());
drop policy if exists pray_prayers_del on pray_prayers;
create policy pray_prayers_del on pray_prayers for delete using (author_id = auth.uid());

-- 공유 매핑: 기도제목 작성자만 관리, 클럽 멤버는 조회
drop policy if exists pray_shares_sel on pray_prayer_shares;
create policy pray_shares_sel on pray_prayer_shares for select using (
  pray_is_club_member(club_id, auth.uid()) or pray_is_prayer_author(prayer_id, auth.uid())
);
drop policy if exists pray_shares_ins on pray_prayer_shares;
create policy pray_shares_ins on pray_prayer_shares for insert with check (
  pray_is_prayer_author(prayer_id, auth.uid())
);
drop policy if exists pray_shares_del on pray_prayer_shares;
create policy pray_shares_del on pray_prayer_shares for delete using (
  pray_is_prayer_author(prayer_id, auth.uid())
);

-- 내 기도함: 본인 것만. 담을 땐 그 기도제목을 볼 수 있어야 함.
drop policy if exists pray_box_sel on pray_box_items;
create policy pray_box_sel on pray_box_items for select using (user_id = auth.uid());
drop policy if exists pray_box_ins on pray_box_items;
create policy pray_box_ins on pray_box_items for insert with check (
  user_id = auth.uid() and pray_can_see_prayer(prayer_id, auth.uid())
);
drop policy if exists pray_box_del on pray_box_items;
create policy pray_box_del on pray_box_items for delete using (user_id = auth.uid());

-- 기도 기록: 본인 것만
drop policy if exists pray_logs_sel on pray_logs;
create policy pray_logs_sel on pray_logs for select using (user_id = auth.uid());
drop policy if exists pray_logs_ins on pray_logs;
create policy pray_logs_ins on pray_logs for insert with check (user_id = auth.uid());
drop policy if exists pray_logs_del on pray_logs;
create policy pray_logs_del on pray_logs for delete using (user_id = auth.uid());

-- 기도마당: 로그인 사용자 모두 조회 / 본인 글만 작성·삭제
drop policy if exists pray_posts_sel on pray_community_posts;
create policy pray_posts_sel on pray_community_posts for select using (auth.uid() is not null);
drop policy if exists pray_posts_ins on pray_community_posts;
create policy pray_posts_ins on pray_community_posts for insert with check (author_id = auth.uid());
drop policy if exists pray_posts_del on pray_community_posts;
create policy pray_posts_del on pray_community_posts for delete using (author_id = auth.uid());

drop policy if exists pray_comments_sel on pray_community_comments;
create policy pray_comments_sel on pray_community_comments for select using (auth.uid() is not null);
drop policy if exists pray_comments_ins on pray_community_comments;
create policy pray_comments_ins on pray_community_comments for insert with check (author_id = auth.uid());
drop policy if exists pray_comments_del on pray_community_comments;
create policy pray_comments_del on pray_community_comments for delete using (author_id = auth.uid());

drop policy if exists pray_reactions_sel on pray_community_reactions;
create policy pray_reactions_sel on pray_community_reactions for select using (auth.uid() is not null);
drop policy if exists pray_reactions_ins on pray_community_reactions;
create policy pray_reactions_ins on pray_community_reactions for insert with check (user_id = auth.uid());
drop policy if exists pray_reactions_del on pray_community_reactions;
create policy pray_reactions_del on pray_community_reactions for delete using (user_id = auth.uid());

drop policy if exists pray_reports_ins on pray_reports;
create policy pray_reports_ins on pray_reports for insert with check (reporter_id = auth.uid());

-- 익명 게시 보호: author_id를 노출하지 않는 피드 뷰
create or replace view pray_community_feed
with (security_invoker = true) as
select
  p.id, p.title, p.body, p.amen_count, p.comment_count, p.created_at, p.is_anonymous,
  case when p.is_anonymous then null else p.author_id end as author_id,
  case when p.is_anonymous then '익명의 성도' else coalesce(pr.display_name, '기도의 동반자') end as author_name,
  case when p.is_anonymous then null else pr.avatar_url end as author_avatar
from pray_community_posts p
left join pray_profiles pr on pr.id = p.author_id;

-- ============================================================
-- 완료. 이후 앱 최초 진입 시 select pray_ensure_profile(); 호출로 프로필 보장.
-- ============================================================
