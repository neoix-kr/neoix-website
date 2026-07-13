import React from 'react';
import { Text, TextInput, Platform, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/contexts/AuthContext';
import { PrayerStoreProvider } from './src/store/PrayerStore';
import mobileAds from 'react-native-google-mobile-ads';
import NotificationSync from './src/components/NotificationSync';
import PermissionNotice from './src/components/PermissionNotice';

// AdMob SDK 초기화 (1회)
mobileAds().initialize().catch(() => {});
import RootNavigator from './src/navigation/RootNavigator';
import { COLORS } from './src/theme/colors';

// Pretendard를 전역 기본 폰트로 (개별 스타일의 fontFamily는 그대로 우선)
function applyGlobalFont() {
  const patch = (Component: any) => {
    const oldRender = Component.render;
    if (!oldRender || Component.__patched) return;
    Component.__patched = true;
    Component.render = function (...args: any[]) {
      const origin = oldRender.call(this, ...args);
      if (!origin) return origin;
      return React.cloneElement(origin, {
        style: [{ fontFamily: 'Pretendard-Regular' }, origin.props.style],
      });
    };
  };
  patch(Text as any);
  patch(TextInput as any);
}

export default function App() {
  const [fontsLoaded] = useFonts({
    'Pretendard-Regular': require('./assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Medium': require('./assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-SemiBold': require('./assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('./assets/fonts/Pretendard-Bold.otf'),
  });

  if (fontsLoaded && Platform.OS !== 'web') applyGlobalFont();

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <PrayerStoreProvider>
            <NotificationSync />
            <PermissionNotice />
            <StatusBar style="auto" />
            <RootNavigator />
          </PrayerStoreProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
