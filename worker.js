// neoix.kr 정적 사이트 + 라우팅
// 실제 파일이 있는 요청은 워커를 거치지 않고 바로 서빙됨(assets 우선).
// 여기는 "파일이 없는" 경로만 들어온다.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 임시 진단: 링크 페이지가 보내는 이벤트를 로그로 남김 (wrangler tail로 실시간 확인)
    if (url.pathname === '/diag') {
      console.log('DIAG', url.search, '|UA:', (request.headers.get('user-agent') || '').slice(0, 120));
      return new Response('ok', { headers: { 'cache-control': 'no-store' } });
    }

    // 앱스토어 리다이렉트: /go?u=<스토어 URL> — 같은 도메인 이동이라 인앱 브라우저가 못 막고,
    // 302는 엔진 레벨이라 무조건 따라감. 스토어 도메인만 허용(오픈 리다이렉트 방지).
    if (url.pathname === '/go') {
      const u = url.searchParams.get('u') || '';
      const ua = request.headers.get('user-agent') || '';
      console.log('GO', u.slice(0, 80), '|UA:', ua.slice(0, 120));
      if (!/^https:\/\/(apps\.apple\.com|itunes\.apple\.com|play\.google\.com)\//.test(u)) {
        return Response.redirect('https://neoix.kr/', 302);
      }
      const inApp = /Instagram|FBAN|FBAV|FB_IAB|KAKAOTALK|Line\//i.test(ua);
      const isApple = /apps\.apple\.com|itunes\.apple\.com/.test(u);
      // 인앱 브라우저(인스타 등)는 apps.apple.com 앱 전환을 조용히 삼킴 →
      // 중간 페이지에서 앱스토어 스킴으로 전환 + 실패 대비 버튼 제공(무반응 방지)
      if (inApp && isApple) {
        const scheme = u.replace(/^https:\/\//, 'itms-appss://');
        const e = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
        return new Response(`<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>App Store로 이동</title>
<style>body{margin:0;background:#000;color:#fff;font-family:-apple-system,'Pretendard Variable',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px}
.b{max-width:320px}.t{font-size:17px;font-weight:700;margin-bottom:8px}.d{font-size:13px;color:rgba(255,255,255,.55);line-height:1.6;margin-bottom:24px}
a.go{display:block;background:#fff;color:#000;font-size:16px;font-weight:800;padding:16px;border-radius:14px;text-decoration:none;margin-bottom:10px}
a.web{display:block;color:rgba(255,255,255,.6);font-size:13px;padding:10px;text-decoration:underline}</style></head><body>
<div class="b"><div class="t">App Store로 이동 중…</div>
<div class="d">자동으로 열리지 않으면 아래 버튼을 눌러 주세요.</div>
<a class="go" href="${e(scheme)}">App Store 열기</a>
<a class="web" href="${e(u)}">웹에서 보기</a></div>
<script>setTimeout(function(){location.href=${JSON.stringify(scheme)};},60);</script>
</body></html>`, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
      }
      return Response.redirect(u, 302);
    }

    // 링크인바이오: /link/{slug} → 공개 렌더러(/link/index.html)
    if (url.pathname.startsWith('/link/')) {
      return env.ASSETS.fetch(new URL('/link/', url));
    }

    // 짧은 주소: neoix.kr/{슬러그} — 실제 파일/폴더가 없는 단일 세그먼트(확장자 없음)만 여기 도달
    const seg = url.pathname.slice(1);
    if (seg && !seg.includes('/') && !seg.includes('.')) {
      return env.ASSETS.fetch(new URL('/link/', url));
    }

    return env.ASSETS.fetch(request);
  },
};
