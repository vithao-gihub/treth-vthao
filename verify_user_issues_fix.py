# -*- coding: utf-8 -*-
"""
VERIFICATION & ACCEPTANCE TEST:
1. Module Isolation (switching from Matrix to Calendar hides Matrix completely)
2. Calendar Scroll Stability (no reset to 0 or laggy jumps on updates)
3. Task Inline Direct Edit & Permanent Removal of 'Sửa' Button
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
window.__fix_test_results = { total: 0, passed: 0, failed: 0, tests: [] };

function assertTest(condition, name, detail) {
    window.__fix_test_results.total++;
    if (condition) {
        window.__fix_test_results.passed++;
        window.__fix_test_results.tests.push({ name: name, status: 'PASSED', detail: detail || '' });
    } else {
        window.__fix_test_results.failed++;
        window.__fix_test_results.tests.push({ name: name, status: 'FAILED', detail: detail || '' });
    }
}

window.addEventListener('load', () => {
    setTimeout(async () => {
        try {
            // ===================================================================
            // TEST 1: CHUYỂN TỪ MA TRẬN SANG LỊCH BIỂU (MODULE ISOLATION)
            // ===================================================================
            const btnMatrix = document.getElementById('btn-view-matrix');
            const navCalendar = document.getElementById('nav-btn-calendar');
            const navTasks = document.getElementById('nav-btn-tasks');
            const moduleTasks = document.getElementById('module-tasks-view');
            const moduleCalendar = document.getElementById('module-calendar-view');
            const matrixContainer = document.getElementById('matrix-view-container');

            // Bước 1: Vào ma trận
            if (btnMatrix) btnMatrix.click();
            const matrixTasksDisplay = window.getComputedStyle(moduleTasks).display;
            const matrixGridDisplay = window.getComputedStyle(matrixContainer).display;
            assertTest(matrixTasksDisplay !== 'none' && matrixGridDisplay !== 'none',
                "1. Chế độ Ma trận: Module công việc và Khung ma trận hiển thị",
                `tasks=${matrixTasksDisplay}, matrix=${matrixGridDisplay}`);

            // Bước 2: Bấm chuyển sang Lịch biểu
            if (navCalendar) navCalendar.click();
            await new Promise(r => setTimeout(r, 100));

            const calModuleDisplay = window.getComputedStyle(moduleCalendar).display;
            const tasksModuleDisplayWhenCal = window.getComputedStyle(moduleTasks).display;
            const matrixDisplayWhenCal = window.getComputedStyle(matrixContainer).display;

            assertTest(calModuleDisplay !== 'none',
                "1. Module Lịch biểu hiển thị sau khi chuyển",
                `calendar=${calModuleDisplay}`);
            assertTest(tasksModuleDisplayWhenCal === 'none',
                "1. Module Công việc (Tasks) bị ẨN HOÀN TOÀN khi đang ở Lịch biểu (Không bị đè)",
                `tasksModuleDisplay=${tasksModuleDisplayWhenCal}`);

            // ===================================================================
            // TEST 2: KIỂM TRA LĂN CUỘN LỊCH BIỂU (SCROLL POSITION PRESERVATION)
            // ===================================================================
            if (window.__calendarInstance) {
                window.__calendarInstance.setViewMode('week');
                await new Promise(r => setTimeout(r, 100));
            }
            const timeGridScroll = document.querySelector('#cal-timegrid-scroll-viewport');
            const scrollDetail = timeGridScroll ? `clientHeight: ${timeGridScroll.clientHeight}, scrollHeight: ${timeGridScroll.scrollHeight}` : 'not found';
            assertTest(!!timeGridScroll, "2. Tìm thấy khung cuộn lưới giờ lịch biểu #cal-timegrid-scroll-viewport", scrollDetail);

            if (timeGridScroll && window.__calendarInstance) {
                // Đặt một vị trí cuộn cụ thể
                timeGridScroll.scrollTop = 520;
                await new Promise(r => setTimeout(r, 60));
                const setScroll = timeGridScroll.scrollTop;

                // Giả lập tương tác gọi render() lại
                window.__calendarInstance.render();

                // Ngay lập tức sau render(), kiểm tra scroll
                const immediatelyAfterScroll = document.querySelector('#cal-timegrid-scroll-viewport')?.scrollTop;
                // Và 60ms sau (khi autoScroll timeout kích hoạt)
                await new Promise(r => setTimeout(r, 70));
                const delayedScroll = document.querySelector('#cal-timegrid-scroll-viewport')?.scrollTop;

                assertTest(setScroll > 0 && immediatelyAfterScroll === setScroll && delayedScroll === setScroll,
                    "2. Vị trí cuộn của Lịch biểu được giữ nguyên chính xác khi tương tác/render lại (Không bị reset về 0 hay giật)",
                    `Đặt: ${setScroll}, Ngay sau: ${immediatelyAfterScroll}, Sau timeout: ${delayedScroll}`);
            }

            // ===================================================================
            // TEST 3: XÓA VĨNH VIỄN NÚT 'SỬA' VÀ CHỈNH SỬA TRỰC TIẾP TRÊN THẺ
            // ===================================================================
            // Quay lại module công việc
            if (navTasks) navTasks.click();
            const btnList = document.getElementById('btn-view-list');
            if (btnList) btnList.click();
            await new Promise(r => setTimeout(r, 100));

            // Kiểm tra nút 'Sửa' (btn-edit-title) đã bị xóa bỏ hoàn toàn
            const allEditButtons = document.querySelectorAll('.task-item .btn-edit-title');
            assertTest(allEditButtons.length === 0,
                "3. Nút 'Sửa' (btn-edit-title) đã được xóa bỏ hoàn toàn khỏi các thẻ công việc",
                `Found count: ${allEditButtons.length}`);

            // Thử click trực tiếp vào .task-name trên thẻ công việc
            const firstTaskItem = document.querySelector('.task-item');
            const taskNameEl = firstTaskItem?.querySelector('.task-name');
            assertTest(!!taskNameEl, "3. Tìm thấy phần tử tiêu đề công việc .task-name");

            if (taskNameEl) {
                taskNameEl.click();
                await new Promise(r => setTimeout(r, 50));
                const inlineInput = firstTaskItem.querySelector('.inline-edit-input');
                assertTest(!!inlineInput,
                    "3. Bấm trực tiếp vào tên công việc (.task-name) kích hoạt ô chỉnh sửa trực tiếp (.inline-edit-input)",
                    inlineInput ? `Value: ${inlineInput.value}` : 'Không tìm thấy inline-edit-input');
            }

        } catch (e) {
            assertTest(false, "Lỗi kiểm thử: " + e.message, e.stack);
        }

        const resEl = document.createElement('div');
        resEl.id = 'acceptance-fix-payload';
        resEl.style.display = 'none';
        resEl.textContent = JSON.stringify(window.__fix_test_results);
        document.body.appendChild(resEl);
    }, 400);
});
</script>
"""

runner_html = html.replace('</body>', test_script + '</body>')
runner_file = os.path.join(ROOT_DIR, 'runner_fix_test.html')

with open(runner_file, 'w', encoding='utf-8') as f:
    f.write(runner_html)

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
file_url = 'file:///K:/DU AN AI/Flle d%E1%BB%B1 %C3%A1n 2/TreTH/runner_fix_test.html'

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

match = re.search(r'<div id="acceptance-fix-payload"[^>]*>(.*?)</div>', res.stdout, re.DOTALL)
if match:
    data = json.loads(match.group(1))
    print("=" * 75)
    print("  KẾT QUẢ KIỂM THỬ 3 VẤN ĐỀ NGƯỜI DÙNG PHẢN HỒI")
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
        print("🎉 TẤT CẢ CÁC VẤN ĐỀ ĐÃ ĐƯỢC KHẮC PHỤC HOÀN TOÀN!")
else:
    print("CHROME RUN ERROR:")
    print(res.stdout[:1000])
    sys.exit(1)
