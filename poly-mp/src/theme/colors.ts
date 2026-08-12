// Poly Design System — Premium Black-on-Light (Chanel/Apple class)
// Primary = Premium Black #0A0A0B (the brand color)
// Background = light & clean (warm off-white)
// Tone = 럭셔리 흑백 — 정제된 무게감, 샤프한 대비, 미니멀

// ─── DEFAULT — Premium Black-on-Light ───
export const COLORS = {
  // Primary — Vivid Indigo (indigo-600, 채도 높은 쨍한 톤 · 정치 중립)
  primary: '#4F46E5',           // vivid indigo accent — brand anchor
  primaryBright: '#6366F1',     // indigo-500 hover/highlight
  primaryDeep: '#4338CA',       // indigo-700 pressed
  primaryGlow: 'rgba(79,70,229,0.28)',
  primaryDim: 'rgba(79,70,229,0.08)',
  primaryLight: '#E9E9FE',      // soft indigo tint (bg pills)
  primaryHover: '#4338CA',
  primaryDark: '#3730A3',

  // Graphite — dark neutral base (hero, dark surfaces)
  graphite: '#17181F',
  graphiteSoft: '#22232C',

  // Accent — Soft electric blue (subtle highlight only)
  accent: '#3B82F6',            // blue-500, used sparingly
  accentBright: '#60A5FA',
  accentDeep: '#2563EB',
  accentGlow: 'rgba(59,130,246,0.22)',
  accentDim: 'rgba(59,130,246,0.06)',

  // Brand
  brandBlue: '#3B82F6',
  brandGray: '#0A0A0B',

  // ─── Surfaces — Toss contrast (gray bg, white cards) ───
  background: '#EDEFF2',         // Toss-style gray base — makes white cards pop
  backgroundSecondary: '#E4E7EB',
  backgroundMuted: '#D8DCE2',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  card: '#FFFFFF',
  float: '#FFFFFF',

  // ─── Grey scale (neutral, slight warm) ───
  grey50: '#FAFAFA',
  grey100: '#F4F4F5',
  grey200: '#E4E4E7',
  grey300: '#D4D4D8',
  grey400: '#A1A1AA',
  grey500: '#71717A',
  grey600: '#52525B',
  grey700: '#3F3F46',
  grey800: '#27272A',
  grey900: '#0A0A0B',

  // ─── Text hierarchy (deep black contrast) ───
  text: '#0A0A0B',              // primary text — deep black
  textStrong: '#000000',
  textBody: '#27272A',
  textSecondary: '#52525B',
  textCaption: '#71717A',
  textPlaceholder: '#A1A1AA',
  textInverse: '#FFFFFF',
  textTertiary: '#A1A1AA',

  // ─── Borders & Dividers ───
  border: '#E4E4E7',
  borderStrong: '#D4D4D8',
  divider: '#F1F1F3',

  // ─── Header (clean white) ───
  headerBg: '#FFFFFF',
  headerText: '#0A0A0B',

  // ─── Semantic ───
  success: '#10B981',
  successLight: '#D1FAE5',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  caution: '#F59E0B',
  info: '#3B82F6',
  premium: '#0A0A0B',

  // ─── Party colors (preserved) ───
  party: {
    '국민의힘': '#E61E2B',
    '더불어민주당': '#004EA2',
    '조국혁신당': '#004098',
    '개혁신당': '#FF7210',
    '진보당': '#D6001C',
    '새로운미래': '#45B6AF',
    '기본소득당': '#82C8A0',
    '무소속': '#71717A',
  } as Record<string, string>,

  // ─── Misc ───
  liveRed: '#EF4444',
  overlay: 'rgba(10,10,11,0.5)',
  overlayStrong: 'rgba(10,10,11,0.78)',
  skeleton: '#E4E7EB',
  like: '#EF4444',
  badge: '#4F46E5',

  // ─── Glass tokens (frosted white) ───
  glassBase: 'rgba(255,255,255,0.72)',
  glassBorder: 'rgba(255,255,255,0.6)',
  glassHighlight: 'rgba(255,255,255,0.92)',
  glassShadow: 'rgba(10,10,11,0.06)',

  // ─── Tab bar (indigo active = brand presence) ───
  tabActive: '#4F46E5',
  tabActiveLabel: '#4F46E5',
  tabInactive: '#A1A1AA',
  tabInactiveLabel: '#71717A',
};

// ─── DARK MODE (optional, kept for future toggle) ───
export const COLORS_DARK = {
  primary: '#FAFAFA',           // inverse on dark
  primaryBright: '#FFFFFF',
  primaryDeep: '#E4E4E7',
  primaryGlow: 'rgba(250,250,250,0.22)',
  primaryDim: 'rgba(250,250,250,0.10)',
  primaryLight: 'rgba(250,250,250,0.16)',
  primaryHover: '#FFFFFF',
  primaryDark: '#D4D4D8',

  // Graphite — 라이트와 동일한 다크 뉴트럴 (히어로 표면은 테마 무관)
  graphite: '#17181F',
  graphiteSoft: '#22232C',

  accent: '#60A5FA',
  accentBright: '#93C5FD',
  accentDeep: '#3B82F6',
  accentGlow: 'rgba(96,165,250,0.30)',
  accentDim: 'rgba(96,165,250,0.10)',

  brandBlue: '#3B82F6',
  brandGray: '#0A0A0B',

  background: '#0A0A0B',
  backgroundSecondary: '#111114',
  backgroundMuted: '#16161A',
  surface: '#16161A',
  surfaceElevated: '#1C1C22',
  card: '#16161A',
  float: '#1C1C22',

  grey50: '#0A0A0B',
  grey100: '#16161A',
  grey200: '#1C1C22',
  grey300: '#27272A',
  grey400: '#3F3F46',
  grey500: '#52525B',
  grey600: '#71717A',
  grey700: '#A1A1AA',
  grey800: '#D4D4D8',
  grey900: '#FAFAFA',

  text: '#FAFAFA',
  textStrong: '#FFFFFF',
  textBody: '#E4E4E7',
  textSecondary: '#A1A1AA',
  textCaption: '#71717A',
  textPlaceholder: '#52525B',
  textInverse: '#0A0A0B',
  textTertiary: '#71717A',

  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.16)',
  divider: 'rgba(255,255,255,0.06)',

  headerBg: '#0A0A0B',
  headerText: '#FAFAFA',

  success: '#34D399',
  successLight: 'rgba(52,211,153,0.14)',
  error: '#F87171',
  errorLight: 'rgba(248,113,113,0.14)',
  warning: '#FBBF24',
  warningLight: 'rgba(251,191,36,0.14)',
  caution: '#FBBF24',
  info: '#60A5FA',
  premium: '#FAFAFA',

  party: {
    '국민의힘': '#E61E2B',
    '더불어민주당': '#004EA2',
    '조국혁신당': '#004098',
    '개혁신당': '#FF7210',
    '진보당': '#D6001C',
    '새로운미래': '#45B6AF',
    '기본소득당': '#82C8A0',
    '무소속': '#A1A1AA',
  } as Record<string, string>,

  liveRed: '#F87171',
  overlay: 'rgba(0,0,0,0.72)',
  overlayStrong: 'rgba(0,0,0,0.88)',
  skeleton: '#1C1C22',
  like: '#F87171',
  badge: '#FAFAFA',

  glassBase: 'rgba(22,22,26,0.72)',
  glassBorder: 'rgba(255,255,255,0.1)',
  glassHighlight: 'rgba(255,255,255,0.08)',
  glassShadow: 'rgba(0,0,0,0.5)',

  tabActive: '#FAFAFA',
  tabActiveLabel: '#FAFAFA',
  tabInactive: '#52525B',
  tabInactiveLabel: '#71717A',
};

// Backward-compat alias
export const COLORS_LIGHT = COLORS;

// Soft neutral shadow system — restrained, premium
export const SHADOWS = {
  subtle: {
    shadowColor: '#0A0A0B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  standard: {
    shadowColor: '#0A0A0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  elevated: {
    shadowColor: '#0A0A0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  modal: {
    shadowColor: '#0A0A0B',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 12,
  },

  // Legacy aliases
  small: {
    shadowColor: '#0A0A0B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  medium: {
    shadowColor: '#0A0A0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  large: {
    shadowColor: '#0A0A0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
};

// 자간(letterSpacing)은 poly-build 화면들의 실측 관례 — 타이트한 한글 자간이 폴리 톤의 핵심.
export const TYPO = {
  displayHero: { fontSize: 30, fontWeight: '900' as const, lineHeight: 40, letterSpacing: -0.7 },
  displayLarge: { fontSize: 26, fontWeight: '900' as const, lineHeight: 36, letterSpacing: -0.6 },
  headingLarge: { fontSize: 22, fontWeight: '700' as const, lineHeight: 30, letterSpacing: -0.5 },
  heading: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28, letterSpacing: -0.4 },
  subtitle: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24, letterSpacing: -0.3 },
  bodyLarge: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24, letterSpacing: -0.2 },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 22, letterSpacing: -0.2 },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, lineHeight: 20, letterSpacing: -0.2 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 18, letterSpacing: -0.1 },
};

export const SPACING = {
  xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32, xxxl: 40,
};

export const RADIUS = {
  compact: 8,
  standard: 12,
  comfortable: 16,
  large: 20,
  xlarge: 28,
  pill: 9999,
};
