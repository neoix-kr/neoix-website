-- ============================================================
-- RLS 무한 재귀(42P17) 수정 — pray_prayers ↔ pray_prayer_shares
-- 정책의 상호 서브쿼리를 SECURITY DEFINER 함수로 대체 (2026-07-12)
-- ============================================================

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

drop policy if exists pray_prayers_sel on pray_prayers;
create policy pray_prayers_sel on pray_prayers for select using (
  author_id = auth.uid()
  or (visibility = 'neighbors' and pray_are_neighbors(auth.uid(), author_id))
  or (visibility = 'clubs' and pray_prayer_shared_with(id, auth.uid()))
);

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
