// 중보 — 컬러 시스템 v3 (구름 천국 톤 + 시스템 다크모드)
// LIGHT = 낮 하늘(새벽빛 + 구름 화이트 카드), DARK = 깊은 밤하늘.
// 화면은 useTheme()의 C만 사용한다. COLORS는 LIGHT의 별칭(레거시 호환).

export const LIGHT = {
  // ─── 하늘 (홈 헤더 새벽 하늘 → 배경으로 자연스럽게) ───
  sky: ['#C7DEF6', '#E2EDF9', '#EFF4FA'] as [string, string, string],
  skyDeep: ['#C7DEF6', '#EFF4FA'] as [string, string],
  cloud: '#FFFFFF',
  primaryGradient: ['#3577F0', '#3577F0'] as [string, string],

  // ─── Primary — 브랜드 블루 (아이콘 소매 파랑 계열) ───
  primary: '#3577F0',
  primaryBright: '#5B90F4',
  primaryDeep: '#2A63D4',
  primaryGlow: 'rgba(53,119,240,0.28)',
  primaryDim: 'rgba(53,119,240,0.08)',
  primaryLight: '#EBF2FE', // 옅은 블루 틴트 (칩/아바타 배경)

  // ─── Gold — 응답된 기도 · 특별 포인트에만 아껴서 ───
  gold: '#D9A03F',
  goldBright: '#E8B65C',
  goldDeep: '#A97722',
  goldLight: '#FAF1DE',
  goldText: '#8F6A1D',

  // ─── Surfaces (은은한 하늘빛 화이트) ───
  background: '#EFF4FA',
  backgroundSky: '#E2EAF4',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  card: '#FFFFFF',
  cardMuted: '#F7F8FA',
  footerBg: '#FFFFFF',

  // ─── Text (또렷한 위계) ───
  text: '#191F28',
  textStrong: '#0E1420',
  textBody: '#333D4B',
  textSecondary: '#4E5968',
  textCaption: '#8B95A1',
  textPlaceholder: '#B0B8C1',
  textInverse: '#FFFFFF',

  // ─── Borders & Dividers ───
  border: '#E5E8EB',
  borderSoft: '#EEF0F3',
  borderStrong: '#D5DAE0',
  divider: '#F0F2F4',

  // ─── 3단계 카테고리 ───
  tier: {
    urgent: '#E5674F',
    urgentBg: '#FDEEEA',
    urgentText: '#C24329',
    week: '#E8A33D',
    weekBg: '#FCF3E3',
    weekText: '#A66A14',
    period: '#2E9E8F',
    periodBg: '#E6F4F1',
    periodText: '#1E7566',
  },

  // ─── Semantic ───
  success: '#2E9E6B',
  successLight: '#E5F4EC',
  answered: '#2E9E6B',
  error: '#E0533D',
  errorLight: '#FCEDEA',
  warning: '#E8A33D',
  warningLight: '#FCF3E3',

  // ─── Avatar / misc ───
  avatarBg: '#EBF2FE',
  avatarText: '#3577F0',
  overlay: 'rgba(25,31,40,0.5)',
  skeleton: '#E9EDF1',
  like: '#E5674F',

  // ─── Tab bar ───
  tabActive: '#3577F0',
  tabInactive: '#9AA3AD',
};

export type Palette = typeof LIGHT;

// ─── DARK — 뉴트럴 다크 (시스템 다크모드, 파란기 최소화) ───
export const DARK: Palette = {
  sky: ['#0E1014', '#15171D', '#111318'] as [string, string, string],
  skyDeep: ['#0E1014', '#111318'] as [string, string],
  cloud: '#22252C',
  primaryGradient: ['#7FA3EC', '#7FA3EC'] as [string, string],

  primary: '#7FA3EC',
  primaryBright: '#9FBCF2',
  primaryDeep: '#5F87DC',
  primaryGlow: 'rgba(127,163,236,0.3)',
  primaryDim: 'rgba(127,163,236,0.1)',
  primaryLight: 'rgba(127,163,236,0.16)',

  gold: '#E4BC6C',
  goldBright: '#F0CE88',
  goldDeep: '#C89B45',
  goldLight: 'rgba(228,188,108,0.14)',
  goldText: '#E4BC6C',

  background: '#111318',
  backgroundSky: '#22252C',
  surface: '#1B1E24',
  surfaceElevated: '#222529',
  card: '#1B1E24',
  cardMuted: '#25282F',
  footerBg: '#15171C',

  text: '#EDEEF1',
  textStrong: '#FFFFFF',
  textBody: '#C7CBD3',
  textSecondary: '#9AA1AC',
  textCaption: '#6E7480',
  textPlaceholder: '#515762',
  textInverse: '#111318',

  border: 'rgba(255,255,255,0.09)',
  borderSoft: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.16)',
  divider: 'rgba(255,255,255,0.07)',

  tier: {
    urgent: '#F08A72',
    urgentBg: 'rgba(240,138,114,0.16)',
    urgentText: '#F5AD9C',
    week: '#E8B25C',
    weekBg: 'rgba(232,178,92,0.16)',
    weekText: '#F0C987',
    period: '#5FC0AE',
    periodBg: 'rgba(95,192,174,0.16)',
    periodText: '#8FD9CB',
  },

  success: '#6FCF97',
  successLight: 'rgba(111,207,151,0.16)',
  answered: '#6FCF97',
  error: '#F08A80',
  errorLight: 'rgba(240,138,128,0.16)',
  warning: '#E8B25C',
  warningLight: 'rgba(232,178,92,0.16)',

  avatarBg: 'rgba(127,163,236,0.18)',
  avatarText: '#9FBCF2',
  overlay: 'rgba(0,0,0,0.6)',
  skeleton: '#25282F',
  like: '#F08A72',

  tabActive: '#9FBCF2',
  tabInactive: '#5B6067',
};

// 레거시 호환 별칭 — 신규 코드는 useTheme()의 C를 쓸 것
export const COLORS = LIGHT;

// ─── 기도 모드 = 항상 다크 (깊은 밤하늘 · 눈부심 방지) ───
export const NIGHT = {
  bg: '#0F1526',
  card: '#1D2640',
  cardSoft: '#182036',
  border: 'rgba(255,255,255,0.08)',
  text: '#EEF2FA',
  textSecondary: '#A9B4CE',
  textMuted: '#6D7893',
  primary: '#8FB0E8',
  gold: '#E4BC6C',
  goldSoft: 'rgba(228,188,108,0.14)',
  tierUrgent: '#F08A72',
  tierUrgentSoft: 'rgba(240,138,114,0.14)',
  tierUrgentText: '#F5AD9C',
  overlay: 'rgba(0,0,0,0.6)',
  // 밤하늘 그라데이션 + 별
  sky: ['#0C1120', '#131B33', '#1B2745'] as const,
  skyDeep: ['#0C1120', '#1B2745'] as const,
  star: 'rgba(255,255,255,0.85)',
  starDim: 'rgba(255,255,255,0.35)',
  primaryGradient: ['#8FB0E8', '#8FB0E8'] as const,
};

// 그림자 — 카드가 배경에서 살짝만 뜨게, 최소한으로
export const CLOUD_SHADOW = {
  soft: {
    shadowColor: '#191F28',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  card: {
    shadowColor: '#191F28',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  float: {
    shadowColor: '#191F28',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  primary: {
    shadowColor: '#3577F0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
};
