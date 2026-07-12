import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FONT, RADIUS, SPACING, useTheme, Palette, CLOUD_SHADOW } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { agreeSensitive } from '../../lib/api';

// 종교 관련 정보(민감정보) 별도 동의 — 개인정보 보호법 제23조.
// 교회·교단, 기도제목 내용이 서버에 저장·공유되기 전 반드시 1회 동의.
const ITEMS: { icon: keyof typeof Ionicons.glyphMap; label: string; desc: string }[] = [
  { icon: 'book-outline', label: '기도제목 내용', desc: '기도 기록·나눔 기능 제공을 위해 서버에 저장돼요' },
  { icon: 'home-outline', label: '교회·교단', desc: '우리교회 설정과 모임 기능에 사용돼요' },
  { icon: 'people-outline', label: '공유 범위는 내가 결정', desc: '기도제목마다 나만 보기 / 이웃 / 모임을 직접 선택해요' },
];

export default function ConsentScreen() {
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const insets = useSafeAreaInsets();
  const { refreshProfile, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  const agree = async () => {
    setBusy(true);
    try {
      await agreeSensitive();
      await refreshProfile();
    } catch {
      setBusy(false);
      Alert.alert('잠시 후 다시', '동의 처리가 원활하지 않아요. 네트워크를 확인해 주세요.');
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.xxl }}>
        <Text style={styles.h1}>기도 정보 이용 동의</Text>
        <Text style={styles.sub}>
          기도해요의 핵심 기능(기도제목 나눔·모임)을 위해{'\n'}종교에 관한 정보를 저장해요. 시작 전에 한 번만 확인해 주세요.
        </Text>

        <View style={[styles.card, CLOUD_SHADOW.soft]}>
          {ITEMS.map((it) => (
            <View key={it.label} style={styles.row}>
              <View style={styles.iconWrap}>
                <Ionicons name={it.icon} size={19} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{it.label}</Text>
                <Text style={styles.rowDesc}>{it.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.legal}>
          <Text style={styles.legalText}>
            교회·교단·기도 내용 등 종교적 신념에 관한 정보는 「개인정보 보호법」 제23조의 민감정보예요. 기도해요는 서비스 제공에 필요한 최소한의 범위에서만 처리하고, 회원 탈퇴 시 지체 없이 파기해요. 자세한 내용은 개인정보처리방침에서 확인할 수 있어요.
          </Text>
          <Text style={[styles.legalText, { marginTop: 8 }]}>
            이 동의는 서비스 이용에 꼭 필요해서, 동의하지 않으면 기도해요를 이용할 수 없어요.
          </Text>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: SPACING.xxl, gap: 10 }}>
        <Pressable onPress={agree} disabled={busy} style={({ pressed }) => [styles.btn, (pressed || busy) && { opacity: 0.9 }]}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>동의하고 시작하기</Text>}
        </Pressable>
        <Pressable onPress={signOut} style={{ alignSelf: 'center', padding: 8 }}>
          <Text style={styles.decline}>동의하지 않고 로그아웃</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (C: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: C.background },
    h1: { fontSize: 24, color: C.textStrong, fontFamily: FONT.bold, marginTop: SPACING.xl },
    sub: { fontSize: 14.5, lineHeight: 22, color: C.textSecondary, fontFamily: FONT.regular, marginTop: 10, marginBottom: SPACING.xl },
    card: { backgroundColor: C.surface, borderRadius: RADIUS.xl, padding: SPACING.lg, gap: 4 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
    iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
    rowLabel: { fontSize: 15, color: C.text, fontFamily: FONT.semibold },
    rowDesc: { fontSize: 12.5, lineHeight: 18, color: C.textSecondary, fontFamily: FONT.regular, marginTop: 2 },
    legal: { marginTop: SPACING.lg, paddingHorizontal: 2 },
    legalText: { fontSize: 12, lineHeight: 18, color: C.textPlaceholder, fontFamily: FONT.regular },
    btn: { height: 54, borderRadius: RADIUS.lg, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
    btnText: { fontSize: 16, color: '#fff', fontFamily: FONT.semibold },
    decline: { fontSize: 13, color: C.textPlaceholder, fontFamily: FONT.regular, textDecorationLine: 'underline' },
  });
