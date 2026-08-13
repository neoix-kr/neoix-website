// 폴리 오피스 내비게이션 — 게이트 2단(로그인 → 의원 승격) 후 탭 5개
// 라우트 이름은 ASCII — 한글 키는 네이티브 탭바(C string 변환)에서 크래시 유발 (poly-build 검증)
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import GateScreen from '../screens/GateScreen';
import ArchiveScreen from '../screens/ArchiveScreen';
import CasesScreen from '../screens/CasesScreen';
import SupportScreen from '../screens/SupportScreen';
import ContactsScreen from '../screens/ContactsScreen';
import OrgsScreen from '../screens/OrgsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useAuth } from '../contexts/AuthContext';
import { useMember } from '../contexts/MemberContext';
import { useTheme } from '../theme/ThemeContext';

export type TabParamList = {
  Archive: undefined;
  Cases: undefined;
  Support: undefined;
  Contacts: undefined;
  Orgs: undefined;
};

const Tab = createNativeBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator();

// @bottom-tabs 타입 정의에 없는 네이티브 전용 프롭 (런타임 지원됨) — poly-build와 동일
const NATIVE_TAB_PROPS = {
  backgroundColor: 'rgba(23,24,31,0.55)',
  activeIndicatorColor: 'rgba(99,102,241,0.28)',
  translucent: true,
  hapticFeedbackEnabled: true,
} as any;

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Archive"
      // 반투명 그래파이트 글래스 바 — 선택 탭 쨍한 인디고 (폴리 본체와 동일)
      {...NATIVE_TAB_PROPS}
      tabBarActiveTintColor="#A5A6FF"
      tabBarInactiveTintColor="rgba(255,255,255,0.6)"
    >
      <Tab.Screen name="Archive" component={ArchiveScreen} options={{ title: '아카이빙', tabBarIcon: () => ({ sfSymbol: 'square.and.pencil' }) }} />
      <Tab.Screen name="Cases" component={CasesScreen} options={{ title: '민원', tabBarIcon: () => ({ sfSymbol: 'bubble.left.and.bubble.right' }) }} />
      <Tab.Screen name="Support" component={SupportScreen} options={{ title: '후원회', tabBarIcon: () => ({ sfSymbol: 'wonsign.circle' }) }} />
      <Tab.Screen name="Contacts" component={ContactsScreen} options={{ title: '연락처', tabBarIcon: () => ({ sfSymbol: 'person.crop.circle' }) }} />
      <Tab.Screen name="Orgs" component={OrgsScreen} options={{ title: '조직', tabBarIcon: () => ({ sfSymbol: 'building.2' }) }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { session, isLoading } = useAuth();
  const { member, isLoading: memberLoading } = useMember();
  const { COLORS, scheme } = useTheme();

  if (isLoading || (session && memberLoading)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  const navTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <NavigationContainer theme={{ ...navTheme, colors: { ...navTheme.colors, background: COLORS.background, primary: COLORS.primary } }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : member?.status !== 'active' ? (
          <Stack.Screen name="Gate" component={GateScreen} />
        ) : (
          <Stack.Group>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ presentation: 'modal' }} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
