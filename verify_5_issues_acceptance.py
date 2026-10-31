# -*- coding: utf-8 -*-
"""
VERIFICATION & ACCEPTANCE TEST FOR 5 ISSUES
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
window.__5issues_test_results = { total: 0, passed: 0, failed: 0, tests: [] };

function assertTest(condition, name, detail) {
    window.__5issues_test_results.total++;
    if (condition) {
        window.__5issues_test_results.passed++;
        window.__5issues_test_results.tests.push({ name: name, status: 'PASSED', detail: detail || '' });
    } else {
        window.__5issues_test_results.failed++;
        window.__5issues_test_results.tests.push({ name: name, status: 'FAILED', detail: detail || '' });
    }
}

window.addEventListener('load', () => {
    setTimeout(async () => {
        try {
            const btnList = document.getElementById('btn-view-list');
            const btnMatrix = document.getElementById('btn-view-matrix');
            const btnKanban = document.getElementById('btn-view-kanban');
            const listContainer = document.getElementById('list-view-container');
            const matrixContainer = document.getElementById('matrix-view-container');
            const kanbanContainer = document.getElementById('kanban-view-container');
            const quickAdd = document.querySelector('.treth-quick-add-section');

            // ===================================================================
            // VẤN ĐỀ 1: SỬA LỖI CHỒNG CHÉO 3 CHẾ ĐỘ XEM & ĐỒNG BỘ TRẠNG THÁI ACTIVE
            // ===================================================================
            // Test 1.1: Chế độ Danh sách (List View)
            btnList.click();
            await new Promise(r => setTimeout(r, 100));

            assertTest(btnList.classList.contains('active'), "Nút Danh sách có class .active khi ở chế độ Danh sách");
            assertTest(!btnMatrix.classList.contains('active'), "Nút Ma trận KHÔNG có class .active khi ở Danh sách");
            assertTest(!btnKanban.classList.contains('active'), "Nút Kanban KHÔNG có class .active khi ở Danh sách");

            const listDisp = window.getComputedStyle(listContainer).display;
            const matrixDispInList = window.getComputedStyle(matrixContainer).display;
            const kanbanDispInList = window.getComputedStyle(kanbanContainer).display;
            const qaDispInList = window.getComputedStyle(quickAdd).display;

            assertTest(listDisp !== 'none', "Chế độ Danh sách: Danh sách công việc đang HIỂN THỊ", `display=${listDisp}`);
            assertTest(qaDispInList !== 'none', "Chế độ Danh sách: Thanh nhập việc nhanh đang HIỂN THỊ", `display=${qaDispInList}`);
            assertTest(matrixDispInList === 'none', "Chế độ Danh sách: Bảng Ma trận bị ẨN HOÀN TOÀN", `display=${matrixDispInList}`);
            assertTest(kanbanDispInList === 'none', "Chế độ Danh sách: Bảng Kanban bị ẨN HOÀN TOÀN", `display=${kanbanDispInList}`);

            // Test 1.2: Chuyển sang chế độ Ma trận (Matrix View)
            btnMatrix.click();
            await new Promise(r => setTimeout(r, 100));

            assertTest(btnMatrix.classList.contains('active'), "Nút Ma trận có class .active khi chuyển sang Ma trận");
            assertTest(!btnList.classList.contains('active'), "Nút Danh sách KHÔNG có class .active khi ở Ma trận");
            assertTest(!btnKanban.classList.contains('active'), "Nút Kanban KHÔNG có class .active khi ở Ma trận");

            const matrixDisp = window.getComputedStyle(matrixContainer).display;
            const listDispInMatrix = window.getComputedStyle(listContainer).display;
            const kanbanDispInMatrix = window.getComputedStyle(kanbanContainer).display;
            const qaDispInMatrix = window.getComputedStyle(quickAdd).display;

            assertTest(matrixDisp === 'grid', "Chế độ Ma trận: Bảng Ma trận HIỂN THỊ dạng Grid", `display=${matrixDisp}`);
            assertTest(qaDispInMatrix === 'none', "Chế độ Ma trận: Thanh nhập việc nhanh ở trên cùng bị ẨN (dùng ô riêng trong từng góc)", `display=${qaDispInMatrix}`);
            assertTest(listDispInMatrix === 'none', "Chế độ Ma trận: Khung Danh sách và empty state bị ẨN HOÀN TOÀN", `display=${listDispInMatrix}`);
            assertTest(kanbanDispInMatrix === 'none', "Chế độ Ma trận: Bảng Kanban bị ẨN HOÀN TOÀN", `display=${kanbanDispInMatrix}`);

            // Test 1.3: Chuyển sang chế độ Kanban (Kanban View)
            btnKanban.click();
            await new Promise(r => setTimeout(r, 100));

            assertTest(btnKanban.classList.contains('active'), "Nút Kanban có class .active khi chuyển sang Kanban");
            assertTest(!btnList.classList.contains('active'), "Nút Danh sách KHÔNG có class .active khi ở Kanban");
            assertTest(!btnMatrix.classList.contains('active'), "Nút Ma trận KHÔNG có class .active khi ở Kanban");

            const kanbanDisp = window.getComputedStyle(kanbanContainer).display;
            const listDispInKanban = window.getComputedStyle(listContainer).display;
            const matrixDispInKanban = window.getComputedStyle(matrixContainer).display;
            const qaDispInKanban = window.getComputedStyle(quickAdd).display;

            assertTest(kanbanDisp !== 'none', "Chế độ Kanban: Bảng Kanban 3 cột HIỂN THỊ", `display=${kanbanDisp}`);
            assertTest(qaDispInKanban === 'none', "Chế độ Kanban: Thanh nhập việc nhanh bị ẨN", `display=${qaDispInKanban}`);
            assertTest(listDispInKanban === 'none', "Chế độ Kanban: Khung Danh sách bị ẨN HOÀN TOÀN", `display=${listDispInKanban}`);
            assertTest(matrixDispInKanban === 'none', "Chế độ Kanban: Bảng Ma trận bị ẨN HOÀN TOÀN", `display=${matrixDispInKanban}`);

            // Trở về List View
            btnList.click();
            await new Promise(r => setTimeout(r, 100));

            // ===================================================================
            // VẤN ĐỀ 2: SỬA LỖI ĐÈ LỚP Z-INDEX BỘ LỌC CÔNG VIỆC
            // ===================================================================
            const btnFilterToggle = document.getElementById('btnToggleFilterDropdown');
            const filterDropdown = document.getElementById('filterDropdownPanel');
            const topbar = document.querySelector('.treth-topbar');

            assertTest(!!btnFilterToggle && !!filterDropdown, "Tìm thấy nút Bộ lọc và Bảng popup lọc");
            btnFilterToggle.click();
            await new Promise(r => setTimeout(r, 100));

            const topbarStyle = window.getComputedStyle(topbar);
            const topbarZ = parseInt(topbarStyle.zIndex, 10) || 0;
            const filterStyle = window.getComputedStyle(filterDropdown);
            const filterZ = parseInt(filterStyle.zIndex, 10) || 0;
            const quickAddZ = parseInt(window.getComputedStyle(quickAdd).zIndex, 10) || 0;

            assertTest(filterStyle.display === 'block', "Bảng popup Bộ lọc mở thành công (display: block)");
            assertTest(topbarZ >= 1000, "Thanh Topbar có z-index cao (>= 1000) bảo đảm stacking context", `zIndex=${topbarZ}`);
            assertTest(filterZ >= 1050, "Bảng popup Bộ lọc có z-index >= 1050", `zIndex=${filterZ}`);
            assertTest(filterZ > quickAddZ && topbarZ > quickAddZ, "Bảng Bộ lọc và Topbar nổi hoàn toàn lên trên thanh nhập việc nhanh (Top: " + topbarZ + " vs QuickAdd: " + quickAddZ + ")");

            // Đóng bộ lọc
            btnFilterToggle.click();

            // ===================================================================
            // VẤN ĐỀ 3: THU GỌN KHUNG THÔNG BÁO EMPTY STATE
            // ===================================================================
            const testCompletedTasks = [
                { id: 'c-1', title: 'Task xong 1', status: 'completed', isDeleted: false, categoryId: 'none', priority: 'low', quadrant: 'q1', createdAt: Date.now() }
            ];
            if (typeof window.__setTasks === 'function') {
                window.__setTasks(testCompletedTasks);
            }
            if (typeof window.__resetAllAppFilters === 'function') {
                window.__resetAllAppFilters();
            }
            await new Promise(r => setTimeout(r, 100));

            const emptyCard = document.querySelector('.empty-state-card');
            assertTest(!!emptyCard, "Tìm thấy thẻ Empty State khi hoàn thành hết việc");
            if (emptyCard) {
                const cardStyle = window.getComputedStyle(emptyCard);
                const maxW = parseInt(cardStyle.maxWidth, 10) || 0;
                assertTest(maxW <= 400, "Thẻ Empty State được thu nhỏ gọn gàng (maxWidth <= 400px)", `maxWidth=${maxW}px`);

                const emptyIcon = emptyCard.querySelector('.empty-icon-wrapper');
                if (emptyIcon) {
                    const iconStyle = window.getComputedStyle(emptyIcon);
                    const iconW = parseInt(iconStyle.width, 10) || 0;
                    assertTest(iconW <= 42, "Biểu tượng Empty State thu gọn dịu mắt (width <= 42px)", `width=${iconW}px`);
                }

                const emptyTitle = emptyCard.querySelector('.empty-title');
                if (emptyTitle) {
                    const titleStyle = window.getComputedStyle(emptyTitle);
                    const titleSize = parseFloat(titleStyle.fontSize) || 0;
                    assertTest(titleSize <= 16, "Cỡ chữ tiêu đề Empty State vừa phải, không gây ngợp (fontSize <= 16px)", `fontSize=${titleSize}px`);
                }
            }

            // ===================================================================
            // VẤN ĐỀ 4: KHÔI PHỤC NÚT CHUYỂN ĐỔI SÁNG/TỐI (THEME TOGGLE) Ở SIDEBAR
            // ===================================================================
            const btnTheme = document.getElementById('btn-toggle-theme');
            assertTest(!!btnTheme, "Nút chuyển đổi Sáng/Tối (#btn-toggle-theme) hiện diện ở đáy Sidebar");

            if (btnTheme) {
                const themeIcon = document.getElementById('theme-toggle-icon');
                const themeText = document.getElementById('theme-toggle-text');
                assertTest(!!themeIcon, "Nút Theme có icon hiển thị (#theme-toggle-icon)");
                assertTest(!!themeText, "Nút Theme có nhãn chữ (#theme-toggle-text)");

                const initTheme = document.documentElement.getAttribute('data-theme') || 'light';
                btnTheme.click();
                await new Promise(r => setTimeout(r, 100));
                const toggledTheme = document.documentElement.getAttribute('data-theme');
                assertTest(toggledTheme !== initTheme, "Bấm nút chuyển đổi theme thành công (từ " + initTheme + " sang " + toggledTheme + ")");

                // Kiểm tra localStorage
                const savedTheme = localStorage.getItem('personal_workspace_theme_v1');
                assertTest(savedTheme === toggledTheme, "Theme được lưu bền vững vào localStorage (" + savedTheme + ")");

                // Đổi lại theme ban đầu
                btnTheme.click();
            }

            // Test Collapsed Sidebar: icon căn giữa, text ẩn
            const sidebar = document.getElementById('treth-sidebar');
            if (sidebar && btnTheme) {
                sidebar.classList.add('collapsed');
                await new Promise(r => setTimeout(r, 50));

                const themeText = document.getElementById('theme-toggle-text');
                const textStyle = window.getComputedStyle(themeText);
                assertTest(textStyle.display === 'none', "Khi Sidebar thu gọn (collapsed), phần chữ của nút Theme tự động ẩn");

                sidebar.classList.remove('collapsed');
            }

            // ===================================================================
            // VẤN ĐỀ 5: RÀ SOÁT CÁC TAB KHÁC & MODAL DỮ LIỆU
            // ===================================================================
            const btnDataMenu = document.getElementById('btnToggleDataMenu');
            const dataModal = document.getElementById('dataDropdownPanel');
            assertTest(!!btnDataMenu && !!dataModal, "Tìm thấy nút Dữ liệu và Modal quản lý Dữ liệu");

            btnDataMenu.click();
            await new Promise(r => setTimeout(r, 100));

            const modalStyle = window.getComputedStyle(dataModal);
            const modalZ = parseInt(modalStyle.zIndex, 10) || 0;
            assertTest(dataModal.classList.contains('active'), "Bấm nút Dữ liệu mở thành công Modal Dữ liệu (.active)");
            assertTest(modalZ >= 9999, "Modal Dữ liệu có z-index cao tuyệt đối (>= 9999) nằm chính giữa màn hình, không bị cắt khuất", `zIndex=${modalZ}`);

            // Đóng Modal Dữ liệu
            const btnCloseData = document.getElementById('btn-close-data-modal');
            if (btnCloseData) btnCloseData.click();

        } catch (e) {
            assertTest(false, "Lỗi kiểm thử acceptance: " + e.message, e.stack);
        }

        setTimeout(() => {
            const resEl = document.createElement('div');
            resEl.id = 'acceptance-5issues-payload';
            resEl.style.display = 'none';
            resEl.textContent = JSON.stringify(window.__5issues_test_results);
            document.body.appendChild(resEl);
        }, 300);
    }, 600);
});
</script>
"""

runner_html = html.replace('</body>', test_script + '</body>')
runner_file = os.path.join(ROOT_DIR, 'runner_5issues_test.html')

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

match = re.search(r'<div id="acceptance-5issues-payload"[^>]*>(.*?)</div>', res.stdout, re.DOTALL)
if match:
    data = json.loads(match.group(1))
    print("=" * 75)
    print("  KẾT QUẢ NGHIỆM THU 5 VẤN ĐỀ GIAO DIỆN & LOGIC HIỂN THỊ (TRETH)")
    print("=" * 75)
    print(f"Tổng số bài kiểm tra (Total Tests) : {data['total']}")
    print(f"Thành công (Passed)                : {data['passed']}")
    print(f"Thất bại (Failed)                  : {data['failed']}")
    print(f"Tỷ lệ đạt (Pass Rate)              : {round((data['passed']/data['total'])*100, 1)}%")
    print("=" * 75)
    for t in data['tests']:
        status_icon = " ✅" if t['status'] == 'PASSED' else " ❌"
        detail = f" [{t['detail']}]" if t['detail'] else ""
        print(f"{status_icon} {t['name']}{detail}")
    print("=" * 75)
    if data['failed'] > 0:
        sys.exit(1)
    else:
        print("🎉 TẤT CẢ 5 HẠNG MỤC YÊU CẦU ĐÃ VƯỢT QUA 100%!")
else:
    print("CHROME RUN ERROR:")
    print(res.stdout[:1000])
    sys.exit(1)

