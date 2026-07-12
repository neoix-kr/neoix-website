import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PrayerPeriod, Visibility } from '../types/db';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../lib/api';

// ─────────────────────────────────────────────────────────────
// 기도해요 — 서버 동기화 스토어 (Supabase pray_ 실연동)
// 화면 인터페이스는 로컬 시절과 동일하게 유지 + 이웃/모임 신규 액션.
// 전략: 서버가 원본, 낙관적 업데이트 후 백그라운드 동기화,
//       마지막 스냅샷은 AsyncStorage 캐시로 콜드스타트 즉시 표시.
// ─────────────────────────────────────────────────────────────

export interface LocalPrayer {
  id: string;
  title: string;
  body: string | null;
  period: PrayerPeriod;
  visibility: Visibility;
  clubId: string | null;
  mine: boolean;
  authorName: string;
  inBox: boolean;
  photoUri: string | null;  // 서버 photo_url 또는 로컬 uri
  answeredAt: string | null;
  createdAt: string;
}

export interface LocalNeighbor {
  id: string;               // user uuid
  name: string;
  church: string | null;
  prayerCount: number;
}

export interface IncomingRequest {
  userId: string;
  name: string;
  church: string | null;
}

export interface LocalClub {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  isMine: boolean;
  joinCode?: string;
}

export type PostCategory = '건강' | '가족' | '진로' | '신앙' | '감사' | '기타';
export const POST_CATEGORIES: PostCategory[] = ['건강', '가족', '진로', '신앙', '감사', '기타'];

export const MY_REGION = '송산동';

export interface LocalPost {
  id: string;
  title: string;
  body: string;
  category: string;
  region: string | null;
  isAnonymous: boolean;
  authorName: string;
  amenCount: number;
  amened: boolean;
  prayCount: number;
  praying: boolean;
  inBox: boolean;
  comments: { id: string; body: string; authorName: string; createdAt: string }[];
  createdAt: string;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day === 1) return '어제';
  if (day < 7) return `${day}일 전`;
  return `${Math.floor(day / 7)}주 전`;
}

export interface MyChurch {
  name: string;
  denomination: string;
}

interface StoreState {
  prayers: LocalPrayer[];
  neighbors: LocalNeighbor[];
  incomingRequests: IncomingRequest[];
  clubs: LocalClub[];
  posts: LocalPost[];
  logs: Record<string, string[]>;
  weeklyGoal: number;
  church: MyChurch | null;
  jmapApplied: boolean;
  hiddenPostIds: string[];
  boxedPostIds: string[];        // 기도함에 담은 기도마당 글
  collapsedTiers: string[];
  profileName: string | null;
  profileVerse: string | null;
  profilePhotoUri: string | null;
  myRegion: string;
  notif: { enabled: boolean; hour: number; minute: number };
  synced: boolean;               // 서버 첫 동기화 완료 여부
}

interface StoreActions {
  addPrayer: (p: { title: string; body?: string; period: PrayerPeriod; visibility: Visibility; clubId?: string | null; photoUri?: string | null }) => void;
  updatePrayer: (id: string, patch: Partial<Pick<LocalPrayer, 'title' | 'body' | 'period' | 'visibility' | 'clubId' | 'photoUri'>>) => void;
  deletePrayer: (id: string) => void;
  markAnswered: (id: string) => void;
  togglePrayedToday: (id: string) => void;
  markPrayed: (id: string) => void;
  createClub: (name: string, description?: string) => void;
  joinClub: (code: string) => Promise<{ error: string | null }>;
  addPost: (p: { title: string; body: string; isAnonymous: boolean; category: string; region: string | null }) => void;
  toggleAmen: (postId: string) => void;
  togglePray: (postId: string) => void;
  addComment: (postId: string, body: string) => void;
  addPostToBox: (postId: string) => void;
  hidePost: (postId: string) => void;
  reportPost: (postId: string, reason: string) => void;
  setWeeklyGoal: (n: number) => void;
  setChurch: (church: MyChurch | null) => void;
  setJmapApplied: () => void;
  toggleTierCollapsed: (tier: string) => void;
  setProfile: (p: { name?: string | null; verse?: string | null; photoUri?: string | null }) => void;
  setMyRegion: (region: string) => void;
  setNotif: (n: { enabled: boolean; hour: number; minute: number }) => void;
  requestNeighbor: (userId: string) => Promise<{ error: string | null }>;
  acceptNeighbor: (userId: string) => void;
  refresh: () => Promise<void>;
}

type Store = StoreState & StoreActions & {
  todayKey: string;
  prayedToday: (id: string) => boolean;
  todayTargets: LocalPrayer[];
  todayDoneCount: number;
  streak: number;
  weekCounts: number[];
};

const PREFS_KEY = 'jungbo-store-v6';    // 기존 로컬 키 재사용 (환경설정 + 마이그레이션 소스)
const CACHE_KEY = 'pray-server-cache-v1';
const MIGRATED_KEY = 'pray-migrated-v1';
const SEED_IDS = new Set(['p1', 'p2', 'p3', 'p4', 'p5']);

const uid = () => 'tmp-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const dateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

function emptyState(): StoreState {
  return {
    prayers: [], neighbors: [], incomingRequests: [], clubs: [], posts: [],
    logs: {}, weeklyGoal: 20, church: null, jmapApplied: false,
    hiddenPostIds: [], boxedPostIds: [], collapsedTiers: [],
    profileName: null, profileVerse: null, profilePhotoUri: null,
    myRegion: MY_REGION, notif: { enabled: false, hour: 7, minute: 0 },
    synced: false,
  };
}

// church text 컬럼 직렬화: "교단::교회이름"
const churchToText = (c: MyChurch | null) => (c ? `${c.denomination}::${c.name}` : null);
const churchFromText = (t: string | null): MyChurch | null => {
  if (!t) return null;
  const i = t.indexOf('::');
  return i >= 0 ? { denomination: t.slice(0, i), name: t.slice(i + 2) } : { denomination: '', name: t };
};

const Ctx = createContext<Store | null>(null);

export function PrayerStoreProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, updateProfile } = useAuth();
  const [state, setState] = useState<StoreState | null>(null);
  const loaded = useRef(false);
  const refreshing = useRef(false);

  const set = useCallback((fn: (s: StoreState) => StoreState) => setState((s) => (s ? fn(s) : s)), []);

  // ── 서버 → 로컬 매핑 전체 새로고침 ──
  const refresh = useCallback(async () => {
    if (!user || refreshing.current) return;
    refreshing.current = true;
    try {
      const myId = user.id;
      const [bundle, clubs, feed, nb, prof] = await Promise.all([
        api.fetchPrayersBundle(myId),
        api.fetchClubs(myId),
        api.fetchFeed(),
        api.fetchNeighbors(myId),
        api.fetchMyProfile(),
      ]);

      const nameOf = new Map(bundle.profiles.map((p) => [p.id, p.display_name]));
      const shareOf = new Map<string, string>();
      bundle.shares.forEach((s) => { if (!shareOf.has(s.prayer_id)) shareOf.set(s.prayer_id, s.club_id); });
      const boxSet = new Set(bundle.box);

      const prayers: LocalPrayer[] = bundle.prayers.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        period: p.period,
        visibility: p.visibility,
        clubId: shareOf.get(p.id) ?? null,
        mine: p.author_id === myId,
        authorName: p.author_id === myId ? '나' : (nameOf.get(p.author_id) ?? '이웃'),
        inBox: boxSet.has(p.id),
        photoUri: p.photo_url,
        answeredAt: p.answered_at,
        createdAt: p.created_at,
      }));

      const logs: Record<string, string[]> = {};
      bundle.logs.forEach((l) => { (logs[l.prayed_on] = logs[l.prayed_on] ?? []).push(l.prayer_id); });

      const prayerCountBy = new Map<string, number>();
      bundle.prayers.forEach((p) => prayerCountBy.set(p.author_id, (prayerCountBy.get(p.author_id) ?? 0) + 1));

      const neighbors: LocalNeighbor[] = nb.profiles.map((p: any) => ({
        id: p.id, name: p.display_name, church: churchFromText(p.church)?.name ?? null,
        prayerCount: prayerCountBy.get(p.id) ?? 0,
      }));
      const incomingRequests: IncomingRequest[] = nb.incoming.map((r) => ({
        userId: r.user_id, name: r.display_name, church: churchFromText(r.church)?.name ?? null,
      }));

      const commentsByPost = new Map<string, LocalPost['comments']>();
      feed.comments.forEach((c: any) => {
        const arr = commentsByPost.get(c.post_id) ?? [];
        arr.push({ id: c.id, body: c.body, authorName: c.is_mine ? '나' : c.author_name, createdAt: c.created_at });
        commentsByPost.set(c.post_id, arr);
      });

      set((s) => {
        const posts: LocalPost[] = feed.posts.map((p: any) => ({
          id: p.id, title: p.title, body: p.body,
          category: p.category ?? '기타', region: p.region ?? null,
          isAnonymous: p.is_anonymous,
          authorName: p.is_mine ? (p.is_anonymous ? '익명' : '나') : p.author_name,
          amenCount: p.amen_count, amened: p.my_amen,
          prayCount: p.pray_count, praying: p.my_pray,
          inBox: s.boxedPostIds.includes(p.id),
          comments: commentsByPost.get(p.id) ?? [],
          createdAt: p.created_at,
        }));
        return {
          ...s,
          prayers, logs, neighbors, incomingRequests, clubs, posts,
          church: prof?.church ? churchFromText(prof.church) : s.church,
          profileName: prof?.display_name ?? s.profileName,
          profileVerse: prof?.verse ?? s.profileVerse,
          profilePhotoUri: prof?.avatar_url ?? s.profilePhotoUri,
          myRegion: prof?.region ?? s.myRegion,
          synced: true,
        };
      });
    } catch {
      // 오프라인 등 — 캐시 유지
    } finally {
      refreshing.current = false;
    }
  }, [user, set]);

  // ── 초기 로드: 캐시 → 화면 즉시, 이어서 서버 동기화 + 1회 마이그레이션 ──
  useEffect(() => {
    let alive = true;
    (async () => {
      const [prefsRaw, cacheRaw] = await Promise.all([
        AsyncStorage.getItem(PREFS_KEY).catch(() => null),
        AsyncStorage.getItem(CACHE_KEY).catch(() => null),
      ]);
      if (!alive) return;
      const prefs = prefsRaw ? JSON.parse(prefsRaw) : {};
      const cache = cacheRaw ? JSON.parse(cacheRaw) : {};
      setState({
        ...emptyState(),
        ...cache,
        weeklyGoal: prefs.weeklyGoal ?? cache.weeklyGoal ?? 20,
        church: cache.church ?? prefs.church ?? null,
        jmapApplied: prefs.jmapApplied ?? false,
        hiddenPostIds: prefs.hiddenPostIds ?? [],
        boxedPostIds: cache.boxedPostIds ?? [],
        collapsedTiers: prefs.collapsedTiers ?? [],
        notif: prefs.notif ?? { enabled: false, hour: 7, minute: 0 },
        myRegion: cache.myRegion ?? prefs.myRegion ?? MY_REGION,
        profileName: cache.profileName ?? prefs.profileName ?? null,
        profileVerse: cache.profileVerse ?? prefs.profileVerse ?? null,
        profilePhotoUri: cache.profilePhotoUri ?? prefs.profilePhotoUri ?? null,
        synced: false,
      });
    })();
    return () => { alive = false; };
  }, []);

  // 유저 로그인 시: 마이그레이션 1회 → 서버 동기화
  useEffect(() => {
    if (!user || !state) return;
    (async () => {
      try {
        const migrated = await AsyncStorage.getItem(MIGRATED_KEY);
        if (!migrated) {
          const prefsRaw = await AsyncStorage.getItem(PREFS_KEY);
          const old = prefsRaw ? JSON.parse(prefsRaw) : null;
          const mine: any[] = (old?.prayers ?? []).filter((p: any) => p.mine && !SEED_IDS.has(p.id));
          for (const p of mine) {
            try {
              await api.insertPrayer({
                title: p.title, body: p.body ?? null, period: p.period,
                visibility: p.visibility ?? 'private', clubId: null, photoUri: p.photoUri ?? null,
              });
            } catch {}
          }
          await AsyncStorage.setItem(MIGRATED_KEY, '1');
        }
      } catch {}
      refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, state === null]);

  // ── 저장: 환경설정은 PREFS_KEY, 서버 스냅샷은 CACHE_KEY ──
  useEffect(() => {
    if (!state) return;
    if (!loaded.current) { loaded.current = true; return; }
    const { weeklyGoal, jmapApplied, hiddenPostIds, collapsedTiers, notif } = state;
    AsyncStorage.mergeItem(PREFS_KEY, JSON.stringify({ weeklyGoal, jmapApplied, hiddenPostIds, collapsedTiers, notif })).catch(() => {});
    const { prayers, neighbors, incomingRequests, clubs, posts, logs, church, profileName, profileVerse, profilePhotoUri, myRegion, boxedPostIds } = state;
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ prayers, neighbors, incomingRequests, clubs, posts, logs, church, profileName, profileVerse, profilePhotoUri, myRegion, boxedPostIds })).catch(() => {});
  }, [state]);

  const store = useMemo<Store | null>(() => {
    if (!state) return null;
    const todayKey = dateKey(new Date());
    const todayLog = state.logs[todayKey] ?? [];

    const markPrayed = (id: string) => {
      set((s) => {
        const cur = s.logs[todayKey] ?? [];
        if (cur.includes(id)) return s;
        return { ...s, logs: { ...s.logs, [todayKey]: [...cur, id] } };
      });
      if (!id.startsWith('tmp-')) api.logPrayed(id).catch(() => {});
    };

    let streak = 0;
    for (let i = 0; ; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = dateKey(d);
      if ((state.logs[k] ?? []).length > 0) streak++;
      else if (i === 0) continue;
      else break;
    }

    const weekCounts = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return (state.logs[dateKey(d)] ?? []).length;
    });

    const todayTargets = state.prayers.filter((p) => p.inBox && !p.answeredAt);

    return {
      ...state,
      todayKey,
      prayedToday: (id) => todayLog.includes(id),
      todayTargets,
      todayDoneCount: todayTargets.filter((p) => todayLog.includes(p.id)).length,
      streak,
      weekCounts,
      refresh,

      addPrayer: ({ title, body, period, visibility, clubId, photoUri }) => {
        const tempId = uid();
        set((s) => ({
          ...s,
          prayers: [
            { id: tempId, title, body: body || null, period, visibility, clubId: clubId ?? null, mine: true, authorName: '나', inBox: true, photoUri: photoUri ?? null, answeredAt: null, createdAt: new Date().toISOString() },
            ...s.prayers,
          ],
        }));
        api.insertPrayer({ title, body: body || null, period, visibility, clubId: clubId ?? null, photoUri: photoUri ?? null })
          .then((row) => set((s) => ({ ...s, prayers: s.prayers.map((p) => (p.id === tempId ? { ...p, id: row.id, photoUri: row.photo_url ?? p.photoUri } : p)) })))
          .catch(() => {});
      },

      updatePrayer: (id, patch) => {
        set((s) => ({ ...s, prayers: s.prayers.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
        if (id.startsWith('tmp-')) return;
        const server: Record<string, any> = {};
        if (patch.title !== undefined) server.title = patch.title;
        if (patch.body !== undefined) server.body = patch.body;
        if (patch.period !== undefined) server.period = patch.period;
        if (patch.visibility !== undefined) server.visibility = patch.visibility;
        api.updatePrayerRow(id, server, patch.clubId).catch(() => {});
      },

      deletePrayer: (id) => {
        set((s) => ({ ...s, prayers: s.prayers.filter((p) => p.id !== id) }));
        if (!id.startsWith('tmp-')) api.deletePrayerRow(id).catch(() => {});
      },

      markAnswered: (id) => {
        const at = new Date().toISOString();
        set((s) => ({ ...s, prayers: s.prayers.map((p) => (p.id === id ? { ...p, answeredAt: at } : p)) }));
        if (!id.startsWith('tmp-')) api.updatePrayerRow(id, { answered_at: at }).catch(() => {});
      },

      togglePrayedToday: (id) => {
        const on = !todayLog.includes(id);
        set((s) => {
          const cur = s.logs[todayKey] ?? [];
          const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
          return { ...s, logs: { ...s.logs, [todayKey]: next } };
        });
        if (id.startsWith('tmp-')) return;
        (on ? api.logPrayed(id) : api.unlogPrayed(id, todayKey)).catch(() => {});
      },

      markPrayed,

      createClub: (name, description) => {
        const tempId = uid();
        set((s) => ({
          ...s,
          clubs: [{ id: tempId, name, description: description || null, memberCount: 1, isMine: true }, ...s.clubs],
        }));
        api.createClubRow(name, description || null)
          .then((club) => set((s) => ({ ...s, clubs: s.clubs.map((c) => (c.id === tempId ? { ...c, id: club.id, joinCode: club.join_code } : c)) })))
          .catch(() => {});
      },

      joinClub: async (code) => {
        try {
          await api.joinClubByCode(code);
          await refresh();
          return { error: null };
        } catch (e: any) {
          return { error: e?.message ?? '초대 코드를 확인해 주세요' };
        }
      },

      addPost: ({ title, body, isAnonymous, category, region }) => {
        const tempId = uid();
        set((s) => ({
          ...s,
          posts: [
            { id: tempId, title, body, category, region, isAnonymous, authorName: isAnonymous ? '익명' : '나', amenCount: 0, amened: false, prayCount: 0, praying: false, inBox: false, comments: [], createdAt: new Date().toISOString() },
            ...s.posts,
          ],
        }));
        api.insertPost({ title, body, isAnonymous, category, region })
          .then((row: any) => set((s) => ({ ...s, posts: s.posts.map((p) => (p.id === tempId ? { ...p, id: row.id } : p)) })))
          .catch(() => {});
      },

      toggleAmen: (postId) => {
        const post = state.posts.find((p) => p.id === postId);
        const on = post ? !post.amened : true;
        set((s) => ({
          ...s,
          posts: s.posts.map((p) => (p.id === postId ? { ...p, amened: !p.amened, amenCount: p.amenCount + (p.amened ? -1 : 1) } : p)),
        }));
        if (!postId.startsWith('tmp-')) api.setReaction(postId, 'amen', on).catch(() => {});
      },

      togglePray: (postId) => {
        const post = state.posts.find((p) => p.id === postId);
        const on = post ? !post.praying : true;
        set((s) => ({
          ...s,
          posts: s.posts.map((p) => (p.id === postId ? { ...p, praying: !p.praying, prayCount: p.prayCount + (p.praying ? -1 : 1) } : p)),
        }));
        if (!postId.startsWith('tmp-')) api.setReaction(postId, 'pray', on).catch(() => {});
      },

      addComment: (postId, body) => {
        const tempId = uid();
        set((s) => ({
          ...s,
          posts: s.posts.map((p) =>
            p.id === postId
              ? { ...p, comments: [...p.comments, { id: tempId, body, authorName: '나', createdAt: new Date().toISOString() }] }
              : p
          ),
        }));
        if (!postId.startsWith('tmp-')) api.insertComment(postId, body, true).catch(() => {});
      },

      addPostToBox: (postId) => {
        const post = state.posts.find((p) => p.id === postId);
        if (!post || post.inBox) return;
        set((s) => ({
          ...s,
          boxedPostIds: [...s.boxedPostIds, postId],
          posts: s.posts.map((p) => (p.id === postId ? { ...p, inBox: true } : p)),
        }));
        // 기도마당 글은 내 기도함에 '나만보기' 사본으로 담는다
        api.insertPrayer({ title: post.title, body: post.body, period: 'week', visibility: 'private', clubId: null, photoUri: null })
          .then(() => refresh())
          .catch(() => {});
      },

      hidePost: (postId) =>
        set((s) => ({
          ...s,
          hiddenPostIds: s.hiddenPostIds.includes(postId) ? s.hiddenPostIds : [...s.hiddenPostIds, postId],
        })),

      reportPost: (postId, reason) => {
        set((s) => ({
          ...s,
          hiddenPostIds: s.hiddenPostIds.includes(postId) ? s.hiddenPostIds : [...s.hiddenPostIds, postId],
        }));
        if (!postId.startsWith('tmp-')) api.insertReport('post', postId, reason).catch(() => {});
      },

      setWeeklyGoal: (n) => set((s) => ({ ...s, weeklyGoal: Math.max(1, n) })),

      setChurch: (church) => {
        set((s) => ({ ...s, church }));
        api.updateMyProfile({ church: churchToText(church) }).catch(() => {});
      },

      setJmapApplied: () => set((s) => ({ ...s, jmapApplied: true })),

      setProfile: (p) => {
        set((s) => ({
          ...s,
          profileName: p.name !== undefined ? p.name : s.profileName,
          profileVerse: p.verse !== undefined ? p.verse : s.profileVerse,
          profilePhotoUri: p.photoUri !== undefined ? p.photoUri : s.profilePhotoUri,
        }));
        (async () => {
          try {
            const patch: Record<string, any> = {};
            if (p.name !== undefined) patch.display_name = p.name ?? '기도의 동반자';
            if (p.verse !== undefined) patch.verse = p.verse;
            if (p.photoUri !== undefined && p.photoUri && !p.photoUri.startsWith('http')) {
              patch.avatar_url = await api.uploadPhoto(p.photoUri, 'avatar');
            }
            if (Object.keys(patch).length) await api.updateMyProfile(patch);
            if (patch.display_name !== undefined) await updateProfile({ display_name: patch.display_name } as any).catch?.(() => {});
          } catch {}
        })();
      },

      setMyRegion: (region) => {
        set((s) => ({ ...s, myRegion: region }));
        api.updateMyProfile({ region }).catch(() => {});
      },

      setNotif: (n) => set((s) => ({ ...s, notif: n })),

      requestNeighbor: async (userId) => {
        try {
          await api.requestNeighborRow(userId);
          return { error: null };
        } catch (e: any) {
          return { error: e?.message ?? '신청에 실패했어요' };
        }
      },

      acceptNeighbor: (userId) => {
        set((s) => ({ ...s, incomingRequests: s.incomingRequests.filter((r) => r.userId !== userId) }));
        api.acceptNeighborRow(userId).then(() => refresh()).catch(() => {});
      },

      toggleTierCollapsed: (tier) =>
        set((s) => ({
          ...s,
          collapsedTiers: s.collapsedTiers.includes(tier)
            ? s.collapsedTiers.filter((t) => t !== tier)
            : [...s.collapsedTiers, tier],
        })),
    };
  }, [state, set, refresh, updateProfile]);

  // 프로필 동의 시각 등은 AuthContext가 관리 — 여기선 화면 데이터만.
  void profile;

  if (!store) return null;
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function usePrayerStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePrayerStore must be used within PrayerStoreProvider');
  return ctx;
}
