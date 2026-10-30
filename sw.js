const CACHE_NAME = 'treth-v4.2.0';
const STATIC_ASSETS = [
    './',
    './index.html',
    './style.css',
    './styles/treth-ui.css',
    './styles/theme-treth-v3.css',
    './services/SyncQueue.js',
    './services/LocalRepository.js',
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
                    cache.add(new Request(url, { cache: 'reload' })).catch((err) => {
                        console.warn('[ServiceWorker] Bỏ qua tài nguyên phụ chưa sẵn sàng:', url, err);
                    })
                )
            );
        })
    );
});

// 2. Kích hoạt và dọn dẹp triệt để các cache phiên bản cũ (treth-v4.0.0, v.v.)
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

// Hỗ trợ kích hoạt nóng hoặc xóa cache từ trang cài đặt
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// 3. Xử lý yêu cầu mạng tối ưu:
// - HTML, JS, CSS, Manifest: Network-First (luôn lấy bản mới nhất khi có mạng, dự phòng cache khi offline)
// - Images, Fonts, Icons: Stale-While-Revalidate (mở tức thì & cập nhật nền)
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith('http')) return;
    if (event.request.url.includes('/api/')) return;

    const reqUrl = new URL(event.request.url);
    const pathname = reqUrl.pathname.toLowerCase();

    const isHtmlNavigate = event.request.mode === 'navigate' ||
        (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'));

    const isCoreCodeOrStyle = isHtmlNavigate ||
        pathname.endsWith('.html') ||
        pathname.endsWith('.js') ||
        pathname.endsWith('.css') ||
        pathname.endsWith('manifest.json') ||
        pathname === '/' ||
        pathname === '';

    if (isCoreCodeOrStyle) {
        // Luồng 1: Network-First cho HTML, JS, CSS để bản cài đặt PWA / APK luôn nhận giao diện mới nhất ngay lập tức
        event.respondWith(
            fetch(event.request, { cache: 'no-cache' })
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const copy = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                    }
                    return networkResponse;
                })
                .catch(() => {
                    return caches.match(event.request, { ignoreSearch: true }).then((cached) => {
                        if (cached) return cached;
                        if (isHtmlNavigate) {
                            return caches.match('./index.html', { ignoreSearch: true }).then((htmlRes) => {
                                return htmlRes || caches.match('./', { ignoreSearch: true });
                            });
                        }
                        return null;
                    });
                })
        );
    } else {
        // Luồng 2: Stale-While-Revalidate cho hình ảnh, biểu tượng, font chữ
        event.respondWith(
            caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
                const fetchPromise = fetch(event.request)
                    .then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
                            const copy = networkResponse.clone();
                            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                        }
                        return networkResponse;
                    })
                    .catch(() => null);

                return cachedResponse || fetchPromise;
            })
        );
    }
});
