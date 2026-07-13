import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FONT, RADIUS, SPACING, useTheme, Palette, CLOUD_SHADOW } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { getPremiumOffer, purchasePremium, restorePremium } from '../lib/premium';
import { PREMIUM_PRICE } from '../config';
import ScreenHeader from '../components/common/ScreenHeader';

const BENEFITS: { icon: keyof typeof Ionicons.glyphMap; title: string; desc: string }[] = [
  { icon: 'close-circle-outline', title: '광고 완전 제거', desc: '홈 하단 배너 광고가 사라져요' },
  { icon: 'heart-outline', title: '기도해요 후원', desc: '구독으로 서비스 운영을 도와요' },
  { icon: 'sparkles-outline', title: '앞으로 추가될 혜택', desc: '프리미엄 전용 기능이 계속 늘어나요' },
];

export default function PremiumScreen() {
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const insets = useSafeAreaInsets();
  const { profile, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [storePrice, setStorePrice] = useState<string | null>(null);

  const isPremium = !!profile?.is_premium;

  useEffect(() => {
    getPremiumOffer().then((o) => o && setStorePrice(o.price)).catch(() => {});
  }, []);

  const subscribe = async () => {
    setBusy(true);
    const { ok, error } = await purchasePremium();
    if (ok) await refreshProfile();
    setBusy(false);
    if (ok) Alert.alert('구독 완료', '이제 광고 없이 기도해요를 이용할 수 있어요. 감사합니다 🙏');
    else if (error) Alert.alert('구독 안내', error);
  };

  const restore = async () => {
    setBusy(true);
    const ok = await restorePremium();
    if (ok) await refreshProfile();
    setBusy(false);
    Alert.alert(ok ? '복원 완료' : '복원할 구독 없음', ok ? '프리미엄이 복원됐어요.' : '이 계정으로 구매한 구독을 찾지 못했어요.');
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="프리미엄" />
      <ScrollView contentContainerStyle={{ padding: SPACING.xxl, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}><Ionicons name="star" size={26} color={C.primary} /></View>
          <Text style={styles.heroTitle}>광고 없이, 기도에만 집중</Text>
          <Text style={styles.heroSub}>프리미엄으로 홈 화면 광고를 없애고{'\n'}기도해요를 응원해 주세요</Text>
        </View>

        <View style={[styles.card, CLOUD_SHADOW.soft]}>
          {BENEFITS.map((b, i) => (
            <View key={b.title} style={[styles.row, i > 0 && styles.rowDivider]}>
              <View style={styles.rowIcon}><Ionicons name={b.icon} size={19} color={C.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{b.title}</Text>
                <Text style={styles.rowDesc}>{b.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {isPremium ? (
          <View style={[styles.activeCard, CLOUD_SHADOW.soft]}>
            <Ionicons name="checkmark-circle" size={20} color={C.success} />
            <Text style={styles.activeText}>프리미엄 이용 중이에요 · 광고가 제거됐어요</Text>
          </View>
        ) : (
          <>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>월 구독</Text>
              <Text style={styles.price}>{storePrice ?? PREMIUM_PRICE}</Text>
            </View>
            <Pressable onPress={subscribe} disabled={busy} style={({ pressed }) => [styles.subBtn, (pressed || busy) && { opacity: 0.9 }]}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.subText}>프리미엄 시작하기</Text>}
            </Pressable>
            <Pressable onPress={restore} disabled={busy} style={{ alignSelf: 'center', padding: 10 }}>
              <Text style={styles.restore}>구매 복원</Text>
            </Pressable>
          </>
        )}

        <Text style={styles.legal}>
          구독은 App Store / Google Play 계정으로 결제되며, 해지 전까지 매월 자동 갱신됩니다.
          해지는 기기의 스토어 구독 관리에서 언제든 할 수 있어요.
        </Text>
      </ScrollView>
    </View>
  );
}

const createStyles = (C: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: C.background },
    hero: { alignItems: 'center', marginBottom: SPACING.xl },
    heroIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md },
    heroTitle: { fontSize: 22, color: C.textStrong, fontFamily: FONT.bold },
    heroSub: { fontSize: 14, lineHeight: 21, color: C.textSecondary, fontFamily: FONT.regular, textAlign: 'center', marginTop: 8 },

    card: { backgroundColor: C.surface, borderRadius: RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.xl },
    row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 12 },
    rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.borderSoft },
    rowIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
    rowTitle: { fontSize: 15, color: C.text, fontFamily: FONT.semibold },
    rowDesc: { fontSize: 12.5, color: C.textSecondary, fontFamily: FONT.regular, marginTop: 2 },

    priceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 8, marginBottom: SPACING.md },
    priceLabel: { fontSize: 14, color: C.textSecondary, fontFamily: FONT.medium },
    price: { fontSize: 24, color: C.textStrong, fontFamily: FONT.bold },
    subBtn: { height: 54, borderRadius: RADIUS.lg, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
    subText: { fontSize: 16, color: '#fff', fontFamily: FONT.semibold },
    restore: { fontSize: 13, color: C.textSecondary, fontFamily: FONT.medium, textDecorationLine: 'underline' },

    activeCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderRadius: RADIUS.lg, padding: SPACING.lg },
    activeText: { flex: 1, fontSize: 14, color: C.text, fontFamily: FONT.semibold },

    legal: { fontSize: 11.5, lineHeight: 17, color: C.textPlaceholder, fontFamily: FONT.regular, marginTop: SPACING.xl, textAlign: 'center' },
  });
