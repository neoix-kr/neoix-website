import React from 'react';
import { Text, TextInput, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { MemberProvider } from './src/contexts/MemberContext';
import AppGate from './src/components/AppGate';
import AppNavigator from './src/navigation/AppNavigator';

// Pretendard를 전역 기본 폰트로 — 개별 스타일의 fontWeight는 그대로 살아있음
// (iOS는 같은 패밀리 안에서 weight 매칭). poly-build와 동일한 패치.
function applyGlobalFont() {
  const patch = (Component: any) => {
    const oldRender = Component.render;
    if (!oldRender || Component.__pretendardPatched) return;
    Component.__pretendardPatched = true;
    Component.render = function (...args: any[]) {
      const origin = oldRender.call(this, ...args);
      if (!origin) return origin;
      return React.cloneElement(origin, {
        style: [{ fontFamily: 'Pretendard' }, origin.props.style],
      });
    };
  };
  patch(Text as any);
  patch(TextInput as any);
}

function Root() {
  const { scheme } = useTheme();
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    'Pretendard-Regular': require('./assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Medium': require('./assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-SemiBold': require('./assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('./assets/fonts/Pretendard-Bold.otf'),
  });

  if (fontsLoaded && Platform.OS !== 'web') applyGlobalFont();

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <MemberProvider>
            {/* AppGate — 강제 업데이트/점검 차단은 로그인 전에도 떠야 하므로 내비게이터 밖에서 감싼다 */}
            <AppGate>
              <Root />
            </AppGate>
          </MemberProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
