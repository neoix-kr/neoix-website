// neoix.kr 정적 사이트 + 라우팅
// 실제 파일이 있는 요청은 워커를 거치지 않고 바로 서빙됨(assets 우선).
// 여기는 "파일이 없는" 경로만 들어온다.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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
