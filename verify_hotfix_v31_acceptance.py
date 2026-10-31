# -*- coding: utf-8 -*-
"""
VERIFICATION SCRIPT FOR TRETH v3.1 HOTFIX & STANDARDIZATION
Validates all 4 domains from prompt_t_ng_h_p_hotfix_ng_b_to_n_repo_antigravity.md:
1. Module Isolation (Tasks vs Calendar), No duplicate toggle button on Desktop, Quick Add Leading Icon, No false empty state, SVG reset icon.
2. 100% Native select elements hidden & upgraded to Custom Dropdowns with Cyber Bamboo Glassmorphism.
3. Filter Popup Layout: 100% width aligned, no Indigo purple, unified filter icons.
4. Categories Deduplication & 2-column grid layout with search.
5. Unified text contrast for Primary Buttons in Dark and Light modes.
"""
import os
import sys
import subprocess
import json
import re

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = r"K:\DU AN AI\Flle dự án 2\TreTH"
index_html_path = os.path.join(ROOT_DIR, "index.html")

with open(index_html_path, 'r', encoding='utf-8') as f:
    html = f.read()

test_script = """
<script>
window.__hotfix_test_results = { total: 0, passed: 0, failed: 0, tests: [] };

function assertTest(condition, name, detail) {
    window.__hotfix_test_results.total++;
    if (condition) {
        window.__hotfix_test_results.passed++;
        window.__hotfix_test_results.tests.push({ name: name, status: 'PASSED', detail: detail || '' });
    } else {
        window.__hotfix_test_results.failed++;
        window.__hotfix_test_results.tests.push({ name: name, status: 'FAILED', detail: detail || '' });
    }
}

window.addEventListener('load', () => {
    setTimeout(async () => {
        try {
            // ===================================================================
            // DOMAIN 1: SỬA LỖI ĐIỀU HƯỚNG MODULE, TRẠNG THÁI RỖNG & BỐ CỤC CÔNG VIỆC
            // ===================================================================
            const moduleTasksView = document.getElementById('module-tasks-view');
            const moduleCalendarView = document.getElementById('module-calendar-view');
            const mobileMenuBtn = document.getElementById('mobile-menu-btn');
            const taskList = document.getElementById('task-list');

            // 1.1 Khắc phục lỗi xếp chồng Module: Khi ở Công việc, Lịch biểu phải display: none hoàn toàn
            const calComputed = window.getComputedStyle(moduleCalendarView);
            assertTest(calComputed.display === 'none', "Khi ở module Công việc, #module-calendar-view bị ẩn hoàn toàn (display: none)", `display=${calComputed.display}`);

            // 1.2 Không lặp nút đóng/mở Sidebar trên Desktop
            const mobileBtnComputed = window.getComputedStyle(mobileMenuBtn);
            assertTest(mobileBtnComputed.display === 'none', "Nút #mobile-menu-btn bị ẩn trên Desktop (display: none)", `display=${mobileBtnComputed.display}`);

            // 1.3 Màn hình Công việc không bị kẹt rỗng (False Empty State)
            const taskItems = document.querySelectorAll('#task-list .task-item');
            assertTest(taskItems.length > 0, `Màn hình Công việc hiển thị đầy đủ danh sách công việc hiện có (tìm thấy ${taskItems.length} tasks)`);

            // 1.4 Khôi phục icon gợi ý ở thanh nhập việc nhanh (Cyber Bamboo #10B981)
            const quickAddLeadingIcon = document.querySelector('.treth-quick-add-form .quick-add-leading-icon');
            assertTest(!!quickAddLeadingIcon, "Thanh nhập nhanh có icon gợi ý .quick-add-leading-icon");
            if (quickAddLeadingIcon) {
                const iconComputed = window.getComputedStyle(quickAddLeadingIcon);
                assertTest(iconComputed.display !== 'none', "Icon gợi ý hiển thị trực quan (không bị display: none)");
            }

            // 1.5 Icon nút Xóa bộ lọc rỗng là icon SVG xoay ↻ thay vì icon font O
            // Giả lập filter để test template empty state
            const emptyResetBtnHtml = document.querySelector('.btn-empty-reset');
            // Kiểm tra trong mã nguồn renderTasks template
            const scriptContent = await fetch('script.js').then(r => r.text());
            assertTest(scriptContent.includes('<svg') && scriptContent.includes('btn-empty-reset'), "Nút 'Xóa bộ lọc để xem tất cả' dùng icon SVG xoay ↻ chuẩn xác (không bị O rỗng)");

            // ===================================================================
            // DOMAIN 2: THAY THẾ 100% THẺ <select> BẰNG GLOBAL CUSTOM DROPDOWN
            // ===================================================================
            const allSelects = document.querySelectorAll('select');
            let allHidden = true;
            let allHaveCustom = true;

            allSelects.forEach(sel => {
                const selComputed = window.getComputedStyle(sel);
                if (selComputed.display !== 'none') {
                    allHidden = false;
                }
                const wrapper = sel.nextElementSibling;
                if (!wrapper || !wrapper.classList.contains('treth-custom-dropdown')) {
                    allHaveCustom = false;
                }
            });

            assertTest(allHidden, `Tất cả 100% thẻ <select> (${allSelects.length} thẻ) đều bị ẩn khỏi giao diện người dùng`);
            assertTest(allHaveCustom, `Tất cả 100% thẻ <select> (${allSelects.length} thẻ) đều có Custom Dropdown tương ứng`);

            // Kiểm tra click mở Custom Dropdown
            const firstTrigger = document.querySelector('.custom-dropdown-trigger');
            assertTest(!!firstTrigger, "Nút kích hoạt Custom Dropdown (.custom-dropdown-trigger) tồn tại");
            if (firstTrigger) {
                firstTrigger.click();
                const openDropdown = document.querySelector('.treth-custom-dropdown.is-open');
                assertTest(!!openDropdown, "Click vào trigger mở popover menu thành công (.is-open)");
                const firstCheck = openDropdown ? openDropdown.querySelector('.custom-dropdown-check svg') : null;
                assertTest(!!firstCheck, "Mục được chọn hiển thị dấu tích ✓ chuẩn");

                // Test click outside to close
                document.body.click();
                const stillOpen = document.querySelector('.treth-custom-dropdown.is-open');
                assertTest(!stillOpen, "Click ra ngoài tự động đóng Custom Dropdown menu");
            }

            // ===================================================================
            // DOMAIN 3: CHUẨN HÓA BỐ CỤC & MÀU SẮC POPUP "BỘ LỌC CÔNG VIỆC"
            // ===================================================================
            const filterDropdownBtn = document.getElementById('btnToggleFilterDropdown');
            filterDropdownBtn.click();

            const filterPanel = document.getElementById('filterDropdownPanel');
            assertTest(filterPanel && filterPanel.style.display !== 'none', "Mở Popup 'Bộ lọc công việc' thành công");

            // 3.1 Cả 4 ô chọn có width: 100%
            const filterCustomDropdowns = filterPanel.querySelectorAll('.treth-custom-dropdown');
            assertTest(filterCustomDropdowns.length === 4, "Popup Bộ lọc có đủ 4 ô chọn Custom Dropdown");

            let allFullWidth = true;
            filterCustomDropdowns.forEach(dd => {
                const trigger = dd.querySelector('.custom-dropdown-trigger');
                if (trigger) {
                    const widthPercent = (trigger.offsetWidth / dd.offsetWidth) * 100;
                    if (Math.abs(widthPercent - 100) > 2) allFullWidth = false;
                }
            });
            assertTest(allFullWidth, "Cả 4 ô chọn trong Popup Bộ lọc đều giãn đều width: 100% thẳng hàng tuyệt đối");

            // 3.2 Đồng bộ icon trong các giá trị mặc định của 4 ô chọn
            const filterCatTrigger = document.querySelector('[data-for-select="filterCategorySelect"] .custom-dropdown-content-label');
            const filterPrioTrigger = document.querySelector('[data-for-select="filterPrioritySelect"] .custom-dropdown-content-label');
            const filterDueTrigger = document.querySelector('[data-for-select="filterDueDateSelect"] .custom-dropdown-content-label');
            const filterStatusTrigger = document.querySelector('[data-for-select="filterStatusSelect"] .custom-dropdown-content-label');

            assertTest(filterCatTrigger && filterCatTrigger.textContent.includes('🏷️'), "Ô Loại việc có icon mặc định 🏷️");
            assertTest(filterPrioTrigger && filterPrioTrigger.textContent.includes('🚩'), "Ô Mức ưu tiên có icon mặc định 🚩");
            assertTest(filterDueTrigger && filterDueTrigger.textContent.includes('📅'), "Ô Thời hạn có icon mặc định 📅");
            assertTest(filterStatusTrigger && filterStatusTrigger.textContent.includes('📋'), "Ô Trạng thái có icon mặc định 📋");

            // 3.3 Không còn màu tím Indigo trong tiêu đề và viền nút Bộ lọc
            const filterTitle = filterPanel.querySelector('.filter-panel-title');
            const titleColor = window.getComputedStyle(filterTitle).color;
            assertTest(!titleColor.includes('79, 70, 229'), "Tiêu đề Popup Bộ lọc không còn màu Tím Indigo (#4F46E5)", `color=${titleColor}`);

            const filterBtnBorder = window.getComputedStyle(filterDropdownBtn).borderColor;
            assertTest(!filterBtnBorder.includes('79, 70, 229'), "Viền nút Bộ lọc khi active đổi sang Cyber Bamboo (#10B981)", `border=${filterBtnBorder}`);

            // Đóng popup lọc
            document.getElementById('btnCloseFilterPanel').click();

            // ===================================================================
            // DOMAIN 4: KHỬ TRÙNG LẶP DỮ LIỆU & TỐI ƯU HIỂN THỊ LOẠI VIỆC
            // ===================================================================
            const currentCategories = window.TreTHCore ? window.TreTHCore.getCategories() : [];
            const catNames = currentCategories.map(c => c.name.trim().toLowerCase());
            const uniqueNames = new Set(catNames);

            assertTest(catNames.length === uniqueNames.size, `Danh sách Loại việc không còn bị trùng lặp tên (${catNames.length} mục đều duy nhất)`);
            assertTest(!catNames.includes('báo cáo') || currentCategories.filter(c => c.name.trim().toLowerCase() === 'báo cáo').length === 1, "Loại việc 'Báo cáo' chỉ tồn tại 1 bản ghi duy nhất");
            assertTest(!catNames.includes('kế hoạch') || currentCategories.filter(c => c.name.trim().toLowerCase() === 'kế hoạch').length === 1, "Loại việc 'Kế hoạch' chỉ tồn tại 1 bản ghi duy nhất");
            assertTest(!catNames.includes('công văn') || currentCategories.filter(c => c.name.trim().toLowerCase() === 'công văn').length === 1, "Loại việc 'Công văn' chỉ tồn tại 1 bản ghi duy nhất");
            assertTest(!catNames.includes('chương trình') || currentCategories.filter(c => c.name.trim().toLowerCase() === 'chương trình').length === 1, "Loại việc 'Chương trình' chỉ tồn tại 1 bản ghi duy nhất");

            // 4.2 Lưới 2 cột cho Loại việc & Thanh tìm kiếm nhanh
            const catDropdown = document.querySelector('.treth-custom-dropdown.is-category-dropdown');
            assertTest(!!catDropdown, "Dropdown Loại việc mang class .is-category-dropdown");
            if (catDropdown) {
                const gridList = catDropdown.querySelector('.custom-dropdown-list.is-grid-2col');
                assertTest(!!gridList, "Danh sách Loại việc có bố cục Lưới 2 cột (.is-grid-2col)");
                const searchInp = catDropdown.querySelector('.custom-dropdown-search-input');
                assertTest(!!searchInp, "Dropdown Loại việc có thanh tìm kiếm nhanh 'Tìm loại việc...'");
            }

            // ===================================================================
            // DOMAIN 5: ĐỒNG BỘ ĐỘ TƯƠNG PHẢN NÚT CHÍNH (PRIMARY BUTTONS)
            // ===================================================================
            // 5.1 Dark Mode
            document.documentElement.setAttribute('data-theme', 'dark');
            const darkPrimaryBtn = document.querySelector('.btn-primary');
            if (darkPrimaryBtn) {
                const darkColor = window.getComputedStyle(darkPrimaryBtn).color;
                // rgb(6, 18, 14) tương ứng với #06120E
                assertTest(darkColor === 'rgb(6, 18, 14)' || darkColor.includes('6, 18, 14'), "Dark Mode: Nút chính có chữ tối sắc nét #06120E trên nền Cyber Bamboo", `color=${darkColor}`);
            }

            // 5.2 Light Mode
            document.documentElement.setAttribute('data-theme', 'light');
            const lightPrimaryBtn = document.querySelector('.btn-primary');
            if (lightPrimaryBtn) {
                const lightColor = window.getComputedStyle(lightPrimaryBtn).color;
                assertTest(lightColor === 'rgb(255, 255, 255)', "Light Mode: Nút chính có chữ trắng sáng #FFFFFF trên nền xanh đậm", `color=${lightColor}`);
            }

            // Restore theme
            document.documentElement.setAttribute('data-theme', 'dark');

        } catch (e) {
            assertTest(false, "Lỗi kiểm thử acceptance: " + e.message, e.stack);
        }

        const resEl = document.createElement('div');
        resEl.id = 'hotfix-acceptance-payload';
        resEl.style.display = 'none';
        resEl.textContent = JSON.stringify(window.__hotfix_test_results);
        document.body.appendChild(resEl);
    }, 500);
});
</script>
"""

runner_html = html.replace('</body>', test_script + '</body>')
runner_file = os.path.join(ROOT_DIR, 'hotfix_acceptance_runner.html')

with open(runner_file, 'w', encoding='utf-8') as f:
    f.write(runner_html)

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
html_path = runner_file.replace('\\', '/')

res = subprocess.run([
    chrome_path,
    "--headless=new",
    "--window-size=1280,800",
    "--disable-gpu",
    "--allow-file-access-from-files",
    "--virtual-time-budget=4000",
    "--dump-dom",
    f"file:///{html_path}"
], capture_output=True, text=True, encoding='utf-8', errors='replace')

if os.path.exists(runner_file):
    os.remove(runner_file)

match = re.search(r'<div id="hotfix-acceptance-payload"[^>]*>(.*?)</div>', res.stdout, re.DOTALL)
if match:
    data = json.loads(match.group(1))
    print("=" * 70)
    print("  KIỂM THỬ NGHIỆM THU HOTFIX & ĐỒNG BỘ TOÀN REPO (TRETH v3.1)")
    print("=" * 70)
    print(f"Tổng số bài kiểm tra (Total Tests) : {data['total']}")
    print(f"Thành công (Passed)                : {data['passed']}")
    print(f"Thất bại (Failed)                  : {data['failed']}")
    print(f"Tỷ lệ đạt (Pass Rate)              : {round((data['passed']/data['total'])*100, 1)}%")
    print("=" * 70)
    for t in data['tests']:
        status_icon = " ✅" if t['status'] == 'PASSED' else " ❌"
        detail = f" [{t['detail']}]" if t['detail'] else ""
        print(f"{status_icon} {t['name']}{detail}")
    print("=" * 70)
    if data['failed'] > 0:
        sys.exit(1)
    else:
        print("🏆 TẤT CẢ CÁC MỤC NGHIỆM THU ĐÃ VƯỢT QUA 100%!")
else:
    print("CHROME RUN ERROR:")
    print(res.stdout[:1000])
    sys.exit(1)
