// NEOIX 푸시 발송 프록시
// 어드민 페이지(neoix.kr/admin)가 관리자 세션 JWT로 호출한다.
// 브라우저→Expo 직접 호출은 CORS로 막혀서 이 Worker가 대신 발송한다.
// service_role 키 불필요: 관리자 JWT를 그대로 Supabase에 넘겨 RLS로 토큰을 읽는다.
//   (pray_push_tokens SELECT 정책이 관리자에게 전체 열람을 허용)

const SUPABASE_URL = 'https://nroddjekdjwnwguwkudl.supabase.co';
const ANON_KEY = 'sb_publishable_Uygr7NmVn1wmqopNrb4FRw_CRWw7Xeg';
const ALLOWED_ORIGINS = ['https://neoix.kr', 'https://www.neoix.kr'];

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';
    const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    const cors = {
      'Access-Control-Allow-Origin': allow,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, content-type',
      'Vary': 'Origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    const url = new URL(request.url);

    // 발송 대상 수 미리보기
    if (request.method === 'GET' && url.pathname === '/count') {
      const auth = request.headers.get('Authorization') || '';
      if (!auth.startsWith('Bearer ')) return json({ error: '인증 필요' }, 401, cors);
      const tokens = await fetchTokens(auth);
      return json({ count: tokens.length }, 200, cors);
    }

    if (request.method !== 'POST' || url.pathname !== '/send') {
      return json({ error: 'Not found' }, 404, cors);
    }

    const auth = request.headers.get('Authorization') || '';
    if (!auth.startsWith('Bearer ')) return json({ error: '인증 필요' }, 401, cors);

    let payload;
    try { payload = await request.json(); } catch { return json({ error: '잘못된 요청' }, 400, cors); }
    const title = (payload.title || '').trim();
    const body = (payload.body || '').trim();
    if (!title || !body) return json({ error: '제목과 본문을 입력해 주세요' }, 400, cors);

    const tokens = await fetchTokens(auth);
    if (!tokens.length) return json({ sent: 0, message: '발송 대상 토큰이 없습니다' }, 200, cors);

    let sent = 0;
    const receipts = [];
    for (let i = 0; i < tokens.length; i += 100) {
      const batch = tokens.slice(i, i + 100).map((to) => ({ to, title, body, sound: 'default' }));
      const er = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(batch),
      });
      const ej = await er.json().catch(() => ({}));
      sent += batch.length;
      if (ej?.data) receipts.push(...ej.data);
    }
    const errors = receipts.filter((r) => r.status === 'error').map((r) => r.message);
    return json({ sent, ok: sent - errors.length, errors: errors.slice(0, 5) }, 200, cors);
  },
};

async function fetchTokens(auth) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/pray_push_tokens?select=token`, {
    headers: { apikey: ANON_KEY, Authorization: auth },
  });
  if (!r.ok) return [];
  const rows = await r.json().catch(() => []);
  return [...new Set((rows || []).map((x) => x.token))].filter((t) => typeof t === 'string' && t.startsWith('ExponentPushToken'));
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
