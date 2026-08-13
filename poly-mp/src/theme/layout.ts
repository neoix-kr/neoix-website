// 레이아웃 토큰 — 화면마다 제각각이던 여백·반경을 한 곳에서 고정한다.
// 원칙: 여백은 화면 밖(카드 사이)보다 안(콘텐츠)이 넉넉해야 하고, 리스트는 밀도가 우선이다.
// 값은 4pt 그리드. 임의값을 새로 만들지 말고 여기서 가져다 쓴다.
export const LAYOUT = {
  /** 화면 좌우 여백 — 모든 카드·리스트 공통 */
  screenX: 16,
  /** 카드 사이 세로 간격 (개별 카드형 리스트) */
  cardGap: 8,
  /** 리스트 카드 내부 여백 */
  cardPadX: 14,
  cardPadY: 12,
  /** 리스트 카드 모서리 */
  cardRadius: 16,
  /** 요약 스트립·히어로 등 큰 블록 모서리 */
  blockRadius: 20,

  /** 그룹 리스트(한 카드 안에 여러 행) — 연락처·조직·설정 */
  rowPadX: 14,
  rowPadY: 11,
  rowGap: 12,
  /** 그룹 리스트 아바타 지름 */
  rowAvatar: 40,
  /** 구분선 좌측 인셋 = rowPadX + rowAvatar + rowGap (아바타 오른쪽부터 시작) */
  rowDividerInset: 14 + 40 + 12,
} as const;

/** 카드형 리스트 아이템 공통 스타일 조각 — StyleSheet에 스프레드해서 쓴다 */
export const cardBase = (surface: string) => ({
  backgroundColor: surface,
  marginHorizontal: LAYOUT.screenX,
  marginBottom: LAYOUT.cardGap,
  paddingHorizontal: LAYOUT.cardPadX,
  paddingVertical: LAYOUT.cardPadY,
  borderRadius: LAYOUT.cardRadius,
});
