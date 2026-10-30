#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TreTH v3.0 / v3.1 Asset Cropping & Background Extraction Script
Tự động cắt và tách nền các asset từ 3 file ảnh thiết kế:
- assets/raw/sheet-v3.0-base.png
- assets/raw/sheet-v3.1-icons.png
- assets/raw/sheet-v3.0-cyber-natural.png
"""

import os
import sys
import cv2
import numpy as np
from PIL import Image

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def remove_dark_background(bgr_img, bg_thresh_low=20, bg_thresh_high=75):
    """
    Tách nền tối bằng thuật toán Alpha matting mượt mà (smooth edge preserving)
    """
    img_rgb = bgr_img[:, :, :3]
    h, w, c = img_rgb.shape
    # Ước lượng màu nền từ 4 góc ảnh
    corners = np.concatenate([
        img_rgb[:12, :12],
        img_rgb[:12, -12:],
        img_rgb[-12:, :12],
        img_rgb[-12:, -12:]
    ]).reshape(-1, 3)
    bg_color = np.median(corners, axis=0)

    # Tính khoảng cách Euclidean màu
    diff = np.linalg.norm(img_rgb.astype(np.float32) - bg_color, axis=2)

    # Tính độ trong suốt Alpha từ 0 đến 255
    alpha = np.clip((diff - bg_thresh_low) / (bg_thresh_high - bg_thresh_low) * 255.0, 0, 255).astype(np.uint8)

    # Gộp kênh RGBA
    rgba = cv2.cvtColor(img_rgb, cv2.COLOR_BGR2BGRA)
    rgba[:, :, 3] = alpha
    return rgba

def trim_transparent_borders(rgba_img, padding=6):
    """
    Cắt gọn các viền trong suốt xung quanh ảnh
    """
    alpha = rgba_img[:, :, 3]
    ys, xs = np.where(alpha > 15)
    if len(xs) == 0 or len(ys) == 0:
        return rgba_img
    
    x1 = max(0, xs.min() - padding)
    x2 = min(rgba_img.shape[1], xs.max() + padding + 1)
    y1 = max(0, ys.min() - padding)
    y2 = min(rgba_img.shape[0], ys.max() + padding + 1)
    
    return rgba_img[y1:y2, x1:x2]

def make_square_with_padding(rgba_img, target_size=256):
    """
    Đưa ảnh về tỷ lệ vuông đồng nhất với padding đều
    """
    h, w, _ = rgba_img.shape
    max_dim = max(h, w)
    
    # Tạo canvas vuông trong suốt
    square = np.zeros((max_dim, max_dim, 4), dtype=np.uint8)
    ox = (max_dim - w) // 2
    oy = (max_dim - h) // 2
    square[oy:oy+h, ox:ox+w] = rgba_img
    
    # Resize mịn nếu cần
    if target_size and max_dim != target_size:
        square = cv2.resize(square, (target_size, target_size), interpolation=cv2.INTER_AREA)
    return square

def main():
    icons_dir = os.path.join('assets', 'icons')
    os.makedirs(icons_dir, exist_ok=True)
    os.makedirs('assets', exist_ok=True)

    print("🚀 Bắt đầu quá trình Crop và tách nền Asset TreTH v3.0 / v3.1...")

    # =========================================================================
    # 1. CẮT LOGO TRETH TỪ sheet-v3.0-base.png
    # =========================================================================
    base_path = os.path.join('assets', 'raw', 'sheet-v3.0-base.png')
    base_img = cv2.imread(base_path, cv2.IMREAD_UNCHANGED)
    if base_img is None:
        raise FileNotFoundError(f"Không tìm thấy file: {base_path}")

    print(f"Đọc {base_path}: {base_img.shape[1]}x{base_img.shape[0]}")

    # Logo nằm ở x=190..345, y=370..580
    logo_raw = base_img[370:580, 190:345]
    logo_rgba = remove_dark_background(logo_raw, bg_thresh_low=18, bg_thresh_high=65)
    logo_trimmed = trim_transparent_borders(logo_rgba, padding=4)
    logo_square = make_square_with_padding(logo_trimmed, target_size=256)
    
    logo_out_path = os.path.join('assets', 'logo-treth.png')
    cv2.imwrite(logo_out_path, logo_square)
    cv2.imwrite(os.path.join(icons_dir, 'logo-treth.png'), logo_square)
    print(f"  ✅ Đã lưu Logo: {logo_out_path} ({logo_square.shape[1]}x{logo_square.shape[0]})")

    # =========================================================================
    # 2. CẮT 10 ICON HÀNH CHÍNH MỞ RỘNG TỪ sheet-v3.1-icons.png (5 cột x 2 hàng)
    # =========================================================================
    v31_path = os.path.join('assets', 'raw', 'sheet-v3.1-icons.png')
    v31_img = cv2.imread(v31_path, cv2.IMREAD_UNCHANGED)
    if v31_img is None:
        raise FileNotFoundError(f"Không tìm thấy file: {v31_path}")

    print(f"Đọc {v31_path}: {v31_img.shape[1]}x{v31_img.shape[0]}")

    cols_x = [68, 602, 1135, 1668, 2202]
    rows_y = [321, 922]
    card_w = 482
    card_h = 549

    slugs_grid = [
        ['bao-cao', 'ke-hoach', 'cong-van', 'chuong-trinh', 'du-thao'],
        ['hop-gap-go', 'y-tuong', 'nghien-cuu', 'tai-lieu', 'kiem-duyet']
    ]

    for r_idx, y in enumerate(rows_y):
        for c_idx, x in enumerate(cols_x):
            slug = slugs_grid[r_idx][c_idx]
            card = v31_img[y:y+card_h, x:x+card_w]
            
            # Cắt phần đồ họa icon (phía trên phần chữ nhãn)
            icon_part = card[30:420, 45:437]
            icon_rgba = remove_dark_background(icon_part, bg_thresh_low=22, bg_thresh_high=75)
            icon_trimmed = trim_transparent_borders(icon_rgba, padding=6)
            icon_square = make_square_with_padding(icon_trimmed, target_size=256)

            out_file = os.path.join(icons_dir, f"{slug}.png")
            cv2.imwrite(out_file, icon_square)
            print(f"  ✅ Icon Hành chính [{r_idx+1},{c_idx+1}]: {out_file}")

    # =========================================================================
    # 3. CẮT 7 ICON TÍNH NĂNG CHÍNH TỪ sheet-v3.0-base.png
    # =========================================================================
    # Danh sách 7 tính năng chính
    feature_slugs = [
        'cong-viec',
        'thoi-gian',
        'thoi-quen',
        'ghi-chu',
        'quan-ly-loai-viec',
        'du-lieu',
        'cai-dat'
    ]
    feature_centers_x = [180, 445, 710, 970, 1235, 1500, 1750]
    feature_center_y = 855

    for slug, cx in zip(feature_slugs, feature_centers_x):
        raw_feat = base_img[feature_center_y-95:feature_center_y+95, cx-95:cx+95]
        feat_rgba = remove_dark_background(raw_feat, bg_thresh_low=20, bg_thresh_high=65)
        feat_trimmed = trim_transparent_borders(feat_rgba, padding=4)
        feat_square = make_square_with_padding(feat_trimmed, target_size=192)

        out_file = os.path.join(icons_dir, f"{slug}.png")
        cv2.imwrite(out_file, feat_square)
        print(f"  ✅ Icon Tính năng: {out_file}")

    # =========================================================================
    # 4. CẮT 8 ICON LOẠI VIỆC CƠ BẢN TỪ sheet-v3.0-base.png
    # =========================================================================
    basic_cat_slugs = [
        'lap-trinh',
        'thiet-ke',
        'hoc-tap',
        'doi-song',
        'suc-khoe',
        'tai-chinh',
        'quan-trong',
        'giai-tri'
    ]
    cat_centers_x = [165, 405, 644, 883, 1130, 1364, 1609, 1855]
    cat_center_y = 1238

    for slug, cx in zip(basic_cat_slugs, cat_centers_x):
        raw_cat = base_img[cat_center_y-85:cat_center_y+85, cx-85:cx+85]
        cat_rgba = remove_dark_background(raw_cat, bg_thresh_low=20, bg_thresh_high=65)
        cat_trimmed = trim_transparent_borders(cat_rgba, padding=4)
        cat_square = make_square_with_padding(cat_trimmed, target_size=192)

        out_file = os.path.join(icons_dir, f"{slug}.png")
        cv2.imwrite(out_file, cat_square)
        print(f"  ✅ Icon Loại việc: {out_file}")

    print("\n🎉 Hoàn thành xuất sắc toàn bộ 26 asset (1 Logo + 10 Hành chính + 7 Tính năng + 8 Cá nhân) vào assets/icons/!")

if __name__ == '__main__':
    main()
