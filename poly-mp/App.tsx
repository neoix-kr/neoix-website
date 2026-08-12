import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { MemberProvider } from './src/contexts/MemberContext';
import AppGate from './src/components/AppGate';
import AppNavigator from './src/navigation/AppNavigator';

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
