# -*- coding: utf-8 -*-
"""
Test script verifying Category and Priority inline badge popovers
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
window.__badge_test_results = { total: 0, passed: 0, failed: 0, tests: [] };

function assertTest(condition, name, detail) {
    window.__badge_test_results.total++;
    if (condition) {
        window.__badge_test_results.passed++;
        window.__badge_test_results.tests.push({ name: name, status: 'PASSED', detail: detail || '' });
    } else {
        window.__badge_test_results.failed++;
        window.__badge_test_results.tests.push({ name: name, status: 'FAILED', detail: detail || '' });
    }
}

window.addEventListener('load', () => {
    setTimeout(async () => {
        try {
            const firstTask = document.querySelector('.task-item');
            assertTest(!!firstTask, "Tìm thấy ít nhất 1 thẻ công việc");
            const taskId = firstTask.dataset.id;

            // 1. Kiểm tra bấm badge Loại việc (.category-editable)
            const catBadge = firstTask.querySelector('.category-editable');
            assertTest(!!catBadge, "Tìm thấy badge Loại việc .category-editable");

            if (catBadge) {
                catBadge.click();
                await new Promise(r => setTimeout(r, 60));

                const popover = document.querySelector('.treth-inline-badge-popover');
                assertTest(!!popover, "Popover chọn loại việc (.treth-inline-badge-popover) mở thành công sau khi bấm vào badge");

                if (popover) {
                    const items = popover.querySelectorAll('.inline-badge-popover-item');
                    assertTest(items.length >= 2, `Popover chứa danh sách các loại việc (Tìm thấy: ${items.length})`);

                    // Bấm chọn một loại việc khác
                    const targetOption = Array.from(items).find(it => !it.classList.contains('is-selected')) || items[0];
                    if (targetOption) {
                        targetOption.click();
                        await new Promise(r => setTimeout(r, 60));

                        const popoverAfter = document.querySelector('.treth-inline-badge-popover');
                        assertTest(!popoverAfter, "Popover tự động đóng sau khi chọn loại việc");
                    }
                }
            }

            // 2. Kiểm tra bấm badge Mức độ ưu tiên (.badge-editable)
            const taskAfterCat = document.querySelector(`.task-item[data-id="${taskId}"]`);
            const prioBadge = taskAfterCat ? taskAfterCat.querySelector('.badge-editable') : null;
            assertTest(!!prioBadge, "Tìm thấy badge Mức độ ưu tiên .badge-editable");

            if (prioBadge) {
                prioBadge.click();
                await new Promise(r => setTimeout(r, 60));

                const prioPopover = document.querySelector('.treth-inline-badge-popover');
                assertTest(!!prioPopover, "Popover chọn độ ưu tiên (.treth-inline-badge-popover) mở thành công sau khi bấm vào badge");

                if (prioPopover) {
                    const items = prioPopover.querySelectorAll('.inline-badge-popover-item');
                    assertTest(items.length >= 3, `Popover chứa danh sách các mức ưu tiên (Tìm thấy: ${items.length})`);

                    const targetPrioOpt = Array.from(items).find(it => !it.classList.contains('is-selected')) || items[0];
                    if (targetPrioOpt) {
                        targetPrioOpt.click();
                        await new Promise(r => setTimeout(r, 60));

                        const prioPopoverAfter = document.querySelector('.treth-inline-badge-popover');
                        assertTest(!prioPopoverAfter, "Popover tự động đóng sau khi chọn mức độ ưu tiên");
                    }
                }
            }

        } catch (e) {
            assertTest(false, "Lỗi kiểm thử: " + e.message, e.stack);
        }

        const resEl = document.createElement('div');
        resEl.id = 'acceptance-badge-payload';
        resEl.style.display = 'none';
        resEl.textContent = JSON.stringify(window.__badge_test_results);
        document.body.appendChild(resEl);
    }, 400);
});
</script>
"""

runner_html = html.replace('</body>', test_script + '</body>')
runner_file = os.path.join(ROOT_DIR, 'runner_badge_test.html')

with open(runner_file, 'w', encoding='utf-8') as f:
    f.write(runner_html)

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
file_url = 'file:///K:/DU AN AI/Flle d%E1%BB%B1 %C3%A1n 2/TreTH/runner_badge_test.html'

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

match = re.search(r'<div id="acceptance-badge-payload"[^>]*>(.*?)</div>', res.stdout, re.DOTALL)
if match:
    data = json.loads(match.group(1))
    print("=" * 75)
    print("  KẾT QUẢ KIỂM THỬ CHỈNH SỬA LOẠI VIỆC & MỨC ĐỘ ƯU TIÊN")
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

