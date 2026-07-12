import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { DEV_BYPASS_AUTH } from '../config';
import { useTheme } from '../theme';
import MainTabs from './MainTabs';
import LoginScreen from '../screens/auth/LoginScreen';
import ConsentScreen from '../screens/auth/ConsentScreen';
import PrayerComposeScreen from '../screens/PrayerComposeScreen';
import PrayerDetailScreen from '../screens/PrayerDetailScreen';
import PrayerSessionScreen from '../screens/PrayerSessionScreen';
import ClubDetailScreen from '../screens/ClubDetailScreen';
import PostComposeScreen from '../screens/PostComposeScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import StatsScreen from '../screens/StatsScreen';
import ProfileEditScreen from '../screens/ProfileEditScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import ContactsScreen from '../screens/ContactsScreen';

export type RootStackParamList = {
  MainTabs: undefined;
  Login: undefined;
  Consent: undefined;
  PrayerCompose: { editId?: string } | undefined;
  PrayerDetail: { id: string };
  PrayerSession: { sources: string[] } | undefined;
  ClubDetail: { id: string };
  PostCompose: undefined;
  PostDetail: { id: string };
  Stats: undefined;
  ProfileEdit: undefined;
  NotificationSettings: undefined;
  Contacts: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const NAV_FONTS = {
  regular: { fontFamily: 'Pretendard-Regular', fontWeight: '400' as const },
  medium: { fontFamily: 'Pretendard-Medium', fontWeight: '500' as const },
  bold: { fontFamily: 'Pretendard-SemiBold', fontWeight: '600' as const },
  heavy: { fontFamily: 'Pretendard-Bold', fontWeight: '700' as const },
};

export default function RootNavigator() {
  const { session, isLoading, profile } = useAuth();
  const needsConsent = !!session && !!profile && !profile.sensitive_agreed_at;
  const { C, isDark } = useTheme();
  const navTheme = {
    dark: isDark,
    colors: {
      primary: C.primary,
      background: C.background,
      card: C.surface,
      text: C.text,
      border: C.border,
      notification: C.tier.urgent,
    },
    fonts: NAV_FONTS,
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.background } }}>
        {needsConsent ? (
          <Stack.Screen name="Consent" component={ConsentScreen} />
        ) : session || DEV_BYPASS_AUTH ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="PrayerCompose" component={PrayerComposeScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="PrayerDetail" component={PrayerDetailScreen} />
            <Stack.Screen name="PrayerSession" component={PrayerSessionScreen} options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
            <Stack.Screen name="ClubDetail" component={ClubDetailScreen} />
            <Stack.Screen name="PostCompose" component={PostComposeScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="PostDetail" component={PostDetailScreen} />
            <Stack.Screen name="Stats" component={StatsScreen} />
            <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
            <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
            <Stack.Screen name="Contacts" component={ContactsScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
