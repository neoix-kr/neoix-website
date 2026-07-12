-- ============================================================
-- 기도해요 서버 동기화 델타 (2026-07-12) — pray-setup.sql 이후 실행
-- ============================================================

-- 1) 프로필 확장: 말씀 구절 / 우리동네 / 민감정보(종교) 별도 동의 시각
alter table pray_profiles add column if not exists verse text;
alter table pray_profiles add column if not exists region text;
alter table pray_profiles add column if not exists sensitive_agreed_at timestamptz;

-- 2) 기도제목 사진
alter table pray_prayers add column if not exists photo_url text;

-- 3) 기도마당 확장: 카테고리 / 동네 / 기도할게요 수
alter table pray_community_posts add column if not exists category text not null default '기타';
alter table pray_community_posts add column if not exists region text;
alter table pray_community_posts add column if not exists pray_count int not null default 0;

-- 4) 반응 카운터 트리거 확장 (kind: amen / pray 구분)
create or replace function pray_bump_counts() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'pray_community_reactions' then
    if tg_op = 'INSERT' then
      if new.kind = 'pray' then update pray_community_posts set pray_count = pray_count + 1 where id = new.post_id;
      else update pray_community_posts set amen_count = amen_count + 1 where id = new.post_id; end if;
    elsif tg_op = 'DELETE' then
      if old.kind = 'pray' then update pray_community_posts set pray_count = greatest(pray_count - 1, 0) where id = old.post_id;
      else update pray_community_posts set amen_count = greatest(amen_count - 1, 0) where id = old.post_id; end if;
    end if;
  elsif tg_table_name = 'pray_community_comments' then
    if tg_op = 'INSERT' then update pray_community_posts set comment_count = comment_count + 1 where id = new.post_id;
    elsif tg_op = 'DELETE' then update pray_community_posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id; end if;
  end if;
  return null;
end;
$$;

-- 5) 공개 표시명 (익명 아닌 글 작성자 이름만 — 프로필 RLS 우회 최소 노출)
create or replace function pray_public_name(p_user uuid)
returns text language sql security definer stable set search_path = public as $$
  select coalesce(display_name, '기도의 동반자') from pray_profiles where id = p_user;
$$;

-- 6) 기도마당 피드 뷰 재생성 (+내 반응 여부)
drop view if exists pray_community_feed;
create view pray_community_feed with (security_invoker = true) as
select
  p.id, p.title, p.body, p.category, p.region,
  p.amen_count, p.pray_count, p.comment_count, p.created_at, p.is_anonymous,
  case when p.is_anonymous then null else p.author_id end as author_id,
  case when p.is_anonymous then '익명의 성도' else pray_public_name(p.author_id) end as author_name,
  (p.author_id = auth.uid()) as is_mine,
  exists (select 1 from pray_community_reactions r where r.post_id = p.id and r.user_id = auth.uid() and r.kind = 'amen') as my_amen,
  exists (select 1 from pray_community_reactions r where r.post_id = p.id and r.user_id = auth.uid() and r.kind = 'pray') as my_pray
from pray_community_posts p;
grant select on pray_community_feed to authenticated;

-- 댓글 피드 뷰
drop view if exists pray_comment_feed;
create view pray_comment_feed with (security_invoker = true) as
select c.id, c.post_id, c.body, c.created_at, c.is_anonymous,
  case when c.is_anonymous then '익명의 성도' else pray_public_name(c.author_id) end as author_name,
  (c.author_id = auth.uid()) as is_mine
from pray_community_comments c;
grant select on pray_comment_feed to authenticated;

-- 7) 모임 초대코드 참여
create or replace function pray_join_club(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_club uuid;
begin
  select id into v_club from pray_clubs where join_code = upper(trim(p_code));
  if v_club is null then raise exception '초대 코드를 확인해 주세요'; end if;
  insert into pray_club_members (club_id, user_id, role) values (v_club, auth.uid(), 'member')
  on conflict do nothing;
  return v_club;
end;
$$;

-- 8) 받은 이웃 신청 목록 (신청자 이름·교회 — 최소 노출)
create or replace function pray_incoming_requests()
returns table (user_id uuid, display_name text, church text, created_at timestamptz)
language sql security definer stable set search_path = public as $$
  select n.user_id, coalesce(p.display_name, '기도의 동반자'), p.church, n.created_at
  from pray_neighbors n join pray_profiles p on p.id = n.user_id
  where n.neighbor_id = auth.uid() and n.status = 'pending';
$$;

-- 9) 사진 스토리지 (공개 읽기, 본인 폴더에만 쓰기: {uid}/...)
insert into storage.buckets (id, name, public) values ('pray', 'pray', true)
on conflict (id) do nothing;
drop policy if exists pray_storage_ins on storage.objects;
create policy pray_storage_ins on storage.objects for insert to authenticated
  with check (bucket_id = 'pray' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists pray_storage_upd on storage.objects;
create policy pray_storage_upd on storage.objects for update to authenticated
  using (bucket_id = 'pray' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists pray_storage_del on storage.objects;
create policy pray_storage_del on storage.objects for delete to authenticated
  using (bucket_id = 'pray' and (storage.foldername(name))[1] = auth.uid()::text);
