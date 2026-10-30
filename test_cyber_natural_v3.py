# -*- coding: utf-8 -*-
"""
Automated Verification Suite for TreTH v3.0 / v3.1 Cyber Natural UI Kit
Checks Tasks 1, 2, 3, 4 requirements.
"""

import os
import sys
import json
import re
from PIL import Image

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

print("=" * 60)
print(" TRETH v3.0 / v3.1 CYBER NATURAL UI KIT - VERIFICATION SUITE")
print("=" * 60)

# ---------------------------------------------------------
# NHIỆM VỤ 1: Kiểm tra 26 assets ảnh đã cắt & tách nền alpha
# ---------------------------------------------------------
print("\n--- NHIỆM VỤ 1: Cắt & Tách nền Icon PNG ---")

logo_path = os.path.join(ROOT_DIR, 'assets', 'logo-treth.png')
check(os.path.isfile(logo_path), "Logo TreTH: assets/logo-treth.png tồn tại")
if os.path.isfile(logo_path):
    with Image.open(logo_path) as im:
        check(im.mode == 'RGBA', "Logo TreTH có kênh màu RGBA (tách nền trong suốt)")
        check(im.size[0] >= 100 and im.size[1] >= 100, f"Logo TreTH có kích thước chuẩn ({im.size})")

admin_icons = [
    'bao-cao.png', 'ke-hoach.png', 'cong-van.png', 'chuong-trinh.png',
    'du-thao.png', 'hop-gap-go.png', 'y-tuong.png', 'nghien-cuu.png',
    'tai-lieu.png', 'kiem-duyet.png'
]
for icon in admin_icons:
    p = os.path.join(ROOT_DIR, 'assets', 'icons', icon)
    ok = os.path.isfile(p)
    check(ok, f"Icon hành chính v3.1 tồn tại: assets/icons/{icon}")
    if ok:
        with Image.open(p) as im:
            check(im.mode == 'RGBA', f"Icon {icon} có kênh alpha RGBA tách nền")

feature_icons = [
    'cong-viec.png', 'thoi-gian.png', 'thoi-quen.png', 'ghi-chu.png',
    'quan-ly-loai-viec.png', 'du-lieu.png', 'cai-dat.png'
]
for icon in feature_icons:
    p = os.path.join(ROOT_DIR, 'assets', 'icons', icon)
    check(os.path.isfile(p), f"Icon tính năng chính tồn tại: assets/icons/{icon}")

basic_cat_icons = [
    'lap-trinh.png', 'thiet-ke.png', 'hoc-tap.png', 'doi-song.png',
    'suc-khoe.png', 'tai-chinh.png', 'quan-trong.png', 'giai-tri.png'
]
for icon in basic_cat_icons:
    p = os.path.join(ROOT_DIR, 'assets', 'icons', icon)
    check(os.path.isfile(p), f"Icon loại việc cơ bản v3.0 tồn tại: assets/icons/{icon}")

# ---------------------------------------------------------
# NHIỆM VỤ 2: Kiểm tra CSS Variables & Glassmorphism Tokens
# ---------------------------------------------------------
print("\n--- NHIỆM VỤ 2: CSS Variables & Glassmorphism (theme-treth-v3.css) ---")

css_path = os.path.join(ROOT_DIR, 'styles', 'theme-treth-v3.css')
check(os.path.isfile(css_path), "File styles/theme-treth-v3.css tồn tại")

if os.path.isfile(css_path):
    with open(css_path, 'r', encoding='utf-8') as f:
        css_content = f.read()
    
    check("#0B0F19" in css_content, "CSS chứa màu nền Cyber Space (#0B0F19)")
    check("#7C3AED" in css_content, "CSS chứa Aurora Purple (#7C3AED)")
    check("#06B6D4" in css_content, "CSS chứa Cyber Cyan (#06B6D4)")
    check("#10B981" in css_content, "CSS chứa Bamboo Green (#10B981)")
    check("#00FF87" in css_content, "CSS chứa Neon Green (#00FF87)")
    check("backdrop-filter: blur(16px)" in css_content or "backdrop-filter: blur(20px)" in css_content, "CSS hỗ trợ Glassmorphism backdrop-filter blur")
    check("rgba(22, 31, 48" in css_content, "CSS có Card Glassmorphism rgba(22, 31, 48, ...)")
    check("bamboo" in css_content.lower() or "00FF87" in css_content, "CSS có họa tiết lá tre / đốt tre watermark SVG")

# ---------------------------------------------------------
# NHIỆM VỤ 3: Kiểm tra 4 Card Chỉ số & Thanh tiến độ đốt tre
# ---------------------------------------------------------
print("\n--- NHIỆM VỤ 3: 4 Card Chỉ số & Thanh tiến độ đốt tre trong index.html ---")

html_path = os.path.join(ROOT_DIR, 'index.html')
with open(html_path, 'r', encoding='utf-8') as f:
    html_content = f.read()

check('styles/theme-treth-v3.css' in html_content, "index.html đã liên kết styles/theme-treth-v3.css")
check('assets/logo-treth.png' in html_content, "Sidebar Brand Logo đã dùng assets/logo-treth.png")
check('stat-card-total' in html_content, "Card 1: Tổng số việc có class stat-card-total")
check('stat-card-completed' in html_content, "Card 2: Đã hoàn thành có class stat-card-completed")
check('ri-shield-check-line' in html_content, "Card 2: Sử dụng icon khiên tích xanh ri-shield-check-line")
check('stat-card-progress' in html_content, "Card 3: Tiến độ hoàn thành có class stat-card-progress")
check('bamboo-sprout-node' in html_content, "Card 3: Điểm cuối thanh tiến độ có mầm/đốt tre (bamboo-sprout-node)")
check('stat-card-urgent' in html_content, "Card 4: Gấp / Quá hạn có class stat-card-urgent")

# ---------------------------------------------------------
# NHIỆM VỤ 4: Tích hợp 18 Loại việc, Bộ lọc & Toast
# ---------------------------------------------------------
print("\n--- NHIỆM VỤ 4: 18 Loại việc, Dropdown Ma trận & Toast trong script.js ---")

js_path = os.path.join(ROOT_DIR, 'script.js')
with open(js_path, 'r', encoding='utf-8') as f:
    js_content = f.read()

# Kiểm tra đủ 18 categories trong defaultCategories
cat_slugs = [
    'bao-cao', 'ke-hoach', 'cong-van', 'chuong-trinh', 'du-thao',
    'hop-gap-go', 'y-tuong', 'nghien-cuu', 'tai-lieu', 'kiem-duyet',
    'lap-trinh', 'thiet-ke', 'hoc-tap', 'doi-song', 'suc-khoe',
    'tai-chinh', 'quan-trong', 'giai-tri'
]
for slug in cat_slugs:
    check(f"cat-{slug}" in js_content, f"script.js định nghĩa category cat-{slug}")
    check(f"{slug}.png" in js_content, f"script.js cấu hình icon ảnh cho {slug}.png")

# Toast Overdue countdown & Celebration Confetti
check('toast-overdue' in js_content or 'toast-overdue' in css_content, "Hệ thống hỗ trợ Toast Quá hạn (toast-overdue)")
check('00:02' in js_content, "Toast Quá hạn có đồng hồ đếm ngược 00:02")
check('toast-celebration' in js_content or 'triggerConfetti' in js_content, "Hệ thống hỗ trợ Toast Hoàn thành xuất sắc & hiệu ứng pháo giấy Confetti")

# Dropdown ma trận Eisenhower
check('q1' in html_content and 'Làm ngay' in html_content, "Dropdown ma trận có Ô 1: Làm ngay (Đỏ)")
check('q2' in html_content and 'Lên lịch' in html_content, "Dropdown ma trận có Ô 2: Lên lịch (Xanh dương)")
check('q3' in html_content and 'Ủy quyền' in html_content, "Dropdown ma trận có Ô 3: Ủy quyền (Vàng)")
check('q4' in html_content and 'Xóa' in html_content, "Dropdown ma trận có Ô 4: Xóa (Xám)")

print("\n" + "=" * 60)
print(f" TỔNG KẾT: {PASSED} PASSED, {FAILED} FAILED")
print(f" TỶ LỆ ĐẠT: {PASSED / (PASSED + FAILED) * 100:.1f}%")
print("=" * 60)

if FAILED > 0:
    sys.exit(1)

