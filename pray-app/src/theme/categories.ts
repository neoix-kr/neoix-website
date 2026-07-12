import { Ionicons } from '@expo/vector-icons';

// 기도마당 분류 비주얼 — 아이콘 + 고유색 (라이트/다크 공통, 배경은 알파 틴트)
export const CATEGORY_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  건강: { icon: 'pulse', color: '#E5674F' },
  가족: { icon: 'home', color: '#E8A33D' },
  진로: { icon: 'briefcase', color: '#3577F0' },
  신앙: { icon: 'book', color: '#7C6CD9' },
  감사: { icon: 'sunny', color: '#2E9E8F' },
  기타: { icon: 'chatbubble-ellipses', color: '#8B95A1' },
};

export const catMeta = (c: string) => CATEGORY_META[c] ?? CATEGORY_META['기타'];
// 12% 알파 틴트 배경 (라이트/다크 양쪽에서 자연스러움)
export const catTint = (c: string) => catMeta(c).color + '1F';
