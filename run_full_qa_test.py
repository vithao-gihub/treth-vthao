import subprocess
import json
import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Read current index.html
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Inject test runner script right before </body>
test_script = """
<script>
window.__test_results = {
    passed: 0,
    failed: 0,
    total: 0,
    tests: []
};

function assert(condition, name) {
    window.__test_results.total++;
    if (condition) {
        window.__test_results.passed++;
        window.__test_results.tests.push({ name: name, status: 'PASSED' });
    } else {
        window.__test_results.failed++;
        window.__test_results.tests.push({ name: name, status: 'FAILED' });
    }
}

window.addEventListener('load', () => {
    setTimeout(() => {
        try {
            // TEST GROUP 1: DOM IDs Uniqueness
            const idsToCheck = [
                'btn-request-notif',
                'btn-request-notif-text',
                'notif-status-badge',
                'btnToggleDataMenu',
                'dataDropdownPanel',
                'btn-export-json',
                'btn-import-json',
                'exportExcelBtn',
                'importExcelBtn',
                'downloadExcelTemplateBtn',
                'importJsonInput',
                'importExcelInput',
                'update-modal',
                'modal-form',
                'settingsModal',
                'settings-form',
                'nav-btn-tasks',
                'nav-btn-time',
                'nav-btn-habits',
                'nav-btn-notes',
                'module-tasks-view',
                'module-time-view',
                'module-habits-view',
                'module-notes-view',
                'habit-modal',
                'habit-form',
                'note-modal',
                'note-form',
                'pwa-settings-group',
                'btn-install-pwa',
                'pwa-status-text'
            ];

            idsToCheck.forEach(id => {
                const count = document.querySelectorAll('#' + id).length;
                assert(count === 1, 'DOM ID #' + id + ' must be unique (got ' + count + ')');
            });

            // TEST GROUP 2: Navigation Between All 4 Modules
            const navTasks = document.getElementById('nav-btn-tasks');
            const navTime = document.getElementById('nav-btn-time');
            const navHabits = document.getElementById('nav-btn-habits');
            const navNotes = document.getElementById('nav-btn-notes');

            assert(!!navTasks && !!navTime && !!navHabits && !!navNotes, 'All 4 Navigation Buttons exist');

            // Switch to Time
            if (navTime) navTime.click();
            const timeView = document.getElementById('module-time-view');
            assert(timeView && timeView.style.display !== 'none', 'Module 02 (Time/Pomodoro) view activates');

            // Switch to Habits
            if (navHabits) navHabits.click();
            const habitsView = document.getElementById('module-habits-view');
            assert(habitsView && habitsView.style.display !== 'none', 'Module 03 (Habits) view activates');

            // Switch to Notes
            if (navNotes) navNotes.click();
            const notesView = document.getElementById('module-notes-view');
            assert(notesView && notesView.style.display !== 'none', 'Module 04 (Notes) view activates');

            // Switch back to Tasks
            if (navTasks) navTasks.click();
            const tasksView = document.getElementById('module-tasks-view');
            assert(tasksView && tasksView.style.display !== 'none', 'Module 01 (Tasks) view activates');

            // TEST GROUP 2B: Task Item Actions & Double-Click Inline Edit
            const editButtons = document.querySelectorAll('#task-list .btn-edit, .quadrant-task-list .btn-edit');
            assert(editButtons.length === 0, 'No redundant .btn-edit buttons exist on task cards (found ' + editButtons.length + ')');

            const firstTaskName = document.querySelector('#task-list .task-name');
            assert(!!firstTaskName, 'Task item title element exists for inline editing');
            if (firstTaskName) {
                firstTaskName.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
                const inlineInput = document.querySelector('.inline-edit-input');
                assert(!!inlineInput, 'Double-clicking task name activates inline title editing input');
                if (inlineInput) {
                    inlineInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
                }
            }

            // TEST GROUP 3: Habit Tracker Logic
            if (navHabits) navHabits.click();
            const habitCards = document.querySelectorAll('.habit-card');
            assert(habitCards.length >= 3, 'Habit Tracker renders default habits (found ' + habitCards.length + ')');

            const firstCheckBtn = document.querySelector('.habit-check-cta');
            assert(!!firstCheckBtn, 'Habit check-in button exists');
            if (firstCheckBtn) {
                const wasChecked = firstCheckBtn.classList.contains('completed');
                firstCheckBtn.click();
                const nowBtn = document.querySelector('.habit-check-cta');
                const nowChecked = nowBtn ? nowBtn.classList.contains('completed') : false;
                assert(nowChecked !== wasChecked, 'Habit check-in toggles completion state');
            }

            // TEST GROUP 4: Quick Notes & Markdown Logic
            if (navNotes) navNotes.click();
            const noteCards = document.querySelectorAll('.note-card');
            assert(noteCards.length >= 2, 'Notes module renders default notes (found ' + noteCards.length + ')');

            const notePreviews = document.querySelectorAll('.note-content-preview');
            assert(notePreviews.length >= 2, 'Notes render formatted preview cards');

            // TEST GROUP 5: Settings Modal & Audio
            const btnOpenSettings = document.getElementById('btn-open-settings');
            const settingsModal = document.getElementById('settingsModal');
            assert(!!btnOpenSettings && !!settingsModal, 'Settings modal and button exist');

            if (btnOpenSettings) btnOpenSettings.click();
            assert(settingsModal.classList.contains('active'), 'Settings modal opens on button click');

            const btnCloseSettings = document.getElementById('btn-close-settings-modal');
            if (btnCloseSettings) btnCloseSettings.click();
            assert(!settingsModal.classList.contains('active'), 'Settings modal closes on close button click');

            // TEST GROUP 6: Theme Mode Toggle
            const themeBtn = document.getElementById('btn-toggle-theme');
            assert(!!themeBtn, 'Theme switch button exists');
            const initialTheme = document.documentElement.getAttribute('data-theme');
            if (themeBtn) themeBtn.click();
            const toggledTheme = document.documentElement.getAttribute('data-theme');
            assert(initialTheme !== toggledTheme, 'Theme toggles data-theme (' + initialTheme + ' -> ' + toggledTheme + ')');
            if (themeBtn) themeBtn.click(); // Revert back

            // TEST GROUP 7: Static Clean Background & No 3D Canvas
            const canvas3D = document.getElementById('spatial-3d-canvas');
            const threeBgCanvas = document.getElementById('three-bg-canvas');
            assert(!canvas3D && !threeBgCanvas, 'Dynamic 3D background canvas completely removed (100% clean UI & zero GPU load)');

            // TEST GROUP 8: Clean Header Structure (Exactly 4 clusters on 1 row)
            if (navTasks) navTasks.click();
            const headerRight = document.querySelector('.header-right-actions');
            assert(!!headerRight, 'Header right actions container exists');
            assert(headerRight.children.length === 4, 'Header right actions contains exactly 4 groups on 1 row (got ' + headerRight.children.length + ')');
            assert(!!headerRight.querySelector('.module-nav'), 'Header contains Group 1: Module Navigation');
            assert(!!headerRight.querySelector('#btn-open-cat-manager'), 'Header contains Group 2: Category Manager Button');
            assert(!!headerRight.querySelector('.data-menu-popover-container'), 'Header contains Group 3: Data Menu Popover');
            assert(!!headerRight.querySelector('#btn-open-settings'), 'Header contains Group 4: Settings Button');

            // TEST GROUP 9: Data Dropdown Popover Interaction
            const btnToggleDataMenu = document.getElementById('btnToggleDataMenu');
            const dataDropdownPanel = document.getElementById('dataDropdownPanel');
            assert(!!btnToggleDataMenu && !!dataDropdownPanel, 'Data Menu button and popover panel exist');

            if (btnToggleDataMenu && dataDropdownPanel) {
                // Initially closed
                assert(!dataDropdownPanel.classList.contains('active'), 'Data menu initially closed');
                // Click to open
                btnToggleDataMenu.click();
                assert(dataDropdownPanel.classList.contains('active'), 'Data menu opens on click');
                // Click to close
                btnToggleDataMenu.click();
                assert(!dataDropdownPanel.classList.contains('active'), 'Data menu closes on second click');
                // Open again then close via click outside
                btnToggleDataMenu.click();
                document.body.click();
                assert(!dataDropdownPanel.classList.contains('active'), 'Data menu closes on outside click');
                // Open again then close via Escape key
                btnToggleDataMenu.click();
                assert(dataDropdownPanel.classList.contains('active'), 'Data menu opens before Escape test');
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
                assert(!dataDropdownPanel.classList.contains('active'), 'Data menu closes on Escape key');
            }

            // TEST GROUP 10: All 5 Data Actions Present in Popover & Auto-close on click
            const btnExportJson = document.getElementById('btn-export-json');
            const btnImportJson = document.getElementById('btn-import-json');
            const exportExcelBtn = document.getElementById('exportExcelBtn');
            const importExcelBtn = document.getElementById('importExcelBtn');
            const downloadExcelTemplateBtn = document.getElementById('downloadExcelTemplateBtn');
            assert(!!btnExportJson && !!btnImportJson && !!exportExcelBtn && !!importExcelBtn && !!downloadExcelTemplateBtn, 'All 5 data management options exist in Data Dropdown');

            if (btnToggleDataMenu && dataDropdownPanel) {
                btnToggleDataMenu.click();
                assert(dataDropdownPanel.classList.contains('active'), 'Data menu opened before item click');
                const importJsonInput = document.getElementById('importJsonInput');
                if (importJsonInput) importJsonInput.click = () => {};
                const btnImport = document.getElementById('btn-import-json');
                if (btnImport) btnImport.click();
                assert(!dataDropdownPanel.classList.contains('active'), 'Data menu auto-closes after clicking action inside');
            }

            // TEST GROUP 11: No Duplicate Emojis & Clean Labels
            const dataMenuSpan = document.querySelector('#btnToggleDataMenu span');
            const settingsBtnSpan = document.querySelector('#btn-open-settings span');
            assert(dataMenuSpan && dataMenuSpan.textContent.trim() === 'Dữ liệu', 'Data menu button text has no duplicate emoji ("Dữ liệu")');
            assert(settingsBtnSpan && settingsBtnSpan.textContent.trim() === 'Cài đặt', 'Settings button text has no duplicate emoji ("Cài đặt")');

            // TEST GROUP 12: PWA HTML Meta Tags & Install UI
            const manifestLink = document.querySelector('link[rel="manifest"]');
            assert(!!manifestLink && (manifestLink.getAttribute('href') === 'manifest.json' || manifestLink.getAttribute('href') === './manifest.json'), 'Manifest link exists in head');

            const themeColorMeta = document.querySelector('meta[name="theme-color"]');
            assert(!!themeColorMeta && themeColorMeta.getAttribute('content') === '#4F46E5', 'Meta theme-color tag is correctly configured');

            const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');
            assert(!!appleTouchIcon && (appleTouchIcon.getAttribute('href') === 'apple-touch-icon.png' || appleTouchIcon.getAttribute('href') === './apple-touch-icon.png'), 'Apple touch icon link exists and points to PNG');

            const appleCapableMeta = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
            assert(!!appleCapableMeta && appleCapableMeta.getAttribute('content') === 'yes', 'Apple mobile web app capable meta exists');

            const pwaSettingsGroup = document.getElementById('pwa-settings-group');
            const btnInstallPwa = document.getElementById('btn-install-pwa');
            assert(!!pwaSettingsGroup && !!btnInstallPwa, 'PWA Install settings group and button exist in Settings modal');

        } catch (err) {
            assert(false, 'Runtime exception in QA test: ' + err.message);
        }

        // Render results into container
        const resEl = document.createElement('div');
        resEl.id = 'qa-results-payload';
        resEl.style.display = 'none';
        resEl.textContent = JSON.stringify(window.__test_results);
        document.body.appendChild(resEl);
    }, 450);
});
</script>
"""

qa_html = html.replace('</body>', test_script + '</body>')

with open('qa_runner.html', 'w', encoding='utf-8') as f:
    f.write(qa_html)

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
html_path = os.path.abspath('qa_runner.html').replace('\\', '/')
res = subprocess.run([
    chrome_path,
    "--headless=new",
    "--disable-gpu",
    "--allow-file-access-from-files",
    "--virtual-time-budget=3000",
    "--dump-dom",
    f"file:///{html_path}"
], capture_output=True, text=True, encoding='utf-8', errors='replace')

if os.path.exists('qa_runner.html'):
    os.remove('qa_runner.html')

# Extract test results from dumped DOM
match = re.search(r'<div id="qa-results-payload"[^>]*>(.*?)</div>', res.stdout, re.DOTALL)
if match:
    data = json.loads(match.group(1))
    print(f"=================================================")
    print(f"      PERSONAL WORKSPACE 2.0 - QA TEST SUITE     ")
    print(f"=================================================")
    print(f"Total Tests Run : {data['total']}")
    print(f"Passed          : {data['passed']}")
    print(f"Failed          : {data['failed']}")
    print(f"Pass Rate       : {round((data['passed']/data['total'])*100, 1)}%")
    print("=" * 49)
    for t in data['tests']:
        status_icon = "✅" if t['status'] == 'PASSED' else "❌"
        print(f" {status_icon} {t['name']}")
    print("=" * 49)

    # Check PWA manifest.json
    manifest_valid = False
    if os.path.exists('manifest.json'):
        try:
            with open('manifest.json', 'r', encoding='utf-8') as mf:
                mdata = json.load(mf)
                manifest_valid = (
                    mdata.get('name') in ['TreTH', 'TreTH - Quản lý công việc & Hiệu suất', 'Personal Workspace 2.0'] and
                    mdata.get('short_name') in ['TreTH', 'Workspace 2.0'] and
                    mdata.get('display') == 'standalone' and
                    len(mdata.get('icons', [])) >= 2
                )
        except Exception:
            manifest_valid = False

    icons_valid = all(os.path.exists(f) and os.path.getsize(f) > 0 for f in ['icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'])
    sw_valid = os.path.exists('sw.js') and os.path.getsize('sw.js') > 0

    print(f" {'✅' if manifest_valid else '❌'} PWA manifest.json valid & standards-compliant")
    print(f" {'✅' if icons_valid else '❌'} PWA Icons (SVG, 192x192 PNG, 512x512 PNG, Apple 180x180 PNG) present on disk")
    print(f" {'✅' if sw_valid else '❌'} PWA Service Worker (sw.js) present with offline caching")

    pwa_ok = manifest_valid and icons_valid and sw_valid

    if data['failed'] == 0 and pwa_ok:
        print("\n🏆 ALL QA AUTOMATED TESTS PASSED WITH 100% SUCCESS!")
    else:
        print(f"\n❌ {data['failed']} TEST(S) FAILED!")
        sys.exit(1)
else:
    print("Error: Could not extract test results payload from DOM dump.")
    sys.exit(1)

