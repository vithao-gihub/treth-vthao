# -*- coding: utf-8 -*-
import subprocess
import json
import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = r"K:\DU AN AI\Flle dự án 2\TreTH"
index_file = os.path.join(ROOT_DIR, 'index.html')

with open(index_file, 'r', encoding='utf-8') as f:
    html = f.read()

test_script = """
<script>
window.__cal_test_results = {
    passed: 0,
    failed: 0,
    total: 0,
    tests: []
};

function assertTest(condition, name, detail) {
    window.__cal_test_results.total++;
    if (condition) {
        window.__cal_test_results.passed++;
        window.__cal_test_results.tests.push({ name: name, status: 'PASSED', detail: detail || '' });
    } else {
        window.__cal_test_results.failed++;
        window.__cal_test_results.tests.push({ name: name, status: 'FAILED', detail: detail || '' });
    }
}

window.addEventListener('load', () => {
    setTimeout(() => {
        try {
            // ===================================================================
            // DOMAIN 1: MODULE ISOLATION & NAVIGATION
            // ===================================================================
            const navBtnCalendar = document.getElementById('nav-btn-calendar');
            const navBtnTasks = document.getElementById('nav-btn-tasks');
            const moduleTasksView = document.getElementById('module-tasks-view');
            const moduleCalendarView = document.getElementById('module-calendar-view');
            const calContainer = document.getElementById('calendar-view-container');
            const topbarRight = document.querySelector('.treth-topbar-right');
            const dashboardBar = document.querySelector('.treth-dashboard-bar');
            const viewSwitcher = document.querySelector('.view-switcher');
            const btnViewCalendar = document.getElementById('btn-view-calendar');

            assertTest(!!navBtnCalendar, "Nút điều hướng Lịch biểu #nav-btn-calendar tồn tại trên Sidebar");
            assertTest(!!moduleCalendarView, "Container module #module-calendar-view tồn tại");
            assertTest(!!calContainer, "Container #calendar-view-container tồn tại");

            // 1.1 Kiểm tra nút Lịch bị ẩn khỏi View Switcher của Task
            const btnCalStyle = window.getComputedStyle(btnViewCalendar);
            assertTest(btnCalStyle.display === 'none', "Nút Lịch biểu #btn-view-calendar bị ẩn hoàn toàn khỏi view-switcher Hàng 1 (display: none)");

            // 1.2 Chuyển sang module Lịch biểu
            navBtnCalendar.click();

            assertTest(moduleTasksView.style.display === 'none', "Hàng 2 & Workspace Công việc bị ẩn triệt để khi sang Lịch (#module-tasks-view style.display: none)");
            assertTest(moduleCalendarView.style.display === 'block', "Module Lịch biểu hiển thị thành công (#module-calendar-view style.display: block)");
            assertTest(topbarRight.style.display === 'none', "Hàng 1: Ô Tìm kiếm & Bộ lọc của Công việc bị ẩn triệt để (.treth-topbar-right style.display: none)");
            assertTest(dashboardBar.style.display === 'none', "Hàng 1: Dải thẻ lọc chips bị ẩn triệt để (.treth-dashboard-bar style.display: none)");
            assertTest(viewSwitcher.style.display === 'none', "Hàng 1: Cụm chuyển đổi chế độ xem Công việc bị ẩn triệt để (.view-switcher style.display: none)");

            // 1.3 Kiểm tra unhighlight smart list item khi ở Calendar
            const activeSmartItemsOnCal = document.querySelectorAll('.smart-list-item.active');
            assertTest(activeSmartItemsOnCal.length === 0, "Mục Tất cả công việc & Smart lists không còn bị tô sáng active khi đang ở Lịch");

            // 1.4 Kiểm tra nút CTA Sự kiện không bị dư dấu cộng (+ + Sự kiện -> + Sự kiện)
            const calCreateBtn = document.getElementById('cal-btn-create-event');
            assertTest(!!calCreateBtn, "Nút CTA #cal-btn-create-event tồn tại");
            if (calCreateBtn) {
                const btnText = calCreateBtn.textContent.trim();
                assertTest(btnText === 'Sự kiện' || btnText === '+ Sự kiện', "Nút Sự kiện không bị trùng lặp hai dấu cộng ('+ + Sự kiện')", `text="${btnText}"`);
                const plusIcons = calCreateBtn.querySelectorAll('.ri-add-line');
                assertTest(plusIcons.length <= 1, "Nút Sự kiện chỉ có tối đa 1 icon cộng duy nhất");
            }

            // ===================================================================
            // DOMAIN 2: UNIFIED SINGLE-ROW TOOLBAR (PHƯƠNG ÁN A)
            // ===================================================================
            const calToolbar = document.querySelector('.cal-v4-toolbar');
            assertTest(!!calToolbar, "Thanh công cụ Lịch biểu .cal-v4-toolbar tồn tại");

            const toolbarLeft = calToolbar ? calToolbar.querySelector('.cal-toolbar-left') : null;
            const toolbarCenter = calToolbar ? calToolbar.querySelector('.cal-toolbar-center') : null;
            const toolbarRight = calToolbar ? calToolbar.querySelector('.cal-toolbar-right') : null;

            assertTest(!!toolbarLeft, "Cụm Trái .cal-toolbar-left tồn tại trong toolbar");
            assertTest(!!toolbarCenter, "Cụm Giữa .cal-toolbar-center tồn tại trong toolbar");
            assertTest(!!toolbarRight, "Cụm Phải .cal-toolbar-right tồn tại trong toolbar");

            if (toolbarLeft) {
                assertTest(!!toolbarLeft.querySelector('#cal-btn-today'), "Cụm Trái chứa nút Hôm nay");
                assertTest(!!toolbarLeft.querySelector('.cal-nav-arrows'), "Cụm Trái chứa cụm nút điều hướng < >");
                assertTest(!!toolbarLeft.querySelector('.cal-month-title'), "Cụm Trái chứa tiêu đề Tháng, Năm");
                assertTest(!!toolbarLeft.querySelector('.cal-lunar-badge'), "Cụm Trái chứa Badge Âm lịch");
            }

            if (toolbarCenter) {
                assertTest(!!toolbarCenter.querySelector('#cal-toggle-habits'), "Cụm Giữa chứa pill Thói quen");
                assertTest(!!toolbarCenter.querySelector('#cal-toggle-pomo'), "Cụm Giữa chứa pill Tập trung");
                assertTest(!!toolbarCenter.querySelector('#cal-toggle-unscheduled'), "Cụm Giữa chứa pill Backlog");
            }

            if (toolbarRight) {
                assertTest(!!toolbarRight.querySelector('.cal-view-segmented'), "Cụm Phải chứa Segmented Switch Ngày/Tuần/Tháng/Lịch trình");
                assertTest(!!toolbarRight.querySelector('#cal-btn-create-event'), "Cụm Phải chứa nút CTA + Sự kiện sát lề phải");
            }

            // ===================================================================
            // DOMAIN 3: ALL-DAY AREA, HABITS & NON-TIMED TASKS (WEEK VIEW)
            // ===================================================================
            const btnWeek = document.querySelector('.cal-seg-btn[data-cal-view="week"]');
            assertTest(!!btnWeek, "Nút xem Tuần (W) tồn tại");
            if (btnWeek) {
                btnWeek.click();
            }

            const alldayRow = document.querySelector('.cal-allday-row');
            assertTest(!!alldayRow, "Hàng Cả ngày .cal-allday-row được render trong chế độ Tuần");
            if (alldayRow) {
                const rowStyle = window.getComputedStyle(alldayRow);
                assertTest(rowStyle.maxHeight === '112px', "Hàng Cả ngày có max-height: 112px", rowStyle.maxHeight);
                assertTest(rowStyle.overflowY === 'auto' || rowStyle.overflowY === 'scroll', "Hàng Cả ngày có overflow-y: auto", rowStyle.overflowY);
            }

            // Header columns đồng bộ (white-space: nowrap)
            const headerColMains = document.querySelectorAll('.cal-header-col-main');
            assertTest(headerColMains.length === 7, "Render đầy đủ 7 cột ngày trong tuần (T2-CN)");
            if (headerColMains.length > 0) {
                const firstColStyle = window.getComputedStyle(headerColMains[0]);
                assertTest(firstColStyle.whiteSpace === 'nowrap', "Header cột ngày có white-space: nowrap để không bị lệch cột CN");
            }

            // ===================================================================
            // DOMAIN 4: TIMELINE GRID & DOUBLE SCROLLBARS
            // ===================================================================
            const bodyStyle = window.getComputedStyle(document.body);
            assertTest(bodyStyle.overflow === 'hidden' || bodyStyle.overflowY === 'hidden', "Khóa cuộn body toàn trang để xóa thanh cuộn trắng ngoài rìa (overflow: hidden)", bodyStyle.overflow);

            const timegridScroll = document.getElementById('cal-timegrid-scroll-viewport');
            assertTest(!!timegridScroll, "Khung cuộn lưới giờ #cal-timegrid-scroll-viewport tồn tại");
            if (timegridScroll) {
                const scrollStyle = window.getComputedStyle(timegridScroll);
                assertTest(scrollStyle.overflowY === 'auto' || scrollStyle.overflowY === 'scroll', "Lưới giờ cuộn mượt độc lập (overflow-y: auto)");
            }

            // Now Line có badge hiển thị giờ
            const nowLine = document.getElementById('cal-live-now-line');
            if (nowLine) {
                const nowBadge = nowLine.querySelector('.cal-now-badge');
                assertTest(!!nowBadge, "Vạch thời gian thực chứa badge hiển thị giờ .cal-now-badge");
                if (nowBadge) {
                    assertTest(/\\d{1,2}:\\d{2}/.test(nowBadge.textContent.trim()), "Badge giờ hiển thị đúng định dạng HH:mm", nowBadge.textContent);
                }
            }

            // ===================================================================
            // DOMAIN 5: CYBER BAMBOO THEME (DARK & LIGHT MODE)
            // ===================================================================
            // Kiểm tra Dark mode variables
            document.documentElement.setAttribute('data-theme', 'dark');
            const rootDarkStyle = window.getComputedStyle(document.documentElement);
            const darkBgApp = rootDarkStyle.getPropertyValue('--bg-app').trim();
            const darkAccentPrimary = rootDarkStyle.getPropertyValue('--accent-primary').trim();
            const darkAccentCyber = rootDarkStyle.getPropertyValue('--accent-cyber').trim();

            assertTest(darkBgApp === '#091013', "Dark Mode: --bg-app chuẩn Cyber Bamboo (#091013)", darkBgApp);
            assertTest(darkAccentPrimary === '#10B981', "Dark Mode: --accent-primary chuẩn Emerald Tre Việt (#10B981)", darkAccentPrimary);
            assertTest(darkAccentCyber === '#06B6D4', "Dark Mode: --accent-cyber chuẩn Cyber Cyan (#06B6D4)", darkAccentCyber);

            // Kiểm tra Light mode variables
            document.documentElement.setAttribute('data-theme', 'light');
            const rootLightStyle = window.getComputedStyle(document.documentElement);
            const lightBgApp = rootLightStyle.getPropertyValue('--bg-app').trim();
            const lightAccentPrimary = rootLightStyle.getPropertyValue('--accent-primary').trim();
            const lightAccentCyber = rootLightStyle.getPropertyValue('--accent-cyber').trim();

            assertTest(lightBgApp === '#F3F7F5', "Light Mode: --bg-app chuẩn Tre Mai Tinh Khiết (#F3F7F5)", lightBgApp);
            assertTest(lightAccentPrimary === '#059669', "Light Mode: --accent-primary chuẩn Xanh thân tre đậm (#059669)", lightAccentPrimary);
            assertTest(lightAccentCyber === '#0D9488', "Light Mode: --accent-cyber chuẩn Xanh ngọc Teal (#0D9488)", lightAccentCyber);

            // ===================================================================
            // DOMAIN 1.4 TEST: SMART LISTS CLICK HANDLER SWITCHES TO TASKS
            // ===================================================================
            // Đang ở Lịch, click mục 'Hôm nay' trong DANH SÁCH THÔNG MINH
            const smartItemToday = document.querySelector('.smart-list-item[data-smart-filter="today"]');
            assertTest(!!smartItemToday, "Mục 'Hôm nay' tồn tại trong DANH SÁCH THÔNG MINH");
            if (smartItemToday) {
                smartItemToday.click();

                assertTest(moduleTasksView.style.display === 'block', "Click mục Smart List từ Lịch biểu tự động chuyển về module Công việc");
                assertTest(moduleCalendarView.style.display === 'none', "Module Lịch biểu được ẩn đi khi chuyển về Công việc");
                assertTest(navBtnTasks.classList.contains('active'), "Nút Công việc trên Sidebar nhận class 'active'");
                assertTest(!navBtnCalendar.classList.contains('active'), "Nút Lịch biểu trên Sidebar bỏ class 'active'");
                assertTest(smartItemToday.classList.contains('active'), "Mục Smart List 'Hôm nay' nhận class 'active'");
                assertTest(topbarRight.style.display !== 'none', "Thanh Toolbar Hàng 1 của Công việc hiển thị lại đầy đủ");
            }

        } catch (e) {
            assertTest(false, "Lỗi kiểm thử: " + e.message, e.stack);
        }

        const resEl = document.createElement('div');
        resEl.id = 'cal-overhaul-test-payload';
        resEl.style.display = 'none';
        resEl.textContent = JSON.stringify(window.__cal_test_results);
        document.body.appendChild(resEl);
    }, 450);
});
</script>
"""

runner_html = html.replace('</body>', test_script + '</body>')
runner_file = os.path.join(ROOT_DIR, 'cal_overhaul_runner.html')

with open(runner_file, 'w', encoding='utf-8') as f:
    f.write(runner_html)

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
html_path = runner_file.replace('\\', '/')

res = subprocess.run([
    chrome_path,
    "--headless=new",
    "--disable-gpu",
    "--allow-file-access-from-files",
    "--virtual-time-budget=4000",
    "--dump-dom",
    f"file:///{html_path}"
], capture_output=True, text=True, encoding='utf-8', errors='replace')

if os.path.exists(runner_file):
    os.remove(runner_file)

match = re.search(r'<div id="cal-overhaul-test-payload"[^>]*>(.*?)</div>', res.stdout, re.DOTALL)
if match:
    data = json.loads(match.group(1))
    print("=" * 70)
    print("  KIỂM THỬ TỔNG THỂ GIAO DIỆN & LOGIC MODULE LỊCH BIỂU (TRETH v3.1)")
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
        print("🏆 TẤT CẢ CÁC MỤC KIỂM THỬ MODULE LỊCH BIỂU ĐẠT 100%!")
else:
    print("CHROME RUN ERROR:")
    print(res.stdout[:1000])
    sys.exit(1)

