import React from 'react';
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import { useTheme } from '../theme';

import HomeScreen from '../screens/HomeScreen';
import NeighborsScreen from '../screens/NeighborsScreen';
import PrayerModeScreen from '../screens/PrayerModeScreen';
import CommunityScreen from '../screens/CommunityScreen';
import MeScreen from '../screens/MeScreen';

// 라우트 이름은 ASCII — 한글 키는 네이티브 탭바에서 크래시 유발
export type TabParamList = {
  Home: undefined;
  Neighbors: undefined;
  Pray: undefined;
  Community: undefined;
  Me: undefined;
};

// 진짜 네이티브 UITabBarController — iOS 26에서 Liquid Glass가 시스템 기본 적용
const Tab = createNativeBottomTabNavigator<TabParamList>();

export default function MainTabs() {
  const { C } = useTheme();
  return (
    <Tab.Navigator
      tabBarActiveTintColor={C.tabActive}
      tabBarInactiveTintColor={C.tabInactive}
      translucent
      hapticFeedbackEnabled
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: '기도함', tabBarIcon: () => ({ sfSymbol: 'tray.full' }) }}
      />
      <Tab.Screen
        name="Neighbors"
        component={NeighborsScreen}
        options={{ title: '이웃', tabBarIcon: () => ({ sfSymbol: 'person.2' }) }}
      />
      <Tab.Screen
        name="Pray"
        component={PrayerModeScreen}
        options={{ title: '기도하기', tabBarIcon: () => require('../../assets/tab-pray.png') }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityScreen}
        options={{ title: '기도마당', tabBarIcon: () => ({ sfSymbol: 'bubble.left.and.bubble.right' }) }}
      />
      <Tab.Screen
        name="Me"
        component={MeScreen}
        options={{ title: '프로필', tabBarIcon: () => ({ sfSymbol: 'person.crop.circle' }) }}
      />
    </Tab.Navigator>
  );
}
