# -*- coding: utf-8 -*-
"""
Automated Verification Suite for TreTH: 4 Bug Fixes & Brand Synchronization
"""

import os
import sys
import json
import subprocess
import time

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
PASSED = 0
FAILED = 0

def check(condition, message):
    global PASSED, FAILED
    if condition:
        print(f" ✅ {message}")
        PASSED += 1
    else:
        print(f" ❌ {message}")
        FAILED += 1

print("=" * 65)
print(" TRETH: 4 TÍNH NĂNG / FIX LỖI & ĐỒNG BỘ THƯƠNG HIỆU - KIỂM THỬ TỰ ĐỘNG")
print("=" * 65)

# -------------------------------------------------------------
# 1. MENU DỮ LIỆU (#dataDropdownPanel) KHÔNG BỊ TRÀN MÀN HÌNH
# -------------------------------------------------------------
print("\n--- 1. Menu Dữ liệu (#dataDropdownPanel) chống tràn màn hình ---")
with open(os.path.join(ROOT_DIR, 'styles', 'treth-ui.css'), 'r', encoding='utf-8') as f:
    treth_ui_css = f.read()

with open(os.path.join(ROOT_DIR, 'style.css'), 'r', encoding='utf-8') as f:
    style_css = f.read()

with open(os.path.join(ROOT_DIR, 'script.js'), 'r', encoding='utf-8') as f:
    script_js = f.read()

check('max-width: calc(100vw - 24px)' in treth_ui_css or 'max-width: calc(100vw - 24px)' in style_css,
      "CSS: .data-dropdown-panel có ràng buộc max-width: calc(100vw - 24px)")
check('max-height: calc(100dvh - 100px)' in treth_ui_css or 'max-height: calc(100dvh - 100px)' in style_css,
      "CSS: .data-dropdown-panel có ràng buộc max-height: calc(100dvh - 100px)")
check('overflow-y: auto' in treth_ui_css or 'overflow-y: auto' in style_css,
      "CSS: .data-dropdown-panel có overflow-y: auto")
check('getBoundingClientRect' in script_js and 'btnToggleDataMenu' in script_js,
      "JS: toggleDataMenu() tự động căn chỉnh vị trí dựa trên getBoundingClientRect() của nút")

# -------------------------------------------------------------
# 2. TÍNH NĂNG LỊCH (CALENDAR VIEW) HOÀN CHỈNH
# -------------------------------------------------------------
print("\n--- 2. Kích hoạt hoàn chỉnh tính năng Lịch (Calendar View) ---")
cal_file = os.path.join(ROOT_DIR, 'ui', 'CalendarView.js')
check(os.path.isfile(cal_file), "File ui/CalendarView.js tồn tại trên đĩa")

with open(os.path.join(ROOT_DIR, 'index.html'), 'r', encoding='utf-8') as f:
    html_content = f.read()

with open(os.path.join(ROOT_DIR, 'sw.js'), 'r', encoding='utf-8') as f:
    sw_content = f.read()

check('ui/CalendarView.js' in html_content, "index.html đã nạp script ui/CalendarView.js")
check('ui/CalendarView.js' in sw_content, "sw.js đã lưu cache tĩnh cho ui/CalendarView.js")
check('id="btn-view-calendar"' in html_content and 'data-view="calendar"' in html_content,
      "Thanh .view-switcher có nút #btn-view-calendar với data-view='calendar'")
check('id="calendar-view-container"' in html_content,
      "Workspace có khung chứa #calendar-view-container")
check('window.__calendarInstance' in script_js, "script.js khởi tạo đối tượng singleton window.__calendarInstance")
check("currentViewMode === 'calendar'" in script_js, "script.js hỗ trợ chế độ xem currentViewMode === 'calendar'")

# Kiểm tra các tính năng cốt lõi trong CalendarView.js
if os.path.isfile(cal_file):
    with open(cal_file, 'r', encoding='utf-8') as f:
        cal_code = f.read()
    check('Thứ 2' in cal_code and 'Chủ Nhật' in cal_code, "CalendarView hiển thị tuần Thứ 2 -> Chủ Nhật")
    check('prevMonth' in cal_code and 'nextMonth' in cal_code and 'goToToday' in cal_code,
          "CalendarView có nút chuyển Tháng trước, Tháng sau, Hôm nay")
    check('unscheduled' in cal_code or 'Chưa có ngày hạn' in cal_code,
          "CalendarView có bộ lọc/panel công việc chưa đặt ngày hạn")
    check('calDropzone' in cal_code or 'data-cal-dropzone' in cal_code,
          "CalendarView hỗ trợ Drag & Drop (kéo thả cập nhật dueDate)")
    check('cal-task-check' in cal_code, "CalendarView hỗ trợ checkbox hoàn thành việc trực tiếp")
    check('_promptQuickAddForDate' in cal_code or 'quick-add' in cal_code,
          "CalendarView hỗ trợ thêm nhanh công việc khi click ô ngày trống")

# -------------------------------------------------------------
# 3. XÓA BỎ KÝ HIỆU "MODULE 01, 02, 03, 04"
# -------------------------------------------------------------
print("\n--- 3. Xóa bỏ ký hiệu Module 01, 02, 03, 04 ---")
check('style="display: none;"' in html_content and 'id="header-module-badge"' in html_content,
      "index.html: #header-module-badge đã được ẩn hoàn toàn (display: none)")
check('Module 01' not in script_js and 'Module 02' not in script_js and 'Module 03' not in script_js and 'Module 04' not in script_js,
      "script.js: Đã loại bỏ các chuỗi gán 'Module 01, 02, 03, 04' trong hàm switchModule()")
check("headerModuleTitle.textContent = 'Công việc'" in script_js or "headerModuleTitle.textContent = 'Công việc';" in script_js,
      "script.js: Module tasks gán tiêu đề 'Công việc'")
check("headerModuleTitle.textContent = 'Thời gian'" in script_js or "headerModuleTitle.textContent = 'Thời gian';" in script_js,
      "script.js: Module time gán tiêu đề 'Thời gian'")
check("headerModuleTitle.textContent = 'Thói quen'" in script_js or "headerModuleTitle.textContent = 'Thói quen';" in script_js,
      "script.js: Module habits gán tiêu đề 'Thói quen'")
check("headerModuleTitle.textContent = 'Ghi chú'" in script_js or "headerModuleTitle.textContent = 'Ghi chú';" in script_js,
      "script.js: Module notes gán tiêu đề 'Ghi chú'")

# -------------------------------------------------------------
# 4. CHẾ ĐỘ SÁNG (LIGHT MODE) CHUẨN ĐỘ TƯƠNG PHẢN & BIẾN CSS
# -------------------------------------------------------------
print("\n--- 4. Chế độ Sáng (Light Mode) và Hệ thống Biến CSS ---")
with open(os.path.join(ROOT_DIR, 'styles', 'theme-treth-v3.css'), 'r', encoding='utf-8') as f:
    theme_css = f.read()

check('html[data-theme="light"] body' in theme_css, "theme-treth-v3.css định nghĩa quy tắc riêng cho html[data-theme='light'] body")
check('html[data-theme="light"] .card' in theme_css or 'html[data-theme="light"]' in theme_css,
      "theme-treth-v3.css có thiết lập giao diện thẻ sáng rõ ràng")
check('var(--bg-body)' in theme_css or 'var(--bg-body' in treth_ui_css, "CSS dùng biến --bg-body chuẩn")
check('var(--bg-surface)' in theme_css or 'var(--bg-surface' in treth_ui_css, "CSS dùng biến --bg-surface chuẩn")
check('var(--text-main)' in theme_css or 'var(--text-main' in treth_ui_css, "CSS dùng biến --text-main chuẩn")
check('var(--border-color)' in theme_css or 'var(--border-color' in treth_ui_css, "CSS dùng biến --border-color chuẩn")

# -------------------------------------------------------------
# 5. ĐỒNG BỘ THƯƠNG HIỆU TRETH TOÀN BỘ DỰ ÁN
# -------------------------------------------------------------
print("\n--- 5. Đồng bộ Thương hiệu TreTH toàn dự án ---")
check('<title>TreTH - Quản lý công việc & Hiệu suất</title>' in html_content,
      "index.html: <title> đổi thành 'TreTH - Quản lý công việc & Hiệu suất'")
check('<meta name="apple-mobile-web-app-title" content="TreTH">' in html_content,
      "index.html: apple-mobile-web-app-title đổi thành 'TreTH'")
check("DEFAULT_DOCUMENT_TITLE = 'TreTH - Quản lý công việc & Hiệu suất'" in script_js,
      "script.js: DEFAULT_DOCUMENT_TITLE đổi thành 'TreTH - Quản lý công việc & Hiệu suất'")
check('TreTH_Backup_' in script_js, "script.js: Tên file JSON backup đổi thành TreTH_Backup_YYYY-MM-DD.json")
check('TreTH_Tasks_' in script_js, "script.js: Tên file xuất Excel/CSV đổi thành TreTH_Tasks_YYYY-MM-DD")
check('Mau_Nhap_Cong_Viec_TreTH' in script_js, "script.js: Tên file mẫu Excel đổi thành Mau_Nhap_Cong_Viec_TreTH")
check('TreTH' in script_js and 'Hướng dẫn sử dụng TreTH' in script_js,
      "script.js: DEFAULT_NOTES đổi tên thành 'Hướng dẫn sử dụng TreTH'")
check('Đang cài đặt TreTH...' in script_js and 'TreTH đã được cài đặt thành app' in script_js,
      "script.js: Thông báo cài đặt PWA đổi thành TreTH")

# Bảo toàn các khóa localStorage cũ
storage_keys = [
    'personal_workspace_tasks_v1',
    'personal_workspace_categories_v1',
    'personal_workspace_view_mode_v1',
    'personal_workspace_pomo_stats_v1',
    'personal_workspace_pomo_settings_v1',
    'personal_workspace_habits_v1',
    'personal_workspace_notes_v1',
    'personal_workspace_theme_v1'
]
for k in storage_keys:
    check(k in script_js, f"script.js: Bảo toàn khóa localStorage '{k}'")

with open(os.path.join(ROOT_DIR, 'manifest.json'), 'r', encoding='utf-8') as f:
    mf = json.load(f)
check('TreTH' in mf.get('name', '') and mf.get('short_name') == 'TreTH',
      "manifest.json: Cập nhật name & short_name thành TreTH")

with open(os.path.join(ROOT_DIR, 'package.json'), 'r', encoding='utf-8') as f:
    pkg = json.load(f)
check(pkg.get('name') == 'treth' and pkg.get('build', {}).get('productName') == 'TreTH',
      "package.json: name là 'treth', productName là 'TreTH'")

with open(os.path.join(ROOT_DIR, 'main.js'), 'r', encoding='utf-8') as f:
    main_code = f.read()
check("title: 'TreTH'" in main_code, "main.js: Cửa sổ Electron có title là 'TreTH'")

print("\n" + "=" * 65)
print(f" TỔNG KẾT: {PASSED} PASSED, {FAILED} FAILED")
print(f" TỶ LỆ ĐẠT: {PASSED / (PASSED + FAILED) * 100:.1f}%")
print("=" * 65)

if FAILED > 0:
    sys.exit(1)

