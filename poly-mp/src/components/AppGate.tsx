/**
 * NEOIX 공용 앱 게이트 — 강제 업데이트 / 점검 모드 차단 화면 + 권장 업데이트·공지 안내.
 * pray-app 원본을 폴리 오피스 테마 토큰(COLORS/TYPO/SPACING/RADIUS)으로 이식.
 *
 * 배치: 최상위에서 children을 감싼다. 설정을 못 받으면 항상 통과시킨다(서비스 우선).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Linking, Platform, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/ThemeContext';
import { TYPO, SPACING, RADIUS } from '../theme/colors';
import {
  fetchAppConfig, evaluateGate, isNoticeDismissed, dismissNotice,
  isUpdateSkipped, skipUpdate, type AppGateState,
} from '../services/appConfig';

const PLATFORM = Platform.OS === 'android' ? 'android' : Platform.OS === 'ios' ? 'ios' : 'web';

export default function AppGate({ children }: { children: React.ReactNode }) {
  const { COLORS, SHADOWS } = useTheme();
  const styles = React.useMemo(() => makeStyles(COLORS), [COLORS]);
  const insets = useSafeAreaInsets();

  const [gate, setGate] = useState<AppGateState | null>(null);
  const [showNotice, setShowNotice] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);

  const load = useCallback(async () => {
    const config = await fetchAppConfig();
    const g = evaluateGate(config, PLATFORM);
    setGate(g);

    // 매번 양쪽 다 재계산한다 — 서버에서 공지를 내리거나 권장 버전을 롤백하면 배너도 사라져야 한다.
    const noticeOn =
      g.kind === 'ok' && !!config?.notice_id && !(await isNoticeDismissed(config.notice_id));
    const suggestOn =
      g.kind === 'ok' && g.suggestUpdate && !!config?.latest_version &&
      !(await isUpdateSkipped(config.latest_version));
    setShowNotice(noticeOn);
    setShowSuggest(suggestOn);
  }, []);

  // 배너는 화면 하단에 떠서 FAB·확인 버튼을 가릴 수 있다. 읽을 시간(12초)만 보여주고 접는다.
  // 닫기(X)를 눌러야 '다시 보지 않기'로 기록되므로, 자동으로 접힌 공지는 다음 실행에 다시 보인다.
  useEffect(() => {
    if (!showNotice) return;
    const t = setTimeout(() => setShowNotice(false), 12000);
    return () => clearTimeout(t);
  }, [showNotice]);
  // 공지가 함께 떠 있으면 권장 배너는 가려져 있으므로, 공지가 접힌 뒤부터 12초를 센다.
  useEffect(() => {
    if (!showSuggest || showNotice) return;
    const t = setTimeout(() => setShowSuggest(false), 12000);
    return () => clearTimeout(t);
  }, [showSuggest, showNotice]);

  useEffect(() => {
    load();
    // 백그라운드에서 돌아올 때 재확인 — 점검 시작/해제를 앱 재시작 없이 반영
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') load(); });
    return () => sub.remove();
  }, [load]);

  const openStore = () => {
    // storeUrl 미설정(서버 기본값 NULL)이어도 사용자가 빠져나갈 길은 남겨둔다.
    const fallback =
      Platform.OS === 'android'
        ? 'market://search?q=' + encodeURIComponent(gate?.config?.app_name || '')
        : 'itms-apps://search.itunes.apple.com/WebObjects/MZSearch.woa/wa/search?media=software&term=' +
          encodeURIComponent(gate?.config?.app_name || '');
    const url = gate?.storeUrl || fallback;
    Linking.openURL(url).catch(() => {});
  };

  // ── 차단 화면 (강제 업데이트 / 점검) ──
  if (gate && (gate.kind === 'force_update' || gate.kind === 'maintenance')) {
    const isMaint = gate.kind === 'maintenance';
    return (
      <View style={[styles.blockWrap, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.blockIcon}>
          <Ionicons
            name={isMaint ? 'construct-outline' : 'arrow-up-circle-outline'}
            size={30}
            color={COLORS.primary}
          />
        </View>
        <Text style={styles.blockTitle}>
          {isMaint ? '잠시 점검 중이에요' : '업데이트가 필요해요'}
        </Text>
        <Text style={styles.blockBody}>{gate.message}</Text>

        {!isMaint && (
          <Pressable style={styles.blockBtn} onPress={openStore}>
            <Text style={styles.blockBtnText}>업데이트하러 가기</Text>
          </Pressable>
        )}
        <Pressable style={styles.blockGhostBtn} onPress={load}>
          <Ionicons name="refresh" size={14} color={COLORS.textSecondary} />
          <Text style={styles.blockGhostText}>다시 확인</Text>
        </Pressable>
      </View>
    );
  }

  const cfg = gate?.config ?? null;
  const noticeColor =
    cfg?.notice_level === 'critical' ? COLORS.error
    : cfg?.notice_level === 'warn' ? COLORS.warning
    : COLORS.primary;

  return (
    <View style={{ flex: 1 }}>
      {children}

      {/* 공지 배너 — 하단 탭 위에 떠서 서비스를 가리지 않음 */}
      {showNotice && !!cfg?.notice_title && (
        <View style={[styles.banner, SHADOWS.elevated, { bottom: insets.bottom + 96, borderLeftColor: noticeColor }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>{cfg.notice_title}</Text>
            {!!cfg.notice_body && <Text style={styles.bannerBody}>{cfg.notice_body}</Text>}
          </View>
          <Pressable
            hitSlop={10}
            onPress={() => { if (cfg.notice_id) dismissNotice(cfg.notice_id); setShowNotice(false); }}
          >
            <Ionicons name="close" size={18} color={COLORS.textSecondary} />
          </Pressable>
        </View>
      )}

      {/* 권장 업데이트 — 건너뛸 수 있는 안내 */}
      {showSuggest && !showNotice && (
        <View style={[styles.banner, SHADOWS.elevated, { bottom: insets.bottom + 96, borderLeftColor: COLORS.primary }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>새 버전이 나왔어요</Text>
            <Text style={styles.bannerBody}>{gate?.message || '더 편해진 기능을 만나보세요.'}</Text>
          </View>
          <View style={styles.bannerActions}>
            <Pressable style={styles.bannerBtn} onPress={openStore}>
              <Text style={styles.bannerBtnText}>업데이트</Text>
            </Pressable>
            <Pressable
              hitSlop={8}
              onPress={() => {
                if (cfg?.latest_version) skipUpdate(cfg.latest_version);
                setShowSuggest(false);
              }}
            >
              <Text style={styles.bannerLater}>나중에</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const makeStyles = (C: ThemeColors) =>
  StyleSheet.create({
    blockWrap: {
      flex: 1,
      backgroundColor: C.background,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    blockIcon: {
      width: 64, height: 64, borderRadius: 32,
      backgroundColor: C.primaryLight,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 18,
    },
    blockTitle: { ...TYPO.headingLarge, color: C.text, marginBottom: 10, textAlign: 'center' },
    blockBody: { ...TYPO.body, color: C.textSecondary, textAlign: 'center', marginBottom: 26 },
    blockBtn: {
      backgroundColor: C.primary,
      borderRadius: RADIUS.standard, paddingVertical: 15, paddingHorizontal: 40,
    },
    blockBtnText: { ...TYPO.subtitle, color: C.textInverse },
    blockGhostBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      marginTop: 16, padding: 8,
    },
    blockGhostText: { ...TYPO.bodySmall, color: C.textSecondary },

    banner: {
      position: 'absolute',
      left: SPACING.base, right: SPACING.base,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      backgroundColor: C.surface,
      borderRadius: RADIUS.standard,
      borderLeftWidth: 3,
      paddingVertical: 13,
      paddingHorizontal: 14,
    },
    bannerTitle: { ...TYPO.bodySmall, fontWeight: '600', color: C.text },
    bannerBody: { ...TYPO.caption, color: C.textSecondary, marginTop: 3 },
    bannerActions: { alignItems: 'flex-end', gap: 6 },
    bannerBtn: {
      backgroundColor: C.primary,
      borderRadius: RADIUS.compact, paddingVertical: 7, paddingHorizontal: 12,
    },
    bannerBtnText: { ...TYPO.caption, fontWeight: '600', color: C.textInverse },
    bannerLater: { ...TYPO.caption, color: C.textSecondary },
  });
