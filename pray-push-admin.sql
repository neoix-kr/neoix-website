-- ============================================================
-- 관리자가 어드민 페이지에서 푸시 발송할 수 있도록
-- pray_push_tokens 전체 조회 권한을 admin_users에게 부여 (2026-07-13)
-- Supabase SQL Editor에서 1회 실행.
-- ============================================================

drop policy if exists pray_push_sel on public.pray_push_tokens;
create policy pray_push_sel on public.pray_push_tokens for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );
