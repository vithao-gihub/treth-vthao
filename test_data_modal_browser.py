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
window.__data_modal_test_results = {
    passed: 0,
    failed: 0,
    total: 0,
    tests: []
};

function assert(condition, name, detail) {
    window.__data_modal_test_results.total++;
    if (condition) {
        window.__data_modal_test_results.passed++;
        window.__data_modal_test_results.tests.push({ name: name, status: 'PASSED', detail: detail || '' });
    } else {
        window.__data_modal_test_results.failed++;
        window.__data_modal_test_results.tests.push({ name: name, status: 'FAILED', detail: detail || '' });
    }
}

window.addEventListener('load', () => {
    setTimeout(() => {
        try {
            const btnData = document.getElementById('btnToggleDataMenu');
            const dataModal = document.getElementById('dataDropdownPanel');
            const btnSettings = document.getElementById('btn-open-settings');
            const settingsModal = document.getElementById('settingsModal');

            assert(!!btnData, "Nút #btnToggleDataMenu tồn tại");
            assert(!!dataModal, "Modal #dataDropdownPanel tồn tại");

            // Kiểm tra trước khi mở
            assert(!dataModal.classList.contains('active'), "Data Modal ban đầu ở trạng thái đóng");

            // 1. Click mở Data Modal
            btnData.click();
            assert(dataModal.classList.contains('active'), "Data Modal nhận class 'active' sau khi click nút Dữ liệu");

            const compStyle = window.getComputedStyle(dataModal);
            assert(compStyle.position === 'fixed', "Data Modal có position: fixed", compStyle.position);
            assert(compStyle.display === 'flex', "Data Modal có display: flex", compStyle.display);

            const rect = dataModal.getBoundingClientRect();
            assert(rect.width >= window.innerWidth - 2, "Data Modal phủ kín chiều ngang màn hình (không bị kẹt trong Sidebar)", `width=${rect.width}, win=${window.innerWidth}`);
            assert(rect.height >= window.innerHeight - 2, "Data Modal phủ kín chiều cao màn hình", `height=${rect.height}, win=${window.innerHeight}`);
            assert(rect.top === 0 && rect.left === 0, "Data Modal căn sát mép trên-trái (top:0, left:0)", `top=${rect.top}, left=${rect.left}`);

            // Thẻ card bên trong
            const card = dataModal.querySelector('.modal-card');
            assert(!!card, "Data Modal chứa phần tử .modal-card");
            if (card) {
                const cardRect = card.getBoundingClientRect();
                assert(cardRect.width <= 380, "Thẻ Data Modal nhỏ gọn tinh tế (width <= 380px)", `width=${cardRect.width}px, height=${cardRect.height}px`);
                // Phải nằm giữa màn hình
                const isCenteredHorizontally = Math.abs((cardRect.left + cardRect.width / 2) - (window.innerWidth / 2)) < 30;
                assert(isCenteredHorizontally, "Thẻ Data Modal Card được căn chính giữa màn hình Desktop", `cardCenter=${cardRect.left + cardRect.width/2}, winCenter=${window.innerWidth/2}`);
            }

            // 2. Click nút đóng 'X'
            const btnClose = document.getElementById('btn-close-data-modal');
            assert(!!btnClose, "Nút đóng #btn-close-data-modal tồn tại");
            if (btnClose) {
                btnClose.click();
                assert(!dataModal.classList.contains('active'), "Data Modal đóng thành công khi click nút 'X'");
            }

            // 3. Mở lại và đóng bằng nút Footer
            btnData.click();
            assert(dataModal.classList.contains('active'), "Data Modal mở lại thành công");
            const btnFooter = document.getElementById('btn-close-data-modal-footer');
            assert(!!btnFooter, "Nút đóng Footer #btn-close-data-modal-footer tồn tại");
            if (btnFooter) {
                btnFooter.click();
                assert(!dataModal.classList.contains('active'), "Data Modal đóng thành công khi click nút 'Đóng' ở Footer");
            }

            // 4. So sánh với Settings Modal
            btnSettings.click();
            assert(settingsModal.classList.contains('active'), "Settings Modal mở thành công khi click nút Cài đặt");
            const setRect = settingsModal.getBoundingClientRect();
            assert(setRect.width >= window.innerWidth - 20 && setRect.height >= window.innerHeight - 20, "Settings Modal phủ toàn màn hình giống hệt Data Modal", `width=${setRect.width}, height=${setRect.height}, winW=${window.innerWidth}, winH=${window.innerHeight}`);
            const btnCloseSet = document.getElementById('btn-close-settings-modal');
            if (btnCloseSet) btnCloseSet.click();

        } catch (e) {
            assert(false, "Lỗi kiểm thử: " + e.message, e.stack);
        }

        const resEl = document.createElement('div');
        resEl.id = 'data-modal-test-payload';
        resEl.style.display = 'none';
        resEl.textContent = JSON.stringify(window.__data_modal_test_results);
        document.body.appendChild(resEl);
    }, 400);
});
</script>
"""

qa_html = html.replace('</body>', test_script + '</body>')

with open('data_modal_runner.html', 'w', encoding='utf-8') as f:
    f.write(qa_html)

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
html_path = os.path.abspath('data_modal_runner.html').replace('\\', '/')
res = subprocess.run([
    chrome_path,
    "--headless=new",
    "--disable-gpu",
    "--allow-file-access-from-files",
    "--virtual-time-budget=3000",
    "--dump-dom",
    f"file:///{html_path}"
], capture_output=True, text=True, encoding='utf-8', errors='replace')

if os.path.exists('data_modal_runner.html'):
    os.remove('data_modal_runner.html')

match = re.search(r'<div id="data-modal-test-payload"[^>]*>(.*?)</div>', res.stdout, re.DOTALL)
if match:
    data = json.loads(match.group(1))
    print("=" * 65)
    print(" BROWSER TEST: DATA MODAL (SLIDE-UP & FULL VIEWPORT UX)")
    print("=" * 65)
    print(f"Total Tests : {data['total']}")
    print(f"Passed      : {data['passed']}")
    print(f"Failed      : {data['failed']}")
    print(f"Pass Rate   : {round((data['passed']/data['total'])*100, 1)}%")
    print("=" * 65)
    for t in data['tests']:
        status_icon = " ✅" if t['status'] == 'PASSED' else " ❌"
        detail = f" ({t['detail']})" if t['detail'] else ""
        print(f"{status_icon} {t['name']}{detail}")
    print("=" * 65)
    if data['failed'] > 0:
        sys.exit(1)
else:
    print("CHROME OUTPUT ERROR:")
    print(res.stdout[:1000])
    sys.exit(1)
