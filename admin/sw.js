// NEOIX Admin 서비스워커 — 웹푸시 수신 + PWA
const PUSH_API = 'https://neoix-push.neoix-kr.workers.dev';

self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  e.waitUntil((async () => {
    let title = 'NEOIX', body = '새 알림이 있어요';
    try {
      // payload-less 푸시 — 내용은 워커에서 조회
      const r = await fetch(`${PUSH_API}/webpush/latest`, { cache: 'no-store' });
      const j = await r.json();
      if (j.title) { title = j.title; body = j.body || ''; }
    } catch {}
    await self.registration.showNotification(title, {
      body,
      icon: '/admin/icons/icon-192.png',
      badge: '/admin/icons/icon-192.png',
    });
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) { if (w.url.includes('/admin')) { w.focus(); return; } }
    await self.clients.openWindow('/admin/');
  })());
});
