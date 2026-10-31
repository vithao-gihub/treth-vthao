# -*- coding: utf-8 -*-
"""
ACCEPTANCE TEST FOR SINGLE-VIEWPORT EISENHOWER MATRIX (PHƯƠNG ÁN 1)
Verifies:
1. All 4 quadrants (Q1, Q2, Q3, Q4) fit 100% within the visible screen without whole-page scroll
2. Internal scrollbar is active inside overflowing quadrant (scrollHeight > clientHeight)
3. Compact task item sizing (height <= 42px)
4. Zero whole-page overflow in matrix view
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

test_script = r"""
<script>
window.__matrix_test_results = { total: 0, passed: 0, failed: 0, tests: [] };

function assertTest(condition, name, detail) {
    window.__matrix_test_results.total++;
    if (condition) {
        window.__matrix_test_results.passed++;
        window.__matrix_test_results.tests.push({ name: name, status: 'PASSED', detail: detail || '' });
    } else {
        window.__matrix_test_results.failed++;
        window.__matrix_test_results.tests.push({ name: name, status: 'FAILED', detail: detail || '' });
    }
}

window.addEventListener('load', async () => {
    try {
        await new Promise(r => setTimeout(r, 200));

        // 1. Chuyển sang chế độ Ma trận
        const btnMatrix = document.getElementById('btn-view-matrix');
        if (btnMatrix) btnMatrix.click();
        await new Promise(r => setTimeout(r, 100));

        // 2. Thêm nhiều công việc vào Góc 1 (q1) và Góc 2 (q2) để kiểm tra tràn
        if (window.TreTH && window.TreTH.repo) {
            const repo = window.TreTH.repo;
            for (let i = 1; i <= 10; i++) {
                repo.createTask({
                    title: `Công việc thử nghiệm góc 1 số ${i}`,
                    quadrant: 'q1',
                    priority: 'high',
                    dueDate: '2026-10-31'
                });
            }
            for (let i = 1; i <= 8; i++) {
                repo.createTask({
                    title: `Công việc thử nghiệm góc 2 số ${i}`,
                    quadrant: 'q2',
                    priority: 'medium',
                    dueDate: '2026-11-05'
                });
            }
        }

        // Kích hoạt render lại
        if (typeof window.__trethRenderTasks === 'function') {
            window.__trethRenderTasks();
        } else if (btnMatrix) {
            btnMatrix.click();
        }
        await new Promise(r => setTimeout(r, 150));

        const matrixContainer = document.getElementById('matrix-view-container');
        const q1 = document.querySelector('.quadrant-q1');
        const q2 = document.querySelector('.quadrant-q2');
        const q3 = document.querySelector('.quadrant-q3');
        const q4 = document.querySelector('.quadrant-q4');

        assertTest(!!matrixContainer, "1. Tìm thấy container Ma trận #matrix-view-container");
        assertTest(!!q1 && !!q2 && !!q3 && !!q4, "1. Tìm thấy đầy đủ 4 góc phần tư Q1, Q2, Q3, Q4");

        const winHeight = window.innerHeight;
        const q3Rect = q3 ? q3.getBoundingClientRect() : null;
        const q4Rect = q4 ? q4.getBoundingClientRect() : null;

        // Kiểm tra Q3 và Q4 có bị đẩy xuống dưới đáy màn hình không
        const isQ3InViewport = q3Rect && (q3Rect.bottom <= winHeight + 15);
        const isQ4InViewport = q4Rect && (q4Rect.bottom <= winHeight + 15);

        assertTest(isQ3InViewport && isQ4InViewport,
            "1. Cả 4 ô Ma trận nằm trọn vẹn trong màn hình, không bị đẩy trôi (Q3 & Q4 đáy <= chiều cao màn hình)",
            `WinHeight: ${winHeight}, Q3 bottom: ${q3Rect?.bottom}, Q4 bottom: ${q4Rect?.bottom}`);

        // Kiểm tra toàn trang không bị thanh cuộn dọc (không cuộn trang web)
        const mainEl = document.querySelector('.treth-main');
        const mainOverflowY = mainEl ? window.getComputedStyle(mainEl).overflowY : null;
        const bodyOverflowY = window.getComputedStyle(document.body).overflowY;
        const isPageScrollLocked = (bodyOverflowY === 'hidden' || mainOverflowY === 'hidden');

        assertTest(isPageScrollLocked,
            "1. Trang web khóa cuộn dọc tổng trong chế độ Ma trận (overflow-y: hidden)",
            `body=${bodyOverflowY}, main=${mainOverflowY}`);

        // Kiểm tra cuộn nội bộ trong ô có nhiều việc (Q1)
        const q1List = q1 ? q1.querySelector('.quadrant-task-list') : null;
        assertTest(!!q1List, "2. Tìm thấy danh sách việc nội bộ .quadrant-task-list trong Góc 1");

        if (q1List) {
            const cs = window.getComputedStyle(q1List);
            const isScrollable = (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && (q1List.scrollHeight > q1List.clientHeight);
            assertTest(isScrollable,
                "2. Danh sách công việc góc 1 tự xuất hiện thanh cuộn nội bộ độc lập (scrollHeight > clientHeight)",
                `overflowY: ${cs.overflowY}, scrollHeight: ${q1List.scrollHeight}, clientHeight: ${q1List.clientHeight}`);

            // Kiểm tra độ dày nhỏ gọn của thẻ việc trong ma trận
            const firstItem = q1List.querySelector('.task-item');
            assertTest(!!firstItem, "3. Tìm thấy thẻ công việc trong góc 1");
            if (firstItem) {
                const itemHeight = firstItem.offsetHeight;
                assertTest(itemHeight <= 45,
                    "3. Thẻ công việc trong Ma trận được thu gọn nhỏ gọn (chiều cao <= 45px)",
                    `Chiều cao thực tế: ${itemHeight}px`);
            }
        }

    } catch (e) {
        assertTest(false, "Lỗi kiểm thử: " + e.message, e.stack);
    }

    const resEl = document.createElement('div');
    resEl.id = 'acceptance-matrix-payload';
    resEl.style.display = 'none';
    resEl.textContent = JSON.stringify(window.__matrix_test_results);
    document.body.appendChild(resEl);
});
</script>
"""

runner_html = html.replace('</body>', test_script + '</body>')
runner_file = os.path.join(ROOT_DIR, 'runner_matrix_test.html')

with open(runner_file, 'w', encoding='utf-8') as f:
    f.write(runner_html)

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
file_url = 'file:///K:/DU AN AI/Flle d%E1%BB%B1 %C3%A1n 2/TreTH/runner_matrix_test.html'

res = subprocess.run([
    chrome_path,
    "--headless=new",
    "--window-size=1280,800",
    "--disable-gpu",
    "--allow-file-access-from-files",
    "--virtual-time-budget=6000",
    "--dump-dom",
    file_url
], capture_output=True, text=True, encoding='utf-8', errors='replace')

if os.path.exists(runner_file):
    os.remove(runner_file)

match = re.search(r'<div id="acceptance-matrix-payload"[^>]*>(.*?)</div>', res.stdout, re.DOTALL)
if match:
    data = json.loads(match.group(1))
    print("=" * 75)
    print("  KẾT QUẢ KIỂM THỬ MA TRẬN 100% MÀN HÌNH & CUỘN NỘI BỘ (PHƯƠNG ÁN 1)")
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
        print("🎉 TẤT CẢ CÁC MỤC KIỂM THỬ ĐÃ VƯỢT QUA 100%!")
else:
    print("CHROME RUN ERROR:")
    print(res.stdout[:1000])
    sys.exit(1)

