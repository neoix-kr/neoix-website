import { useEffect } from 'react';
import { usePrayerStore } from '../store/PrayerStore';
import { scheduleDaily, cancelDaily } from '../lib/notifications';

// 알림 설정/오늘의 기도제목이 바뀔 때마다 매일 알림을 최신 내용으로 재예약.
export default function NotificationSync() {
  const store = usePrayerStore();
  const titles = store.todayTargets.map((p) => p.title);
  const titlesKey = titles.join('|');

  useEffect(() => {
    if (store.notif.enabled) {
      scheduleDaily(store.notif.hour, store.notif.minute, titles).catch(() => {});
    } else {
      cancelDaily().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.notif.enabled, store.notif.hour, store.notif.minute, titlesKey]);

  return null;
}
