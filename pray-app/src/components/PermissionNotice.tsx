import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { FONT, RADIUS, SPACING, useTheme, Palette } from '../theme';

const KEY = 'pray:perm-notice-v1';

// 정보통신망법 제22조의2 앱 접근권한 고지 — 안드로이드 최초 실행 시 1회 표시.
// 모든 권한이 선택 권한임을 명시한다 (미허용 시에도 서비스 이용 가능).
const ITEMS: { icon: keyof typeof Ionicons.glyphMap; label: string; desc: string }[] = [
  { icon: 'people-outline', label: '연락처 (선택)', desc: '이웃(성도) 찾기 매칭에만 사용해요' },
  { icon: 'location-outline', label: '위치 (선택)', desc: '우리동네 기도제목 표시용 동네 확인' },
  { icon: 'camera-outline', label: '카메라·사진 (선택)', desc: '프로필 사진과 기도제목 사진 첨부' },
  { icon: 'notifications-outline', label: '알림 (선택)', desc: '정해둔 시간의 기도 알림' },
];

export default function PermissionNotice() {
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    AsyncStorage.getItem(KEY).then((v) => {
      if (!v) setVisible(true);
    });
  }, []);

  const confirm = () => {
    AsyncStorage.setItem(KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" onRequestClose={confirm}>
      <View style={styles.dim}>
        <View style={styles.sheet}>
          <Text style={styles.title}>앱 접근권한 안내</Text>
          <Text style={styles.sub}>기도해요는 아래 권한을 사용해요. 모두 선택 권한이라 허용하지 않아도 서비스를 이용할 수 있어요.</Text>

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

          <Text style={styles.note}>권한은 해당 기능을 처음 사용할 때 요청되며, 휴대폰 설정에서 언제든 변경할 수 있어요.</Text>

          <Pressable onPress={confirm} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }]}>
            <Text style={styles.btnText}>확인했어요</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (C: Palette) =>
  StyleSheet.create({
    dim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: C.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: SPACING.xxl,
      paddingBottom: SPACING.xxl + 12,
    },
    title: { fontSize: 20, color: C.textStrong, fontFamily: FONT.bold },
    sub: { fontSize: 13.5, lineHeight: 20, color: C.textSecondary, fontFamily: FONT.regular, marginTop: 8, marginBottom: SPACING.lg },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: C.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: { fontSize: 15, color: C.text, fontFamily: FONT.semibold },
    rowDesc: { fontSize: 12.5, color: C.textSecondary, fontFamily: FONT.regular, marginTop: 2 },
    note: { fontSize: 12, lineHeight: 17, color: C.textPlaceholder, fontFamily: FONT.regular, marginTop: SPACING.md },
    btn: {
      height: 52,
      borderRadius: RADIUS.lg,
      backgroundColor: C.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: SPACING.lg,
    },
    btnText: { fontSize: 16, color: '#fff', fontFamily: FONT.semibold },
  });
