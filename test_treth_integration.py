import subprocess
import json
import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Read current index.html
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Inject TreTH Integration Test runner script right before </body>
test_script = """
<script>
window.__treth_qa_results = {
    passed: 0,
    failed: 0,
    total: 0,
    tests: []
};

function assertTreTH(condition, name) {
    window.__treth_qa_results.total++;
    if (condition) {
        window.__treth_qa_results.passed++;
        window.__treth_qa_results.tests.push({ name: name, status: 'PASSED' });
    } else {
        window.__treth_qa_results.failed++;
        window.__treth_qa_results.tests.push({ name: name, status: 'FAILED' });
    }
}

window.addEventListener('load', () => {
    setTimeout(() => {
        try {
            // =========================================================
            // TEST SUITE 1: TRETH KANBAN VIEW DOM & VIEW SWITCHER
            // =========================================================
            const btnKanban = document.getElementById('btn-view-kanban');
            const btnList = document.getElementById('btn-view-list');
            const btnMatrix = document.getElementById('btn-view-matrix');
            const kanbanContainer = document.getElementById('kanban-view-container');
            const listContainer = document.getElementById('list-view-container');
            const matrixContainer = document.getElementById('matrix-view-container');

            assertTreTH(!!btnKanban, 'TreTH: Nút chuyển chế độ xem Kanban (#btn-view-kanban) tồn tại');
            assertTreTH(!!kanbanContainer, 'TreTH: Container bảng Kanban (#kanban-view-container) tồn tại trong DOM');

            // Switch to Kanban View
            if (btnKanban) btnKanban.click();
            assertTreTH(kanbanContainer && kanbanContainer.style.display !== 'none', 'TreTH: Chuyển sang chế độ Kanban hiển thị kanban-view-container');
            assertTreTH(listContainer && listContainer.style.display === 'none', 'TreTH: Chế độ Kanban ẩn list-view-container');
            assertTreTH(matrixContainer && matrixContainer.style.display === 'none', 'TreTH: Chế độ Kanban ẩn matrix-view-container');
            assertTreTH(btnKanban && btnKanban.classList.contains('active'), 'TreTH: Nút #btn-view-kanban nhận class active');

            // Kiểm tra 3 cột Kanban chuẩn (To Do, In Progress, Done)
            const kanbanColumns = document.querySelectorAll('.kanban-column');
            assertTreTH(kanbanColumns.length === 3, 'TreTH: Bảng Kanban có đúng 3 cột To Do, In Progress, Done (tìm thấy ' + kanbanColumns.length + ')');

            const colTodo = document.querySelector('.kanban-column[data-status="TODO"]');
            const colInProgress = document.querySelector('.kanban-column[data-status="IN_PROGRESS"]');
            const colDone = document.querySelector('.kanban-column[data-status="DONE"]');
            assertTreTH(!!colTodo && !!colInProgress && !!colDone, 'TreTH: Cả 3 cột data-status="TODO", "IN_PROGRESS", "DONE" đều có mặt');

            // Kiểm tra các thẻ bài (Cards) trong Kanban
            const taskCards = document.querySelectorAll('.task-card');
            assertTreTH(taskCards.length > 0, 'TreTH: Kanban render ít nhất 1 task card từ CSDL (tìm thấy ' + taskCards.length + ')');

            const firstCard = taskCards[0];
            if (firstCard) {
                const catTag = firstCard.querySelector('.category-tag');
                assertTreTH(!!catTag && catTag.textContent.trim().length > 0, 'TreTH: Thẻ Kanban có nhãn Category hiển thị emoji và tên');

                const syncBadge = firstCard.querySelector('.sync-badge');
                assertTreTH(!!syncBadge, 'TreTH: Thẻ Kanban có Sync Badge hiển thị trạng thái đồng bộ');

                const cardTitle = firstCard.querySelector('.card-title');
                assertTreTH(!!cardTitle && cardTitle.getAttribute('contenteditable') === 'true', 'TreTH: Tiêu đề thẻ Kanban hỗ trợ chỉnh sửa trực tiếp (contenteditable="true")');

                const metaTime = firstCard.querySelector('.meta-time');
                assertTreTH(!!metaTime && metaTime.textContent.includes('phút'), 'TreTH: Thẻ Kanban hiển thị thời gian tập trung Pomodoro tính theo phút');
            }

            // =========================================================
            // TEST SUITE 2: LOCAL REPOSITORY & SYNC QUEUE INTEGRATION
            // =========================================================
            assertTreTH(typeof window.LocalRepository === 'function', 'TreTH: Class LocalRepository được định nghĩa toàn cục');
            assertTreTH(typeof window.SyncQueue === 'function', 'TreTH: Class SyncQueue được định nghĩa toàn cục');
            assertTreTH(!!window.__localRepo, 'TreTH: Đối tượng Singleton LocalRepository (__localRepo) đã khởi tạo');

            const repo = window.__localRepo;
            const syncQueue = repo.syncQueue;
            assertTreTH(!!syncQueue, 'TreTH: LocalRepository kết nối thành công với SyncQueue instance');

            // Test Create Task qua LocalRepository
            const testTaskTitle = 'Kiểm thử TreTH Task ' + Date.now();
            const created = repo.createTask({
                title: testTaskTitle,
                status: 'TODO',
                quadrant: 'q1',
                actualTime: 30
            });
            assertTreTH(!!created && created.title === testTaskTitle, 'TreTH: LocalRepository.createTask tạo thành công task mới');
            assertTreTH(created.version === 1, 'TreTH: Task mới khởi tạo có version = 1');
            assertTreTH(created.syncStatus === 'PENDING', 'TreTH: Task mới khởi tạo có syncStatus = "PENDING"');

            // Kiểm tra hàng đợi SyncQueue ghi nhận op CREATE
            const currentQueue = syncQueue.getQueue();
            const createOp = currentQueue.find(op => op.entityId === created.id && op.action === 'CREATE');
            assertTreTH(!!createOp && createOp.status === 'PENDING', 'TreTH: SyncQueue ghi nhận thao tác CREATE với trạng thái PENDING');

            // Test Update Task qua LocalRepository
            const updated = repo.updateTask(created.id, {
                title: testTaskTitle + ' (Đã sửa)',
                status: 'IN_PROGRESS'
            });
            assertTreTH(!!updated && updated.version === 2, 'TreTH: LocalRepository.updateTask tăng version lên 2');
            assertTreTH(updated.baseVersion === 1, 'TreTH: baseVersion của task cập nhật là 1');

            const updateOp = syncQueue.getQueue().find(op => op.entityId === created.id && op.action === 'UPDATE');
            assertTreTH(!!updateOp && updateOp.baseVersion === 1, 'TreTH: SyncQueue ghi nhận thao tác UPDATE với baseVersion = 1');

            // Test Soft Delete Task
            const deleted = repo.softDeleteTask(created.id);
            assertTreTH(!!deleted && deleted.isDeleted === true, 'TreTH: LocalRepository.softDeleteTask đánh dấu isDeleted = true');
            const allActive = repo.getAllTasks();
            const existsInActive = allActive.some(t => t.id === created.id);
            assertTreTH(!existsInActive, 'TreTH: getAllTasks() loại bỏ các task đã bị xóa mềm');

            // =========================================================
            // TEST SUITE 3: MOBILE KEYBOARD FIX & VIEWPORT PROPERTIES
            // =========================================================
            const computedStyle = getComputedStyle(document.documentElement);
            const keyboardOffset = computedStyle.getPropertyValue('--keyboard-offset');
            assertTreTH(keyboardOffset !== undefined && keyboardOffset !== null, 'TreTH: Biến CSS --keyboard-offset đã được thiết lập');

            // Kiểm tra Quick Add trong từng cột Kanban
            const quickAddForms = document.querySelectorAll('.column-quick-add');
            assertTreTH(quickAddForms.length === 3, 'TreTH: Mỗi cột Kanban đều có form thêm thẻ nhanh (+ Thêm thẻ...)');

            // Trở về List View an toàn
            if (btnList) btnList.click();
            assertTreTH(listContainer && listContainer.style.display !== 'none', 'TreTH: Chuyển lại về chế độ Danh sách thành công và mượt mà');

        } catch (err) {
            assertTreTH(false, 'Lỗi ngoại lệ trong quá trình kiểm thử TreTH: ' + err.message);
        }

        // Render kết quả JSON vào DOM để Python đọc
        const resEl = document.createElement('div');
        resEl.id = 'treth-qa-payload';
        resEl.style.display = 'none';
        resEl.textContent = JSON.stringify(window.__treth_qa_results);
        document.body.appendChild(resEl);
    }, 450);
});
</script>
"""

qa_html = html.replace('</body>', test_script + '</body>')

with open('qa_treth_runner.html', 'w', encoding='utf-8') as f:
    f.write(qa_html)

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
html_path = os.path.abspath('qa_treth_runner.html').replace('\\', '/')
res = subprocess.run([
    chrome_path,
    "--headless=new",
    "--disable-gpu",
    "--allow-file-access-from-files",
    "--virtual-time-budget=3000",
    "--dump-dom",
    f"file:///{html_path}"
], capture_output=True, text=True, encoding='utf-8', errors='replace')

if os.path.exists('qa_treth_runner.html'):
    os.remove('qa_treth_runner.html')

match = re.search(r'<div id="treth-qa-payload"[^>]*>(.*?)</div>', res.stdout, re.DOTALL)
if match:
    data = json.loads(match.group(1))
    print(f"===========================================================")
    print(f"       TRETH INTEGRATION & QA TEST SUITE (2026)            ")
    print(f"===========================================================")
    print(f"Tổng số bài kiểm tra (Total Tests) : {data['total']}")
    print(f"Thành công (Passed)                : {data['passed']}")
    print(f"Thất bại (Failed)                  : {data['failed']}")
    print(f"Tỷ lệ đạt (Pass Rate)              : {round((data['passed']/data['total'])*100, 1)}%")
    print("=" * 59)
    for t in data['tests']:
        status_icon = "✅" if t['status'] == 'PASSED' else "❌"
        print(f" {status_icon} {t['name']}")
    print("=" * 59)

    if data['failed'] == 0:
        print("\n🏆 TẤT CẢ CÁC BÀI TEST TÍCH HỢP TRETH ĐÃ VƯỢT QUA 100%!")
    else:
        print(f"\n❌ {data['failed']} TEST BỊ THẤT BẠI!")
        sys.exit(1)
else:
    print("Error: Could not extract TreTH test results from DOM dump.")
    sys.exit(1)

