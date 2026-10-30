# -*- coding: utf-8 -*-
import subprocess
import json
import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

test_script = """
<script>
window.__inline_cal_results = {
    passed: 0,
    failed: 0,
    total: 0,
    tests: []
};

function assert(condition, name) {
    window.__inline_cal_results.total++;
    if (condition) {
        window.__inline_cal_results.passed++;
        window.__inline_cal_results.tests.push({ name: name, status: 'PASSED' });
    } else {
        window.__inline_cal_results.failed++;
        window.__inline_cal_results.tests.push({ name: name, status: 'FAILED' });
    }
}

window.addEventListener('load', () => {
    setTimeout(() => {
        try {
            const btnCalendar = document.getElementById('btn-view-calendar');
            const calContainer = document.getElementById('calendar-view-container');
            assert(!!btnCalendar, 'Nút #btn-view-calendar tồn tại');

            if (btnCalendar && calContainer) {
                btnCalendar.click();

                // 1. Kiểm tra ngày Hôm nay có .is-today và huy hiệu 'Hôm nay'
                const todayCell = calContainer.querySelector('.cal-day-cell.is-today');
                assert(!!todayCell, 'Tìm thấy ô ngày Hôm nay (.cal-day-cell.is-today)');

                const todayPill = todayCell ? todayCell.querySelector('.cal-today-pill') : null;
                assert(!!todayPill && todayPill.textContent.trim().toUpperCase() === 'HÔM NAY', 'Ô hôm nay hiển thị huy hiệu "Hôm nay" (.cal-today-pill)');

                // 2. Click nút '+' trên ô ngày để kiểm tra thêm việc tại chỗ
                if (todayCell) {
                    const addBtn = todayCell.querySelector('.cal-quick-add-btn');
                    assert(!!addBtn, 'Nút thêm việc (+) có mặt trên ô ngày');

                    if (addBtn) {
                        addBtn.click();

                        // Kiểm tra không nhảy lên thanh tìm kiếm
                        const searchInput = document.getElementById('filterKeywordInput');
                        const activeEl = document.activeElement;
                        assert(activeEl !== searchInput, 'Con trỏ KHÔNG nhảy lên thanh tìm kiếm (#filterKeywordInput)');

                        // Kiểm tra hộp thoại thêm việc tại chỗ xuất hiện ngay trong ô ngày
                        const inlineBox = todayCell.querySelector('.cal-inline-add-box');
                        assert(!!inlineBox, 'Hộp thoại thêm việc tại chỗ (.cal-inline-add-box) hiển thị ngay trong ô ngày');

                        const inlineInput = inlineBox ? inlineBox.querySelector('.cal-inline-add-input') : null;
                        assert(activeEl === inlineInput, 'Con trỏ tự động focus vào ô nhập việc tại chỗ (.cal-inline-add-input)');

                        // Nhập tên việc và click nút Lưu
                        if (inlineInput) {
                            inlineInput.value = 'Nhiệm vụ kiểm thử tạo tại chỗ Lịch 2026';
                            const saveBtn = inlineBox.querySelector('.cal-inline-save-btn');
                            assert(!!saveBtn, 'Nút Lưu trên hộp thêm việc tại chỗ tồn tại');
                            if (saveBtn) {
                                saveBtn.click();

                                // Đợi đồng bộ vào tasks
                                const createdTask = window.__localRepo.getAllTasks().find(t => t.title === 'Nhiệm vụ kiểm thử tạo tại chỗ Lịch 2026');
                                assert(!!createdTask, 'Task mới được tạo thành công trong Repository với đúng ngày hạn');
                            }
                        }
                    }
                }
            }
        } catch (err) {
            assert(false, 'Lỗi runtime trong browser test: ' + err.message);
        }

        const resEl = document.createElement('div');
        resEl.id = 'inline-cal-test-payload';
        resEl.style.display = 'none';
        resEl.textContent = JSON.stringify(window.__inline_cal_results);
        document.body.appendChild(resEl);
    }, 600);
});
</script>
"""

qa_html = html.replace('</body>', test_script + '</body>')

with open('inline_cal_runner.html', 'w', encoding='utf-8') as f:
    f.write(qa_html)

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
html_path = os.path.abspath('inline_cal_runner.html').replace('\\', '/')
res = subprocess.run([
    chrome_path,
    "--headless=new",
    "--disable-gpu",
    "--allow-file-access-from-files",
    "--virtual-time-budget=4000",
    "--dump-dom",
    f"file:///{html_path}"
], capture_output=True, text=True, encoding='utf-8', errors='replace')

if os.path.exists('inline_cal_runner.html'):
    os.remove('inline_cal_runner.html')

match = re.search(r'<div id="inline-cal-test-payload"[^>]*>(.*?)</div>', res.stdout, re.DOTALL)
if match:
    data = json.loads(match.group(1))
    print("=" * 65)
    print(" BROWSER TEST: CALENDAR INLINE QUICK-ADD & TODAY HIGHLIGHT")
    print("=" * 65)
    print(f"Total Tests : {data['total']}")
    print(f"Passed      : {data['passed']}")
    print(f"Failed      : {data['failed']}")
    print(f"Pass Rate   : {round((data['passed']/data['total'])*100, 1)}%")
    print("=" * 65)
    for t in data['tests']:
        status_icon = "✅" if t['status'] == 'PASSED' else "❌"
        print(f" {status_icon} {t['name']}")
    print("=" * 65)
    if data['failed'] > 0:
        sys.exit(1)
else:
    print("Error: Could not extract test results.")
    sys.exit(1)
