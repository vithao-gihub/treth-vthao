# -*- coding: utf-8 -*-
"""
VERIFICATION SCRIPT: TreTH Display Systems, Empty State, & Smart List Removal
"""
import os
import sys
import subprocess
import json
import re

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = r"K:\DU AN AI\Flle dự án 2\TreTH"
index_html_path = os.path.join(ROOT_DIR, "index.html")

with open(index_html_path, 'r', encoding='utf-8') as f:
    html = f.read()

test_script = """
<script>
window.__display_test_results = { total: 0, passed: 0, failed: 0, tests: [] };

function assertTest(condition, name, detail) {
    window.__display_test_results.total++;
    if (condition) {
        window.__display_test_results.passed++;
        window.__display_test_results.tests.push({ name: name, status: 'PASSED', detail: detail || '' });
    } else {
        window.__display_test_results.failed++;
        window.__display_test_results.tests.push({ name: name, status: 'FAILED', detail: detail || '' });
    }
}

window.addEventListener('load', () => {
    setTimeout(async () => {
        try {
            // -------------------------------------------------------------
            // 1. KIỂM TRA ĐÃ XÓA TÍNH NĂNG "DANH SÁCH THÔNG MINH"
            // -------------------------------------------------------------
            const smartListsEl = document.getElementById('treth-smart-lists');
            assertTest(!smartListsEl, "Phần tử #treth-smart-lists đã bị xóa hoàn toàn khỏi DOM");

            const smartItems = document.querySelectorAll('.smart-list-item');
            assertTest(smartItems.length === 0, "Không còn bất kỳ .smart-list-item nào trong giao diện", `count=${smartItems.length}`);

            // -------------------------------------------------------------
            // 2. KIỂM TRA BẢNG BỘ LỌC (FILTER POPOVER) KHÔNG BỊ ĐÈ BỞI DÒNG THÊM VIỆC
            // -------------------------------------------------------------
            const filterDropdown = document.getElementById('filterDropdownPanel');
            assertTest(!!filterDropdown, "Bảng bộ lọc (#filterDropdownPanel) tồn tại");
            if (filterDropdown) {
                const fdStyle = window.getComputedStyle(filterDropdown);
                assertTest(fdStyle.position === 'absolute' || fdStyle.position === 'fixed', "Bảng bộ lọc có position absolute/fixed độc lập", `position=${fdStyle.position}`);
                assertTest(parseInt(fdStyle.zIndex, 10) >= 1050, "Bảng bộ lọc có z-index >= 1050 (nổi lên trên thanh thêm việc)", `zIndex=${fdStyle.zIndex}`);
            }

            const quickAdd = document.querySelector('.treth-quick-add-section');
            assertTest(!!quickAdd, "Thanh thêm việc (.treth-quick-add-section) tồn tại");
            if (quickAdd) {
                const qaStyle = window.getComputedStyle(quickAdd);
                const qaZ = parseInt(qaStyle.zIndex, 10) || 0;
                assertTest(qaZ < 1050, "Thanh thêm việc có z-index thấp hơn bảng bộ lọc để không đè lên popover", `zIndex=${qaZ}`);
            }

            // -------------------------------------------------------------
            // 3. KIỂM TRA DẢI FILTER CHIPS KHI KHÔNG CÓ BỘ LỌC
            // -------------------------------------------------------------
            const chipsBar = document.getElementById('activeFiltersDashboardBar');
            if (chipsBar) {
                const barStyle = window.getComputedStyle(chipsBar);
                assertTest(barStyle.display === 'none', "Khi không có bộ lọc kích hoạt, dải Filter Chips ẩn hoàn toàn không tạo khoảng trống thừa", `display=${barStyle.display}`);
            }

            // -------------------------------------------------------------
            // 4. KIỂM TRA EMPTY STATE: HOÀN THÀNH TẤT CẢ CÔNG VIỆC
            // -------------------------------------------------------------
            // Mô phỏng: user có 2 công việc và đã tick hoàn thành cả 2
            const testTasks = [
                { id: 'test-1', title: 'Công việc test 1', status: 'completed', isDeleted: false, categoryId: 'none', priority: 'medium', quadrant: 'q1', createdAt: Date.now() },
                { id: 'test-2', title: 'Công việc test 2', status: 'completed', isDeleted: false, categoryId: 'none', priority: 'low', quadrant: 'q2', createdAt: Date.now() }
            ];

            if (typeof window.__setTasks === 'function') {
                window.__setTasks(testTasks);
            }
            if (typeof window.__resetAllAppFilters === 'function') {
                window.__resetAllAppFilters();
            }

            // Kích hoạt re-render
            const taskListEl = document.getElementById('task-list');
            assertTest(!!taskListEl, "Danh sách task (#task-list) tồn tại");

            // Kiểm tra nội dung empty state khi hoàn thành tất cả
            const emptyCompleted = taskListEl.querySelector('.is-all-completed');
            assertTest(!!emptyCompleted, "Hiển thị đúng trạng thái hoàn thành tất cả (.is-all-completed)");

            const emptyTitle = taskListEl.querySelector('.empty-title');
            const hasSuccessMessage = emptyTitle && emptyTitle.textContent.includes('Tuyệt vời! Bạn đã hoàn thành tất cả công việc');
            assertTest(hasSuccessMessage, "Tiêu đề mang thông điệp tích cực hoàn thành tất cả công việc", emptyTitle ? emptyTitle.textContent : 'none');

            const hasFalseFilterMsg = emptyTitle && emptyTitle.textContent.includes('Không tìm thấy công việc phù hợp');
            assertTest(!hasFalseFilterMsg, "KHÔNG hiển thị thông báo lỗi bộ lọc khi hoàn thành công việc");

            const checkmarkIcon = taskListEl.querySelector('.empty-icon-wrapper.is-success i.ri-checkbox-circle-fill');
            assertTest(!!checkmarkIcon, "Hiển thị biểu tượng huy hiệu / tích xanh hoàn thành xuất sắc");

            // -------------------------------------------------------------
            // 5. KIỂM TRA EMPTY STATE: KHI LỌC KHÔNG KHỚP
            // -------------------------------------------------------------
            const filterKeywordInput = document.getElementById('filterKeywordInput');
            if (filterKeywordInput) {
                filterKeywordInput.value = 'từ khóa không tồn tại xyz123';
                filterKeywordInput.dispatchEvent(new Event('input'));
                await new Promise(r => setTimeout(r, 350));

                const filterEmpty = taskListEl.querySelector('.empty-icon-wrapper.is-filter');
                assertTest(!!filterEmpty, "Khi có bộ lọc không khớp, hiển thị đúng empty state của bộ lọc (.is-filter)");
                
                // Reset lại
                if (typeof window.__resetAllAppFilters === 'function') {
                    window.__resetAllAppFilters();
                }
            }

        } catch (e) {
            assertTest(false, "Lỗi kiểm thử: " + e.message, e.stack);
        }

        setTimeout(() => {
            const resEl = document.createElement('div');
            resEl.id = 'display-test-payload';
            resEl.style.display = 'none';
            resEl.textContent = JSON.stringify(window.__display_test_results);
            document.body.appendChild(resEl);
        }, 300);
    }, 500);
});
</script>
"""

runner_html = html.replace('</body>', test_script + '</body>')
runner_file = os.path.join(ROOT_DIR, 'display_test_runner.html')

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
    "--virtual-time-budget=6000",
    "--dump-dom",
    f"file:///{html_path}"
], capture_output=True, text=True, encoding='utf-8', errors='replace')

if os.path.exists(runner_file):
    os.remove(runner_file)

match = re.search(r'<div id="display-test-payload"[^>]*>(.*?)</div>', res.stdout, re.DOTALL)
if match:
    data = json.loads(match.group(1))
    print("=" * 70)
    print("  KẾT QUẢ KIỂM THỬ HỆ THỐNG HIỂN THỊ, EMPTY STATE & BỎ SMART LISTS")
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
        print("🎉 TẤT CẢ CÁC BÀI KIỂM THỬ ĐÃ VƯỢT QUA 100%!")
else:
    print("CHROME RUN ERROR:")
    print(res.stdout[:1000])
    sys.exit(1)
