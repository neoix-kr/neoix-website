import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, TextInput, ActivityIndicator, Linking, Share, Alert } from 'react-native';
import * as Contacts from 'expo-contacts';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, FONT, RADIUS, SPACING, CLOUD_SHADOW, Palette } from '../theme';
import { usePrayerStore } from '../store/PrayerStore';
import { useAuth } from '../contexts/AuthContext';
import { normalizePhone, hashPhone, findByPhoneHashes, registerMyPhoneHash } from '../lib/api';
import ScreenHeader from '../components/common/ScreenHeader';

type Row = { id: string; name: string; phone: string; hash: string | null };
type Match = { userId: string; contactName: string; displayName: string; church: string | null };

// 연락처로 이웃 찾기 — 전화번호는 기기에서 해시 처리 후 매칭에만 사용 (원문 미전송)
export default function ContactsScreen() {
  const store = usePrayerStore();
  const { profile, refreshProfile } = useAuth();
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);

  const [state, setState] = useState<'loading' | 'denied' | 'ready'>('loading');
  const [rows, setRows] = useState<Row[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [myPhone, setMyPhone] = useState('');
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') { setState('denied'); return; }
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
        sort: Contacts.SortTypes.FirstName,
      });
      const list: Row[] = [];
      for (const c of data) {
        if (!c.name || !c.phoneNumbers?.length) continue;
        const raw = c.phoneNumbers[0].number ?? '';
        const norm = normalizePhone(raw);
        list.push({ id: c.id ?? c.name, name: c.name, phone: raw, hash: norm ? await hashPhone(norm) : null });
      }
      setRows(list);
      // 가입자 매칭 (해시만 전송)
      try {
        const hashes = [...new Set(list.map((r) => r.hash).filter(Boolean))] as string[];
        const found = await findByPhoneHashes(hashes);
        const byHash = new Map<string, Row>();
        list.forEach((r) => { if (r.hash) byHash.set(r.hash, r); });
        // RPC는 해시→프로필만 주므로, 어느 연락처였는지는 다시 해시로 못 찾는다(프로필에 해시 없음).
        // 대신 매칭된 가입자 목록을 그대로 보여준다.
        setMatches(found.map((f) => ({ userId: f.id, contactName: f.display_name, displayName: f.display_name, church: f.church })));
      } catch {}
      setState('ready');
    })();
  }, []);

  const registerMe = async () => {
    if (!normalizePhone(myPhone)) return Alert.alert('입력 확인', '올바른 휴대폰 번호를 입력해 주세요.');
    setRegistering(true);
    try {
      await registerMyPhoneHash(myPhone);
      await refreshProfile();
      Alert.alert('등록 완료', '이제 지인들이 회원님을 찾을 수 있어요. 번호 원문은 저장되지 않아요.');
      setMyPhone('');
    } catch (e: any) {
      Alert.alert('등록 실패', e?.message ?? '다시 시도해 주세요.');
    } finally {
      setRegistering(false);
    }
  };

  const request = async (m: Match) => {
    const { error } = await store.requestNeighbor(m.userId);
    if (error && !/duplicate/i.test(error)) return Alert.alert('신청 실패', error);
    setRequested((prev) => new Set(prev).add(m.userId));
  };

  const invite = (name: string) =>
    Share.share({ message: `[기도해요] ${name}님, 서로의 기도제목을 나누고 함께 기도해요.\nhttps://neoix.kr/pray` });

  const isNeighbor = (userId: string) => store.neighbors.some((n) => n.id === userId);
  const filtered = query.trim() ? rows.filter((r) => r.name.includes(query.trim())) : rows;

  const header = (
    <View>
      {/* 받은 신청 */}
      {store.incomingRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>받은 이웃 신청</Text>
          {store.incomingRequests.map((r) => (
            <View key={r.userId} style={[styles.row, CLOUD_SHADOW.soft]}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{r.name.charAt(0)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{r.name}</Text>
                {!!r.church && <Text style={styles.phone}>{r.church}</Text>}
              </View>
              <Pressable onPress={() => store.acceptNeighbor(r.userId)} style={styles.addBtn}>
                <Text style={styles.addBtnText}>수락</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* 내 번호 등록 */}
      {!profile?.phone_hash && (
        <View style={[styles.myPhoneCard, CLOUD_SHADOW.soft]}>
          <Text style={styles.myPhoneTitle}>내 번호를 등록하면 지인들이 나를 찾을 수 있어요</Text>
          <Text style={styles.myPhoneDesc}>번호는 기기에서 암호화(해시)돼 원문이 저장되지 않아요</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <TextInput
              style={styles.myPhoneInput}
              placeholder="휴대폰 번호"
              placeholderTextColor={C.textPlaceholder}
              keyboardType="phone-pad"
              value={myPhone}
              onChangeText={setMyPhone}
              maxLength={13}
            />
            <Pressable onPress={registerMe} disabled={registering} style={({ pressed }) => [styles.addBtn, { height: 44, paddingHorizontal: 16 }, (pressed || registering) && { opacity: 0.85 }]}>
              <Text style={styles.addBtnText}>{registering ? '등록 중' : '등록'}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* 가입한 지인 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>기도해요에 있는 지인</Text>
        {matches.length === 0 && (
          <Text style={styles.emptySmall}>연락처에서 가입한 지인을 찾지 못했어요.{'\n'}지인이 앱에서 번호를 등록하면 여기에 나타나요.</Text>
        )}
        {matches.map((m) => {
          const neighbor = isNeighbor(m.userId);
          const pending = requested.has(m.userId);
          return (
            <View key={m.userId} style={[styles.row, CLOUD_SHADOW.soft]}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{m.displayName.charAt(0)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{m.displayName}</Text>
                {!!m.church && <Text style={styles.phone}>{m.church}</Text>}
              </View>
              <Pressable
                onPress={() => !neighbor && !pending && request(m)}
                style={[styles.addBtn, (neighbor || pending) && styles.addBtnDone]}
              >
                <Text style={[styles.addBtnText, (neighbor || pending) && styles.addBtnTextDone]}>
                  {neighbor ? '이웃' : pending ? '신청됨' : '이웃 신청'}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>아직 없는 지인 초대하기</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <ScreenHeader title="연락처로 이웃 찾기" />

      {state === 'loading' && (
        <View style={styles.center}>
          <ActivityIndicator color={C.primary} />
          <Text style={styles.emptySmall}>연락처를 안전하게 확인하는 중…</Text>
        </View>
      )}

      {state === 'denied' && (
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={34} color={C.textPlaceholder} />
          <Text style={styles.deniedTitle}>연락처 권한이 필요해요</Text>
          <Text style={styles.deniedDesc}>전화번호는 서버에 저장하지 않고{'\n'}이웃 찾기에만 사용돼요</Text>
          <Pressable onPress={() => Linking.openSettings()} style={({ pressed }) => [styles.settingsBtn, pressed && { opacity: 0.85 }]}>
            <Text style={styles.settingsBtnText}>설정에서 허용하기</Text>
          </Pressable>
        </View>
      )}

      {state === 'ready' && (
        <>
          <View style={styles.searchWrap}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color={C.textCaption} />
              <TextInput
                style={styles.searchInput}
                placeholder="이름 검색"
                placeholderTextColor={C.textPlaceholder}
                value={query}
                onChangeText={setQuery}
              />
            </View>
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(r) => r.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: SPACING.xl, paddingBottom: 40 }}
            ListHeaderComponent={header}
            ListEmptyComponent={<Text style={styles.empty}>연락처가 없어요</Text>}
            renderItem={({ item }) => (
              <View style={[styles.row, CLOUD_SHADOW.soft]}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{item.name.charAt(0)}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.phone}>{item.phone}</Text>
                </View>
                <Pressable onPress={() => invite(item.name)} style={[styles.addBtn, styles.inviteBtn]}>
                  <Text style={[styles.addBtnText, { color: C.primary }]}>초대</Text>
                </Pressable>
              </View>
            )}
          />
        </>
      )}
    </View>
  );
}

const createStyles = (C: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: C.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
    deniedTitle: { fontSize: 16, color: C.text, fontFamily: FONT.semibold, marginTop: 6 },
    deniedDesc: { fontSize: 13.5, color: C.textCaption, fontFamily: FONT.regular, textAlign: 'center', lineHeight: 20 },
    settingsBtn: { marginTop: SPACING.md, height: 44, paddingHorizontal: 22, borderRadius: RADIUS.md, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
    settingsBtnText: { fontSize: 14, color: '#fff', fontFamily: FONT.semibold },

    searchWrap: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md },
    searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, borderRadius: RADIUS.pill, paddingHorizontal: 14, height: 42 },
    searchInput: { flex: 1, height: '100%', fontSize: 14.5, color: C.text, fontFamily: FONT.regular, paddingVertical: 0 },

    section: { marginBottom: SPACING.md },
    sectionTitle: { fontSize: 14, color: C.textSecondary, fontFamily: FONT.semibold, marginBottom: 8, marginTop: 4 },
    emptySmall: { fontSize: 12.5, lineHeight: 18, color: C.textPlaceholder, fontFamily: FONT.regular, marginBottom: 8 },

    myPhoneCard: { backgroundColor: C.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.lg },
    myPhoneTitle: { fontSize: 14.5, color: C.text, fontFamily: FONT.semibold },
    myPhoneDesc: { fontSize: 12, color: C.textPlaceholder, fontFamily: FONT.regular, marginTop: 3 },
    myPhoneInput: { flex: 1, height: 44, backgroundColor: C.background, borderRadius: RADIUS.md, paddingHorizontal: 14, fontSize: 14.5, color: C.text, fontFamily: FONT.regular },

    row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.lg, paddingVertical: 12, marginBottom: 8 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.avatarBg, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 15, color: C.avatarText, fontFamily: FONT.semibold },
    name: { fontSize: 15, color: C.text, fontFamily: FONT.medium },
    phone: { fontSize: 12.5, color: C.textCaption, fontFamily: FONT.regular, marginTop: 2 },
    addBtn: { paddingHorizontal: 14, height: 32, borderRadius: RADIUS.pill, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
    addBtnDone: { backgroundColor: C.cardMuted },
    inviteBtn: { backgroundColor: C.primaryLight },
    addBtnText: { fontSize: 13, color: '#fff', fontFamily: FONT.semibold },
    addBtnTextDone: { color: C.textCaption },
    empty: { textAlign: 'center', paddingTop: 50, fontSize: 13.5, color: C.textCaption, fontFamily: FONT.regular },
  });
