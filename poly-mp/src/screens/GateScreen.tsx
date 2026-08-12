// 승격 게이트 — 의원 인증 신청(pending) 또는 승인 대기 안내
// 승인은 네오익스 어드민(폴리 → 의원 앱)에서 처리한다.
// 유형(기초/광역/국회)과 지역구는 선관위 선거구 데이터(poly-build 이식)에서 선택 — 자유입력 없음.
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView, Modal, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { deleteMyAccount } from '../lib/account';
import { useAuth } from '../contexts/AuthContext';
import { useMember } from '../contexts/MemberContext';
import { useTheme } from '../theme/ThemeContext';
import { TYPO, SPACING, RADIUS } from '../theme/colors';
import {
  MEMBER_LEVELS, levelLabel, PROVINCES, PROVINCE_CITIES,
  getDistrictOptions, formatDistrict, type MemberLevel,
} from '../data/districts';

export default function GateScreen() {
  const { signOut, user } = useAuth();
  const { member, apply, refresh } = useMember();
  const { COLORS, SHADOWS } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [level, setLevel] = useState<MemberLevel | null>(null);
  const [district, setDistrict] = useState('');
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const s = styles(COLORS);
  const pending = member?.status === 'pending';
  const suspended = member?.status === 'suspended';

  const submit = async () => {
    if (!name.trim()) return Alert.alert('입력 확인', '성함을 입력해 주세요.');
    if (!level) return Alert.alert('입력 확인', '의원 유형을 선택해 주세요.');
    if (!district) return Alert.alert('입력 확인', '지역구를 선택해 주세요.');
    setBusy(true);
    const { error } = await apply({ name: name.trim(), level, position: levelLabel(level), district });
    setBusy(false);
    if (error) Alert.alert('신청 실패', String(error?.message ?? error));
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ padding: SPACING.xl, paddingTop: insets.top + 56, paddingBottom: insets.bottom + 40 }}
    >
      <Text style={s.title}>{pending ? '승인을 기다리고 있어요' : suspended ? '이용이 중지된 계정이에요' : '의원 인증이 필요해요'}</Text>

      {pending ? (
        <View style={[s.card, SHADOWS.standard]}>
          <Text style={s.body}>
            <Text style={{ fontWeight: '700', color: COLORS.text }}>{member?.name}</Text>님의 신청이 접수됐어요.{'\n'}
            {member?.position ? `${member.position}${member?.district ? ` · ${member.district}` : ''}\n` : ''}
            운영팀 확인 후 승인되면 바로 이용할 수 있습니다.{'\n'}보통 1영업일 안에 처리돼요.
          </Text>
          <Pressable style={[s.btn, { backgroundColor: COLORS.primary }]} onPress={refresh}>
            <Text style={s.btnText}>승인 여부 새로고침</Text>
          </Pressable>
        </View>
      ) : suspended ? (
        <View style={[s.card, SHADOWS.standard]}>
          <Text style={s.body}>이용료 미납 또는 운영 정책에 따라 중지됐어요.{'\n'}문의: support@polyx.kr</Text>
        </View>
      ) : (
        <View style={[s.card, SHADOWS.standard]}>
          <Text style={s.body}>폴리 오피스는 의원·후보자 전용 앱이에요.{'\n'}아래 정보로 신청하면 확인 후 열어드립니다.</Text>

          {/* 의원 유형 — 기초/광역/국회 선택 */}
          <View style={{ flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap' }}>
            {MEMBER_LEVELS.map(l => (
              <Pressable
                key={l.key}
                style={[s.chipBtn, level === l.key && { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary }]}
                onPress={() => { setLevel(l.key); setDistrict(''); }}
              >
                <Text style={[s.chipBtnText, level === l.key && { color: COLORS.primary, fontWeight: '700' }]}>{l.label}</Text>
              </Pressable>
            ))}
          </View>

          <TextInput style={s.input} placeholder="성함 (필수)" placeholderTextColor={COLORS.textPlaceholder} value={name} onChangeText={setName} />

          {/* 지역구 — 선관위 선거구에서 선택 */}
          <Pressable
            style={[s.input, s.selectRow]}
            onPress={() => {
              if (!level) return Alert.alert('입력 확인', '의원 유형을 먼저 선택해 주세요.');
              setPicker(true);
            }}
          >
            <Text style={district ? s.selectValue : s.selectPlaceholder} numberOfLines={1}>
              {district || '지역구 선택'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textCaption} />
          </Pressable>

          <Pressable style={[s.btn, { backgroundColor: COLORS.primary, opacity: busy ? 0.6 : 1 }]} disabled={busy} onPress={submit}>
            <Text style={s.btnText}>인증 신청하기</Text>
          </Pressable>
        </View>
      )}

      <Pressable onPress={signOut} style={{ marginTop: SPACING.xl }}>
        <Text style={s.signout}>{user?.email ?? ''} · 로그아웃</Text>
      </Pressable>

      {/* 계정 삭제 (Apple 5.1.1(v)) — 승인 전(게이트) 상태에서도 삭제 경로가 있어야 한다.
          설정 화면은 탭 안에 있어 게이트에 막힌 사용자는 못 가므로 여기에도 둔다. */}
      <Pressable
        style={{ marginTop: SPACING.md }}
        disabled={deleting}
        onPress={() =>
          Alert.alert(
            '계정을 삭제할까요?',
            '계정과 모든 데이터가 영구 삭제되며 되돌릴 수 없어요.\n\nNEOIX 통합 계정이라 폴리·기도해요 등 다른 NEOIX 앱에서도 로그인할 수 없게 됩니다.',
            [
              { text: '취소', style: 'cancel' },
              {
                text: '삭제',
                style: 'destructive',
                onPress: () =>
                  Alert.alert('정말 삭제할까요?', '이 작업은 되돌릴 수 없어요.', [
                    { text: '취소', style: 'cancel' },
                    {
                      text: '영구 삭제',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          setDeleting(true);
                          const { error } = await deleteMyAccount();
                          if (error) throw error;
                          await signOut();
                        } catch {
                          setDeleting(false);
                          Alert.alert('삭제 실패', '잠시 후 다시 시도해 주세요.');
                        }
                      },
                    },
                  ]),
              },
            ],
          )
        }
      >
        <Text style={[s.signout, { color: COLORS.error }]}>{deleting ? '삭제 중…' : '계정 삭제'}</Text>
      </Pressable>

      {level && (
        <DistrictPicker
          visible={picker}
          level={level}
          onClose={() => setPicker(false)}
          onSelect={(v) => { setDistrict(v); setPicker(false); }}
        />
      )}
    </ScrollView>
  );
}

// ── 지역구 선택 모달 — 선관위식 3단계 (시도 → 시군구 → 선거구) ──
function DistrictPicker({ visible, level, onClose, onSelect }: {
  visible: boolean; level: MemberLevel; onClose: () => void; onSelect: (formatted: string) => void;
}) {
  const { COLORS } = useTheme();
  const [province, setProvince] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const s = styles(COLORS);

  const reset = () => { setProvince(null); setCity(null); };
  const close = () => { reset(); onClose(); };

  const step: 'province' | 'city' | 'district' = !province ? 'province' : !city ? 'city' : 'district';
  const data = useMemo(() => {
    if (step === 'province') return PROVINCES;
    if (step === 'city') return PROVINCE_CITIES[province!] ?? [];
    return getDistrictOptions(level, province!, city!);
  }, [step, province, city, level]);

  const title =
    step === 'province' ? `${levelLabel(level)} · 시·도 선택`
    : step === 'city' ? `${province} · 시·군·구 선택`
    : `${province} ${city} · 선거구 선택`;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <View style={s.modalHead}>
          {step === 'province' ? (
            <Pressable onPress={close}><Text style={s.modalCancel}>취소</Text></Pressable>
          ) : (
            <Pressable onPress={() => (step === 'district' ? setCity(null) : setProvince(null))}>
              <Text style={s.modalCancel}>뒤로</Text>
            </Pressable>
          )}
          <Text style={s.modalTitle} numberOfLines={1}>{title}</Text>
          <View style={{ width: 40 }} />
        </View>
        <FlatList
          data={data}
          keyExtractor={(i) => i}
          contentContainerStyle={{ padding: SPACING.base, paddingBottom: 48 }}
          renderItem={({ item }) => (
            <Pressable
              style={s.pickRow}
              onPress={() => {
                if (step === 'province') return setProvince(item);
                if (step === 'city') return setCity(item);
                const formatted = formatDistrict(province!, city!, item);
                reset();
                onSelect(formatted);
              }}
            >
              <Text style={s.pickText}>{item}</Text>
              <Ionicons name="chevron-forward" size={15} color={COLORS.textCaption} />
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = (C: any) => StyleSheet.create({
  title: { ...TYPO.displayLarge, color: C.text, marginBottom: SPACING.lg },
  card: { backgroundColor: C.surface, borderRadius: RADIUS.large, padding: SPACING.lg, gap: SPACING.md },
  body: { ...TYPO.body, color: C.textSecondary, lineHeight: 22 },
  input: {
    height: 48, borderRadius: RADIUS.standard, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: SPACING.base, color: C.text, backgroundColor: C.surface, ...TYPO.bodyLarge,
  },
  selectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  selectValue: { ...TYPO.bodyLarge, color: C.text, flex: 1 },
  selectPlaceholder: { ...TYPO.bodyLarge, color: C.textPlaceholder, flex: 1 },
  chipBtn: { paddingHorizontal: SPACING.md, height: 36, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  chipBtnText: { ...TYPO.bodySmall, color: C.textSecondary },
  btn: { height: 50, borderRadius: RADIUS.standard, alignItems: 'center', justifyContent: 'center' },
  btnText: { ...TYPO.subtitle, color: C.textInverse },
  signout: { ...TYPO.bodySmall, color: C.textCaption, textAlign: 'center' },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.base, gap: SPACING.sm },
  modalCancel: { ...TYPO.bodyLarge, color: C.textCaption },
  modalTitle: { ...TYPO.subtitle, color: C.text, flexShrink: 1 },
  pickRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  pickText: { ...TYPO.bodyLarge, color: C.textBody },
});
