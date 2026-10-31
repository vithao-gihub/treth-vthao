# -*- coding: utf-8 -*-
"""
VERIFICATION & ACCEPTANCE SUITE FOR TRETH 4.0
Checks all 4 core UI/UX deliverables & version upgrade:
1. Quick Add Dropdown Z-index & Overflow (no clipping, elevated over cards).
2. Matrix View 2x2 layout fitting 1 screen, inner scrollbars, no body scroll.
3. Complete elimination of 'Ô 1, Ô 2, Ô 3, Ô 4' prefix & hidden quadrant badge in Matrix.
4. Compact task cards in Matrix & lightweight subtasks list (Option B1), collapsed add subtask by default.
5. TreTH 4.0 versioning across components.
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
window.__treth40_test_results = { total: 0, passed: 0, failed: 0, tests: [] };

function assertTest(condition, name, detail) {
    window.__treth40_test_results.total++;
    if (condition) {
        window.__treth40_test_results.passed++;
        window.__treth40_test_results.tests.push({ name: name, status: 'PASSED', detail: detail || '' });
    } else {
        window.__treth40_test_results.failed++;
        window.__treth40_test_results.tests.push({ name: name, status: 'FAILED', detail: detail || '' });
    }
}

window.addEventListener('load', () => {
    setTimeout(async () => {
        try {
            // ===================================================================
            // DOMAIN 1: SỬA LỖI CHE KHUẤT MENU THẢ XUỐNG Ở THANH THÊM VIỆC (Z-INDEX & OVERFLOW)
            // ===================================================================
            const quickAddSection = document.querySelector('.treth-quick-add-section');
            assertTest(!!quickAddSection, "Tìm thấy container thanh thêm việc nhanh (.treth-quick-add-section)");
            if (quickAddSection) {
                const secStyle = window.getComputedStyle(quickAddSection);
                assertTest(secStyle.overflow === 'visible', "Thanh thêm việc gỡ bỏ overflow:hidden (overflow: visible)", `overflow=${secStyle.overflow}`);
                assertTest(parseInt(secStyle.zIndex, 10) >= 50, "Thanh thêm việc có z-index >= 50", `zIndex=${secStyle.zIndex}`);
            }

            // Dropdown Loại việc
            const catDropdown = document.querySelector('.treth-custom-dropdown.is-category-dropdown');
            assertTest(!!catDropdown, "Dropdown Loại việc tồn tại");
            if (catDropdown) {
                const trigger = catDropdown.querySelector('.custom-dropdown-trigger');
                const popover = catDropdown.querySelector('.custom-dropdown-popover');
                assertTest(!!trigger && !!popover, "Dropdown Loại việc có trigger và popover");

                // Mở dropdown
                trigger.click();
                const popoverStyle = window.getComputedStyle(popover);
                assertTest(catDropdown.classList.contains('is-open'), "Dropdown Loại việc mở thành công (.is-open)");
                assertTest(popoverStyle.display === 'block', "Popover Dropdown Loại việc hiển thị (display: block)");
                assertTest(parseInt(popoverStyle.zIndex, 10) >= 999, "Popover Dropdown có z-index cao nổi lên trên (>= 999)", `zIndex=${popoverStyle.zIndex}`);

                // Đóng dropdown sau khi test
                trigger.click();
            }

            // ===================================================================
            // DOMAIN 2: TỐI ƯU BỐ CỤC CHẾ ĐỘ XEM MA TRẬN (HIỂN THỊ ĐỦ 4 GÓC TRÊN 1 MÀN HÌNH)
            // ===================================================================
            const btnViewMatrix = document.getElementById('btn-view-matrix');
            const matrixViewContainer = document.getElementById('matrix-view-container');
            assertTest(!!btnViewMatrix && !!matrixViewContainer, "Nút chuyển chế độ Ma trận và container Ma trận tồn tại");

            // Kích hoạt chế độ Ma trận
            btnViewMatrix.click();
            await new Promise(r => setTimeout(r, 100));

            const matrixStyle = window.getComputedStyle(matrixViewContainer);
            assertTest(matrixStyle.display === 'grid', "Khi chuyển sang Ma trận, container hiển thị dạng grid", `display=${matrixStyle.display}`);
            assertTest(document.body.classList.contains('view-mode-matrix'), "Body mang class view-mode-matrix");

            // Kiểm tra grid 2 cột x 2 hàng
            const cols = matrixStyle.gridTemplateColumns.split(' ').length;
            const rows = matrixStyle.gridTemplateRows.split(' ').length;
            assertTest(cols === 2 && rows === 2, `Bố cục Ma trận là Grid 2 cột x 2 hàng (thực tế: ${cols} cột x ${rows} hàng)`);

            // Kiểm tra không cuộn dọc tổng trang web
            const trethMain = document.querySelector('.treth-main');
            if (trethMain) {
                const mainStyle = window.getComputedStyle(trethMain);
                assertTest(mainStyle.overflowY === 'hidden', "Trang web không có thanh cuộn dọc tổng khi xem Ma trận (overflow-y: hidden)", `overflowY=${mainStyle.overflowY}`);
            }

            // Kiểm tra 4 góc quadrant card có cấu trúc flex column và scrollbar bên trong
            const quadrants = document.querySelectorAll('#matrix-view-container .quadrant-card');
            assertTest(quadrants.length === 4, `Ma trận có đủ 4 góc phần tư (thực tế: ${quadrants.length})`);

            let allQuadrantsFlex = true;
            let allListsScrollable = true;
            quadrants.forEach(q => {
                const qStyle = window.getComputedStyle(q);
                if (qStyle.display !== 'flex' || qStyle.flexDirection !== 'column') allQuadrantsFlex = false;
                const qList = q.querySelector('.quadrant-task-list');
                if (qList) {
                    const lStyle = window.getComputedStyle(qList);
                    if (lStyle.overflowY !== 'auto' && lStyle.overflowY !== 'scroll') allListsScrollable = false;
                }
            });
            assertTest(allQuadrantsFlex, "Cả 4 góc Quadrant có display: flex và flex-direction: column");
            assertTest(allListsScrollable, "Danh sách bên trong từng góc có overflow-y: auto cuộn mượt nội bộ");

            // ===================================================================
            // DOMAIN 3: XÓA BỎ TIỀN TỐ 'Ô 1, Ô 2, Ô 3, Ô 4' & ẨN NHÃN LẶP LẠI
            // ===================================================================
            const qTitles = Array.from(document.querySelectorAll('#matrix-view-container .quadrant-title')).map(el => el.textContent.trim());
            const hasO1to4 = qTitles.some(t => /Ô\s*[1-4]/i.test(t));
            assertTest(!hasO1to4, "Tiêu đề 4 góc ma trận đã xóa bỏ hoàn toàn chữ 'Ô 1', 'Ô 2', 'Ô 3', 'Ô 4'", `Titles=${JSON.stringify(qTitles)}`);

            assertTest(qTitles[0].includes("Khẩn cấp & Quan trọng"), "Góc 1 mang tiêu đề 'Khẩn cấp & Quan trọng'", qTitles[0]);
            assertTest(qTitles[1].includes("Không khẩn cấp & Quan trọng"), "Góc 2 mang tiêu đề 'Không khẩn cấp & Quan trọng'", qTitles[1]);
            assertTest(qTitles[2].includes("Khẩn cấp & Không quan trọng"), "Góc 3 mang tiêu đề 'Khẩn cấp & Không quan trọng'", qTitles[2]);
            assertTest(qTitles[3].includes("Không khẩn cấp & Không quan trọng"), "Góc 4 mang tiêu đề 'Không khẩn cấp & Không quan trọng'", qTitles[3]);

            // Kiểm tra dropdown Góc ma trận trên toolbar không còn 'Ô 1..4'
            const taskQuadrantSelect = document.getElementById('task-quadrant');
            if (taskQuadrantSelect) {
                const optTexts = Array.from(taskQuadrantSelect.options).map(o => o.textContent);
                const hasPrefixInSelect = optTexts.some(t => /Ô\s*[1-4]/i.test(t));
                assertTest(!hasPrefixInSelect, "Dropdown Góc ma trận đã xóa bỏ hoàn toàn tiền tố 'Ô 1..4'", `Options=${JSON.stringify(optTexts)}`);
            }

            // Kiểm tra thẻ trong Ma trận KHÔNG hiển thị badge góc ma trận (ẩn/không render)
            const matrixTasks = document.querySelectorAll('#matrix-view-container .task-item');
            if (matrixTasks.length > 0) {
                let badgeQuadrantVisibleCount = 0;
                matrixTasks.forEach(taskEl => {
                    const badge = taskEl.querySelector('.badge-quadrant');
                    if (badge) {
                        const bStyle = window.getComputedStyle(badge);
                        if (bStyle.display !== 'none') badgeQuadrantVisibleCount++;
                    }
                });
                assertTest(badgeQuadrantVisibleCount === 0, `Thẻ trong Ma trận không hiển thị badge góc ma trận trùng lặp (thực tế visible: ${badgeQuadrantVisibleCount})`);
            }

            // ===================================================================
            // DOMAIN 4: THU GỌN THẺ CÔNG VIỆC & DANH SÁCH VIỆC CON TRỰC TIẾP (B1)
            // ===================================================================
            if (matrixTasks.length > 0) {
                const firstTask = matrixTasks[0];
                const taskStyle = window.getComputedStyle(firstTask);
                const paddingTop = parseInt(taskStyle.paddingTop, 10);
                assertTest(paddingTop <= 12, `Thẻ trong Ma trận có padding thu gọn gọn gàng (paddingTop=${paddingTop}px <= 12px)`);
            }

            // Tạo thử 1 task có subtasks trong Ma trận để kiểm tra hiển thị Option B1
            const sampleTaskWithSubtasks = {
                id: 'sample-task-test-subtasks',
                title: 'Nhiệm vụ kiểm thử Ma trận TreTH 4.0',
                status: 'pending',
                priority: 'high',
                quadrant: 'q1',
                categoryId: 'cat-bao-cao',
                dueDate: '2026-11-05',
                subtasks: [
                    { id: 'sub-1', title: 'Soạn dàn ý việc con 1', completed: false },
                    { id: 'sub-2', title: 'Kiểm tra việc con 2 đã hoàn thành', completed: true }
                ]
            };

            const sampleEl = window.__createTaskElement(sampleTaskWithSubtasks, true);
            const q1List = document.getElementById('matrix-list-q1');
            if (q1List && sampleEl) {
                q1List.prepend(sampleEl);

                // 4.1 Danh sách việc con mỏng trực tiếp hiển thị ngay dưới công việc cha
                const subQuickList = sampleEl.querySelector('.matrix-subtasks-quick-list');
                assertTest(!!subQuickList, "Hiển thị danh sách việc con mỏng trực tiếp (.matrix-subtasks-quick-list) trong Ma trận (Option B1)");

                const subRows = sampleEl.querySelectorAll('.matrix-subtask-row');
                assertTest(subRows.length === 2, `Hiển thị đủ 2 dòng việc con mỏng (tìm thấy: ${subRows.length})`);

                // 4.2 Dòng việc con hoàn thành có gạch ngang line-through
                const doneRow = sampleEl.querySelector('.matrix-subtask-row.is-completed .matrix-subtask-title');
                if (doneRow) {
                    const doneStyle = window.getComputedStyle(doneRow);
                    assertTest(doneStyle.textDecoration.includes('line-through'), "Việc con đã hoàn thành có gạch ngang line-through", `textDecoration=${doneStyle.textDecoration}`);
                }

                // 4.3 Khung quản lý việc con cồng kềnh (input thêm việc con) MẶC ĐỊNH BỊ ẨN
                const bigSubContainer = sampleEl.querySelector('.task-subtasks-container');
                assertTest(!bigSubContainer, "Khung lớn quản lý việc con và ô input 'Thêm việc con mới...' mặc định đóng gọn");

                // Dọn dẹp task mẫu
                sampleEl.remove();
            }

            // ===================================================================
            // DOMAIN 5: PHIÊN BẢN TRETH 4.0
            // ===================================================================
            const versionBadge = document.querySelector('.treth-version-badge');
            assertTest(!!versionBadge && versionBadge.textContent.trim() === 'v4.0', "Giao diện hiển thị đúng nhãn phiên bản v4.0", versionBadge ? versionBadge.textContent : 'none');

        } catch (e) {
            assertTest(false, "Lỗi kiểm thử acceptance: " + e.message, e.stack);
        }

        const resEl = document.createElement('div');
        resEl.id = 'treth40-acceptance-payload';
        resEl.style.display = 'none';
        resEl.textContent = JSON.stringify(window.__treth40_test_results);
        document.body.appendChild(resEl);
    }, 600);
});
</script>
"""

runner_html = html.replace('</body>', test_script + '</body>')
runner_file = os.path.join(ROOT_DIR, 'treth40_acceptance_runner.html')

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
    "--virtual-time-budget=5000",
    "--dump-dom",
    f"file:///{html_path}"
], capture_output=True, text=True, encoding='utf-8', errors='replace')

if os.path.exists(runner_file):
    os.remove(runner_file)

match = re.search(r'<div id="treth40-acceptance-payload"[^>]*>(.*?)</div>', res.stdout, re.DOTALL)
if match:
    data = json.loads(match.group(1))
    print("=" * 70)
    print("  KIỂM THỬ NGHIỆM THU TRETH 4.0 (HOÀN THÀNH 4 HẠNG MỤC + NÂNG CẤP V4.0)")
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
        print("🎉 TẤT CẢ CÁC MỤC NGHIỆM THU TRETH 4.0 ĐÃ VƯỢT QUA 100%!")
else:
    print("CHROME RUN ERROR:")
    print(res.stdout[:1000])
    sys.exit(1)
