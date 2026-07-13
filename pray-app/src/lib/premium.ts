import { Platform } from 'react-native';
import * as IAP from 'react-native-iap';
import { supabase } from './supabase';
import { PREMIUM_PRODUCT_ID } from '../config';

// 프리미엄(광고 제거) 구독 — App Store / Google Play 인앱 구독 (react-native-iap 15.x).
// 스토어에 구독 상품(PREMIUM_PRODUCT_ID)이 등록돼야 실제 결제가 됩니다.

let connected = false;

async function ensureConn(): Promise<boolean> {
  if (connected) return true;
  try {
    await IAP.initConnection();
    connected = true;
    return true;
  } catch {
    return false;
  }
}

export interface PremiumOffer {
  price: string;
  productId: string;
}

// 스토어 구독 상품 가격 조회 (미등록이면 null)
export async function getPremiumOffer(): Promise<PremiumOffer | null> {
  if (!(await ensureConn())) return null;
  try {
    const products = await IAP.fetchProducts({ skus: [PREMIUM_PRODUCT_ID], type: 'subs' });
    const p: any = products?.[0];
    if (!p) return null;
    const price =
      p.displayPrice ??
      p.localizedPrice ??
      p.subscriptionOfferDetailsAndroid?.[0]?.pricingPhases?.pricingPhaseList?.[0]?.formattedPrice ??
      '';
    return { price, productId: PREMIUM_PRODUCT_ID };
  } catch {
    return null;
  }
}

// 구독 결제 → 성공 시 서버 프로필에 프리미엄 표시
export async function purchasePremium(): Promise<{ ok: boolean; error?: string }> {
  if (!(await ensureConn())) return { ok: false, error: '스토어 연결에 실패했어요' };
  try {
    const products = await IAP.fetchProducts({ skus: [PREMIUM_PRODUCT_ID], type: 'subs' });
    const p: any = products?.[0];
    if (!p) return { ok: false, error: '아직 구독 상품이 준비되지 않았어요 (출시 후 이용 가능)' };

    const offerToken = p.subscriptionOfferDetailsAndroid?.[0]?.offerToken;
    await IAP.requestPurchase({
      type: 'subs',
      request: {
        ios: { sku: PREMIUM_PRODUCT_ID },
        android: {
          skus: [PREMIUM_PRODUCT_ID],
          ...(offerToken ? { subscriptionOffers: [{ sku: PREMIUM_PRODUCT_ID, offerToken }] } : {}),
        },
      },
    } as any);

    await markPremium(true);
    return { ok: true };
  } catch (e: any) {
    if (/cancel/i.test(String(e?.message ?? e))) return { ok: false, error: '결제를 취소했어요' };
    return { ok: false, error: e?.message ?? '결제에 실패했어요' };
  }
}

// 이전 구매 복원 → 활성 구독 있으면 프리미엄 유지
export async function restorePremium(): Promise<boolean> {
  if (!(await ensureConn())) return false;
  try {
    const active = await IAP.getActiveSubscriptions([PREMIUM_PRODUCT_ID]);
    const on = Array.isArray(active) && active.length > 0;
    if (on) await markPremium(true);
    return on;
  } catch {
    return false;
  }
}

async function markPremium(on: boolean) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await supabase.from('pray_profiles').update({ is_premium: on }).eq('id', u.user.id);
}

void Platform;
