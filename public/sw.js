// ==================== Service Worker - 毛绒管家 PWA 推送通知 ====================

// 安装事件：缓存核心资源
const CACHE_NAME = 'maorong-v1';

const PRECACHE_URLS = [
  '/',
  '/login',
  '/chat',
  '/pets',
  '/health',
  '/schedule',
  '/settings',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] 缓存核心资源');
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.log('[SW] 预缓存部分资源失败（正常，后续按需缓存）:', err);
        // 不阻塞安装
      });
    })
  );
  // 跳过等待，立即激活
  self.skipWaiting();
});

// 激活事件：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => {
          console.log('[SW] 删除旧缓存:', name);
          return caches.delete(name);
        })
      )
    )
  );
  // 立即控制所有客户端
  self.clients.claim();
});

// 拦截网络请求 - 缓存优先策略
self.addEventListener('fetch', (event) => {
  // 跳过非 GET 请求和扩展 API 请求
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // 有缓存则返回缓存，同时在后台更新
        fetchAndCache(event.request);
        return cachedResponse;
      }
      // 无缓存则走网络
      return fetchAndCache(event.request);
    })
  );
});

async function fetchAndCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // 网络失败时尝试返回离线页面
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;
    
    // 如果请求的是 HTML 页面，返回首页
    if (request.headers.get('accept')?.includes('text/html')) {
      const cachedIndex = await caches.match('/');
      return cachedIndex || new Response('离线中...', { status: 503 });
    }
    throw err;
  }
}

// ==================== 核心功能：推送通知接收与显示 ====================

// 监听推送消息 — 这是手机收到弹窗的关键！
self.addEventListener('push', function (event) {
  console.log('[SW] 收到推送消息');

  let data = { title: '毛绒管家', body: '您有一条新消息', icon: '/icons/icon-192x192.png', url: '/' };

  try {
    data = event.data ? event.data.json() : data;
  } catch (e) {
    console.log('[SW] 解析推送数据失败:', e);
  }

  const options = {
    body: data.body || '您有一条新消息',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'maorong-notification',
    renotify: true,
    requireInteraction: false,
    data: {
      url: data.url || '/',
      ...data.data,
    },
    actions: [
      { action: 'open', title: '查看详情' },
      { action: 'close', title: '关闭' },
    ],
  };

  // 🎯 关键：调用 showNotification 让手机弹出系统级通知
  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 监听用户点击通知 — 打开对应页面
self.addEventListener('notificationclick', function (event) {
  console.log('[SW] 用户点击通知, action:', event.action);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // 打开或聚焦到目标 URL
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 如果已有打开的窗口，聚焦它并导航
        for (const client of clientList) {
          if ('focus' in client && client.url.includes(self.registration.scope)) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        // 否则打开新窗口/标签页
        return clients.openWindow(targetUrl);
      })
  );
});

// 监听通知关闭
self.addEventListener('notificationclose', function (event) {
  console.log('[SW] 通知已关闭');
});
