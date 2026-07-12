#!/usr/bin/env node
// 기도해요 — 전체 사용자에게 팝업 알림 발송
// 사용법:
//   SUPABASE_SERVICE_KEY=xxxxx node scripts/send-push.mjs "제목" "본문"
// service_role 키는 Supabase 대시보드 → Settings → API → service_role secret 에서 복사.
// (전체 토큰을 읽으려면 RLS를 우회하는 service_role 키가 필요합니다.)

const SUPABASE_URL = 'https://nroddjekdjwnwguwkudl.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const [, , title = '기도해요', body = '오늘도 기도로 하루를 열어요 🙏'] = process.argv;

if (!SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_KEY 환경변수가 필요합니다 (service_role secret).');
  process.exit(1);
}

async function main() {
  // 1) 토큰 전부 조회
  const res = await fetch(`${SUPABASE_URL}/rest/v1/pray_push_tokens?select=token`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  const rows = await res.json();
  const tokens = [...new Set(rows.map((r) => r.token))].filter((t) => t?.startsWith('ExponentPushToken'));
  if (!tokens.length) { console.log('발송 대상 토큰이 없습니다.'); return; }

  // 2) Expo Push API로 100개씩 배치 발송
  let sent = 0;
  for (let i = 0; i < tokens.length; i += 100) {
    const batch = tokens.slice(i, i + 100).map((to) => ({ to, title, body, sound: 'default' }));
    const r = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    });
    const j = await r.json();
    sent += batch.length;
    console.log(`배치 ${i / 100 + 1}: ${batch.length}건`, JSON.stringify(j).slice(0, 200));
  }
  console.log(`\n총 ${sent}건 발송 요청 완료.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
