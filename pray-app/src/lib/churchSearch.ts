// 교회 이름 검색 — OpenStreetMap Nominatim (무인증, 사용정책상 초당 1회 · User-Agent 필수)
// 카카오 로컬 API는 NEOIX 앱에서 '지도/로컬' 서비스가 꺼져 있어 사용 불가라 OSM으로 대체.

export interface ChurchHit {
  name: string;
  address: string;
}

export async function searchChurch(query: string, signal?: AbortSignal): Promise<ChurchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  // 한국 교회명은 "온누리교회"처럼 붙여쓰기로 색인돼 있어 공백 없이 접미어를 붙인다.
  // ("온누리 교회"는 0건, "온누리교회"는 매칭됨)
  const term = /교회|성당|채플|chapel|church/i.test(q) ? q : `${q}교회`;
  const url =
    'https://nominatim.openstreetmap.org/search?' +
    new URLSearchParams({
      q: term,
      format: 'json',
      countrycodes: 'kr',
      limit: '8',
      'accept-language': 'ko',
    }).toString();

  const res = await fetch(url, {
    headers: { 'User-Agent': 'pray-app/1.0 (https://neoix.kr)' },
    signal,
  });
  if (!res.ok) return [];
  const raw = (await res.json()) as { display_name: string }[];

  const seen = new Set<string>();
  const hits: ChurchHit[] = [];
  for (const r of raw) {
    const parts = (r.display_name ?? '').split(',').map((s) => s.trim());
    const name = parts[0];
    if (!name || seen.has(name)) continue;
    seen.add(name);
    // 뒤쪽 행정구역 2~3개만 간단히 주소로
    const tail = parts.slice(1).filter((p) => !/^\d/.test(p) && p !== '대한민국');
    hits.push({ name, address: tail.slice(-3).join(' ') });
  }
  return hits;
}
