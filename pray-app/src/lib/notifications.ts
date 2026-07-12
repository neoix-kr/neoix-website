import * as Notifications from 'expo-notifications';

// 포그라운드에서도 배너 표시
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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
