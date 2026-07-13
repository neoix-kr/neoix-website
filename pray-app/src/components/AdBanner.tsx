import React, { useMemo } from 'react';
import { View, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { USE_TEST_ADS, ADMOB_BANNER } from '../config';
import { useAuth } from '../contexts/AuthContext';

// 홈 하단 배너 광고. 프리미엄(광고 제거) 구독자는 표시 안 함.
export default function AdBanner() {
  const { profile } = useAuth();
  const unitId = useMemo(() => {
    if (USE_TEST_ADS) return TestIds.BANNER;
    return Platform.OS === 'ios' ? ADMOB_BANNER.ios : ADMOB_BANNER.android;
  }, []);

  if (profile?.is_premium) return null; // 프리미엄이면 광고 제거

  return (
    <View style={{ alignItems: 'center' }}>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
}
