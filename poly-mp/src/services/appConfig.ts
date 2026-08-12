/**
 * ============================================================================
 * NEOIX 공용 원격설정 (강제 업데이트 · 점검 · 공지 · 기능 플래그)
 * ============================================================================
 * 다른 NEOIX 앱에 그대로 복사해서 쓰는 모듈. 앱마다 바꿀 것은 APP_KEY 한 줄뿐.
 * 서버 테이블: public.neoix_app_config (neoix-app-config.sql)
 *
 * 설계 원칙
 *  - 네트워크 실패는 절대 앱을 막지 않는다 (설정 못 받으면 그냥 통과).
 *  - 마지막 성공 설정을 캐시해 오프라인에서도 점검/강제업데이트 판단이 가능.
 *  - 버전 비교는 순수 함수라 테스트 가능.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { APP_VERSION } from '../appVersion';

// ⬇︎ 앱마다 이 값만 바꾼다 (neoix_app_config.app_key 와 일치)
const APP_KEY = 'polymp';

const CACHE_KEY = `neoix_app_config_${APP_KEY}`;
const NOTICE_DISMISS_KEY = `neoix_notice_dismissed_${APP_KEY}`;
const UPDATE_SKIP_KEY = `neoix_update_skipped_${APP_KEY}`;

export interface AppConfig {
  app_key: string;
  app_name: string;
  min_version: string;
  latest_version: string | null;
  update_message: string | null;
  maintenance: boolean;
  maintenance_message: string | null;
  notice_id: string | null;
  notice_title: string | null;
  notice_body: string | null;
  notice_level: 'info' | 'warn' | 'critical';
  ios_url: string | null;
  android_url: string | null;
  features: Record<string, boolean>;
}

/** 'v1.2.3', '1.2.3-beta' 같은 표기도 받아 [1,2,3] 으로. 숫자 세 자리를 못 얻으면 null. */
function parseVer(v: unknown): [number, number, number] | null {
  const m = String(v ?? '').trim().replace(/^[vV]/, '').match(/^(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)];
}

/**
 * '1.2.10' vs '1.3.0' → -1 / 0 / 1.
 * 한쪽이라도 파싱 불가면 null 을 반환한다 — 호출부에서 '판정 불가'로 다뤄
 * 잘못된 서버 값 때문에 게이트가 조용히 무력화되는 일을 막는다.
 */
export function compareVersion(a: string, b: string): number | null {
  const pa = parseVer(a);
  const pb = parseVer(b);
  if (!pa || !pb) return null;
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

export type GateKind = 'ok' | 'force_update' | 'maintenance';

export interface AppGateState {
  kind: GateKind;
  /** 권장 업데이트 안내 대상 여부 (차단 아님) */
  suggestUpdate: boolean;
  config: AppConfig | null;
  storeUrl: string | null;
  message: string | null;
}

// 캐시된 설정으로 사용자를 '차단'할 수 있는 최대 기간.
// 이게 없으면 점검이 끝난 뒤에도 오프라인 사용자가 옛 maintenance:true 캐시에 영구히 갇힌다
// (네트워크가 없으니 '다시 확인'을 눌러도 새 설정을 못 받는다).
// 오래된 캐시는 참고만 하고 차단 판정에서는 제외한다.
const CACHE_MAX_BLOCK_AGE_MS = 24 * 60 * 60 * 1000; // 24시간

interface CachedConfig {
  savedAt: number;
  config: AppConfig;
}

async function readCache(): Promise<AppConfig | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // 구버전 캐시(래핑 없이 저장된 형태) 호환
    if (!parsed || typeof parsed !== 'object' || !('savedAt' in parsed)) {
      return parsed as AppConfig;
    }
    const { savedAt, config } = parsed as CachedConfig;
    if (Date.now() - savedAt > CACHE_MAX_BLOCK_AGE_MS) {
      // 오래된 캐시로는 막지 않는다 — 점검·강제업데이트만 해제하고 나머지는 그대로 쓴다.
      return { ...config, maintenance: false, min_version: '0.0.0' };
    }
    return config;
  } catch {
    return null;
  }
}

/** 원격설정 조회 — 실패 시 캐시, 캐시도 없으면 null */
export async function fetchAppConfig(): Promise<AppConfig | null> {
  try {
    const { data, error } = await supabase
      .from('neoix_app_config')
      .select('*')
      .eq('app_key', APP_KEY)
      .maybeSingle();

    if (error || !data) return readCache();

    const cfg = { ...(data as AppConfig), features: (data as any).features ?? {} };
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), config: cfg })).catch(() => {});
    return cfg;
  } catch {
    return readCache();
  }
}

/** 현재 앱 버전과 원격설정을 비교해 게이트 상태를 계산 */
export function evaluateGate(config: AppConfig | null, platform: 'ios' | 'android' | 'web'): AppGateState {
  if (!config) {
    return { kind: 'ok', suggestUpdate: false, config: null, storeUrl: null, message: null };
  }
  const storeUrl = platform === 'android' ? config.android_url : config.ios_url;

  if (config.maintenance) {
    return {
      kind: 'maintenance',
      suggestUpdate: false,
      config,
      storeUrl,
      message: config.maintenance_message || '더 나은 서비스를 위해 잠시 점검 중이에요.',
    };
  }
  const vsMin = compareVersion(APP_VERSION, config.min_version);
  if (vsMin === null) {
    // 서버 값이 형식 오류 — 사용자를 막지 않되, 개발 중에는 눈에 띄게 알린다.
    if (__DEV__) console.warn(`[appConfig] min_version 형식 오류: ${config.min_version}`);
  }
  if (vsMin !== null && vsMin < 0) {
    return {
      kind: 'force_update',
      suggestUpdate: false,
      config,
      storeUrl,
      message: config.update_message || '중요한 개선이 있어 업데이트가 필요해요.',
    };
  }
  const vsLatest = config.latest_version ? compareVersion(APP_VERSION, config.latest_version) : null;
  const suggestUpdate = vsLatest !== null && vsLatest < 0;

  return { kind: 'ok', suggestUpdate, config, storeUrl, message: config.update_message };
}

/** 기능 킬스위치 — 서버에 명시적으로 false 일 때만 끈다(기본은 켜짐) */
export function isFeatureEnabled(config: AppConfig | null, key: string): boolean {
  if (!config) return true;
  return config.features?.[key] !== false;
}

// ── 공지 '다시 보지 않기' ──
export async function isNoticeDismissed(noticeId: string | null): Promise<boolean> {
  if (!noticeId) return true;
  try {
    return (await AsyncStorage.getItem(NOTICE_DISMISS_KEY)) === noticeId;
  } catch {
    return false;
  }
}
export async function dismissNotice(noticeId: string): Promise<void> {
  AsyncStorage.setItem(NOTICE_DISMISS_KEY, noticeId).catch(() => {});
}

// ── 권장 업데이트 '나중에' ──
export async function isUpdateSkipped(version: string | null): Promise<boolean> {
  if (!version) return true;
  try {
    return (await AsyncStorage.getItem(UPDATE_SKIP_KEY)) === version;
  } catch {
    return false;
  }
}
export async function skipUpdate(version: string): Promise<void> {
  AsyncStorage.setItem(UPDATE_SKIP_KEY, version).catch(() => {});
}
