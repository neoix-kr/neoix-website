// neoix.kr 정적 사이트 + 라우팅
// 실제 파일이 있는 요청은 워커를 거치지 않고 바로 서빙됨(assets 우선).
// 여기는 "파일이 없는" 경로만 들어온다.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 임시 진단(/iabtest 전용): 어떤 방식이 인앱에서 통하는지 폰에서 판별하기 위한 로그
    if (url.pathname === '/diag') {
      console.log('IABTEST', url.search, '|UA:', (request.headers.get('user-agent') || '').slice(0, 110));
      return new Response('ok', { headers: { 'cache-control': 'no-store' } });
    }

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
