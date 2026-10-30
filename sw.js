const CACHE_NAME = 'treth-v4.0.0';
const STATIC_ASSETS = [
    './',
    './index.html',
    './style.css',
    './styles/treth-ui.css',
    './styles/theme-treth-v3.css',
    './services/SyncQueue.js',
    './services/CloudSyncService.js',
    './services/LocalRepository.js',
    './modules/tasks/TasksModule.js',
    './modules/pomodoro/PomodoroModule.js',
    './modules/habits/HabitsModule.js',
    './modules/notes/NotesModule.js',
    './modules/stats/StatsModule.js',
    './modules/settings/SettingsModule.js',
    './ui/KanbanView.js',
    './ui/CalendarView.js',
    './script.js',
    './manifest.json',
    './xlsx.full.min.js',
    './icon.svg',
    './icon-192.png',
    './icon-512.png',
    './apple-touch-icon.png',
    './assets/logo-treth.png',
    './assets/icons/cong-viec.png',
    './assets/icons/thoi-gian.png',
    './assets/icons/thoi-quen.png',
    './assets/icons/ghi-chu.png',
    './assets/icons/quan-ly-loai-viec.png',
    './assets/icons/du-lieu.png',
    './assets/icons/cai-dat.png',
    './assets/icons/bao-cao.png',
    './assets/icons/ke-hoach.png',
    './assets/icons/cong-van.png',
    './assets/icons/chuong-trinh.png',
    './assets/icons/du-thao.png',
    './assets/icons/hop-gap-go.png',
    './assets/icons/y-tuong.png',
    './assets/icons/nghien-cuu.png',
    './assets/icons/tai-lieu.png',
    './assets/icons/kiem-duyet.png',
    './assets/icons/lap-trinh.png',
    './assets/icons/thiet-ke.png',
    './assets/icons/hoc-tap.png',
    './assets/icons/doi-song.png',
    './assets/icons/suc-khoe.png',
    './assets/icons/tai-chinh.png',
    './assets/icons/quan-trong.png',
    './assets/icons/giai-tri.png'
];

// 1. Cài đặt Service Worker và lưu bộ nhớ đệm an toàn với Promise.allSettled
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.allSettled(
                STATIC_ASSETS.map((url) =>
                    cache.add(url).catch((err) => {
                        console.warn('[ServiceWorker] Bỏ qua tài nguyên phụ chưa sẵn sàng:', url, err);
                    })
                )
            );
        })
    );
});

// 2. Kích hoạt và dọn dẹp các cache phiên bản cũ
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[ServiceWorker] Xóa cache cũ:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. Xử lý yêu cầu mạng tối ưu:
// - HTML Navigate: Network-First (fallback về cache index.html / ./)
// - Static Assets (CSS, JS, Fonts, Icons): Stale-While-Revalidate (mở tức thì & cập nhật nền)
self.addEventListener('fetch', (event) => {
    // Chỉ xử lý các yêu cầu GET
    if (event.request.method !== 'GET') return;

    // Bỏ qua các scheme đặc biệt (chrome-extension, edge, etc.)
    if (!event.request.url.startsWith('http')) return;

    const isHtmlNavigate = event.request.mode === 'navigate' ||
        (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'));

    if (isHtmlNavigate) {
        // Luồng 1: Network-First cho điều hướng trang HTML
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const copy = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                    }
                    return networkResponse;
                })
                .catch(() => {
                    return caches.match(event.request).then((cached) => {
                        if (cached) return cached;
                        return caches.match('./index.html').then((htmlRes) => {
                            return htmlRes || caches.match('./');
                        });
                    });
                })
        );
    } else {
        // Luồng 2: Stale-While-Revalidate cho tài nguyên tĩnh (CSS, JS, Fonts, Images)
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                const fetchPromise = fetch(event.request)
                    .then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
                            const copy = networkResponse.clone();
                            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                        }
                        return networkResponse;
                    })
                    .catch((err) => {
                        // Lỗi mạng nền không làm gián đoạn bản cache đã trả về
                        return null;
                    });

                // Nếu có cache, trả về ngay lập tức không cần chờ mạng; đồng thời fetchPromise cập nhật cache nền
                return cachedResponse || fetchPromise;
            })
        );
    }
});
