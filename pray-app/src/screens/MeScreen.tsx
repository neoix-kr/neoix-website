import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, TextInput, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, FONT, RADIUS, SPACING, CLOUD_SHADOW, Palette } from '../theme';
import SkyHeader from '../components/common/SkyHeader';
import { useAuth } from '../contexts/AuthContext';
import { usePrayerStore } from '../store/PrayerStore';
import { supabase } from '../lib/supabase';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// 개신교 인증 교단 — 풀네임 + 공식 교단 마크
const DENOMS = [
  { full: '대한예수교장로회 (통합)', short: '통합', mark: require('../../assets/denoms/tonghap.png') },
  { full: '대한예수교장로회 (합동)', short: '합동', mark: require('../../assets/denoms/hapdong.png') },
  { full: '대한예수교장로회 (고신)', short: '고신', mark: require('../../assets/denoms/goshin.png') },
  { full: '대한예수교장로회 (백석)', short: '백석', mark: require('../../assets/denoms/baekseok.png') },
  { full: '대한예수교장로회 (합신)', short: '합신', mark: require('../../assets/denoms/hapshin.png') },
  { full: '한국기독교장로회 (기장)', short: '기장', mark: require('../../assets/denoms/kijang.png') },
  { full: '기독교대한감리회', short: '기감', mark: require('../../assets/denoms/kikam.png') },
  { full: '기독교대한성결교회 (기성)', short: '기성', mark: require('../../assets/denoms/kiseong.png') },
  { full: '예수교대한성결교회 (예성)', short: '예성', mark: require('../../assets/denoms/yeseong.png') },
  { full: '기독교한국침례회', short: '기침', mark: require('../../assets/denoms/kichim.png') },
  { full: '기독교대한하나님의성회 (기하성)', short: '기하성', mark: require('../../assets/denoms/kihaseong.png') },
  { full: '기독교한국루터회', short: '루터회', mark: require('../../assets/denoms/luther.png') },
  { full: '대한기독교나사렛성결회', short: '나사렛', mark: require('../../assets/denoms/nazarene.png') },
  { full: '구세군대한본영', short: '구세군', mark: require('../../assets/denoms/salvation.png') },
  { full: '대한성공회', short: '성공회', mark: require('../../assets/denoms/anglican.png') },
];

export default function MeScreen() {
  const nav = useNavigation<Nav>();
  const store = usePrayerStore();
  const { profile, user, signOut } = useAuth();
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);

  const name = store.profileName ?? profile?.display_name ?? '동반자';
  const denomOf = (full: string) => DENOMS.find((d) => d.full === full);

  // 우리교회 편집
  const [editingChurch, setEditingChurch] = useState(false);
  const [churchName, setChurchName] = useState('');
  const [denom, setDenom] = useState('');

  // J맵
  const [jmapPhone, setJmapPhone] = useState('');
  const [jmapBusy, setJmapBusy] = useState(false);
  const [jmapAgree, setJmapAgree] = useState(false);
  const [customDenom, setCustomDenom] = useState('');

  const openChurchForm = () => {
    setChurchName(store.church?.name ?? '');
    const cur = store.church?.denomination ?? '';
    setDenom(cur);
    // 목록에 없는 교단이면 직접 입력칸에 채워둔다
    setCustomDenom(cur && !DENOMS.some((d) => d.full === cur) ? cur : '');
    setEditingChurch(true);
  };

  const saveChurch = () => {
    if (!churchName.trim()) return Alert.alert('입력 확인', '교회 이름을 입력해 주세요.');
    if (!denom) return Alert.alert('입력 확인', '교단을 선택해 주세요.');
    store.setChurch({ name: churchName.trim(), denomination: denom });
    setEditingChurch(false);
  };

  const applyJmap = async () => {
    const digits = jmapPhone.replace(/[^0-9]/g, '');
    if (!/^01[0-9]{8,9}$/.test(digits)) return Alert.alert('입력 확인', '올바른 휴대폰 번호를 입력해 주세요.');
    if (!jmapAgree) return Alert.alert('동의 필요', '개인정보 수집·이용 및 안내 수신 동의에 체크해 주세요.');
    setJmapBusy(true);
    try {
      const { error } = await supabase.from('jmap_preorders').insert({
        phone: digits,
        source: 'pray-app',
        church: store.church?.name ?? null,
        denomination: store.church?.denomination ?? null,
        marketing_agreed: true,
      });
      if (error) throw error;
      store.setJmapApplied();
      setJmapPhone('');
      Alert.alert('신청 완료', 'J맵 사전오픈 소식을 가장 먼저 알려드릴게요.');
    } catch {
      Alert.alert('잠시 후 다시', '신청 접수가 원활하지 않아요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setJmapBusy(false);
    }
  };

  const notifMeta = store.notif.enabled
    ? `${store.notif.hour < 12 ? '오전' : '오후'} ${store.notif.hour % 12 === 0 ? 12 : store.notif.hour % 12}시${store.notif.minute ? ` ${store.notif.minute}분` : ''}`
    : '꺼짐';

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <SkyHeader paddingBottom={44}>
          <Text style={styles.h1}>프로필</Text>
        </SkyHeader>

        {/* 내 계정 */}
        <View style={[styles.section, { marginTop: -28 }]}>
          <Pressable
            onPress={() => nav.navigate('ProfileEdit')}
            style={({ pressed }) => [styles.card, CLOUD_SHADOW.card, styles.profileCard, pressed && { opacity: 0.92 }]}
          >
            {store.profilePhotoUri ? (
              <Image source={{ uri: store.profilePhotoUri }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatar}><Text style={styles.avatarText}>{name.charAt(0)}</Text></View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.sub} numberOfLines={1}>
                {store.profileVerse ?? user?.email ?? '내 계정 설정'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.textPlaceholder} />
          </Pressable>
        </View>

        {/* 우리교회 */}
        <View style={styles.section}>
          <View style={[styles.card, CLOUD_SHADOW.soft]}>
            {!editingChurch && store.church ? (
              <Pressable onPress={openChurchForm} style={styles.churchRow}>
                <View style={styles.denomMark}>
                  {denomOf(store.church.denomination)?.mark ? (
                    <Image source={denomOf(store.church.denomination)!.mark} style={styles.denomMarkImg} resizeMode="contain" />
                  ) : (
                    <Ionicons name="home" size={18} color={C.textCaption} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.churchName}>{store.church.name}</Text>
                  <Text style={styles.churchDenom}>{store.church.denomination}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.textPlaceholder} />
              </Pressable>
            ) : !editingChurch ? (
              <Pressable onPress={openChurchForm} style={styles.churchRow}>
                <View style={[styles.denomMark, { backgroundColor: C.cardMuted, borderWidth: 0 }]}>
                  <Ionicons name="add" size={18} color={C.textCaption} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.churchName}>우리교회 추가하기</Text>
                  <Text style={styles.churchDenom}>출석 교회와 교단을 등록해요</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.textPlaceholder} />
              </Pressable>
            ) : (
              <View>
                <Text style={styles.formTitle}>우리교회</Text>
                <TextInput
                  style={styles.input}
                  placeholder="교회 이름"
                  placeholderTextColor={C.textPlaceholder}
                  value={churchName}
                  onChangeText={setChurchName}
                />
                <Text style={styles.formLabel}>교단</Text>
                <View style={styles.denomList}>
                  {DENOMS.map((d, idx) => {
                    const on = denom === d.full;
                    return (
                      <Pressable
                        key={d.full}
                        onPress={() => setDenom(d.full)}
                        style={[styles.denomRow, idx > 0 && styles.denomDivider]}
                      >
                        <View style={styles.denomMarkSm}>
                          <Image source={d.mark} style={styles.denomMarkSmImg} resizeMode="contain" />
                        </View>
                        <Text style={[styles.denomFull, on && { color: C.text, fontFamily: FONT.semibold }]}>{d.full}</Text>
                        <View style={[styles.radio, on && { borderColor: C.primary }]}>
                          {on && <View style={styles.radioDot} />}
                        </View>
                      </Pressable>
                    );
                  })}

                  {/* 목록에 없는 교단 직접 입력 */}
                  <View style={[styles.denomRow, styles.denomDivider]}>
                    <View style={[styles.denomMarkSm, { backgroundColor: C.cardMuted, borderWidth: 0 }]}>
                      <Ionicons name="create-outline" size={16} color={C.textCaption} />
                    </View>
                    <TextInput
                      style={styles.customDenomInput}
                      placeholder="내 교단 직접 입력"
                      placeholderTextColor={C.textPlaceholder}
                      value={customDenom}
                      onChangeText={(t) => {
                        setCustomDenom(t);
                        if (t.trim()) setDenom(t.trim());
                        else if (!DENOMS.some((d) => d.full === denom)) setDenom('');
                      }}
                    />
                    <View style={[styles.radio, !!customDenom.trim() && denom === customDenom.trim() && { borderColor: C.primary }]}>
                      {!!customDenom.trim() && denom === customDenom.trim() && <View style={styles.radioDot} />}
                    </View>
                  </View>
                </View>
                <View style={styles.formActions}>
                  <Pressable onPress={() => setEditingChurch(false)} style={styles.cancelBtn}>
                    <Text style={styles.cancelText}>취소</Text>
                  </Pressable>
                  <Pressable onPress={saveChurch} style={styles.saveBtn}>
                    <Text style={styles.saveText}>저장</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* 메뉴 */}
        <View style={styles.section}>
          <View style={[styles.card, CLOUD_SHADOW.soft, { paddingVertical: 6, paddingHorizontal: SPACING.lg }]}>
            <Pressable onPress={() => nav.navigate('Stats')} style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.7 }]}>
              <Ionicons name="stats-chart-outline" size={19} color={C.textSecondary} />
              <Text style={styles.menuLabel}>기도 현황 · 통계</Text>
              <Text style={styles.menuMeta}>{store.streak > 0 ? `${store.streak}일 연속` : ''}</Text>
              <Ionicons name="chevron-forward" size={15} color={C.textPlaceholder} />
            </Pressable>
            <Pressable onPress={() => nav.navigate('NotificationSettings')} style={({ pressed }) => [styles.menuRow, styles.menuDivider, pressed && { opacity: 0.7 }]}>
              <Ionicons name="notifications-outline" size={19} color={C.textSecondary} />
              <Text style={styles.menuLabel}>기도 알림</Text>
              <Text style={styles.menuMeta}>{notifMeta}</Text>
              <Ionicons name="chevron-forward" size={15} color={C.textPlaceholder} />
            </Pressable>
          </View>
        </View>

        {/* J맵 사전오픈 */}
        <View style={styles.section}>
          <View style={[styles.card, CLOUD_SHADOW.soft]}>
            <View style={styles.jmapHead}>
              <View style={styles.jmapMark}><Text style={styles.jmapMarkText}>J</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.jmapTitle}>신앙의 답을 찾아가는 네비, J맵</Text>
                <Text style={styles.jmapDesc}>질문하면 목사님 설교 자동 매칭 · 우리동네 안전한 교회 찾기</Text>
              </View>
            </View>
            {store.jmapApplied ? (
              <View style={styles.jmapDone}>
                <Ionicons name="checkmark-circle" size={17} color={C.success} />
                <Text style={styles.jmapDoneText}>사전오픈 신청 완료</Text>
              </View>
            ) : (
              <View>
                <View style={styles.jmapForm}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="휴대폰 번호"
                    placeholderTextColor={C.textPlaceholder}
                    keyboardType="phone-pad"
                    value={jmapPhone}
                    onChangeText={setJmapPhone}
                    maxLength={13}
                  />
                  <Pressable onPress={applyJmap} disabled={jmapBusy} style={({ pressed }) => [styles.jmapBtn, (pressed || jmapBusy) && { opacity: 0.85 }]}>
                    <Text style={styles.jmapBtnText}>{jmapBusy ? '접수 중' : '신청'}</Text>
                  </Pressable>
                </View>
                <Pressable onPress={() => setJmapAgree(!jmapAgree)} style={styles.jmapAgreeRow} hitSlop={6}>
                  <View style={[styles.jmapAgreeBox, jmapAgree && styles.jmapAgreeBoxOn]}>
                    {jmapAgree && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                  <Text style={styles.jmapAgreeText}>
                    (필수) 개인정보 수집·이용 및 오픈 소식 등 안내 수신에 동의합니다.{'\n'}
                    <Text style={styles.jmapAgreeSub}>전화번호는 J맵 사전오픈 안내 목적으로만 사용되며, 목적 달성 후 파기됩니다. 동의는 언제든 철회할 수 있어요.</Text>
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* 로그아웃 */}
        <View style={styles.section}>
          <View style={[styles.card, CLOUD_SHADOW.soft, { paddingVertical: 6, paddingHorizontal: SPACING.lg }]}>
            <Pressable onPress={signOut} style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.7 }]}>
              <Ionicons name="log-out-outline" size={19} color={C.error} />
              <Text style={[styles.menuLabel, { color: C.error }]}>로그아웃</Text>
            </Pressable>
          </View>
        </View>

        {/* 사업자 정보 (전자상거래법 표시) */}
        <Text style={styles.bizInfo}>
          네오익스(NEOIX) · 대표 박정겸{'\n'}사업자등록번호 292-33-01829 · jg@neoix.kr
        </Text>
      </ScrollView>
    </View>
  );
}

const createStyles = (C: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: C.background },
    h1: { fontSize: 24, color: C.textStrong, fontFamily: FONT.bold },

    section: { paddingHorizontal: SPACING.xl, marginBottom: SPACING.md },
    card: { backgroundColor: C.surface, borderRadius: RADIUS.lg, padding: SPACING.lg },

    profileCard: { flexDirection: 'row', alignItems: 'center', gap: 13 },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.avatarBg, alignItems: 'center', justifyContent: 'center' },
    avatarImg: { width: 50, height: 50, borderRadius: 25 },
    avatarText: { color: C.avatarText, fontFamily: FONT.semibold, fontSize: 19 },
    name: { fontSize: 16.5, color: C.text, fontFamily: FONT.semibold },
    sub: { fontSize: 13, color: C.textCaption, fontFamily: FONT.regular, marginTop: 3 },

    churchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    denomMark: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: C.borderSoft,
      overflow: 'hidden',
    },
    denomMarkImg: { width: 32, height: 32 },
    churchName: { fontSize: 15.5, color: C.text, fontFamily: FONT.semibold },
    churchDenom: { fontSize: 12.5, color: C.textCaption, fontFamily: FONT.regular, marginTop: 2 },

    formTitle: { fontSize: 16, color: C.text, fontFamily: FONT.bold, marginBottom: SPACING.md },
    formLabel: { fontSize: 12.5, color: C.textCaption, fontFamily: FONT.semibold, marginBottom: SPACING.sm },
    input: {
      height: 48,
      backgroundColor: C.cardMuted,
      borderRadius: RADIUS.md,
      paddingHorizontal: 14,
      fontSize: 14.5,
      color: C.text,
      fontFamily: FONT.regular,
      marginBottom: SPACING.md,
    },
    denomList: { backgroundColor: C.cardMuted, borderRadius: RADIUS.md, overflow: 'hidden' },
    denomRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, paddingVertical: 11 },
    denomDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.divider },
    denomMarkSm: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: C.borderSoft,
      overflow: 'hidden',
    },
    denomMarkSmImg: { width: 26, height: 26 },
    customDenomInput: { flex: 1, fontSize: 14, color: C.text, fontFamily: FONT.regular, paddingVertical: 0 },
    denomFull: { flex: 1, fontSize: 14, color: C.textSecondary, fontFamily: FONT.regular },
    radio: { width: 21, height: 21, borderRadius: 11, borderWidth: 1.5, borderColor: C.borderStrong, alignItems: 'center', justifyContent: 'center' },
    radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: C.primary },
    formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: SPACING.lg },
    cancelBtn: { height: 40, paddingHorizontal: 16, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
    cancelText: { fontSize: 14, color: C.textSecondary, fontFamily: FONT.medium },
    saveBtn: { height: 40, paddingHorizontal: 20, borderRadius: RADIUS.md, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
    saveText: { fontSize: 14, color: '#fff', fontFamily: FONT.semibold },

    menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
    menuDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.divider },
    menuLabel: { flex: 1, fontSize: 15, color: C.text, fontFamily: FONT.medium },
    menuMeta: { fontSize: 12.5, color: C.textCaption, fontFamily: FONT.regular },

    jmapHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    jmapMark: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
    jmapMarkText: { fontSize: 20, color: '#fff', fontFamily: FONT.bold },
    jmapTitle: { fontSize: 15, color: C.text, fontFamily: FONT.semibold },
    jmapDesc: { fontSize: 12.5, color: C.textCaption, fontFamily: FONT.regular, marginTop: 3, lineHeight: 18 },
    jmapForm: { flexDirection: 'row', gap: 8, marginTop: SPACING.md, alignItems: 'center' },
    jmapBtn: { height: 48, paddingHorizontal: 18, borderRadius: RADIUS.md, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
    jmapBtnText: { fontSize: 14.5, color: '#fff', fontFamily: FONT.semibold },
    jmapAgreeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: SPACING.md },
    jmapAgreeBox: {
      width: 18,
      height: 18,
      borderRadius: 5,
      borderWidth: 1.5,
      borderColor: C.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    jmapAgreeBoxOn: { backgroundColor: C.primary, borderColor: C.primary },
    jmapAgreeText: { flex: 1, fontSize: 12, lineHeight: 17, color: C.textSecondary, fontFamily: FONT.regular },
    jmapAgreeSub: { fontSize: 11.5, color: C.textPlaceholder },
    bizInfo: {
      fontSize: 11.5,
      lineHeight: 17,
      color: C.textPlaceholder,
      fontFamily: FONT.regular,
      textAlign: 'center',
      marginTop: SPACING.lg,
    },
    jmapDone: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.md },
    jmapDoneText: { fontSize: 13.5, color: C.success, fontFamily: FONT.medium },
  });
