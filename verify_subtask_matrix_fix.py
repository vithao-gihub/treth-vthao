# -*- coding: utf-8 -*-
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
window.__subtask_test_results = { total: 0, passed: 0, failed: 0, tests: [] };

function assertTest(condition, name, detail) {
    window.__subtask_test_results.total++;
    if (condition) {
        window.__subtask_test_results.passed++;
        window.__subtask_test_results.tests.push({ name: name, status: 'PASSED', detail: detail || '' });
    } else {
        window.__subtask_test_results.failed++;
        window.__subtask_test_results.tests.push({ name: name, status: 'FAILED', detail: detail || '' });
    }
}

window.addEventListener('load', async () => {
    try {
        await new Promise(r => setTimeout(r, 200));

        // 1. Chuyển sang module công việc và chế độ Ma trận
        if (typeof window.__trethSwitchModule === 'function') {
            window.__trethSwitchModule('tasks');
        }
        const btnMatrix = document.getElementById('btn-view-matrix');
        if (btnMatrix) btnMatrix.click();
        await new Promise(r => setTimeout(r, 150));

        // 2. Thêm 1 task vào Góc 1 để kiểm tra việc con
        if (window.TreTH && window.TreTH.repo) {
            window.TreTH.repo.createTask({
                title: 'Task kiểm tra việc con trong ma trận',
                quadrant: 'q1',
                priority: 'high',
                dueDate: '2026-10-31'
            });
        }
        if (window.__triggerRender) window.__triggerRender();
        await new Promise(r => setTimeout(r, 150));

        // 3. Tìm task trong Q1
        const q1List = document.getElementById('matrix-list-q1');
        assertTest(!!q1List, "1. Tìm thấy danh sách Q1 (#matrix-list-q1)");

        const taskItem = q1List ? q1List.querySelector('.task-item') : null;
        assertTest(!!taskItem, "2. Tìm thấy task item trong Q1");

        if (taskItem) {
            const taskId = taskItem.dataset.id;
            const initHeight = taskItem.offsetHeight;
            assertTest(initHeight <= 42, "3. Thẻ việc ban đầu siêu gọn (<= 42px)", `Cao: ${initHeight}px`);

            // Tìm nút + Việc con
            const btnAddSub = taskItem.querySelector('.btn-subtask-add-quick') || taskItem.querySelector('.badge-subtasks-toggle');
            assertTest(!!btnAddSub, "4. Nút + Việc con / badge việc con tồn tại");

            if (btnAddSub) {
                // Click để mở việc con
                btnAddSub.click();
                await new Promise(r => setTimeout(r, 150));

                let expandedItem = q1List.querySelector(`.task-item[data-id="${taskId}"]`);
                assertTest(!!expandedItem, "5. Tìm thấy thẻ task sau khi bấm + Việc con");

                if (expandedItem) {
                    const hasClass = expandedItem.classList.contains('has-subtasks-expanded');
                    assertTest(hasClass, "6. Thẻ task được gắn class .has-subtasks-expanded", `Class: ${expandedItem.className}`);

                    const subContainer = expandedItem.querySelector('.task-subtasks-container');
                    assertTest(!!subContainer, "7. Khung việc con .task-subtasks-container hiển thị");

                    const expandedHeight = expandedItem.offsetHeight;
                    assertTest(expandedHeight > 60, "8. Thẻ task tự động mở rộng chiều cao (> 60px) khi mở việc con", `Cao: ${expandedHeight}px`);

                    const nameEl = expandedItem.querySelector('.task-name');
                    const nameWidth = nameEl ? nameEl.offsetWidth : 0;
                    assertTest(nameWidth >= 80, "9. Tiêu đề không bị bóp nghẹt chiều ngang (width >= 80px)", `Rộng: ${nameWidth}px`);

                    const inputEl = expandedItem.querySelector('.subtask-input');
                    const inputWidth = inputEl ? inputEl.offsetWidth : 0;
                    const inputHeight = inputEl ? inputEl.offsetHeight : 0;
                    assertTest(inputWidth >= 100 && inputHeight >= 20, "10. Ô nhập việc con .subtask-input hiển thị đầy đủ", `Kích thước: ${inputWidth}x${inputHeight}px`);

                    // 11. Nhập và submit thêm 1 việc con mới
                    const subForm = expandedItem.querySelector('.subtask-add-form');
                    assertTest(!!subForm, "11. Form thêm việc con .subtask-add-form tồn tại");

                    if (subForm && inputEl) {
                        inputEl.value = 'Việc con thử nghiệm số 1';
                        subForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                        await new Promise(r => setTimeout(r, 150));

                        expandedItem = q1List.querySelector(`.task-item[data-id="${taskId}"]`);
                        const createdSubItem = expandedItem ? expandedItem.querySelector('.subtask-item') : null;
                        assertTest(!!createdSubItem, "12. Thêm thành công việc con mới vào danh sách");

                        // 13. Thu gọn lại khi bấm toggle việc con
                        const toggleBtn = expandedItem ? (expandedItem.querySelector('.badge-subtasks-toggle') || expandedItem.querySelector('.btn-subtask-add-quick')) : null;
                        if (toggleBtn) {
                            toggleBtn.click();
                            await new Promise(r => setTimeout(r, 150));
                            const collapsedItem = q1List.querySelector(`.task-item[data-id="${taskId}"]`);
                            const collapsedHeight = collapsedItem ? collapsedItem.offsetHeight : 0;
                            assertTest(collapsedHeight <= 42, "13. Thẻ task thu gọn lại chuẩn <= 42px khi đóng việc con", `Cao sau đóng: ${collapsedHeight}px`);
                        }
                    }
                }
            }
        }

    } catch (e) {
        assertTest(false, "Lỗi kiểm thử: " + e.message, e.stack);
    }

    const resEl = document.createElement('div');
    resEl.id = 'acceptance-subtask-payload';
    resEl.style.display = 'none';
    resEl.textContent = JSON.stringify(window.__subtask_test_results);
    document.body.appendChild(resEl);
});
</script>
"""

runner_html = html.replace('</body>', test_script + '</body>')
runner_file = os.path.join(ROOT_DIR, 'runner_subtask_test.html')

with open(runner_file, 'w', encoding='utf-8') as f:
    f.write(runner_html)

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
file_url = 'file:///K:/DU AN AI/Flle d%E1%BB%B1 %C3%A1n 2/TreTH/runner_subtask_test.html'

res = subprocess.run([
    chrome_path,
    "--headless=new",
    "--window-size=1280,800",
    "--disable-gpu",
    "--allow-file-access-from-files",
    "--virtual-time-budget=6000",
    "--dump-dom",
    file_url
], capture_output=True, text=True, encoding='utf-8')

if os.path.exists(runner_file):
    try:
        os.remove(runner_file)
    except:
        pass

m = re.search(r'<div id="acceptance-subtask-payload"[^>]*>(.*?)</div>', res.stdout)
if not m:
    print("KHÔNG TÌM THẤY PAYLOAD TỪ TRÌNH DUYỆT")
    print(res.stdout[:500])
    sys.exit(1)

data = json.loads(m.group(1))
print("=" * 75)
print("  KẾT QUẢ KIỂM THỬ: THÊM VIỆC CON TRONG MA TRẬN (TRETH)")
print("=" * 75)
print(f"Tổng số bài kiểm tra (Total Tests) : {data['total']}")
print(f"Thành công (Passed)                : {data['passed']}")
print(f"Thất bại (Failed)                  : {data['failed']}")
pass_rate = (data['passed'] / data['total'] * 100) if data['total'] > 0 else 0
print(f"Tỷ lệ đạt (Pass Rate)              : {pass_rate:.1f}%")
print("=" * 75)

for t in data['tests']:
    icon = "✅" if t['status'] == 'PASSED' else "❌"
    detail_str = f" [{t['detail']}]" if t['detail'] else ""
    print(f" {icon} {t['name']}{detail_str}")

print("=" * 75)
if data['failed'] > 0:
    print("❌ VẪN CÒN LỖI CẦN KHẮC PHỤC!")
    sys.exit(1)
else:
    print("🎉 TẤT CẢ CÁC MỤC KIỂM THỬ ĐÃ VƯỢT QUA 100%!")
    sys.exit(0)
