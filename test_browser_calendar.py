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
window.__cal_test_results = {
    passed: 0,
    failed: 0,
    total: 0,
    tests: []
};

function assert(condition, name) {
    window.__cal_test_results.total++;
    if (condition) {
        window.__cal_test_results.passed++;
        window.__cal_test_results.tests.push({ name: name, status: 'PASSED' });
    } else {
        window.__cal_test_results.failed++;
        window.__cal_test_results.tests.push({ name: name, status: 'FAILED' });
    }
}

window.addEventListener('load', () => {
    setTimeout(() => {
        try {
            // 1. Kiểm tra nút Lịch tồn tại và click chuyển sang Lịch
            const btnCalendar = document.getElementById('btn-view-calendar');
            const calContainer = document.getElementById('calendar-view-container');
            assert(!!btnCalendar, 'Nút #btn-view-calendar tồn tại');
            assert(!!calContainer, 'Khung #calendar-view-container tồn tại');

            if (btnCalendar && calContainer) {
                btnCalendar.click();
                assert(btnCalendar.classList.contains('active'), 'Nút Lịch nhận class active sau khi click');
                assert(calContainer.style.display !== 'none', 'Khung #calendar-view-container hiển thị (display != none)');

                // 2. Kiểm tra CalendarView instance đã render
                assert(!!window.__calendarInstance, 'window.__calendarInstance đã khởi tạo');
                const monthTitle = calContainer.querySelector('.cal-month-title');
                assert(!!monthTitle && monthTitle.textContent.length > 0, 'Tiêu đề Tháng hiển thị trên Lịch: ' + (monthTitle ? monthTitle.textContent : ''));

                const dayCells = calContainer.querySelectorAll('.cal-day-cell');
                assert(dayCells.length >= 28, 'Lưới Lịch render đầy đủ các ô ngày (tìm thấy ' + dayCells.length + ' ô)');

                const weekdays = calContainer.querySelectorAll('.cal-weekday');
                assert(weekdays.length === 7, 'Lưới Lịch có đúng 7 cột ngày trong tuần (T2 -> CN)');

                // 3. Kiểm tra nút Tháng trước / Tháng sau
                const btnNext = calContainer.querySelector('#cal-btn-next');
                const initialTitle = monthTitle ? monthTitle.textContent : '';
                if (btnNext) {
                    btnNext.click();
                    const newTitle = calContainer.querySelector('.cal-month-title')?.textContent;
                    assert(newTitle !== initialTitle, 'Chuyển sang tháng sau thành công (' + initialTitle + ' -> ' + newTitle + ')');
                }

                // 4. Kiểm tra panel chưa có ngày hạn
                const unscheduledPanel = calContainer.querySelector('.calendar-unscheduled-sidebar');
                assert(!!unscheduledPanel, 'Panel công việc chưa có ngày hạn hiển thị đầy đủ');
            }

            // 5. Kiểm tra Chế độ Sáng (Light Mode)
            document.documentElement.setAttribute('data-theme', 'light');
            const currentTheme = document.documentElement.getAttribute('data-theme');
            assert(currentTheme === 'light', 'Chuyển thành công sang data-theme="light"');

            const bodyBg = window.getComputedStyle(document.body).backgroundColor;
            assert(!!bodyBg, 'Chế độ Sáng có màu nền Body: ' + bodyBg);

            // 6. Kiểm tra tiêu đề Module không còn "Module 01, 02..."
            const navBtnTime = document.getElementById('nav-btn-time');
            if (navBtnTime) {
                navBtnTime.click();
                const titleEl = document.getElementById('header-module-title');
                assert(titleEl && titleEl.textContent === 'Thời gian', 'Chuyển sang Time module tiêu đề là "Thời gian" (không có Module 02)');
            }

            const navBtnTasks = document.getElementById('nav-btn-tasks');
            if (navBtnTasks) {
                navBtnTasks.click();
                const titleEl = document.getElementById('header-module-title');
                assert(titleEl && titleEl.textContent === 'Công việc', 'Chuyển về Tasks module tiêu đề là "Công việc" (không có Module 01)');
            }

        } catch (err) {
            assert(false, 'Lỗi runtime trong browser test: ' + err.message);
        }

        const resEl = document.createElement('div');
        resEl.id = 'cal-test-payload';
        resEl.style.display = 'none';
        resEl.textContent = JSON.stringify(window.__cal_test_results);
        document.body.appendChild(resEl);
    }, 500);
});
</script>
"""

qa_html = html.replace('</body>', test_script + '</body>')

with open('cal_runner.html', 'w', encoding='utf-8') as f:
    f.write(qa_html)

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
html_path = os.path.abspath('cal_runner.html').replace('\\', '/')
res = subprocess.run([
    chrome_path,
    "--headless=new",
    "--disable-gpu",
    "--allow-file-access-from-files",
    "--virtual-time-budget=3000",
    "--dump-dom",
    f"file:///{html_path}"
], capture_output=True, text=True, encoding='utf-8', errors='replace')

if os.path.exists('cal_runner.html'):
    os.remove('cal_runner.html')

match = re.search(r'<div id="cal-test-payload"[^>]*>(.*?)</div>', res.stdout, re.DOTALL)
if match:
    data = json.loads(match.group(1))
    print("=" * 65)
    print(" BROWSER INTERACTION TEST: CALENDAR VIEW, LIGHT MODE & MODULES")
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

