import React, { useMemo } from 'react';
import { View, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { USE_TEST_ADS, ADMOB_BANNER } from '../config';

// 홈 하단 배너 광고. 테스트 모드면 구글 테스트 광고, 아니면 실제 단위 ID.
export default function AdBanner() {
  const unitId = useMemo(() => {
    if (USE_TEST_ADS) return TestIds.BANNER;
    return Platform.OS === 'ios' ? ADMOB_BANNER.ios : ADMOB_BANNER.android;
  }, []);

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
