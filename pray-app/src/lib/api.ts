import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';
import type { PrayerPeriod, Visibility } from '../types/db';

// ─────────────────────────────────────────────────────────────
// 기도해요 — Supabase(pray_) 서버 API 레이어
// PrayerStore가 이 함수들만 호출한다. 실패는 throw — 스토어에서 처리.
// ─────────────────────────────────────────────────────────────

const ok = <T>(res: { data: T; error: any }): T => {
  if (res.error) throw res.error;
  return res.data;
};

// ── 사진 업로드 (storage bucket 'pray', 경로 {uid}/{name}) ──
const b64lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = Math.floor((clean.length * 3) / 4);
  const out = new Uint8Array(len);
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = b64lookup.indexOf(clean[i]);
    const b = b64lookup.indexOf(clean[i + 1]);
    const c = b64lookup.indexOf(clean[i + 2]);
    const d = b64lookup.indexOf(clean[i + 3]);
    out[p++] = (a << 2) | (b >> 4);
    if (c >= 0) out[p++] = ((b & 15) << 4) | (c >> 2);
    if (d >= 0) out[p++] = ((c & 3) << 6) | d;
  }
  return out.slice(0, p);
}

export async function uploadPhoto(localUri: string, kind: 'avatar' | 'prayer'): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error('로그인이 필요해요');
  const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${uid}/${kind}-${Date.now()}.${ext}`;
  const b64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
  const bytes = base64ToBytes(b64);
  const { error } = await supabase.storage.from('pray').upload(path, bytes.buffer as ArrayBuffer, {
    contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
    upsert: true,
  });
  if (error) throw error;
  return supabase.storage.from('pray').getPublicUrl(path).data.publicUrl;
}

// ── 전화번호 해시 (원문은 어디에도 저장하지 않음) ──
export function normalizePhone(raw: string): string | null {
  let d = raw.replace(/[^0-9+]/g, '');
  if (d.startsWith('+82')) d = '0' + d.slice(3);
  d = d.replace(/[^0-9]/g, '');
  return /^01[0-9]{8,9}$/.test(d) ? d : null;
}
export async function hashPhone(normalized: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `neoix-pray:${normalized}`);
}

// ── 프로필 ──
export async function fetchMyProfile() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  return ok(await supabase.from('pray_profiles').select('*').eq('id', u.user.id).maybeSingle());
}
export async function updateMyProfile(patch: Record<string, any>) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error('로그인이 필요해요');
  return ok(await supabase.from('pray_profiles').update(patch).eq('id', u.user.id).select().single());
}
export async function agreeSensitive() {
  return updateMyProfile({ sensitive_agreed_at: new Date().toISOString() });
}

// ── 기도제목 ──
export interface ServerPrayer {
  id: string; author_id: string; title: string; body: string | null;
  period: PrayerPeriod; visibility: Visibility; photo_url: string | null;
  answered_at: string | null; created_at: string;
}

export async function fetchPrayersBundle(myId: string) {
  const prayers = ok(await supabase.from('pray_prayers').select('*').order('created_at', { ascending: false })) as ServerPrayer[];
  const ids = prayers.map((p) => p.id);
  const [shares, box, logs] = await Promise.all([
    ids.length ? ok(await supabase.from('pray_prayer_shares').select('prayer_id, club_id').in('prayer_id', ids)) : [],
    ok(await supabase.from('pray_box_items').select('prayer_id')),
    ok(await supabase.from('pray_logs').select('prayer_id, prayed_on').gte('prayed_on', daysAgoISO(35))),
  ]);
  const authorIds = [...new Set(prayers.map((p) => p.author_id).filter((a) => a !== myId))];
  const profiles = authorIds.length
    ? (ok(await supabase.from('pray_profiles').select('id, display_name').in('id', authorIds)) as { id: string; display_name: string }[])
    : [];
  return { prayers, shares: shares as { prayer_id: string; club_id: string }[], box: (box as { prayer_id: string }[]).map((b) => b.prayer_id), logs: logs as { prayer_id: string; prayed_on: string }[], profiles };
}
const daysAgoISO = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export async function insertPrayer(p: { title: string; body: string | null; period: PrayerPeriod; visibility: Visibility; clubId: string | null; photoUri: string | null }) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error('로그인이 필요해요');
  let photo_url: string | null = null;
  if (p.photoUri) { try { photo_url = await uploadPhoto(p.photoUri, 'prayer'); } catch {} }
  const row = ok(await supabase.from('pray_prayers').insert({
    author_id: u.user.id, title: p.title, body: p.body,
    period: p.period, visibility: p.visibility, photo_url,
  }).select().single()) as ServerPrayer;
  if (p.visibility === 'clubs' && p.clubId) {
    await supabase.from('pray_prayer_shares').insert({ prayer_id: row.id, club_id: p.clubId });
  }
  await supabase.from('pray_box_items').insert({ user_id: u.user.id, prayer_id: row.id });
  return row;
}

export async function updatePrayerRow(id: string, patch: Record<string, any>, clubId?: string | null) {
  ok(await supabase.from('pray_prayers').update(patch).eq('id', id).select().single());
  if (clubId !== undefined) {
    await supabase.from('pray_prayer_shares').delete().eq('prayer_id', id);
    if (clubId) await supabase.from('pray_prayer_shares').insert({ prayer_id: id, club_id: clubId });
  }
}
export async function deletePrayerRow(id: string) {
  ok(await supabase.from('pray_prayers').delete().eq('id', id));
}
export async function logPrayed(prayerId: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await supabase.from('pray_logs').insert({ user_id: u.user.id, prayer_id: prayerId }); // unique 충돌은 무시
}
export async function unlogPrayed(prayerId: string, day: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await supabase.from('pray_logs').delete().eq('user_id', u.user.id).eq('prayer_id', prayerId).eq('prayed_on', day);
}
export async function addToBox(prayerId: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await supabase.from('pray_box_items').insert({ user_id: u.user.id, prayer_id: prayerId });
}

// ── 모임 ──
export async function fetchClubs(myId: string) {
  const rows = ok(await supabase.from('pray_clubs').select('*, members:pray_club_members(user_id)')) as any[];
  return rows.map((c) => ({
    id: c.id as string,
    name: c.name as string,
    description: (c.description ?? null) as string | null,
    memberCount: (c.members?.length ?? 1) as number,
    isMine: c.owner_id === myId,
    joinCode: c.join_code as string,
  }));
}
export async function createClubRow(name: string, description: string | null) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error('로그인이 필요해요');
  const club = ok(await supabase.from('pray_clubs').insert({ name, description, owner_id: u.user.id }).select().single()) as any;
  await supabase.from('pray_club_members').insert({ club_id: club.id, user_id: u.user.id, role: 'owner' });
  return club;
}
export async function joinClubByCode(code: string): Promise<string> {
  return ok(await supabase.rpc('pray_join_club', { p_code: code })) as string;
}

// ── 기도마당 ──
export async function fetchFeed() {
  const posts = ok(await supabase.from('pray_community_feed').select('*').order('created_at', { ascending: false }).limit(100)) as any[];
  const ids = posts.map((p) => p.id);
  const comments = ids.length
    ? (ok(await supabase.from('pray_comment_feed').select('*').in('post_id', ids).order('created_at', { ascending: true })) as any[])
    : [];
  return { posts, comments };
}
export async function insertPost(p: { title: string; body: string; isAnonymous: boolean; category: string; region: string | null }) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error('로그인이 필요해요');
  return ok(await supabase.from('pray_community_posts').insert({
    author_id: u.user.id, title: p.title, body: p.body,
    is_anonymous: p.isAnonymous, category: p.category, region: p.region,
  }).select().single());
}
export async function setReaction(postId: string, kind: 'amen' | 'pray', on: boolean) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  if (on) await supabase.from('pray_community_reactions').insert({ post_id: postId, user_id: u.user.id, kind });
  else await supabase.from('pray_community_reactions').delete().eq('post_id', postId).eq('user_id', u.user.id).eq('kind', kind);
}
export async function insertComment(postId: string, body: string, isAnonymous: boolean) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error('로그인이 필요해요');
  return ok(await supabase.from('pray_community_comments').insert({
    post_id: postId, author_id: u.user.id, body, is_anonymous: isAnonymous,
  }).select().single());
}
export async function insertReport(targetType: 'post' | 'comment', targetId: string, reason: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await supabase.from('pray_reports').insert({ reporter_id: u.user.id, target_type: targetType, target_id: targetId, reason });
}

// ── 이웃 ──
export async function fetchNeighbors(myId: string) {
  const rels = ok(await supabase.from('pray_neighbors').select('*')) as { user_id: string; neighbor_id: string; status: string }[];
  const acceptedIds = rels.filter((r) => r.status === 'accepted').map((r) => (r.user_id === myId ? r.neighbor_id : r.user_id));
  const outgoingPending = rels.filter((r) => r.status === 'pending' && r.user_id === myId).map((r) => r.neighbor_id);
  const profiles = acceptedIds.length
    ? (ok(await supabase.from('pray_profiles').select('id, display_name, church').in('id', acceptedIds)) as any[])
    : [];
  const incoming = (ok(await supabase.rpc('pray_incoming_requests')) ?? []) as { user_id: string; display_name: string; church: string | null; created_at: string }[];
  return { profiles, incoming, outgoingPending };
}
export async function requestNeighborRow(targetId: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error('로그인이 필요해요');
  await supabase.from('pray_neighbors').insert({ user_id: u.user.id, neighbor_id: targetId, status: 'pending' });
}
export async function acceptNeighborRow(requesterId: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await supabase.from('pray_neighbors').update({ status: 'accepted' }).eq('user_id', requesterId).eq('neighbor_id', u.user.id);
}
export async function findByPhoneHashes(hashes: string[]) {
  if (!hashes.length) return [];
  return (ok(await supabase.rpc('pray_find_by_phone_hashes', { hashes })) ?? []) as { id: string; display_name: string; avatar_url: string | null; church: string | null }[];
}
export async function registerMyPhoneHash(phoneRaw: string) {
  const n = normalizePhone(phoneRaw);
  if (!n) throw new Error('올바른 휴대폰 번호가 아니에요');
  const h = await hashPhone(n);
  await updateMyProfile({ phone_hash: h });
}
