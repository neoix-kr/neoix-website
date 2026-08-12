-- 폴리 오피스 P0 델타 — mp-schema-p0.sql 적용 후 1회 실행 (재실행 안전)
-- ✅ 2026-08-12 통합 DB(nroddjekdjwnwguwkudl)에 적용 완료 (SQL Editor에서 실행됨)
-- ① 계정 삭제 RPC (Apple 5.1.1(v))  ② AppGate 원격설정 행  ③ mp-media 본인 삭제 정책

-- ─────────────────────────────────────────────
-- 1) 계정 삭제 — mp_* 는 auth.users FK cascade 대상이 아니므로 직접 파기 후 auth 계정 삭제.
--    NEOIX 통합 계정이라 다른 서비스(pray_* 등)는 각자 FK cascade 로 함께 파기됨(앱 UI에서 고지).
--    storage.objects 직접 DELETE는 Supabase가 차단("Use the Storage API instead" 트리거) —
--    실제 파일 삭제는 앱(src/lib/account.ts)이 RPC 호출 전에 Storage API remove로 수행하고,
--    여기서는 방어적으로 시도만 하고 실패를 무시한다.
-- ─────────────────────────────────────────────
create or replace function public.mp_delete_account()
returns void
language plpgsql
security definer
set search_path = public, auth, storage
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  -- mp_* 직접 파기 (FK 순서: 자식 → 부모)
  delete from public.mp_meetings     where owner_user_id = v_uid;
  delete from public.mp_cases        where owner_user_id = v_uid;
  delete from public.mp_contact_orgs where owner_user_id = v_uid;
  delete from public.mp_contacts     where owner_user_id = v_uid;
  delete from public.mp_orgs         where owner_user_id = v_uid;
  delete from public.mp_schedules    where owner_user_id = v_uid;
  delete from public.mp_posts        where owner_user_id = v_uid;
  delete from public.mp_members      where user_id = v_uid;
  delete from public.mp_profiles     where id = v_uid;
  begin
    delete from storage.objects
     where bucket_id = 'mp-media' and (storage.foldername(name))[1] = v_uid::text;
  exception when others then
    null; -- Storage API 강제 트리거 — 파일은 클라이언트가 선삭제
  end;
  -- 통합 멤버십은 auth.users cascade 대상이 아닐 수 있으므로 선삭제(방어적)
  delete from public.service_memberships where user_id = v_uid;
  -- 본인 auth 계정 삭제 → 나머지 서비스 데이터 cascade 파기
  delete from auth.users where id = v_uid;
end;
$$;
revoke all on function public.mp_delete_account() from public, anon;
grant execute on function public.mp_delete_account() to authenticated;

-- ─────────────────────────────────────────────
-- 2) AppGate 원격설정 — 강제 업데이트/점검/공지 (neoix_app_config, appConfig.ts APP_KEY='polymp')
-- ─────────────────────────────────────────────
insert into public.neoix_app_config (app_key, app_name, min_version, latest_version, ios_url, android_url)
values ('polymp', '폴리 오피스', '1.0.0', '1.0.0', null, null)
on conflict (app_key) do nothing;

-- ─────────────────────────────────────────────
-- 3) mp-media 본인 폴더 삭제 정책 (스키마 P0에는 insert/select만 있었음)
-- ─────────────────────────────────────────────
drop policy if exists "mp media owner delete" on storage.objects;
create policy "mp media owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'mp-media' and (storage.foldername(name))[1] = auth.uid()::text);

notify pgrst, 'reload schema';

select 'polymp P0 델타 완료' as done;
