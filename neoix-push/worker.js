// NEOIX 푸시 워커
// ① Expo 앱 푸시 프록시(기존) — 어드민이 관리자 JWT로 호출, RLS로 토큰 열람
// ② 관리자 웹푸시(iOS PWA) — VAPID payload-less: 푸시 신호만 보내고 SW가 /webpush/latest에서 내용 조회
// ③ cron(2분): 신규 가입·가입자 수 돌파 감지 → 관리자 웹푸시 (SUPABASE_SERVICE_KEY 시크릿 필요)

const SUPABASE_URL = 'https://nroddjekdjwnwguwkudl.supabase.co';
const ANON_KEY = 'sb_publishable_Uygr7NmVn1wmqopNrb4FRw_CRWw7Xeg';
const ALLOWED_ORIGINS = ['https://neoix.kr', 'https://www.neoix.kr'];
const VAPID_PUBLIC = 'BOrOH5QabcdnthmIVBjQx2LjPYYGrFKkyQitEvEMia_YcX35LApXv44DSWuJelMkQFzIcguIT0w3CL1fk1WGsWY';
const VAPID_SUBJECT = 'mailto:neoix.kr@gmail.com';
const MILESTONES = [10, 30, 50, 100, 200, 300, 500, 1000, 2000, 3000, 5000, 10000];

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    const cors = {
      'Access-Control-Allow-Origin': allow,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, content-type',
      'Vary': 'Origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    const url = new URL(request.url);

    // ── 웹푸시: SW가 알림 내용 조회 ──
    if (request.method === 'GET' && url.pathname === '/webpush/latest') {
      const raw = await env.WEBPUSH_KV.get('latest');
      return new Response(raw || JSON.stringify({ title: 'NEOIX', body: '새 알림' }),
        { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // ── 웹푸시: 관리자 직접 발송 ──
    if (request.method === 'POST' && url.pathname === '/webpush/send') {
      const auth = request.headers.get('Authorization') || '';
      if (!auth.startsWith('Bearer ')) return json({ error: '인증 필요' }, 401, cors);
      let p; try { p = await request.json(); } catch { return json({ error: '잘못된 요청' }, 400, cors); }
      const title = (p.title || '').trim(), body = (p.body || '').trim();
      if (!title || !body) return json({ error: '제목과 본문을 입력해 주세요' }, 400, cors);
      // 구독 목록: 관리자 JWT + RLS (admin만 select 가능 → 이 자체가 권한 검증)
      const subs = await fetchSubs({ apikey: ANON_KEY, Authorization: auth });
      if (!subs.length) return json({ sent: 0, message: '등록된 기기가 없어요. 폰에서 알림을 먼저 켜 주세요.' }, 200, cors);
      await env.WEBPUSH_KV.put('latest', JSON.stringify({ title, body, ts: Date.now() }));
      const result = await pushAll(env, subs, auth);
      return json(result, 200, cors);
    }

    // ── 관리자: 가입자 삭제 (admin JWT 검증 후 service key로 실행) ──
    if (request.method === 'POST' && url.pathname === '/admin/delete-user') {
      const auth = request.headers.get('Authorization') || '';
      if (!auth.startsWith('Bearer ')) return json({ error: '인증 필요' }, 401, cors);
      if (!env.SUPABASE_SERVICE_KEY) return json({ error: '서버 키 미설정' }, 500, cors);
      let p; try { p = await request.json(); } catch { return json({ error: '잘못된 요청' }, 400, cors); }
      const uid = (p.user_id || '').trim();
      if (!/^[0-9a-f-]{36}$/.test(uid)) return json({ error: '잘못된 사용자 ID' }, 400, cors);
      // 요청자가 관리자인지 확인 (RLS: 본인 행만 보임)
      const chk = await fetch(`${SUPABASE_URL}/rest/v1/admin_users?select=user_id&limit=1`,
        { headers: { apikey: ANON_KEY, Authorization: auth } });
      const rows = chk.ok ? await chk.json().catch(() => []) : [];
      if (!rows.length) return json({ error: '관리자 권한이 없습니다' }, 403, cors);
      const del = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${uid}`, {
        method: 'DELETE',
        headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` },
      });
      if (!del.ok) {
        const t = await del.text().catch(() => '');
        return json({ error: `삭제 실패 (${del.status}) ${t.slice(0, 120)}` }, 502, cors);
      }
      return json({ ok: true }, 200, cors);
    }

    // ── 기존: Expo 발송 대상 수 ──
    if (request.method === 'GET' && url.pathname === '/count') {
      const auth = request.headers.get('Authorization') || '';
      if (!auth.startsWith('Bearer ')) return json({ error: '인증 필요' }, 401, cors);
      const app = url.searchParams.get('app') || '';
      const tokens = await fetchTokens(auth, app);
      return json({ count: tokens.length }, 200, cors);
    }

    if (request.method !== 'POST' || url.pathname !== '/send') {
      return json({ error: 'Not found' }, 404, cors);
    }

    // ── 기존: Expo 앱 푸시 ──
    const auth = request.headers.get('Authorization') || '';
    if (!auth.startsWith('Bearer ')) return json({ error: '인증 필요' }, 401, cors);
    let payload;
    try { payload = await request.json(); } catch { return json({ error: '잘못된 요청' }, 400, cors); }
    const app = (payload.app || '').trim();
    const title = (payload.title || '').trim();
    const body = (payload.body || '').trim();
    if (!app) return json({ error: '발송할 앱을 선택해 주세요' }, 400, cors);
    if (!title || !body) return json({ error: '제목과 본문을 입력해 주세요' }, 400, cors);
    const tokens = await fetchTokens(auth, app);
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

  // ── cron: 신규 가입·돌파 감지 ──
  async scheduled(event, env) {
    const key = env.SUPABASE_SERVICE_KEY;
    if (!key) return; // 시크릿 미설정 시 조용히 통과
    const svc = { apikey: key, Authorization: `Bearer ${key}` };
    // 총 가입자 수 (auth admin API)
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1`, { headers: svc });
    if (!r.ok) return;
    const j = await r.json().catch(() => null);
    const total = j?.total ?? null;
    if (total === null) return;
    const prevRaw = await env.WEBPUSH_KV.get('user_count');
    const prev = prevRaw === null ? null : parseInt(prevRaw, 10);
    await env.WEBPUSH_KV.put('user_count', String(total));
    if (prev === null || total <= prev) return; // 첫 실행/변화 없음

    const subs = await fetchSubs(svc);
    if (!subs.length) return;

    // 돌파 알림이 우선, 아니면 신규 가입 알림
    const crossed = MILESTONES.find((m) => prev < m && total >= m);
    let title, body;
    if (crossed) {
      title = `🎉 가입자 ${crossed}명 돌파!`;
      body = `네오익스 통합 가입자가 ${total}명이 됐어요.`;
    } else {
      // 최신 가입자 이름 조회
      let who = '';
      try {
        const nr = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=${total - prev}`, { headers: svc });
        const nj = await nr.json();
        const names = (nj?.users || []).map((u) =>
          u.user_metadata?.name || u.user_metadata?.nickname || (u.email || '').split('@')[0] || '새 사용자');
        who = names.slice(0, 3).join(', ');
      } catch {}
      title = '새 가입자가 있어요';
      body = who ? `${who}님이 가입했어요 (전체 ${total}명)` : `가입자 +${total - prev} (전체 ${total}명)`;
    }
    await env.WEBPUSH_KV.put('latest', JSON.stringify({ title, body, ts: Date.now() }));
    await pushAll(env, subs, null);
  },
};

// ── 구독 목록 ──
async function fetchSubs(headers) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/neoix_webpush_subs?select=endpoint,p256dh,auth`, { headers });
  if (!r.ok) return [];
  return (await r.json().catch(() => [])) || [];
}

// ── payload-less 웹푸시 발송 (VAPID만, 암호화 불필요) ──
async function pushAll(env, subs, adminAuth) {
  let ok = 0, dead = 0, fail = 0;
  for (const s of subs) {
    try {
      const jwt = await vapidJwt(new URL(s.endpoint).origin, env.VAPID_PRIVATE_KEY);
      const r = await fetch(s.endpoint, {
        method: 'POST',
        headers: { TTL: '120', Urgency: 'high', Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC}` },
      });
      if (r.status === 404 || r.status === 410) {
        dead++;
        // 죽은 구독 정리 (관리자 JWT 있을 때만 — RLS delete)
        if (adminAuth) {
          await fetch(`${SUPABASE_URL}/rest/v1/neoix_webpush_subs?endpoint=eq.${encodeURIComponent(s.endpoint)}`,
            { method: 'DELETE', headers: { apikey: ANON_KEY, Authorization: adminAuth } }).catch(() => {});
        }
      } else if (r.ok || r.status === 201) ok++;
      else fail++;
    } catch { fail++; }
  }
  return { sent: subs.length, ok, dead, fail };
}

// ── VAPID ES256 JWT (WebCrypto) ──
function b64uToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
function bytesToB64u(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function vapidJwt(aud, privB64u) {
  const pub = b64uToBytes(VAPID_PUBLIC); // 65바이트 0x04||x||y
  const jwk = {
    kty: 'EC', crv: 'P-256',
    x: bytesToB64u(pub.slice(1, 33)),
    y: bytesToB64u(pub.slice(33, 65)),
    d: privB64u,
  };
  const keyObj = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const enc = new TextEncoder();
  const header = bytesToB64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = bytesToB64u(enc.encode(JSON.stringify({
    aud, exp: Math.floor(Date.now() / 1000) + 3600, sub: VAPID_SUBJECT,
  })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keyObj, enc.encode(`${header}.${body}`));
  return `${header}.${body}.${bytesToB64u(new Uint8Array(sig))}`;
}

async function fetchTokens(auth, app) {
  let q = `${SUPABASE_URL}/rest/v1/neoix_push_tokens?select=token`;
  if (app) q += `&app=eq.${encodeURIComponent(app)}`;
  const r = await fetch(q, { headers: { apikey: ANON_KEY, Authorization: auth } });
  if (!r.ok) return [];
  const rows = await r.json().catch(() => []);
  return [...new Set((rows || []).map((x) => x.token))].filter((t) => typeof t === 'string' && t.startsWith('ExponentPushToken'));
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
