// 毛绒管家 PWA Service Worker
const CACHE_NAME = 'pet-care-v1';
const STATIC_ASSETS = [
  '/',
  '/chat',
  '/pets',
  '/health-monitor',
  '/schedule',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// 安装 - 缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('缓存核心资源');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// 激活 - 清除旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// 请求拦截 - 网络优先，离线回退到缓存
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // 只处理 GET 请求
  if (request.method !== 'GET') return;
  
  // 跳过 API 请求和外部请求（API 需要实时数据）
  if (request.url.includes('/api/') || !request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    fetch(request)
      .then(response => {
        // 成功则缓存响应
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // 离线时回退到缓存
        return caches.match(request).then(cached => {
          // 如果是导航请求，回退到首页
          if (cached || request.mode !== 'navigate') return cached;
          return caches.match('/');
        });
      })
  );
});
