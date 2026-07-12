import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Switch, Alert } from 'react-native';
import { useTheme, FONT, RADIUS, SPACING, CLOUD_SHADOW, Palette } from '../theme';
import { usePrayerStore } from '../store/PrayerStore';
import { requestNotifPermission } from '../lib/notifications';
import ScreenHeader from '../components/common/ScreenHeader';

const HOURS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
const MINUTES = [0, 30];

// 매일 기도 알림 — 시간을 정하면 그 시간에 오늘의 기도제목과 함께 알림이 온다.
export default function NotificationSettingsScreen() {
  const store = usePrayerStore();
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);

  const [enabled, setEnabled] = useState(store.notif.enabled);
  const [hour, setHour] = useState(store.notif.hour);
  const [minute, setMinute] = useState(store.notif.minute);

  const toggle = async (v: boolean) => {
    if (v) {
      const ok = await requestNotifPermission();
      if (!ok) {
        Alert.alert('알림 권한 필요', '설정 > 중보에서 알림을 허용해 주세요.');
        return;
      }
    }
    setEnabled(v);
    store.setNotif({ enabled: v, hour, minute });
  };

  const setTime = (h: number, m: number) => {
    setHour(h);
    setMinute(m);
    if (enabled) store.setNotif({ enabled, hour: h, minute: m });
  };

  const ampm = hour < 12 ? '오전' : '오후';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;

  return (
    <View style={styles.root}>
      <ScreenHeader title="기도 알림" />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* 켜기/끄기 */}
        <View style={[styles.card, CLOUD_SHADOW.soft]}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>매일 기도 알림</Text>
              <Text style={styles.toggleDesc}>
                {enabled
                  ? `매일 ${ampm} ${h12}시${minute ? ` ${minute}분` : ''}에 오늘의 기도제목과 함께 알려드려요`
                  : '정한 시간에 오늘의 기도제목과 함께 알려드려요'}
              </Text>
            </View>
            <Switch value={enabled} onValueChange={toggle} trackColor={{ true: C.primary, false: C.backgroundSky }} thumbColor="#fff" />
          </View>
        </View>

        {/* 시간 선택 */}
        {enabled && (
          <View style={[styles.card, CLOUD_SHADOW.soft]}>
            <Text style={styles.sectionTitle}>시간</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hourRow}>
              {HOURS.map((h) => (
                <Pressable key={h} onPress={() => setTime(h, minute)} style={[styles.hourChip, hour === h && styles.chipOn]}>
                  <Text style={[styles.chipText, hour === h && styles.chipTextOn]}>
                    {h < 12 ? '오전' : '오후'} {h % 12 === 0 ? 12 : h % 12}시
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>분</Text>
            <View style={styles.minuteRow}>
              {MINUTES.map((m) => (
                <Pressable key={m} onPress={() => setTime(hour, m)} style={[styles.minuteChip, minute === m && styles.chipOn]}>
                  <Text style={[styles.chipText, minute === m && styles.chipTextOn]}>{m === 0 ? '정각' : `${m}분`}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.note}>
          잠금화면 팝업은 iOS 정책상 제공되지 않아, 매일 알림에 오늘의 기도제목을 담아 보내드려요. 알림을 누르면 앱이 열립니다.
        </Text>
      </ScrollView>
    </View>
  );
}

const createStyles = (C: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: C.background },
    scroll: { paddingHorizontal: SPACING.xl, paddingBottom: 60 },
    card: { backgroundColor: C.surface, borderRadius: RADIUS.lg, padding: SPACING.xl, marginBottom: SPACING.md },

    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    toggleTitle: { fontSize: 16, color: C.text, fontFamily: FONT.semibold },
    toggleDesc: { fontSize: 13, color: C.textCaption, fontFamily: FONT.regular, marginTop: 4, lineHeight: 19 },

    sectionTitle: { fontSize: 13, color: C.textCaption, fontFamily: FONT.semibold, marginBottom: SPACING.sm },
    hourRow: { gap: 7 },
    hourChip: { paddingHorizontal: 13, height: 36, borderRadius: RADIUS.pill, backgroundColor: C.cardMuted, alignItems: 'center', justifyContent: 'center' },
    minuteRow: { flexDirection: 'row', gap: 7 },
    minuteChip: { paddingHorizontal: 18, height: 36, borderRadius: RADIUS.pill, backgroundColor: C.cardMuted, alignItems: 'center', justifyContent: 'center' },
    chipOn: { backgroundColor: C.primary },
    chipText: { fontSize: 13.5, color: C.textSecondary, fontFamily: FONT.medium },
    chipTextOn: { color: '#fff', fontFamily: FONT.semibold },

    note: { fontSize: 12.5, color: C.textPlaceholder, fontFamily: FONT.regular, lineHeight: 19, paddingHorizontal: 4, marginTop: 4 },
  });
