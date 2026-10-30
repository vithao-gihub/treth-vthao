# Đồng Bộ Phiên Bản Mới Nhất Cho PWA & Tự Động Đẩy Code Build APK Lên GitHub

Giải quyết triệt để tình trạng bản tải về (cả bản cài đặt PWA từ trình duyệt lẫn bản APK tải từ GitHub Releases) vẫn hiển thị giao diện cũ so với bản Preview, đồng thời hỗ trợ đẩy trực tiếp mã nguồn mới nhất lên kho lưu trữ GitHub (`vithao-gihub/treth-vthao`) bằng GitHub Token để kích hoạt tiến trình đóng gói APK tự động.

## User Review & Critical Decisions

> [!IMPORTANT]
> Xác nhận các lựa chọn bạn đã chọn ở bước trước và phương thức cung cấp GitHub Token để đẩy mã nguồn tự động:

- **Confirmed Decision 1 (Phạm vi bản cài đặt)**: Đồng bộ hóa phiên bản mới nhất (`v4.2.0`) cho **cả hai kênh**: bản cài đặt PWA trực tiếp từ trình duyệt và bản đóng gói Android APK trên GitHub.
- **Confirmed Decision 2 (Đẩy code tự động lên GitHub bằng Token)**: Hỗ trợ đẩy mã nguồn trực tiếp lên kho lưu trữ GitHub `vithao-gihub/treth-vthao` bằng Personal Access Token (PAT) thông qua hai cách linh hoạt:
  1. **Cách 1 (Ngay trong khung chat)**: Khi duyệt kế hoạch này (*Proceed*), bạn có thể gửi kèm GitHub Token vào khung chat để hệ thống chạy lệnh đẩy trực tiếp lên nhánh `main` và kích hoạt GitHub Actions ngay lập tức.
  2. **Cách 2 (Ngay trong Cài đặt ứng dụng)**: Bổ sung mục **"Đồng bộ GitHub & Làm mới phiên bản"** trong cửa sổ Cài đặt để bạn có thể dán GitHub Token và bấm nút đẩy code lên GitHub bất cứ lúc nào mà không lộ Token trong mã nguồn.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. Loại bỏ hoàn toàn hiện tượng lưu đệm cũ (*stale cache*) trên điện thoại bằng cơ chế ưu tiên mạng (*Network-First*) cho mã nguồn giao diện và tự động kích hoạt bản cập nhật ngay khi mở ứng dụng.
  2. Nâng cấp số hiệu phiên bản ứng dụng Android (`v4.2.0`) và đồng bộ toàn bộ tài nguyên giao diện di động mới nhất sang gói đóng gói Capacitor.
  3. Cung cấp cầu nối đẩy mã nguồn tự động lên GitHub bằng Token (qua máy chủ nội bộ hoặc trực tiếp từ phiên làm việc) để kích hoạt luồng GitHub Actions xây dựng file APK mới.
- **Target Audience / Persona**: Người dùng cá nhân sử dụng TreTH đồng thời trên trình duyệt di động (PWA) và bản cài đặt Android APK độc lập.
- **Key Value**: Mọi tinh chỉnh giao diện di động và bàn phím ảo trên bản Preview đều được áp dụng tức thì trên thiết bị thật mà không cần gỡ ứng dụng hay xóa dữ liệu thủ công.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Tự động cập nhật khi mở ứng dụng (PWA & WebView)**: Khi người dùng mở ứng dụng, trình quản lý phiên bản kiểm tra bản mới từ máy chủ, tự động xóa bộ nhớ đệm cũ (`treth-v4.0.0`), nạp giao diện `v4.2.0` và hiển thị thông báo nhỏ *"Đã cập nhật ứng dụng lên phiên bản mới nhất v4.2.0"*.
  2. **Làm mới bộ nhớ đệm chủ động trong Cài đặt**: Trong hộp thoại **Cài đặt**, người dùng có thêm nút **"Làm mới phiên bản & Xóa bộ nhớ đệm"** (kèm nhãn phiên bản hiện tại `v4.2.0`) để ép tải lại toàn bộ tài nguyên mới nhất chỉ với 1 chạm, vẫn giữ nguyên 100% dữ liệu công việc, thói quen và ghi chú trong máy.
  3. **Đẩy code tự động lên GitHub & Theo dõi tiến trình Build APK**: Trong hộp thoại **Cài đặt** (hoặc gửi trực tiếp qua khung chat), người dùng nhập GitHub Personal Access Token (quyền `repo` và `workflow`) và bấm **"Đẩy bản cập nhật lên GitHub (Build APK)"**. Hệ thống tự động đóng gói tài nguyên, đẩy commit lên nhánh chính của `vithao-gihub/treth-vthao` và hiển thị đường dẫn theo dõi tiến trình tạo file APK mới trên GitHub Actions.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Giữ nguyên ngôn ngữ thiết kế *Cyber-Natural Glassmorphism* đặc trưng của TreTH, gọn gàng và tối ưu vùng chạm ngón cái trên màn hình di động (`375px–430px`).
  - *Color Palette & Mood*: Sử dụng bảng màu ngữ nghĩa chuẩn (`--bg-surface`, `--text-main`, `--primary: #10B981`, `--border-color`), tương thích hoàn toàn giữa Chế độ Sáng (Light Mode) và Chế độ Tối (Dark Mode).
  - *Typography & Hierarchy*: Phân cấp rõ ràng giữa tiêu đề nhóm cài đặt, nhãn trạng thái phiên bản (`tabular-nums`) và các nút thao tác có chiều cao vùng chạm tối thiểu `44px`.
  - *Component Styling & Layout*: Khối điều khiển cập nhật và đồng bộ GitHub được đặt gọn trong cửa sổ **Cài đặt** hiện có, tự động co giãn 1 cột trên màn hình điện thoại mà không gây tràn ngang.
- **Interactive Feedback & Motion**:
  - Nút **"Làm mới phiên bản"** và **"Đẩy lên GitHub"** hiển thị trạng thái đang xử lý rõ ràng và phản hồi kết quả qua thông báo nổi (*Toast Notification*) trong vòng dưới `200ms`.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Chuyển chiến lược bộ nhớ đệm từ Stale-While-Revalidate sang Network-First cho mã nguồn ứng dụng**
  - *Chosen Approach*: Áp dụng cơ chế *Network-First (Ưu tiên mạng, dự phòng ngoại tuyến)* cho tất cả tệp cấu trúc, kịch bản xử lý và bảng kiểu giao diện, kết hợp gắn chuỗi phiên bản (`?v=4.2.0`) và nâng mã bộ nhớ đệm lên `treth-v4.2.0`.
  - *Why*: Cơ chế *Stale-While-Revalidate* trước đây luôn trả về tệp cũ trong bộ nhớ đệm trước, khiến người dùng mở PWA hoặc WebView vẫn thấy giao diện lỗi cũ. *Network-First* đảm bảo khi có mạng, thiết bị luôn nhận ngay bản sửa lỗi mới nhất, còn khi mất mạng vẫn hoạt động ngoại tuyến 100%.
  - *Alternatives Considered*: Xóa hoàn toàn bộ nhớ đệm ngoại tuyến — bị loại bỏ vì làm mất khả năng sử dụng ứng dụng khi không có kết nối Internet.
- **Decision 2: Cơ chế đẩy mã nguồn lên GitHub an toàn qua API nội bộ & Phiên thực thi**
  - *Chosen Approach*: Xử lý đẩy Git thông qua điểm cuối máy chủ nội bộ (`/api/github-sync`) nhận GitHub Token chỉ trong phiên yêu cầu (hoặc thực thi trực tiếp khi người dùng gửi Token trong chat), tuyệt đối không lưu cứng Token vào mã nguồn.
  - *Why*: Bảo vệ an toàn cho tài khoản GitHub của người dùng (tránh việc GitHub tự động thu hồi Token nếu phát hiện Token nằm trong mã nguồn được đẩy lên) đồng thời tự động đồng bộ thư mục đóng gói Android trước khi đẩy.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    GIAO DIỆN NGƯỜI DÙNG (CLIENT UI)                     │
│                                                                         │
│  ┌───────────────────────────────┐   ┌───────────────────────────────┐  │
│  │  Cơ Chế Tự Động Cập Nhật PWA  │   │  Hộp Thoại Cài Đặt Hệ Thống   │  │
│  │  - Kiểm tra phiên bản v4.2.0  │   │  - Nút Xóa Cache & Làm Mới    │  │
│  │  - Tự động kích hoạt SW mới   │   │  - Khung Nhập GitHub Token    │  │
│  └───────────────┬───────────────┘   └───────────────┬───────────────┘  │
└──────────────────┼───────────────────────────────────┼──────────────────┘
                   │                                   │
                   ▼                                   ▼
┌──────────────────────────────────┐   ┌──────────────────────────────────┐
│   TRÌNH QUẢN LÝ BỘ NHỚ ĐỆM SW    │   │    MÁY CHỦ ĐỒNG BỘ NỘI BỘ        │
│   - Cache: treth-v4.2.0          │   │    (POST /api/github-sync)       │
│   - Xóa triệt để treth-v4.0.0    │   │    1. Đồng bộ tài nguyên đóng gói│
│   - Network-First cho HTML/JS/CSS│   │    2. Tạo bản ghi & Đẩy lên Git  │
└──────────────────────────────────┘   └───────────────┬──────────────────┘
                                                       │
                                                       ▼
                                       ┌──────────────────────────────────┐
                                       │  GITHUB (vithao-gihub/treth-vthao│
                                       │  - Nhánh chính nhận mã nguồn mới │
                                       │  - GitHub Actions tự động chạy   │
                                       │    đóng gói APK & EXE v4.2.0     │
                                       └──────────────────────────────────┘
```

- **Data Model & State**:
  - **Bảo toàn dữ liệu người dùng (`localStorage`)**: Quá trình xóa bộ nhớ đệm tài nguyên (`caches.delete`) chỉ xóa các tệp giao diện cũ (`HTML/CSS/JS`), giữ nguyên toàn bộ khóa dữ liệu cá nhân (`personal_workspace_tasks_v1`, `personal_workspace_categories_v1`, `personal_workspace_habits_v1`, `personal_workspace_notes_v1`, `personal_workspace_pomo_settings_v1`).
  - **Thông tin phiên bản (`APP_VERSION = '4.2.0'`)**: Đồng bộ xuyên suốt giữa giao diện web, bộ nhớ đệm trình duyệt, cấu hình dự án và cấu hình đóng gói Android (`versionCode 2`, `versionName "4.2.0"`).
- **Interactive Component & State Mapping**:
  - **Nút "Làm mới phiên bản & Xóa bộ nhớ đệm" (`#btn-force-update-app`)**: Hủy đăng ký Service Worker cũ, xóa toàn bộ `caches.keys()`, hiển thị thông báo xác nhận và tải lại trang với tham số chống lưu đệm.
  - **Khung "Đồng bộ GitHub & Build APK" (`#github-sync-section`)**: Kiểm tra tính hợp lệ của Token và tên kho lưu trữ (`vithao-gihub/treth-vthao`), gửi yêu cầu đến `/api/github-sync`, thực thi đồng bộ gói tài nguyên di động, commit và đẩy lên nhánh chính của GitHub, sau đó trả về trạng thái cùng liên kết trực tiếp tới trang GitHub Actions/Releases.
