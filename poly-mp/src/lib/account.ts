// 계정 삭제 (Apple 5.1.1(v)) — SettingsScreen·GateScreen 공용
// 순서: ① 내 게시물 사진을 Storage API로 삭제 — 서버 RPC의 storage.objects 직접 DELETE는
//        Supabase가 차단한다("Use the Storage API instead" 트리거).
//       ② RPC mp_delete_account — mp_* 행·통합 멤버십·auth 계정 파기.
// 파일 정리 실패는 계정 삭제를 막지 않는다(행이 지워지면 경로를 아는 사람 외엔 접근 불가).
import { supabase } from './supabase';

export async function deleteMyAccount(): Promise<{ error: any }> {
  try {
    const { data } = await supabase.from('mp_posts').select('media');
    const paths = (data ?? [])
      .flatMap((r: any) => (Array.isArray(r.media) ? r.media : []))
      .map((m: any) => m?.path)
      .filter((p: any): p is string => typeof p === 'string' && p.length > 0);
    if (paths.length > 0) {
      await supabase.storage.from('mp-media').remove(paths);
    }
  } catch { /* 파일 정리 실패 무시 */ }
  const { error } = await supabase.rpc('mp_delete_account');
  return { error };
}
