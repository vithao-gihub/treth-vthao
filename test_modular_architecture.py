# -*- coding: utf-8 -*-
"""
TreTH - Modular Architecture, Single Source of Truth & Cloud Sync Test Suite
Kiểm tra tính toàn vẹn của cấu trúc mô-đun hóa mới, LocalRepository là Source of Truth,
và tầng Abstraction Cloud Sync đa thiết bị.
"""
import os
import sys
import subprocess
import json
import re

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(ROOT_DIR, 'index.html'), 'r', encoding='utf-8') as f:
    html_content = f.read()

test_script = """
<script>
window.__modular_test_results = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
};

function assertMod(condition, name, detail) {
    window.__modular_test_results.total++;
    if (condition) {
        window.__modular_test_results.passed++;
        window.__modular_test_results.tests.push({ name: name, status: 'PASSED', detail: detail || '' });
    } else {
        window.__modular_test_results.failed++;
        window.__modular_test_results.tests.push({ name: name, status: 'FAILED', detail: detail || '' });
    }
}

window.addEventListener('load', async () => {
    try {
        // =====================================================================
        // TEST 1: KIỂM TRA TỒN TẠI CỦA CÁC CLASS VÀ SINGLETON TOÀN CỤC
        // =====================================================================
        assertMod(typeof window.LocalRepository === 'function', "LocalRepository class tồn tại toàn cục");
        assertMod(typeof window.SyncQueue === 'function', "SyncQueue class tồn tại toàn cục");
        assertMod(typeof window.CloudSyncService === 'function', "CloudSyncService class tồn tại toàn cục");
        assertMod(typeof window.TasksModule === 'function', "TasksModule class tồn tại toàn cục");
        assertMod(typeof window.PomodoroModule === 'function', "PomodoroModule class tồn tại toàn cục");
        assertMod(typeof window.HabitsModule === 'function', "HabitsModule class tồn tại toàn cục");
        assertMod(typeof window.NotesModule === 'function', "NotesModule class tồn tại toàn cục");
        assertMod(typeof window.StatsModule === 'function', "StatsModule class tồn tại toàn cục");
        assertMod(typeof window.SettingsModule === 'function', "SettingsModule class tồn tại toàn cục");

        assertMod(!!window.TreTH, "Singleton window.TreTH tồn tại");
        assertMod(!!window.TreTH.repo, "window.TreTH.repo kết nối LocalRepository");
        assertMod(!!window.TreTH.sync, "window.TreTH.sync kết nối CloudSyncService");
        assertMod(!!window.TreTH.tasks, "window.TreTH.tasks kết nối TasksModule");
        assertMod(!!window.TreTH.pomodoro, "window.TreTH.pomodoro kết nối PomodoroModule");
        assertMod(!!window.TreTH.habits, "window.TreTH.habits kết nối HabitsModule");
        assertMod(!!window.TreTH.notes, "window.TreTH.notes kết nối NotesModule");
        assertMod(!!window.TreTH.stats, "window.TreTH.stats kết nối StatsModule");
        assertMod(!!window.TreTH.settings, "window.TreTH.settings kết nối SettingsModule");

        const repo = window.TreTH.repo;

        // =====================================================================
        // TEST 2: LOCALREPOSITORY LÀ SINGLE SOURCE OF TRUTH TOÀN DIỆN
        // =====================================================================
        // 2.1 Tasks
        const tTask = repo.createTask({ title: "Mod Task 1", quadrant: "q1", priority: "high" });
        assertMod(!!tTask && tTask.title === "Mod Task 1", "LocalRepository tạo công việc thành công");
        assertMod(tTask.version === 1 && tTask.syncStatus === "PENDING", "Task mới có version = 1 và syncStatus = PENDING");

        const tUpdated = repo.updateTask(tTask.id, { title: "Mod Task 1 Updated" });
        assertMod(tUpdated.version === 2 && tUpdated.baseVersion === 1, "Cập nhật task tăng version lên 2, baseVersion là 1");

        // 2.2 Habits
        const tHabit = repo.createHabit({ title: "Mod Habit 1", category: "Sức khỏe" });
        assertMod(!!tHabit && tHabit.title === "Mod Habit 1", "LocalRepository tạo thói quen thành công");
        const checkedHabit = repo.toggleHabitCheckin(tHabit.id);
        assertMod(checkedHabit && checkedHabit.streak >= 1, "LocalRepository điểm danh thói quen và tính streak");

        // 2.3 Notes
        const tNote = repo.createNote({ title: "Mod Note 1", tags: ["Test"], content: "# Content" });
        assertMod(!!tNote && tNote.title === "Mod Note 1", "LocalRepository tạo ghi chú thành công");
        const updatedNote = repo.updateNote(tNote.id, { isPinned: true });
        assertMod(updatedNote && updatedNote.isPinned === true, "LocalRepository ghim ghi chú thành công");

        // 2.4 Pomodoro
        const initialPomo = repo.getPomoStats();
        const bumpedPomo = repo.incrementPomoCycle(25, tTask.id);
        assertMod(bumpedPomo.completedCycles === (initialPomo.completedCycles || 0) + 1, "LocalRepository ghi nhận chu kỳ Pomodoro vào CSDL");
        const taskAfterPomo = repo.getTaskById(tTask.id);
        assertMod(taskAfterPomo && taskAfterPomo.actualTime >= 25, "Pomodoro tự động tích lũy thời gian thực tế vào Task");

        // 2.5 Preferences & Export/Import
        repo.setTheme("dark");
        assertMod(repo.getTheme() === "dark", "LocalRepository lưu Theme vào LocalStorage");
        const exportedAll = repo.exportAllData();
        assertMod(!!exportedAll.tasks && !!exportedAll.habits && !!exportedAll.notes, "LocalRepository exportAllData tổng hợp đầy đủ các domain");

        // =====================================================================
        // TEST 3: CLOUD SYNC & MULTI-DEVICE ABSTRACTION
        // =====================================================================
        const cloudSync = window.TreTH.sync;
        assertMod(!!cloudSync, "CloudSyncService đã khởi tạo");
        const syncState = cloudSync.getState();
        assertMod(typeof syncState.pendingCount === 'number', "CloudSyncService báo cáo số lượng pending operations");

        // Conflict Resolver
        const resolver = new window.CloudSyncService.ConflictResolver();
        const localEntity = { id: "c1", version: 2, updatedAt: 1000, title: "Local" };
        const remoteEntity = { id: "c1", version: 3, updatedAt: 2000, title: "Remote" };
        const resolved = resolver.resolve(localEntity, remoteEntity);
        assertMod(resolved.title === "Remote", "ConflictResolver tự động chọn bản ghi mới hơn (Last-Write-Wins)");

        // Thực hiện sync thử nghiệm với MockCloudProvider
        const syncRes = await cloudSync.sync();
        assertMod(syncRes.success === true, "Tiến trình CloudSyncService.sync() thực thi thành công");

        // =====================================================================
        // TEST 4: KIỂM TRA CÁC DOMAIN MODULE CHỨC NĂNG
        // =====================================================================
        // 4.1 TasksModule Smart NLP
        const tasksMod = window.TreTH.tasks;
        const nlpRes = tasksMod.parseSmartInput("Gặp đối tác hôm nay !gap #q1 ~25p");
        assertMod(nlpRes.priority === "high" && nlpRes.quadrant === "q1" && nlpRes.estimatedMinutes === 25, "TasksModule Smart NLP bóc tách ngày, độ ưu tiên, góc ma trận và phút");

        // 4.2 PomodoroModule
        const pomoMod = window.TreTH.pomodoro;
        assertMod(pomoMod.formatTime() === "25:00", "PomodoroModule định dạng thời gian ban đầu chuẩn 25:00");
        pomoMod.switchMode("shortBreak");
        assertMod(pomoMod.currentMode === "shortBreak" && pomoMod.formatTime() === "05:00", "PomodoroModule chuyển chế độ sang Nghỉ ngắn 05:00");
        pomoMod.switchMode("work");

        // 4.3 HabitsModule
        const habitsMod = window.TreTH.habits;
        const last7 = habitsMod.getLast7DaysHistory(tHabit);
        assertMod(Array.isArray(last7) && last7.length === 7, "HabitsModule sinh mảng lịch sử 7 ngày chính xác");

        // 4.4 NotesModule Markdown Parser
        const notesMod = window.TreTH.notes;
        const parsedHtml = notesMod.parseMarkdown("# Tiêu đề\\n- [x] Việc xong\\n**In đậm**");
        assertMod(parsedHtml.includes('<h1') && parsedHtml.includes('☑') && parsedHtml.includes('<strong>In đậm</strong>'), "NotesModule phân tích cú pháp Markdown chuẩn xác");

        // 4.5 StatsModule Pure SVG Donut
        const statsMod = window.TreTH.stats;
        const svgMarkup = statsMod.generateSvgDonutMarkup([
            { label: "A", count: 10, color: "#10B981" },
            { label: "B", count: 20, color: "#3B82F6" }
        ], "30");
        assertMod(svgMarkup.includes('<svg') && svgMarkup.includes('<circle') && svgMarkup.includes('stroke-dasharray'), "StatsModule tạo mã nguồn biểu đồ Donut SVG thuần");

        // 4.6 SettingsModule
        const settingsMod = window.TreTH.settings;
        const initialTheme = settingsMod.getTheme();
        const toggled = settingsMod.toggleTheme();
        assertMod(toggled !== initialTheme, "SettingsModule chuyển đổi giao diện sáng/tối thành công");
        settingsMod.setTheme(initialTheme); // Khôi phục lại

    } catch (err) {
        assertMod(false, "Lỗi thực thi kiểm thử mô-đun: " + err.message, err.stack);
    }

    const payloadEl = document.createElement('div');
    payloadEl.id = 'modular-test-payload';
    payloadEl.style.display = 'none';
    payloadEl.textContent = JSON.stringify(window.__modular_test_results);
    document.body.appendChild(payloadEl);
});
</script>
"""

# Chèn test_script vào trước </body>
modified_html = html_content.replace('</body>', test_script + '\n</body>')

temp_html_path = os.path.join(ROOT_DIR, 'test_modular_runner.html')
with open(temp_html_path, 'w', encoding='utf-8') as f:
    f.write(modified_html)

chrome_paths = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe")
]
chrome_bin = next((p for p in chrome_paths if os.path.exists(p)), None)

if not chrome_bin:
    print("❌ Không tìm thấy trình duyệt Chrome để chạy bài kiểm tra.")
    sys.exit(1)

html_url = "file:///" + os.path.abspath(temp_html_path).replace('\\', '/')

proc = subprocess.run(
    [
        chrome_bin,
        "--headless=new",
        "--disable-gpu",
        "--allow-file-access-from-files",
        "--virtual-time-budget=5000",
        "--dump-dom",
        html_url
    ],
    capture_output=True,
    text=True,
    encoding='utf-8',
    errors='replace'
)

# Xóa file temp
if os.path.exists(temp_html_path):
    os.remove(temp_html_path)

match = re.search(r'<div id="modular-test-payload"[^>]*>(.*?)</div>', proc.stdout, re.DOTALL)

print("=" * 70)
print(" TRETH: KIỂM THỬ KIẾN TRÚC MÔ-ĐUN HÓA & CLOUD SYNC ABSTRACTION")
print("=" * 70)

if match:
    data = json.loads(match.group(1))
    print(f"Tổng số bài kiểm tra (Total Tests) : {data['total']}")
    print(f"Thành công (Passed)                : {data['passed']}")
    print(f"Thất bại (Failed)                  : {data['failed']}")
    pass_rate = round((data['passed'] / data['total']) * 100, 1) if data['total'] > 0 else 0
    print(f"Tỷ lệ đạt (Pass Rate)              : {pass_rate}%")
    print("=" * 70)

    for t in data['tests']:
        status_icon = "✅" if t['status'] == 'PASSED' else "❌"
        print(f" {status_icon} {t['name']}")

    print("=" * 70)
    if data['failed'] == 0:
        print("🏆 TẤT CẢ CÁC BÀI TEST KIẾN TRÚC MÔ-ĐUN HÓA ĐÃ VƯỢT QUA 100%!")
        sys.exit(0)
    else:
        print(f"⚠️ Có {data['failed']} bài test thất bại.")
        sys.exit(1)
else:
    print("❌ Không trích xuất được kết quả kiểm thử từ DOM.")
    sys.exit(1)
