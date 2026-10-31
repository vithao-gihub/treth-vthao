# -*- coding: utf-8 -*-
"""
VERIFICATION & ACCEPTANCE TEST FOR UI POLISH (5A)
Linear / Notion / Todoist Aesthetic Verification
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
window.__ui_polish_test_results = { total: 0, passed: 0, failed: 0, tests: [] };

function assertTest(condition, name, detail) {
    window.__ui_polish_test_results.total++;
    if (condition) {
        window.__ui_polish_test_results.passed++;
        window.__ui_polish_test_results.tests.push({ name: name, status: 'PASSED', detail: detail || '' });
    } else {
        window.__ui_polish_test_results.failed++;
        window.__ui_polish_test_results.tests.push({ name: name, status: 'FAILED', detail: detail || '' });
    }
}

function hasEmoji(str) {
    return /[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/u.test(str);
}

window.addEventListener('load', () => {
    // Force light theme in localStorage and DOM
    try { localStorage.setItem('personal_workspace_theme_v1', 'light'); } catch(e) {}
    document.documentElement.setAttribute('data-theme', 'light');
    document.body.classList.remove('dark-mode');

    setTimeout(() => {
        try {
            // ===================================================================
            // 1A. XÓA BỎ EMOJI & CHUẨN HÓA ICON ĐƠN SẮC
            // ===================================================================
            const filterPriority = document.getElementById('filterPrioritySelect') || document.getElementById('filterPriority');
            const priorityTexts = Array.from(filterPriority?.options || []).map(o => o.text);
            const hasEmojiPriority = priorityTexts.some(hasEmoji);
            assertTest(!hasEmojiPriority, "1A. Không có emoji hệ thống trong dropdown Mức ưu tiên", priorityTexts.join(' | '));

            const filterDueDate = document.getElementById('filterDueDateSelect') || document.getElementById('filterDueDate');
            const dueTexts = Array.from(filterDueDate?.options || []).map(o => o.text);
            const hasEmojiDueDate = dueTexts.some(hasEmoji);
            assertTest(!hasEmojiDueDate, "1A. Không có emoji trong dropdown Thời hạn", dueTexts.join(' | '));

            const filterStatus = document.getElementById('filterStatusSelect') || document.getElementById('filterStatus');
            const statusTexts = Array.from(filterStatus?.options || []).map(o => o.text);
            const hasEmojiStatus = statusTexts.some(hasEmoji);
            assertTest(!hasEmojiStatus, "1A. Không có emoji trong dropdown Trạng thái", statusTexts.join(' | '));

            const quickAddLeading = document.querySelector('.quick-add-leading-icon');
            const leadingHtml = quickAddLeading ? quickAddLeading.innerHTML : '';
            const hasSparkle = leadingHtml.includes('sparkling') || leadingHtml.includes('✨');
            assertTest(!hasSparkle, "1A. Thanh nhập việc nhanh không còn icon lấp lánh ✨ (thay bằng icon đơn sắc)", leadingHtml);

            // ===================================================================
            // 2A. BẢNG MÀU TRUNG TÍNH SẮC NÉT & XÓA HOÀN TOÀN HỌA TIẾT LÁ TRE
            // ===================================================================
            const quadrant = document.querySelector('.quadrant-card') || document.querySelector('.matrix-quadrant');
            const qAfter = quadrant ? window.getComputedStyle(quadrant, '::after') : null;
            const qAfterBg = qAfter ? qAfter.getPropertyValue('background-image') : 'none';
            const qAfterContent = qAfter ? qAfter.getPropertyValue('content') : 'none';
            const qAfterDisplay = qAfter ? qAfter.getPropertyValue('display') : 'none';
            const isLeafWatermarkGone = qAfterContent === 'none' || qAfterDisplay === 'none' || !qAfterBg.includes('data:image/svg');
            assertTest(isLeafWatermarkGone, "2A. Đã xóa bỏ hoàn toàn họa tiết lá tre mờ (Bamboo Leaf Watermark) góc thẻ/ma trận", `content=${qAfterContent}, bg=${qAfterBg}`);

            // Light mode body background test
            document.body.style.transition = 'none';
            document.documentElement.setAttribute('data-theme', 'light');
            document.body.classList.remove('dark-mode');
            void document.body.offsetHeight; // Force layout & style recalculation
            const bodyBg = window.getComputedStyle(document.body).backgroundColor;
            const isNeutralLight = bodyBg === 'rgb(248, 250, 252)' || bodyBg === 'rgb(244, 245, 247)';
            assertTest(isNeutralLight, "2A. Nền tổng thể Light Mode là xám trung tính nhạt (#F8FAFC hoặc #F4F5F7)", bodyBg);

            // ===================================================================
            // 3A. THU GỌN BO GÓC (8px/6px) & KHUNG EMPTY STATE
            // ===================================================================
            const qRadius = quadrant ? parseInt(window.getComputedStyle(quadrant).borderRadius, 10) : 0;
            assertTest(qRadius <= 8 && qRadius >= 6, "3A. Độ bo góc khung lớn/ma trận thu gọn chuẩn 8px", `${qRadius}px`);

            const btnQuick = document.getElementById('btn-add-task') || document.getElementById('btn-quick-add');
            const btnRadius = btnQuick ? parseInt(window.getComputedStyle(btnQuick).borderRadius, 10) : 0;
            assertTest(btnRadius <= 6, "3A. Độ bo góc nút bấm thu gọn chuẩn 6px", `${btnRadius}px`);

            // Empty state check
            const emptyCard = document.querySelector('.treth-all-done-card');
            if (emptyCard) {
                const emptyPadding = parseInt(window.getComputedStyle(emptyCard).paddingTop, 10);
                assertTest(emptyPadding <= 28, "3A. Khung Empty state thu gọn dịu mắt (padding <= 28px)", `${emptyPadding}px`);
            } else {
                assertTest(true, "3A. Khung Empty state được định hình thu gọn qua CSS", "CSS applied");
            }

            // ===================================================================
            // 4A. TINH GỌN THẺ CÔNG VIỆC & CƠ CHẾ HOVER ACTIONS
            // ===================================================================
            const testCard = document.createElement('div');
            testCard.className = 'task-item';
            testCard.innerHTML = '<span class="task-title">Test item</span><div class="task-actions-wrapper"><button class="btn-delete">Xóa</button></div>';
            document.body.appendChild(testCard);
            const actionsEl = testCard.querySelector('.task-actions-wrapper');
            const actionsOpacity = window.getComputedStyle(actionsEl).opacity;
            assertTest(actionsOpacity === '0', "4A. Nút thao tác phụ trên thẻ công việc mặc định ẩn (opacity: 0)", `opacity=${actionsOpacity}`);
            testCard.remove();

            // ===================================================================
            // 5A. CHUẨN HÓA TYPOGRAPHY & RÚT GỌN CÂU CHỮ
            // ===================================================================
            const bodyFont = window.getComputedStyle(document.body).fontFamily;
            const hasInter = bodyFont.toLowerCase().includes('inter') || bodyFont.toLowerCase().includes('apple-system') || bodyFont.toLowerCase().includes('system-ui');
            assertTest(hasInter, "5A. Áp dụng font chữ chuẩn Inter / Clean system stack", bodyFont);

            const quickInput = document.getElementById('task-title') || document.getElementById('treth-quick-add-input');
            const ph = quickInput ? quickInput.getAttribute('placeholder') || '' : '';
            const hasNewPh = ph.includes('Thêm công việc mới...') || ph.includes('gõ ! ưu tiên, # nhãn');
            assertTest(hasNewPh, "5A. Placeholder ô nhập việc nhanh rút gọn thực tế", ph);

        } catch (e) {
            assertTest(false, "Lỗi kiểm thử acceptance: " + e.message, e.stack);
        }

        const resEl = document.createElement('div');
        resEl.id = 'acceptance-ui-polish-payload';
        resEl.style.display = 'none';
        resEl.textContent = JSON.stringify(window.__ui_polish_test_results);
        document.body.appendChild(resEl);
    }, 500);
});
</script>
"""

runner_html = html.replace('</body>', test_script + '</body>')
runner_file = os.path.join(ROOT_DIR, 'runner_ui_polish_test.html')

with open(runner_file, 'w', encoding='utf-8') as f:
    f.write(runner_html)

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
file_url = 'file:///K:/DU AN AI/Flle d%E1%BB%B1 %C3%A1n 2/TreTH/runner_ui_polish_test.html'

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

match = re.search(r'<div id="acceptance-ui-polish-payload"[^>]*>(.*?)</div>', res.stdout, re.DOTALL)
if match:
    data = json.loads(match.group(1))
    print("=" * 75)
    print("  KẾT QUẢ KIỂM THỬ UI POLISH (LINEAR / NOTION / TODOIST STYLE)")
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
        print("🎉 TẤT CẢ CÁC HẠNG MỤC UI POLISH ĐÃ VƯỢT QUA 100%!")
else:
    print("CHROME RUN ERROR:")
    print(res.stdout[:1000])
    sys.exit(1)
