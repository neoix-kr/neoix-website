// neoix.kr 정적 사이트 + 라우팅
// 실제 파일이 있는 요청은 워커를 거치지 않고 바로 서빙됨(assets 우선).
// 여기는 "파일이 없는" 경로만 들어온다.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 스토어 리다이렉트: /go?u=<스토어 URL> — 스토어 도메인만 허용(오픈 리다이렉트 방지).
    // 인앱 브라우저용 중간 페이지는 제거했다: x-safari-https:// · itms-appss:// 같은 커스텀 스킴은
    // 인스타/페북 웹뷰가 에러 없이 조용히 취소해서 "아무 반응 없음"의 원인이었다.
    // (이제 링크 페이지가 원본 스토어 URL을 그대로 쓰므로 /go는 과거 링크 호환용으로만 남는다)
    if (url.pathname === '/go') {
      const u = url.searchParams.get('u') || '';
      let host = '';
      try { const t = new URL(u); if (t.protocol === 'https:') host = t.hostname; } catch (_) {}
      if (!['apps.apple.com', 'itunes.apple.com', 'play.google.com'].includes(host)) {
        return Response.redirect('https://neoix.kr/', 302);
      }
      return Response.redirect(u, 302);
    }

    // 링크인바이오: /link/{slug} → 공개 렌더러(/link/index.html)
    if (url.pathname.startsWith('/link/')) {
      return renderLink(url.pathname.slice(6).replace(/\/$/, ''), url, env);
    }

    // 짧은 주소: neoix.kr/{슬러그} — 실제 파일/폴더가 없는 단일 세그먼트(확장자 없음)만 여기 도달
    const seg = url.pathname.slice(1);
    if (seg && !seg.includes('/') && !seg.includes('.')) {
      return renderLink(seg, url, env);
    }

    return env.ASSETS.fetch(request);
  },
};

// 링크인바이오 서버 렌더 — 페이지 데이터를 HTML에 미리 심어 보낸다.
// 예전엔 브라우저가 esm.sh에서 Supabase SDK를 받아온 뒤에야 화면이 보여서,
// 인앱 브라우저(인스타)에서 로딩이 느리면 검은 화면만 뜨는 문제가 있었다.
async function renderLink(slug, url, env) {
  const res = await env.ASSETS.fetch(new URL('/link/', url));
  const key = url.searchParams.get('p') || slug || 'neoix';
  let data = null, ok = false;
  try {
    const r = await fetch(
      `https://nroddjekdjwnwguwkudl.supabase.co/rest/v1/link_pages?slug=eq.${encodeURIComponent(key)}&select=*`,
      {
        headers: { apikey: 'sb_publishable_Uygr7NmVn1wmqopNrb4FRw_CRWw7Xeg' },
        cf: { cacheTtl: 20, cacheEverything: true },
      });
    if (r.ok) { const j = await r.json(); data = (j && j[0]) || null; ok = true; }
  } catch (_) { /* 무시 */ }

  const html = await res.text();
  // 조회 성공 시에만 주입한다(행이 없으면 null = '페이지 없음'이 정답).
  // 실패했으면 주입을 생략해 브라우저가 직접 다시 시도하게 둔다.
  if (!ok) return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
  const inject = `<script>window.__PAGE__=${JSON.stringify(data).replace(/</g, '\\u003c')};</script>`;
  const out = html.includes('</head>') ? html.replace('</head>', inject + '</head>') : inject + html;
  return new Response(out, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}
