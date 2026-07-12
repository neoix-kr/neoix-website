import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// 포그라운드에서도 배너 표시
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ── 원격 푸시(서버에서 보내는 팝업 알림) 등록 ──
// 기기의 Expo 푸시 토큰을 받아 Supabase pray_push_tokens에 저장.
// 관리자/서버는 이 토큰으로 Expo Push API에 POST하면 팝업 알림이 발송된다.
export async function registerPushToken(): Promise<string | null> {
  const ok = await requestNotifPermission();
  if (!ok) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: '기도 알림',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const { data: u } = await supabase.auth.getUser();
    if (u.user && token) {
      await supabase.from('pray_push_tokens').upsert(
        { user_id: u.user.id, token, platform: Platform.OS },
        { onConflict: 'token' }
      );
    }
    return token ?? null;
  } catch {
    return null;
  }
}

export async function requestNotifPermission(): Promise<boolean> {
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

// 매일 정해진 시간에 기도 알림. body에 오늘의 기도제목을 담는다.
// (iOS는 "잠금해제 시 팝업" API가 없어서, 매일 알림에 기도제목을 실어 보내는 방식)
export async function scheduleDaily(hour: number, minute: number, titles: string[]): Promise<boolean> {
  const ok = await requestNotifPermission();
  if (!ok) return false;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const body =
    titles.length > 0
      ? `오늘의 기도제목 — ${titles.slice(0, 3).join(' · ')}${titles.length > 3 ? ` 외 ${titles.length - 3}개` : ''}`
      : '오늘도 잠시 멈추고 기도로 하루를 열어요.';
  await Notifications.scheduleNotificationAsync({
    content: { title: '기도할 시간이에요', body, sound: 'default' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
  return true;
}

export async function cancelDaily() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
