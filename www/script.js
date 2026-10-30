document.addEventListener('DOMContentLoaded', () => {
    // Chốt chặn an toàn chống khởi tạo kép nếu script vô tình được nạp nhiều lần
    if (window.__PERSONAL_WORKSPACE_INITIALIZED__) return;
    window.__PERSONAL_WORKSPACE_INITIALIZED__ = true;

    // =========================================================================
    // MOBILE VIRTUAL KEYBOARD, VISUAL VIEWPORT & DEBOUNCE UTILITIES
    // =========================================================================
    function debounce(fn, delay = 150) {
        let timer = null;
        return function (...args) {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    let isInputComposing = false;
    window.__isInputComposing = false;

    document.addEventListener('compositionstart', () => {
        isInputComposing = true;
        window.__isInputComposing = true;
    }, true);

    document.addEventListener('compositionupdate', () => {
        isInputComposing = true;
        window.__isInputComposing = true;
    }, true);

    document.addEventListener('compositionend', (e) => {
        isInputComposing = false;
        window.__isInputComposing = false;
        if (e.target && (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable)) {
            e.target.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }, true);

    // =========================================================================
    // GLOBAL BACKSPACE & KEYBOARD GUARD (BẢO VỆ PHÍM BACKSPACE / DELETE)
    // =========================================================================
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' || e.key === 'Delete' || e.keyCode === 8 || e.keyCode === 46) {
            const activeEl = document.activeElement;
            if (activeEl && (['INPUT', 'TEXTAREA'].includes(activeEl.tagName) || activeEl.isContentEditable)) {
                return;
            }
        }
    }, true);

    // Gỡ bỏ các thuộc tính cản trở bộ đệm IME (Telex/VNI) và bàn phím ảo trên Mobile
    document.querySelectorAll('input, textarea').forEach(el => {
        el.removeAttribute('autocorrect');
        el.removeAttribute('autocapitalize');
        el.removeAttribute('spellcheck');
    });

    // Bộ điều khiển Toàn cục Bàn phím ảo & Khung nhìn Di động (VisualViewport + Focus Auto-Scroll)
    (function setupGlobalMobileKeyboardController() {
        if (window.__trethMobileKeyboardSetup) return;
        window.__trethMobileKeyboardSetup = true;

        let scrollTimer = null;
        let lastKeyboardOffset = 0;

        function isEditableInput(el) {
            if (!el || el === document.body || el === document.documentElement) return false;
            if (el.isContentEditable || el.getAttribute?.('contenteditable') === 'true') return true;
            const tag = (el.tagName || '').toUpperCase();
            if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
            if (tag === 'INPUT') {
                const type = (el.type || 'text').toLowerCase();
                return !['checkbox', 'radio', 'range', 'color', 'file', 'button', 'submit', 'reset', 'hidden'].includes(type);
            }
            return false;
        }

        function ensureElementVisibleAboveKeyboard(el) {
            if (!isEditableInput(el)) return;
            if (window.innerWidth > 900) return;
            try {
                const vvHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
                const vvTop = window.visualViewport ? window.visualViewport.offsetTop : 0;
                const rect = el.getBoundingClientRect();
                const safeTop = vvTop + 20;
                const safeBottom = vvTop + vvHeight - 64;

                if (rect.bottom > safeBottom || rect.top < safeTop) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                }
            } catch (_) {}
        }

        function updateViewportKeyboardState() {
            const vv = window.visualViewport;
            const offset = vv
                ? Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
                : 0;

            document.documentElement.style.setProperty('--keyboard-offset', `${offset}px`);
            const isOpen = offset > 90 || (window.innerWidth <= 900 && isEditableInput(document.activeElement));
            document.documentElement.classList.toggle('is-keyboard-open', isOpen);
            if (document.body) {
                document.body.classList.toggle('is-keyboard-open', isOpen);
            }

            if (offset > 90 && lastKeyboardOffset <= 60 && isEditableInput(document.activeElement)) {
                const activeEl = document.activeElement;
                if (scrollTimer) clearTimeout(scrollTimer);
                scrollTimer = setTimeout(() => ensureElementVisibleAboveKeyboard(activeEl), 120);
            }
            lastKeyboardOffset = offset;
        }

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', updateViewportKeyboardState);
            window.visualViewport.addEventListener('scroll', updateViewportKeyboardState);
        }

        document.addEventListener('focusin', (e) => {
            const target = e.target;
            if (!isEditableInput(target)) return;
            target.removeAttribute?.('autocorrect');
            target.removeAttribute?.('autocapitalize');
            target.removeAttribute?.('spellcheck');

            if (window.innerWidth <= 900) {
                document.documentElement.classList.add('is-keyboard-open');
                if (document.body) document.body.classList.add('is-keyboard-open');
                if (scrollTimer) clearTimeout(scrollTimer);
                scrollTimer = setTimeout(() => ensureElementVisibleAboveKeyboard(target), 180);
            }
        }, true);

        document.addEventListener('focusout', () => {
            setTimeout(() => {
                if (!isEditableInput(document.activeElement)) {
                    updateViewportKeyboardState();
                }
            }, 120);
        }, true);
    })();

    function safeConfirm(_message) {
        return true;
    }
    window.__trethSafeConfirm = safeConfirm;

    // =========================================================================
    // 1. KHAI BÁO CÁC PHẦN TỬ DOM (DOM ELEMENTS)
    // =========================================================================
    // Cài đặt, Sao lưu & Khôi phục
    const btnToggleDataMenu = document.getElementById('btnToggleDataMenu');
    const dataDropdownPanel = document.getElementById('dataDropdownPanel');
    const btnExportJson = document.getElementById('btn-export-json');
    const btnImportJson = document.getElementById('btn-import-json');
    const importJsonInput = document.getElementById('importJsonInput');
    const btnOpenSettings = document.getElementById('btn-open-settings');
    const settingsModal = document.getElementById('settingsModal') || document.getElementById('settings-modal');
    const btnCloseSettingsModal = document.getElementById('btn-close-settings-modal');
    const settingsForm = document.getElementById('settings-form');
    const settingFocusTime = document.getElementById('setting-focus-time');
    const settingShortBreak = document.getElementById('setting-short-break');
    const settingLongBreak = document.getElementById('setting-long-break');
    const settingEnableSound = document.getElementById('setting-enable-sound');
    const btnResetSettings = document.getElementById('btn-reset-settings');

        // Giao diện Sáng / Tối (Theme Toggle)
    const THEME_STORAGE_KEY = 'personal_workspace_theme_v1';
    const btnToggleTheme = document.getElementById('btn-toggle-theme');
    const themeToggleIcon = document.getElementById('theme-toggle-icon');
    const themeToggleText = document.getElementById('theme-toggle-text');

    // Thông báo đẩy trình duyệt (Web Notification)
    const btnRequestNotif = document.getElementById('btn-request-notif');
    const btnRequestNotifText = document.getElementById('btn-request-notif-text');
    const btnPomoNotifToggle = document.getElementById('btn-pomo-notif-toggle');
    const pomoNotifBtnText = document.getElementById('pomo-notif-btn-text');
    const notifStatusBadge = document.getElementById('notif-status-badge');
    const DEFAULT_DOCUMENT_TITLE = 'TreTH - Quản lý công việc & Hiệu suất';

    // Header & Điều hướng Tab
    const navBtnTasks = document.getElementById('nav-btn-tasks');
    const navBtnCalendar = document.getElementById('nav-btn-calendar');
    const navBtnTime = document.getElementById('nav-btn-time');
    const navBtnHabits = document.getElementById('nav-btn-habits');
    const navBtnNotes = document.getElementById('nav-btn-notes');
    const navBtnAnalytics = document.getElementById('nav-btn-analytics');
    let currentActiveModule = 'tasks';
    let currentSmartFilter = 'all';
    let analyticsTimeRange = 'all';
    const headerModuleBadge = document.getElementById('header-module-badge');
    const headerModuleTitle = document.getElementById('header-module-title');
    const headerModuleSlogan = document.getElementById('header-module-slogan');
    const moduleTasksView = document.getElementById('module-tasks-view');
    const moduleCalendarView = document.getElementById('module-calendar-view');
    const moduleTimeView = document.getElementById('module-time-view');
    const moduleHabitsView = document.getElementById('module-habits-view');
    const moduleNotesView = document.getElementById('module-notes-view');
    const moduleAnalyticsView = document.getElementById('module-analytics-view');

    // Form tạo công việc chính
    const taskForm = document.getElementById('task-form');
    const titleInput = document.getElementById('task-title');
    const categoryInput = document.getElementById('task-category');
    const priorityInput = document.getElementById('task-priority');
    const dueDateInput = document.getElementById('task-due-date');
    const recurringInput = document.getElementById('taskRecurringInput') || document.getElementById('task-recurring');
    const quadrantInput = document.getElementById('task-quadrant');

    // Không gian hiển thị Công việc (List View & Matrix View)
    const tasksWorkspace = document.getElementById('tasks-workspace');
    const listViewContainer = document.getElementById('list-view-container');
    const matrixViewContainer = document.getElementById('matrix-view-container');
    const taskListEl = document.getElementById('task-list');

    const matrixLists = {
        q1: document.getElementById('matrix-list-q1'),
        q2: document.getElementById('matrix-list-q2'),
        q3: document.getElementById('matrix-list-q3'),
        q4: document.getElementById('matrix-list-q4')
    };
    const matrixCounts = {
        q1: document.getElementById('count-q1'),
        q2: document.getElementById('count-q2'),
        q3: document.getElementById('count-q3'),
        q4: document.getElementById('count-q4')
    };
    const quadrantCards = document.querySelectorAll('.quadrant-card');
    const quickAddForms = document.querySelectorAll('.quadrant-quick-add');

    // Dashboard Thống kê Mini 4 ô
    const statTotalEl = document.getElementById('stat-total');
    const statCompletedEl = document.getElementById('stat-completed');
    const statPendingEl = document.getElementById('stat-pending');
    const statProgressTextEl = document.getElementById('stat-progress-text');
    const statProgressBarEl = document.getElementById('stat-progress-bar');
        const statUrgentEl = document.getElementById('stat-urgent');

    // Thanh Tìm kiếm & Bộ lọc Popover Gom Gọn (Unified Compact Filter)
    const filterKeywordInput = document.getElementById('filterKeywordInput') || document.getElementById('search-task-input');
    const searchTaskInput = filterKeywordInput;
    const filterBtns = document.querySelectorAll('.filter-btn');
    const filterPopoverContainer = document.getElementById('filterPopoverContainer');
    const btnToggleFilterDropdown = document.getElementById('btnToggleFilterDropdown');
    const filterDropdownPanel = document.getElementById('filterDropdownPanel');
    const btnCloseFilterPanel = document.getElementById('btnCloseFilterPanel');
    const btnApplyFilter = document.getElementById('btnApplyFilter');
    const filterCategorySelect = document.getElementById('filterCategorySelect') || document.getElementById('filter-category');
    const filterPrioritySelect = document.getElementById('filterPrioritySelect') || document.getElementById('filter-priority');
    const filterDueDateSelect = document.getElementById('filterDueDateSelect') || document.getElementById('filter-due-date');
    const filterStatusSelect = document.getElementById('filterStatusSelect') || document.getElementById('filter-status');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn') || document.getElementById('btn-reset-filters');
    const activeFiltersBadge = document.getElementById('activeFiltersBadge');
    const activeFilterChipsContainer = document.getElementById('activeFilterChipsContainer');
    const activeFilterChipsList = document.getElementById('activeFilterChipsList');
    const btnClearAllFilterChips = document.getElementById('btnClearAllFilterChips');
    const taskSortSelect = document.getElementById('taskSortSelect');
    const btnViewList = document.getElementById('btn-view-list');
    const btnViewMatrix = document.getElementById('btn-view-matrix');
    const btnViewKanban = document.getElementById('btn-view-kanban');
    const btnViewCalendar = document.getElementById('btn-view-calendar');
    const kanbanViewContainer = document.getElementById('kanban-view-container');
    const calendarViewContainer = document.getElementById('calendar-view-container');

    // Modal 1: Cập nhật thông tin bổ sung khi thêm nhanh
    const updateModal = document.getElementById('update-modal');
    const modalForm = document.getElementById('modal-form');
    const modalTaskNameEl = document.getElementById('modal-task-name');
    const modalCategoryInput = document.getElementById('modal-category');
    const modalPriorityInput = document.getElementById('modal-priority');
    const modalDueDateInput = document.getElementById('modal-due-date');
    const modalRecurringInput = document.getElementById('modalRecurringInput') || document.getElementById('modal-recurring');
    const modalQuadrantInput = document.getElementById('modal-quadrant');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnSkipModal = document.getElementById('btn-skip-modal');

    // Modal 2: Quản lý Loại việc (Category Manager)
    const btnOpenCatManager = document.getElementById('btn-open-cat-manager');
    const categoryModal = document.getElementById('category-modal');
    const btnCloseCatModal = document.getElementById('btn-close-cat-modal');
    const categoryForm = document.getElementById('category-form');
    const catFormModeLabel = document.getElementById('cat-form-mode-label');
    const btnCancelCatEdit = document.getElementById('btn-cancel-cat-edit');
    const catIconInput = document.getElementById('cat-icon-input');
    const catNameInput = document.getElementById('cat-name-input');
    const catColorInput = document.getElementById('cat-color-input');
    const btnSaveCategory = document.getElementById('btn-save-category');
    const emojiSuggestions = document.getElementById('emoji-suggestions');
    const categoryManagerListEl = document.getElementById('category-manager-list');
    const catLivePreview = document.getElementById('cat-live-preview');
    const catPreviewIcon = document.getElementById('cat-preview-icon');
    const catPreviewName = document.getElementById('cat-preview-name');

    // Module 2: Đồng hồ Pomodoro & Theo dõi Thời gian
    const focusTaskSelect = document.getElementById('focus-task-select');
    const focusTaskMinutesEl = document.getElementById('focus-task-minutes');
    const btnCompleteFocusedTask = document.getElementById('btn-complete-focused-task');
    const focusTaskMetaBar = document.getElementById('focus-task-meta-bar');
    const focusMetaCategory = document.getElementById('focus-meta-category');
    const focusMetaQuadrant = document.getElementById('focus-meta-quadrant');
    const focusMetaPriority = document.getElementById('focus-meta-priority');
    const focusMetaDue = document.getElementById('focus-meta-due');

    const pomodoroCard = document.getElementById('pomodoro-card');
    const pomoModeBtns = document.querySelectorAll('.pomo-mode-btn');
    const pomoRingProgress = document.getElementById('pomo-ring-progress');
    const pomoStatusBadge = document.getElementById('pomo-status-badge');
    const pomoTimeDisplay = document.getElementById('pomo-time-display');
    const pomoCycleCounter = document.getElementById('pomo-cycle-counter');
    const btnPomoStart = document.getElementById('btn-pomo-start');
    const btnPomoPause = document.getElementById('btn-pomo-pause');
    const btnPomoReset = document.getElementById('btn-pomo-reset');

    const pomoStatTodayCyclesEl = document.getElementById('pomo-stat-today-cycles');
    const pomoStatTodayMinutesEl = document.getElementById('pomo-stat-today-minutes');
    const totalActualTimeAllEl = document.getElementById('total-actual-time-all');
    const totalTrackedTasksEl = document.getElementById('total-tracked-tasks');
    const timeTrackedListEl = document.getElementById('time-tracked-list');

    // =========================================================================
    // 2. LOCALSTORAGE KEYS CHUẨN HÓA & KHỞI TẠO DỮ LIỆU
    // =========================================================================
    const TASKS_STORAGE_KEY = 'personal_workspace_tasks_v1';
    const CATEGORIES_STORAGE_KEY = 'personal_workspace_categories_v1';
    const VIEW_MODE_STORAGE_KEY = 'personal_workspace_view_mode_v1';
    const POMO_STATS_STORAGE_KEY = 'personal_workspace_pomo_stats_v1';
    const POMO_SETTINGS_STORAGE_KEY = 'personal_workspace_pomo_settings_v1';

    function getTodayISO() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function getOffsetDateISO(daysOffset) {
        const d = new Date();
        d.setDate(d.getDate() + daysOffset);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    const defaultCategories = [
        // 10 Loại việc Hành chính / Công việc v3.1 (Cyber Natural)
        { id: 'cat-bao-cao', name: 'Báo cáo', icon: '📊', iconUrl: 'assets/icons/bao-cao.png', color: '#3B82F6' },
        { id: 'cat-ke-hoach', name: 'Kế hoạch', icon: '📋', iconUrl: 'assets/icons/ke-hoach.png', color: '#6366F1' },
        { id: 'cat-cong-van', name: 'Công văn', icon: '📑', iconUrl: 'assets/icons/cong-van.png', color: '#06B6D4' },
        { id: 'cat-chuong-trinh', name: 'Chương trình', icon: '🎯', iconUrl: 'assets/icons/chuong-trinh.png', color: '#10B981' },
        { id: 'cat-du-thao', name: 'Dự thảo', icon: '📝', iconUrl: 'assets/icons/du-thao.png', color: '#F59E0B' },
        { id: 'cat-hop-gap-go', name: 'Họp & Gặp gỡ', icon: '👥', iconUrl: 'assets/icons/hop-gap-go.png', color: '#8B5CF6' },
        { id: 'cat-y-tuong', name: 'Ý tưởng', icon: '💡', iconUrl: 'assets/icons/y-tuong.png', color: '#EC4899' },
        { id: 'cat-nghien-cuu', name: 'Nghiên cứu', icon: '🔬', iconUrl: 'assets/icons/nghien-cuu.png', color: '#14B8A6' },
        { id: 'cat-tai-lieu', name: 'Tài liệu', icon: '📂', iconUrl: 'assets/icons/tai-lieu.png', color: '#64748B' },
        { id: 'cat-kiem-duyet', name: 'Kiểm duyệt', icon: '🛡️', iconUrl: 'assets/icons/kiem-duyet.png', color: '#EF4444' },

        // 8 Loại việc Cá nhân / Kỹ năng v3.0 (Cyber Natural)
        { id: 'cat-lap-trinh', name: 'Lập trình', icon: '💻', iconUrl: 'assets/icons/lap-trinh.png', color: '#00FF87' },
        { id: 'cat-thiet-ke', name: 'Thiết kế', icon: '🎨', iconUrl: 'assets/icons/thiet-ke.png', color: '#A855F7' },
        { id: 'cat-hoc-tap', name: 'Học tập', icon: '📚', iconUrl: 'assets/icons/hoc-tap.png', color: '#38BDF8' },
        { id: 'cat-doi-song', name: 'Đời sống', icon: '🏠', iconUrl: 'assets/icons/doi-song.png', color: '#F97316' },
        { id: 'cat-suc-khoe', name: 'Sức khỏe', icon: '💪', iconUrl: 'assets/icons/suc-khoe.png', color: '#22C55E' },
        { id: 'cat-tai-chinh', name: 'Tài chính', icon: '💰', iconUrl: 'assets/icons/tai-chinh.png', color: '#EAB308' },
        { id: 'cat-quan-trong', name: 'Quan trọng', icon: '🔥', iconUrl: 'assets/icons/quan-trong.png', color: '#F43F5E' },
        { id: 'cat-giai-tri', name: 'Giải trí', icon: '🎮', iconUrl: 'assets/icons/giai-tri.png', color: '#06B6D4' }
    ];

    const defaultTasks = [
        {
            id: 'task-1',
            title: 'Thiết kế kiến trúc cơ sở dữ liệu cho hệ thống quản lý cá nhân',
            categoryId: 'cat-ke-hoach',
            priority: 'high',
            dueDate: getTodayISO(),
            quadrant: 'q1',
            scope: 'short',
            recurring: 'daily',
            lastResetDate: getTodayISO(),
            status: 'pending',
            actualTime: 25
        },
        {
            id: 'task-2',
            title: 'Hoàn thiện lộ trình học tập và ôn luyện chứng chỉ chuyên ngành',
            categoryId: 'cat-hoc-tap',
            priority: 'high',
            dueDate: getOffsetDateISO(6),
            quadrant: 'q2',
            scope: 'medium',
            recurring: 'none',
            lastResetDate: getTodayISO(),
            status: 'pending',
            actualTime: 0
        },
        {
            id: 'task-3',
            title: 'Phản hồi email hành chính và đặt lịch họp nhóm tuần tới',
            categoryId: 'cat-ke-hoach',
            priority: 'medium',
            dueDate: getOffsetDateISO(1),
            quadrant: 'q3',
            scope: 'short',
            recurring: 'weekly',
            lastResetDate: getTodayISO(),
            status: 'pending',
            actualTime: 0
        },
        {
            id: 'task-4',
            title: 'Dọn dẹp thư mục tải xuống và sắp xếp lại hình nền máy tính',
            categoryId: 'cat-doi-song',
            priority: 'low',
            dueDate: getOffsetDateISO(12),
            quadrant: 'q4',
            scope: 'medium',
            recurring: 'none',
            lastResetDate: getTodayISO(),
            status: 'completed',
            actualTime: 15
        }
    ];

    function loadJSONFromStorage(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return fallback;
            const parsed = JSON.parse(raw);
            return parsed !== null && parsed !== undefined ? parsed : fallback;
        } catch (err) {
            return fallback;
        }
    }

    let categories = loadJSONFromStorage(CATEGORIES_STORAGE_KEY, defaultCategories);
    if (!Array.isArray(categories) || categories.length < 18) {
        const existingIds = new Set((Array.isArray(categories) ? categories : []).map(c => c.id));
        const merged = [...(Array.isArray(categories) ? categories : [])];
        defaultCategories.forEach(defCat => {
            if (!existingIds.has(defCat.id)) {
                merged.push(defCat);
            }
        });
        categories = merged.length >= 18 ? merged : [...defaultCategories];
        localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
    }

    /**
     * Chuẩn hóa đối tượng Task lên chuẩn v4.0 (Tương thích ngược 100% với v1 - v3.1)
     */
    function normalizeTaskV4(rawTask) {
        if (!rawTask || typeof rawTask !== 'object') return null;
        const todayISO = getTodayISO();
        const resolvedDueDate = rawTask.dueDate || '';
        const resolvedStartDate = rawTask.startDate || resolvedDueDate || '';
        const rawStartTime = rawTask.startTime || null;
        let rawEndTime = rawTask.endTime || null;
        if (rawStartTime && !rawEndTime) {
            const parts = rawStartTime.split(':').map(Number);
            const endH = Math.min(23, (parts[0] || 0) + 1);
            const endM = parts[1] || 0;
            rawEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
        }

        return {
            id: String(rawTask.id || generateUniqueId('task')),
            title: String(rawTask.title || 'Công việc chưa đặt tên'),
            categoryId: rawTask.categoryId || 'cat-ke-hoach',
            priority: ['high', 'medium', 'low', 'none'].includes(rawTask.priority) ? rawTask.priority : 'medium',
            dueDate: resolvedDueDate,
            quadrant: rawTask.quadrant || suggestEisenhowerQuadrant(rawTask.priority || 'medium', resolvedDueDate),
            scope: rawTask.scope || calculateTaskScope(resolvedDueDate),
            recurring: rawTask.recurring || 'none',
            lastResetDate: rawTask.lastResetDate || todayISO,
            subtasks: Array.isArray(rawTask.subtasks) ? rawTask.subtasks : [],
            status: ['pending', 'in-progress', 'completed'].includes(rawTask.status) ? rawTask.status : 'pending',
            actualTime: typeof rawTask.actualTime === 'number' && !isNaN(rawTask.actualTime) ? rawTask.actualTime : 0,

            // --- Các trường MỚI bổ sung cho Lịch Time-Blocking v4.0 ---
            startDate: resolvedStartDate,
            startTime: rawStartTime,
            endTime: rawEndTime,
            estimatedMinutes: Number(rawTask.estimatedMinutes) || 60,
            isAllDay: rawStartTime ? false : (rawTask.isAllDay !== false),
            description: String(rawTask.description || ''),
            location: String(rawTask.location || ''),
            reminderMinutes: rawTask.reminderMinutes !== undefined ? Number(rawTask.reminderMinutes) : 15,
            pomodoroSessions: Array.isArray(rawTask.pomodoroSessions) ? rawTask.pomodoroSessions : [],
            updatedAt: rawTask.updatedAt || new Date().toISOString()
        };
    }

    let tasks = loadJSONFromStorage(TASKS_STORAGE_KEY, defaultTasks);
    if (!Array.isArray(tasks)) {
        tasks = [...defaultTasks];
    }
    tasks = tasks.map(t => normalizeTaskV4(t)).filter(Boolean);

    let currentViewMode = localStorage.getItem(VIEW_MODE_STORAGE_KEY) || 'list';
    if (currentViewMode !== 'list' && currentViewMode !== 'matrix' && currentViewMode !== 'kanban' && currentViewMode !== 'calendar') {
        currentViewMode = 'list';
    }

    function loadPomoStats() {
        const today = getTodayISO();
        const rawStats = loadJSONFromStorage(POMO_STATS_STORAGE_KEY, null);
        if (!rawStats || typeof rawStats !== 'object' || rawStats.date !== today) {
            return {
                date: today,
                completedCycles: 0,
                totalFocusMinutes: 0
            };
        }
        return {
            date: today,
            completedCycles: Number(rawStats.completedCycles) || 0,
            totalFocusMinutes: Number(rawStats.totalFocusMinutes) || 0
        };
    }

    let pomoStats = loadPomoStats();

    const DEFAULT_POMO_SETTINGS = {
        focusTime: 25,
        shortBreak: 5,
        longBreak: 15,
        enableSound: true
    };

    function loadPomoSettings() {
        const raw = loadJSONFromStorage(POMO_SETTINGS_STORAGE_KEY, null);
        if (!raw || typeof raw !== 'object') {
            return { ...DEFAULT_POMO_SETTINGS };
        }
        return {
            focusTime: Number(raw.focusTime ?? raw.focusMinutes) || DEFAULT_POMO_SETTINGS.focusTime,
            shortBreak: Number(raw.shortBreak ?? raw.shortBreakMinutes) || DEFAULT_POMO_SETTINGS.shortBreak,
            longBreak: Number(raw.longBreak ?? raw.longBreakMinutes) || DEFAULT_POMO_SETTINGS.longBreak,
            enableSound: raw.enableSound !== false
        };
    }

    let pomoSettings = loadPomoSettings();

    function savePomoSettingsToStorage() {
        const toSave = {
            focusTime: Number(pomoSettings.focusTime) || DEFAULT_POMO_SETTINGS.focusTime,
            shortBreak: Number(pomoSettings.shortBreak) || DEFAULT_POMO_SETTINGS.shortBreak,
            longBreak: Number(pomoSettings.longBreak) || DEFAULT_POMO_SETTINGS.longBreak,
            enableSound: pomoSettings.enableSound !== false
        };
        localStorage.setItem(POMO_SETTINGS_STORAGE_KEY, JSON.stringify(toSave));
    }

    function applyPomoSettings() {
        if (!POMO_MODES) return;
        const focusMins = Number(pomoSettings.focusTime) || 25;
        const shortMins = Number(pomoSettings.shortBreak) || 5;
        const longMins = Number(pomoSettings.longBreak) || 15;

        POMO_MODES['focus'].minutes = focusMins;
        POMO_MODES['short-break'].minutes = shortMins;
        POMO_MODES['long-break'].minutes = longMins;

        // Cập nhật nhãn nút Pomodoro
        const focusBtnSpan = document.querySelector('.pomo-mode-btn[data-mode="focus"] span');
        if (focusBtnSpan) focusBtnSpan.textContent = "Tập trung (" + focusMins + "p)";

        const shortBtnSpan = document.querySelector('.pomo-mode-btn[data-mode="short-break"] span');
        if (shortBtnSpan) shortBtnSpan.textContent = "Nghỉ ngắn (" + shortMins + "p)";

        const longBtnSpan = document.querySelector('.pomo-mode-btn[data-mode="long-break"] span');
        if (longBtnSpan) longBtnSpan.textContent = "Nghỉ dài (" + longMins + "p)";

        if (!isTimerRunning) {
            totalModeSeconds = POMO_MODES[currentPomoMode].minutes * 60;
            remainingSeconds = totalModeSeconds;
            updateTimerDisplay();
        }
    }

    let currentSearchQuery = '';
    let currentStatusFilter = 'all';
    let currentCategoryFilter = 'all';
    let currentPriorityFilter = 'all';
    let currentDueDateFilter = 'all';
    let currentSortMode = 'smart';

    let pendingModalTaskId = null;
    let editingCategoryId = null;
    let isQuadrantManuallySelected = false;
    let draggedTaskId = null;
    let expandedSubtaskTaskIds = new Set();

    // =========================================================================
    // 3. CÁC HÀM TIỆN ÍCH & CHUẨN HÓA DỮ LIỆU
    // =========================================================================
    function removeVietnameseTones(str) {
        if (!str) return '';
        str = String(str).toLowerCase();
        str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
        str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
        str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
        str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
        str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
        str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
        str = str.replace(/đ/g, 'd');
        str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, '');
        str = str.replace(/\u02C6|\u0306|\u031B/g, '');
        return str.trim();
    }

    function saveTasksToStorage(syncAction = 'UPDATE', taskId = null, payload = null) {
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
        if (window.__localRepo) {
            try {
                if (taskId) {
                    window.__localRepo._enqueueSyncOperation(syncAction, taskId, payload || {}, 1);
                }
                window.__localRepo._notify();
            } catch (e) {
                console.warn('[SyncQueue] Enqueue warning:', e);
            }
        }
    }

    function saveCategoriesToStorage() {
        localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
    }

    function saveViewModeToStorage() {
        localStorage.setItem(VIEW_MODE_STORAGE_KEY, currentViewMode);
    }

    function savePomoStatsToStorage() {
        const today = getTodayISO();
        if (pomoStats.date !== today) {
            pomoStats = { date: today, completedCycles: 0, totalFocusMinutes: 0 };
        }
        localStorage.setItem(POMO_STATS_STORAGE_KEY, JSON.stringify(pomoStats));
    }

    function generateUniqueId(prefix = 'id') {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    }

    function formatDateVN(dateString) {
        if (!dateString) return 'Chưa đặt hạn';
        const parts = dateString.split('-');
        if (parts.length !== 3) return dateString;
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    /**
     * Thuật toán tự động gợi ý Góc Ma trận Eisenhower (Q1, Q2, Q3, Q4)
     */
    function suggestEisenhowerQuadrant(priority, dueDate) {
        let isUrgent = false;
        if (dueDate) {
            const today = new Date(getTodayISO() + 'T00:00:00');
            const target = new Date(dueDate + 'T00:00:00');
            const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
            isUrgent = diffDays <= 2;
        } else {
            isUrgent = priority === 'high';
        }

        if (priority === 'high') {
            return isUrgent ? 'q1' : 'q2';
        }
        if (priority === 'medium' || !priority || priority === 'none') {
            return isUrgent ? 'q3' : 'q2';
        }
        return isUrgent ? 'q3' : 'q4';
    }


    /**
     * Tính toán Phân loại Kỳ hạn (scope):
     * <= 3 ngày: 'short' (Ngắn hạn)
     * 4 - 14 ngày: 'medium' (Trung hạn)
     * > 14 ngày hoặc không hạn: 'long' (Dài hạn)
     */
    function calculateTaskScope(dueDate) {
        if (!dueDate) return 'long';
        const today = new Date(getTodayISO() + 'T00:00:00');
        const target = new Date(dueDate + 'T00:00:00');
        const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
        if (diffDays <= 3) return 'short';
        if (diffDays <= 14) return 'medium';
        return 'long';
    }

    /**
     * Lấy ngày Thứ 2 đầu tuần của một ngày bất kỳ (YYYY-MM-DD)
     */
    function getMondayOfDate(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        const year = monday.getFullYear();
        const month = String(monday.getMonth() + 1).padStart(2, '0');
        const date = String(monday.getDate()).padStart(2, '0');
        return `${year}-${month}-${date}`;
    }

    function getNextWeeklyDueDate(oldDueDate, mondayStr) {
        if (!oldDueDate) return mondayStr;
        const oldD = new Date(oldDueDate + 'T00:00:00');
        if (isNaN(oldD.getTime())) return mondayStr;
        const day = oldD.getDay();
        const offset = day === 0 ? 6 : day - 1;
        const mon = new Date(mondayStr + 'T00:00:00');
        mon.setDate(mon.getDate() + offset);
        const year = mon.getFullYear();
        const month = String(mon.getMonth() + 1).padStart(2, '0');
        const date = String(mon.getDate()).padStart(2, '0');
        return `${year}-${month}-${date}`;
    }

    /**
     * Tự động kiểm tra và Reset công việc định kỳ (Recurring Tasks):
     * - Hằng ngày (daily): Sang ngày mới (today > lastResetDate) & status === 'completed' -> reset về pending.
     * - Hằng tuần (weekly): Bước sang tuần mới (lastResetDate < mondayOfCurrentWeek) & status === 'completed' -> reset về pending.
     */
    function checkAndResetRecurringTasks() {
        const today = getTodayISO();
        const currentWeekMonday = getMondayOfDate(today);
        let hasChanged = false;

        tasks = tasks.map(task => {
            const recurring = task.recurring || 'none';
            const lastReset = task.lastResetDate || task.dueDate || today;
            const resetSubtasks = (Array.isArray(task.subtasks) ? task.subtasks : []).map(s => ({ ...s, completed: false }));

            // 1. Task recurring === 'daily': Nếu status === 'completed' VÀ today > lastResetDate (đã sang ngày mới)
            if (recurring === 'daily') {
                if (today > lastReset && task.status === 'completed') {
                    hasChanged = true;
                    const newDueDate = today;
                    return {
                        ...task,
                        status: 'pending',
                        dueDate: newDueDate,
                        scope: calculateTaskScope(newDueDate),
                        lastResetDate: today,
                        subtasks: resetSubtasks
                    };
                }
            } 
            // 2. Task recurring === 'weekly': Kiểm tra tuần hiện tại khác tuần của lastResetDate
            else if (recurring === 'weekly') {
                if (lastReset < currentWeekMonday && task.status === 'completed') {
                    hasChanged = true;
                    const newDueDate = getNextWeeklyDueDate(task.dueDate, currentWeekMonday);
                    return {
                        ...task,
                        status: 'pending',
                        dueDate: newDueDate,
                        scope: calculateTaskScope(newDueDate),
                        lastResetDate: today,
                        subtasks: resetSubtasks
                    };
                }
            }

            if (!task.recurring || !task.lastResetDate) {
                return {
                    ...task,
                    recurring: task.recurring || 'none',
                    lastResetDate: task.lastResetDate || today
                };
            }

            return task;
        });

        // 3. Lưu lại mảng Task đã cập nhật vào LocalStorage và trigger re-render
        if (hasChanged) {
            saveTasksToStorage('UPDATE');
            renderTasks();
            updateDashboardStats();
        }
    }

    /**
     * THUẬT TOÁN SẮP XẾP TỰ ĐỘNG THÔNG MINH (SMART AUTO-SORTING)
     * Tiêu chí 1: Task chưa xong (pending / in-progress) nằm trên, task completed nằm dưới cùng.
     * Tiêu chí 2: Task quá hạn / gần đến hạn nhất nằm trên cùng.
     * Tiêu chí 3: Độ quan trọng cao hơn nằm trên (Q1 -> Q2 -> Q3 -> Q4, rồi Ưu tiên Cao -> Trung bình -> Thấp).
     */
    /**
     * THUẬT TOÁN SẮP XẾP TỰ ĐỘNG THÔNG MINH ĐA TẦNG (SMART AUTO-SORTING)
     * TẦNG 1: TRẠNG THÁI HOÀN THÀNH (STATUS)
     *   - Task chưa xong (pending / in-progress) luôn xếp TRÊN.
     *   - Task đã hoàn thành (completed) đẩy xuống DƯỚI CÙNG.
     * TẦNG 2: THỜI HẠN ĐẾN HẠN (DUE DATE & URGENCY)
     *   - Task quá hạn (overdue) và gấp (hôm nay/ngày mai) lên TOP đầu.
     *   - Sắp xếp tăng dần theo dueDate (ngày gần nhất xếp trước, ngày xa hơn xếp sau).
     *   - Task không cài ngày đến hạn xếp sau các task có ngày đến hạn.
     * TẦNG 3: MỨC ƯU TIÊN / MA TRẬN EISENHOWER (PRIORITY / QUADRANT)
     *   - Nếu 2 task cùng độ khẩn cấp ngày hạn: Q1 (hoặc High) > Q2 (Medium) > Q3 (Low) > Q4.
     */
    function sortTasks(taskList, sortMode = currentSortMode) {
        const quadrantWeight = { q1: 1, q2: 2, q3: 3, q4: 4 };
        const priorityWeight = { high: 1, medium: 2, low: 3, none: 4 };

        return [...taskList].sort((a, b) => {
            // TẦNG 1: TRẠNG THÁI HOÀN THÀNH (STATUS)
            const aCompleted = a.status === 'completed' ? 1 : 0;
            const bCompleted = b.status === 'completed' ? 1 : 0;
            if (aCompleted !== bCompleted) {
                return aCompleted - bCompleted;
            }

            // CHẾ ĐỘ 1: HẠN HOÀN THÀNH GẦN NHẤT
            if (sortMode === 'dueDate') {
                const hasDateA = Boolean(a.dueDate);
                const hasDateB = Boolean(b.dueDate);
                if (hasDateA && hasDateB) {
                    if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
                } else if (hasDateA && !hasDateB) {
                    return -1;
                } else if (!hasDateA && hasDateB) {
                    return 1;
                }
                const pA = priorityWeight[a.priority] || 4;
                const pB = priorityWeight[b.priority] || 4;
                return pA - pB;
            }

            // CHẾ ĐỘ 2: MỨC ƯU TIÊN (CAO ➔ THẤP)
            if (sortMode === 'priority') {
                const pA = priorityWeight[a.priority] || 4;
                const pB = priorityWeight[b.priority] || 4;
                if (pA !== pB) return pA - pB;

                const qA = quadrantWeight[a.quadrant] || 2;
                const qB = quadrantWeight[b.quadrant] || 2;
                if (qA !== qB) return qA - qB;

                const hasDateA = Boolean(a.dueDate);
                const hasDateB = Boolean(b.dueDate);
                if (hasDateA && hasDateB) {
                    if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
                } else if (hasDateA && !hasDateB) {
                    return -1;
                } else if (!hasDateA && hasDateB) {
                    return 1;
                }
                return 0;
            }

            // CHẾ ĐỘ 3: MỚI TẠO GẦN ĐÂY
            if (sortMode === 'created') {
                const idxA = tasks.findIndex(t => String(t.id) === String(a.id));
                const idxB = tasks.findIndex(t => String(t.id) === String(b.id));
                return idxA - idxB;
            }

            // MẶC ĐỊNH: SẮP XẾP THÔNG MINH (3 TẦNG ĐA TẦNG)
            // TẦNG 2: Hạn chót & Khẩn cấp
            const hasDateA = Boolean(a.dueDate);
            const hasDateB = Boolean(b.dueDate);
            if (hasDateA && hasDateB) {
                if (a.dueDate !== b.dueDate) {
                    return a.dueDate.localeCompare(b.dueDate);
                }
            } else if (hasDateA && !hasDateB) {
                return -1;
            } else if (!hasDateA && hasDateB) {
                return 1;
            }

            // TẦNG 3: Ma trận Eisenhower & Mức ưu tiên
            const qA = quadrantWeight[a.quadrant] || 2;
            const qB = quadrantWeight[b.quadrant] || 2;
            if (qA !== qB) {
                return qA - qB;
            }

            const pA = priorityWeight[a.priority] || 4;
            const pB = priorityWeight[b.priority] || 4;
            if (pA !== pB) {
                return pA - pB;
            }

            return 0;
        });
    }

    // Chuẩn hóa toàn bộ công việc hiện có để đảm bảo đầy đủ thuộc tính bắt buộc
    const catLegacyMap = {
        'cat-work': 'cat-ke-hoach',
        'cat-study': 'cat-hoc-tap',
        'cat-personal': 'cat-doi-song',
        'cat-finance': 'cat-tai-chinh'
    };
    tasks = tasks.map(task => {
        const normalizedStatus = task.status === 'completed'
            ? 'completed'
            : (task.status === 'in-progress' ? 'in-progress' : 'pending');
        const resolvedDueDate = task.dueDate || '';
        const rawCat = task.categoryId;
        const resolvedCatId = catLegacyMap[rawCat] || (rawCat && rawCat !== 'none' ? rawCat : 'cat-ke-hoach');
        return {
            ...task,
            id: String(task.id || generateUniqueId('task')),
            title: String(task.title || 'Công việc chưa đặt tên'),
            categoryId: resolvedCatId,
            priority: task.priority || 'medium',
            dueDate: resolvedDueDate,
            quadrant: task.quadrant || suggestEisenhowerQuadrant(task.priority, resolvedDueDate),
            scope: task.scope || calculateTaskScope(resolvedDueDate),
            recurring: task.recurring || 'none',
            lastResetDate: task.lastResetDate || getTodayISO(),
            subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
            status: normalizedStatus,
            actualTime: typeof task.actualTime === 'number' && !isNaN(task.actualTime) ? task.actualTime : 0
        };
    });

    function getQuadrantConfig(quadrant) {
        const configs = {
            q1: { class: 'quadrant-badge-q1', dot: '🔴', shortLabel: 'Ô 1: Làm ngay', fullLabel: '🔴 Ô 1: Làm ngay (Khẩn cấp & Quan trọng)' },
            q2: { class: 'quadrant-badge-q2', dot: '🔵', shortLabel: 'Ô 2: Lên kế hoạch', fullLabel: '🔵 Ô 2: Lên kế hoạch (Quan trọng)' },
            q3: { class: 'quadrant-badge-q3', dot: '🟡', shortLabel: 'Ô 3: Ủy quyền', fullLabel: '🟡 Ô 3: Ủy quyền / Làm nhanh' },
            q4: { class: 'quadrant-badge-q4', dot: '⚪', shortLabel: 'Ô 4: Tối thiểu', fullLabel: '⚪ Ô 4: Tối thiểu / Xóa' }
        };
        return configs[quadrant] || configs.q2;
    }

    function getCategoryBadgeStyle(hexColor) {
        let hex = (hexColor || '#2563EB').replace('#', '').trim();
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }
        if (hex.length !== 6) {
            hex = '2563EB';
        }
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `background-color: rgba(${r}, ${g}, ${b}, 0.15); color: #${hex}; border: 1px solid rgba(${r}, ${g}, ${b}, 0.35);`;
    }

    function getCategoryById(categoryId) {
        const found = categories.find(c => String(c.id) === String(categoryId));
        if (found) return found;
        if (categoryId === 'cat-work') return categories.find(c => c.id === 'cat-ke-hoach') || categories[0];
        if (categoryId === 'cat-personal') return categories.find(c => c.id === 'cat-doi-song') || categories[0];
        if (categoryId === 'cat-study') return categories.find(c => c.id === 'cat-hoc-tap') || categories[0];
        if (categoryId === 'cat-finance') return categories.find(c => c.id === 'cat-tai-chinh') || categories[0];
        return { id: 'none', name: 'Chưa phân loại', icon: '📁', color: '#64748B' };
    }

    function getPriorityConfig(priority) {
        const configs = {
            high: { class: 'badge-high', icon: 'ri-fire-fill', label: 'Ưu tiên cao' },
            medium: { class: 'badge-medium', icon: 'ri-flag-2-fill', label: 'Trung bình' },
            low: { class: 'badge-low', icon: 'ri-leaf-fill', label: 'Ưu tiên thấp' },
            none: { class: 'badge-none', icon: 'ri-question-line', label: 'Chưa chọn ưu tiên' }
        };
        return configs[priority] || configs.none;
    }

    function getStatusLabel(status) {
        if (status === 'completed') return 'Đã hoàn thành';
        if (status === 'in-progress') return 'Đang thực hiện';
        return 'Cần làm';
    }

    /**
     * Cảnh báo Hạn hoàn thành & Phân loại Ngắn / Trung / Dài hạn
     * (🟢 An toàn, 🟡 Gần đến hạn, 🟠 Đến hạn/Gấp, 🔴 Quá hạn)
     */
    function getDeadlineAndTermInfo(dueDate, status) {
        if (!dueDate) {
            return {
                class: 'badge-none',
                displayText: '<i class="ri-calendar-line"></i> Chưa đặt hạn',
                isUrgentOrOverdue: false
            };
        }

        const formattedDate = formatDateVN(dueDate);
        const today = new Date(getTodayISO() + 'T00:00:00');
        const target = new Date(dueDate + 'T00:00:00');
        const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

        if (status === 'completed') {
            return {
                class: 'deadline-done',
                displayText: `<i class="ri-check-line"></i> Done • ${formattedDate}`,
                isUrgentOrOverdue: false
            };
        }

        if (diffDays < 0) {
            return {
                class: 'deadline-overdue',
                displayText: `<i class="ri-alarm-warning-line"></i> Instant • ${formattedDate}`,
                isUrgentOrOverdue: true
            };
        }
        if (diffDays === 0) {
            return {
                class: 'deadline-urgent',
                displayText: `<i class="ri-time-line"></i> Today • ${formattedDate}`,
                isUrgentOrOverdue: true
            };
        }
        if (diffDays <= 3) {
            return {
                class: 'deadline-soon',
                displayText: `<i class="ri-calendar-event-line"></i> To do • ${formattedDate}`,
                isUrgentOrOverdue: diffDays === 1
            };
        }
        // Còn nhiều thời gian: để trống trạng thái và chỉ tô màu nhạt
        return {
            class: 'deadline-plenty',
            displayText: `<i class="ri-calendar-line"></i> ${formattedDate}`,
            isUrgentOrOverdue: false
        };
    }

    // =========================================================================
    // 4. ĐỒNG BỘ LOẠI CÔNG VIỆC & CHUYỂN ĐỔI CHẾ ĐỘ XEM (LIST / MATRIX / KANBAN / CALENDAR)
    // =========================================================================
    function applyViewMode() {
        const isMatrix = currentViewMode === 'matrix';
        const isKanban = currentViewMode === 'kanban';
        const isCalendar = currentViewMode === 'calendar';
        const isList = !isMatrix && !isKanban && !isCalendar;

        if (listViewContainer) listViewContainer.style.display = isList ? 'block' : 'none';
        if (matrixViewContainer) matrixViewContainer.style.display = isMatrix ? 'grid' : 'none';
        if (kanbanViewContainer) kanbanViewContainer.style.display = isKanban ? 'block' : 'none';
        if (calendarViewContainer) calendarViewContainer.style.display = isCalendar ? 'block' : 'none';

        if (btnViewList) btnViewList.classList.toggle('active', isList);
        if (btnViewMatrix) btnViewMatrix.classList.toggle('active', isMatrix);
        if (btnViewKanban) btnViewKanban.classList.toggle('active', isKanban);
        if (btnViewCalendar) btnViewCalendar.classList.toggle('active', isCalendar);

        if (isKanban && window.__kanbanInstance && typeof window.__kanbanInstance.render === 'function') {
            window.__kanbanInstance.render(tasks);
        }
        if (isCalendar && window.__calendarInstance && typeof window.__calendarInstance.render === 'function') {
            window.__calendarInstance.render(getFilteredTasks());
        }
        if (isList || isMatrix) {
            renderTasks();
        }
    }

    if (btnViewList) btnViewList.addEventListener('click', () => {
        currentViewMode = 'list';
        saveViewModeToStorage();
        applyViewMode();
    });

    if (btnViewMatrix) btnViewMatrix.addEventListener('click', () => {
        currentViewMode = 'matrix';
        saveViewModeToStorage();
        applyViewMode();
    });

    if (btnViewKanban) btnViewKanban.addEventListener('click', () => {
        currentViewMode = 'kanban';
        saveViewModeToStorage();
        applyViewMode();
    });

    if (btnViewCalendar) btnViewCalendar.addEventListener('click', () => {
        currentViewMode = 'calendar';
        saveViewModeToStorage();
        applyViewMode();
    });

    function populateCategoryDropdowns() {
        if (categoryInput) {
            const currentFormVal = categoryInput.value;
            categoryInput.innerHTML = '<option value="">Loại việc</option>';
            categories.forEach(cat => {
                categoryInput.innerHTML += '<option value="' + escapeHTML(cat.id) + '">' + escapeHTML(cat.icon) + ' ' + escapeHTML(cat.name) + '</option>';
            });
            if (categories.some(c => String(c.id) === String(currentFormVal))) {
                categoryInput.value = currentFormVal;
            }
        }

        if (modalCategoryInput) {
            modalCategoryInput.innerHTML = '';
            categories.forEach(cat => {
                modalCategoryInput.innerHTML += '<option value="' + escapeHTML(cat.id) + '">' + escapeHTML(cat.icon) + ' ' + escapeHTML(cat.name) + '</option>';
            });
        }

        if (filterCategorySelect) {
            const currentFilterVal = filterCategorySelect.value;
            filterCategorySelect.innerHTML = '<option value="all">📁 Tất cả loại việc</option>';
            categories.forEach(cat => {
                filterCategorySelect.innerHTML += '<option value="' + escapeHTML(cat.id) + '">' + escapeHTML(cat.icon) + ' ' + escapeHTML(cat.name) + '</option>';
            });
            filterCategorySelect.innerHTML += '<option value="none">📂 Chưa phân loại</option>';

            if (currentFilterVal === 'all' || currentFilterVal === 'none' || categories.some(c => String(c.id) === String(currentFilterVal))) {
                filterCategorySelect.value = currentFilterVal;
            } else {
                currentCategoryFilter = 'all';
                filterCategorySelect.value = 'all';
            }
        }

        const sidebarCatList = document.getElementById('treth-sidebar-cat-list');
        if (sidebarCatList) {
            sidebarCatList.innerHTML = categories.map(cat => `
                <li class="treth-cat-item" data-cat-id="${escapeHTML(cat.id)}" title="${escapeHTML(cat.name)}">
                    ${cat.iconUrl ? `<img src="${escapeHTML(cat.iconUrl)}" class="cat-img-icon" alt="" />` : `<span class="treth-cat-color-dot" style="background-color: ${escapeHTML(cat.color)};"></span>`}
                    <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHTML(cat.name)}</span>
                </li>
            `).join('');

            sidebarCatList.querySelectorAll('.treth-cat-item').forEach(item => {
                item.addEventListener('click', function() {
                    const catId = this.getAttribute('data-cat-id');
                    if (window.__closeMobileSidebar && window.innerWidth <= 900) {
                        window.__closeMobileSidebar();
                    }
                    if (filterCategorySelect) {
                        filterCategorySelect.value = catId;
                        filterCategorySelect.dispatchEvent(new Event('change'));
                        if (btnApplyFilter) btnApplyFilter.click();
                    }
                });
            });
        }
    }

    function renderCategoryManagerList() {
        categoryManagerListEl.innerHTML = '';
        if (categories.length === 0) {
            categoryManagerListEl.innerHTML = `
                <li style="text-align: center; padding: 1.5rem; color: var(--text-muted); font-size: 0.85rem;">
                    Chưa có loại công việc nào. Hãy thêm mới ở khung phía trên!
                </li>
            `;
            return;
        }

        categories.forEach(cat => {
            const count = tasks.filter(t => String(t.categoryId) === String(cat.id)).length;
            const badgeStyle = getCategoryBadgeStyle(cat.color);

            const li = document.createElement('li');
            li.className = 'cat-manager-item';
            li.dataset.id = cat.id;

            li.innerHTML = `
                <div class="cat-manager-left">
                    <span class="cat-color-dot" style="background-color: ${escapeHTML(cat.color)};"></span>
                    <span class="badge-category" style="${badgeStyle}; cursor: default;">
                        ${cat.iconUrl ? `<img src="${escapeHTML(cat.iconUrl)}" class="cat-img-icon" alt="" />` : `<span>${escapeHTML(cat.icon)}</span>`}
                        <span>${escapeHTML(cat.name)}</span>
                    </span>
                    <span class="cat-task-count">(${count} công việc)</span>
                </div>
                <div class="task-actions">
                    <button type="button" class="btn-icon btn-edit-cat" title="Sửa loại việc này">
                        <i class="ri-pencil-line"></i><span>Sửa</span>
                    </button>
                    <button type="button" class="btn-icon btn-delete btn-delete-cat" title="Xóa loại việc này">
                        <i class="ri-delete-bin-line"></i><span>Xóa</span>
                    </button>
                </div>
            `;
            categoryManagerListEl.appendChild(li);
        });
    }

    // =========================================================================
    // 5. DASHBOARD MINI, BỘ LỌC THÔNG MINH & HIỂN THỊ CÔNG VIỆC
    // =========================================================================
    function updateDashboardStats() {
        const allTasks = tasks;
        const total = allTasks.length;
        const completed = allTasks.filter(task => task.status === 'completed').length;
        const pending = total - completed;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        const urgentOrOverdueCount = allTasks.filter(task => {
            if (task.status === 'completed') return false;
            const deadlineInfo = getDeadlineAndTermInfo(task.dueDate, task.status);
            if (deadlineInfo && deadlineInfo.isUrgentOrOverdue) return true;
            return task.quadrant === 'q1' && task.priority === 'high';
        }).length;

        if (statTotalEl) statTotalEl.textContent = String(total).padStart(2, '0');
        if (statCompletedEl) statCompletedEl.textContent = String(completed).padStart(2, '0');
        if (statPendingEl) statPendingEl.textContent = String(pending).padStart(2, '0');
        if (statUrgentEl) statUrgentEl.textContent = String(urgentOrOverdueCount).padStart(2, '0');

        if (statProgressTextEl) statProgressTextEl.textContent = `${percent}%`;
        if (statProgressBarEl) statProgressBarEl.style.width = `${percent}%`;

        updateSmartListCounts();
    }

    function updateSmartListCounts() {
        const todayStr = getTodayISO();
        const next7DaysStr = getOffsetDateISO(7);
        const activeTasks = tasks.filter(t => !t.isDeleted);

        const allCount = activeTasks.filter(t => t.status !== 'completed').length;
        const completedCount = activeTasks.filter(t => t.status === 'completed').length;
        const todayCount = activeTasks.filter(t => t.dueDate === todayStr && t.status !== 'completed').length;
        const weekCount = activeTasks.filter(t => t.dueDate && t.dueDate >= todayStr && t.dueDate <= next7DaysStr && t.status !== 'completed').length;
        const urgentCount = activeTasks.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== 'completed').length;

        const elAll = document.getElementById('smart-count-all');
        const elToday = document.getElementById('smart-count-today');
        const elWeek = document.getElementById('smart-count-week');
        const elUrgent = document.getElementById('smart-count-urgent');
        const elDone = document.getElementById('smart-count-completed');

        if (elAll) elAll.textContent = allCount;
        if (elToday) elToday.textContent = todayCount;
        if (elWeek) elWeek.textContent = weekCount;
        if (elUrgent) elUrgent.textContent = urgentCount;
        if (elDone) elDone.textContent = completedCount;
    }

    window.__setSmartFilter = function(filterType) {
        currentSmartFilter = filterType || 'all';
        renderTasks();
    };

    function getFilteredTasks() {
        const keyword = (currentSearchQuery || '').trim();
        const normalizedKeyword = removeVietnameseTones(keyword);
        const isCompletedFilter = currentSmartFilter === 'completed' || currentStatusFilter === 'completed';

        return tasks.filter(task => {
            if (task.isDeleted) return false;

            // Tách biệt hoàn toàn việc Đã hoàn thành khỏi không gian làm việc chính
            if (isCompletedFilter) {
                if (task.status !== 'completed') return false;
            } else {
                if (task.status === 'completed') return false;
            }

            // 1. Tìm kiếm theo từ khóa thông minh (Title, Subtasks, Tên Loại việc)
            let matchSearch = true;
            if (keyword) {
                const titleNorm = removeVietnameseTones(task.title || '');
                const cat = getCategoryById(task.categoryId);
                const catNameNorm = removeVietnameseTones(cat && cat.name ? cat.name : '');
                const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
                const matchSub = subtasks.some(s => removeVietnameseTones(s.title || '').includes(normalizedKeyword));

                matchSearch = titleNorm.includes(normalizedKeyword) || catNameNorm.includes(normalizedKeyword) || matchSub;
            }

            // 2. Lọc theo trạng thái
            let matchStatus = true;
            if (currentStatusFilter === 'pending') {
                matchStatus = task.status !== 'completed' && task.status !== 'in-progress';
            } else if (currentStatusFilter === 'in-progress') {
                matchStatus = task.status === 'in-progress';
            } else if (currentStatusFilter === 'completed') {
                matchStatus = task.status === 'completed';
            }

            // 3. Lọc theo Loại việc
            let matchCategory = true;
            if (currentCategoryFilter === 'none') {
                matchCategory = !task.categoryId || task.categoryId === 'none';
            } else if (currentCategoryFilter !== 'all') {
                matchCategory = String(task.categoryId) === String(currentCategoryFilter);
            }

            // 4. Lọc theo Mức độ ưu tiên
            let matchPriority = true;
            if (currentPriorityFilter !== 'all') {
                matchPriority = task.priority === currentPriorityFilter;
            }

            // 5. Lọc theo Thời hạn hoàn thành
            let matchDueDate = true;
            if (currentDueDateFilter !== 'all') {
                if (!task.dueDate) {
                    matchDueDate = currentDueDateFilter === 'no_date';
                } else if (currentDueDateFilter === 'no_date') {
                    matchDueDate = false;
                } else {
                    const today = new Date(getTodayISO() + 'T00:00:00');
                    const target = new Date(task.dueDate + 'T00:00:00');
                    const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

                    if (currentDueDateFilter === 'overdue') {
                        matchDueDate = diffDays < 0;
                    } else if (currentDueDateFilter === 'today') {
                        matchDueDate = diffDays === 0;
                    } else if (currentDueDateFilter === 'this_week') {
                        matchDueDate = diffDays >= 0 && diffDays <= 7;
                    } else if (currentDueDateFilter === 'future') {
                        matchDueDate = diffDays > 7;
                    }
                }
            }

            return matchSearch && matchStatus && matchCategory && matchPriority && matchDueDate;
        });
    }

    function updateActiveFiltersBadge() {
        let count = 0;
        if (currentSearchQuery && currentSearchQuery.trim() !== '') count++;
        if (currentCategoryFilter && currentCategoryFilter !== 'all') count++;
        if (currentPriorityFilter && currentPriorityFilter !== 'all') count++;
        if (currentDueDateFilter && currentDueDateFilter !== 'all') count++;
        if (currentStatusFilter && currentStatusFilter !== 'all') count++;

        if (activeFiltersBadge) {
            if (count > 0) {
                activeFiltersBadge.textContent = count;
                activeFiltersBadge.style.display = 'inline-flex';
            } else {
                activeFiltersBadge.style.display = 'none';
            }
        }

        if (btnToggleFilterDropdown) {
            btnToggleFilterDropdown.classList.toggle('has-active-filter', count > 0);
        }

        renderActiveFilterChips();
    }

    function renderActiveFilterChips() {
        if (!activeFilterChipsContainer || !activeFilterChipsList) return;

        const chips = [];

        // 1. Chip từ khóa
        if (currentSearchQuery && currentSearchQuery.trim() !== '') {
            chips.push({
                type: 'search',
                label: `Từ khóa: "${currentSearchQuery.trim()}"`,
                icon: 'ri-search-line',
                onRemove: () => {
                    currentSearchQuery = '';
                    if (searchTaskInput) searchTaskInput.value = '';
                }
            });
        }

        // 2. Chip Loại việc
        if (currentCategoryFilter && currentCategoryFilter !== 'all') {
            let catLabel = 'Loại việc';
            if (currentCategoryFilter === 'none') {
                catLabel = 'Chưa phân loại';
            } else {
                const cat = getCategoryById(currentCategoryFilter);
                catLabel = `${cat.icon || '📁'} ${cat.name || 'Loại việc'}`;
            }
            chips.push({
                type: 'category',
                label: `Loại việc: ${catLabel}`,
                icon: 'ri-price-tag-3-line',
                onRemove: () => {
                    currentCategoryFilter = 'all';
                    if (filterCategorySelect) filterCategorySelect.value = 'all';
                }
            });
        }

        // 3. Chip Mức ưu tiên
        if (currentPriorityFilter && currentPriorityFilter !== 'all') {
            const priorityMap = {
                high: 'Ưu tiên cao',
                medium: 'Trung bình',
                low: 'Ưu tiên thấp'
            };
            chips.push({
                type: 'priority',
                priorityClass: currentPriorityFilter,
                label: `Ưu tiên: ${priorityMap[currentPriorityFilter] || currentPriorityFilter}`,
                icon: 'ri-flag-line',
                onRemove: () => {
                    currentPriorityFilter = 'all';
                    if (filterPrioritySelect) filterPrioritySelect.value = 'all';
                }
            });
        }

        // 4. Chip Thời hạn
        if (currentDueDateFilter && currentDueDateFilter !== 'all') {
            const dueMap = {
                overdue: '🚨 Quá hạn',
                today: '⏰ Hôm nay',
                this_week: '📅 Trong tuần này',
                future: '⏳ Còn nhiều thời gian',
                no_date: '⚪ Chưa đặt hạn'
            };
            chips.push({
                type: 'dueDate',
                label: `Hạn: ${dueMap[currentDueDateFilter] || currentDueDateFilter}`,
                icon: 'ri-calendar-line',
                onRemove: () => {
                    currentDueDateFilter = 'all';
                    if (filterDueDateSelect) filterDueDateSelect.value = 'all';
                }
            });
        }

        // 5. Chip Trạng thái
        if (currentStatusFilter && currentStatusFilter !== 'all') {
            const statusMap = {
                pending: '⏳ Cần làm',
                'in-progress': '⚡ Đang làm',
                completed: '✅ Đã xong'
            };
            chips.push({
                type: 'status',
                label: `Trạng thái: ${statusMap[currentStatusFilter] || currentStatusFilter}`,
                icon: 'ri-checkbox-circle-line',
                onRemove: () => {
                    currentStatusFilter = 'all';
                    if (filterStatusSelect) filterStatusSelect.value = 'all';
                    if (filterBtns) {
                        filterBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === 'all'));
                    }
                }
            });
        }

        if (chips.length === 0) {
            activeFilterChipsContainer.style.display = 'none';
            activeFilterChipsList.innerHTML = '';
            return;
        }

        activeFilterChipsContainer.style.display = 'flex';
        activeFilterChipsList.innerHTML = '';

        chips.forEach(chip => {
            const chipEl = document.createElement('div');
            chipEl.className = `filter-chip ${chip.priorityClass ? 'chip-priority-' + chip.priorityClass : ''}`;
            chipEl.innerHTML = `
                <i class="${chip.icon}"></i>
                <span>${escapeHTML(chip.label)}</span>
                <button type="button" class="btn-remove-chip" title="Bỏ tiêu chí lọc này" aria-label="Bỏ tiêu chí ${escapeHTML(chip.label)}">
                    <i class="ri-close-line"></i>
                </button>
            `;
            chipEl.querySelector('.btn-remove-chip')?.addEventListener('click', (e) => {
                e.stopPropagation();
                chip.onRemove();
                updateActiveFiltersBadge();
                renderTasks();
            });
            activeFilterChipsList.appendChild(chipEl);
        });
    }

    function resetAllFilters() {
        currentSearchQuery = '';
        currentStatusFilter = 'all';
        currentCategoryFilter = 'all';
        currentPriorityFilter = 'all';
        currentDueDateFilter = 'all';

        if (searchTaskInput) searchTaskInput.value = '';
        if (filterCategorySelect) filterCategorySelect.value = 'all';
        if (filterPrioritySelect) filterPrioritySelect.value = 'all';
        if (filterDueDateSelect) filterDueDateSelect.value = 'all';
        if (filterStatusSelect) filterStatusSelect.value = 'all';

        if (filterBtns && filterBtns.length > 0) {
            filterBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.filter === 'all');
            });
        }

        updateActiveFiltersBadge();
        renderTasks();
    }

    // Expose resetAllFilters to window so empty state button can call it
    window.__resetAllAppFilters = resetAllFilters;

    function createTaskElement(task) {
        const isCompleted = task.status === 'completed';
        const priorityInfo = getPriorityConfig(task.priority);
        const categoryInfo = getCategoryById(task.categoryId);
        const categoryStyle = getCategoryBadgeStyle(categoryInfo.color);
        const quadrantInfo = getQuadrantConfig(task.quadrant);
        const deadlineInfo = getDeadlineAndTermInfo(task.dueDate, task.status);

        const li = document.createElement('li');
        li.className = `task-item ${isCompleted ? 'is-completed' : ''}`;
        li.dataset.id = String(task.id);
        li.dataset.priority = task.priority;
        li.dataset.quadrant = task.quadrant || 'q2';

        const isSubtaskExpanded = expandedSubtaskTaskIds.has(String(task.id));
        const isTouchDevice = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window);
        if (currentViewMode === 'matrix' && !isSubtaskExpanded && !isTouchDevice) {
            li.setAttribute('draggable', 'true');
        } else {
            li.setAttribute('draggable', 'false');
        }

        li.innerHTML = `
            <div class="task-left">
                <label class="checkbox-container" title="Đánh dấu hoàn thành / cần làm">
                    <input type="checkbox" class="task-checkbox" ${isCompleted ? 'checked' : ''}>
                    <span class="checkmark"></span>
                </label>
                <div class="task-content">
                    <span class="task-name" title="Nhấp đúp chuột để sửa tên công việc">${escapeHTML(task.title)}</span>
                    <div class="task-meta">
                        ${task.actualTime > 0 ? `
                            <span class="badge-time-spent" title="Tổng thời gian đã tập trung cho công việc này">
                                <i class="ri-timer-flash-line"></i> ${task.actualTime} phút
                            </span>
                        ` : ''}

                        <span class="badge-category category-editable" style="${categoryStyle}" title="Nhấp để đổi loại việc">
                            ${categoryInfo.iconUrl ? `<img src="${escapeHTML(categoryInfo.iconUrl)}" class="cat-img-icon" alt="" />` : `<span>${escapeHTML(categoryInfo.icon)}</span>`}
                            <span>${escapeHTML(categoryInfo.name)}</span>
                        </span>

                        ${task.recurring === 'daily' ? `
                            <span class="badge badge-recurring" title="Công việc lặp lại hằng ngày">🔁 Hằng ngày</span>
                        ` : ''}
                        ${task.recurring === 'weekly' ? `
                            <span class="badge badge-recurring" title="Công việc lặp lại hằng tuần">📅 Hằng tuần</span>
                        ` : ''}

                        <span class="badge-quadrant ${quadrantInfo.class} quadrant-editable" title="Nhấp để chuyển sang góc ma trận khác">
                            <span>${quadrantInfo.dot}</span>
                            <span>${quadrantInfo.shortLabel}</span>
                        </span>

                        <span class="badge ${priorityInfo.class} badge-editable" title="Nhấp để đổi mức độ ưu tiên">
                            <i class="${priorityInfo.icon}"></i> ${priorityInfo.label}
                        </span>

                        <span class="badge-deadline date-editable ${deadlineInfo ? deadlineInfo.class : 'badge-none'}" title="Nhấp để đổi ngày đến hạn">
                            ${deadlineInfo ? deadlineInfo.displayText : '<i class="ri-calendar-line"></i> Chưa đặt hạn'}
                        </span>

                        ${(() => {
                            const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
                            const totalSub = subtasks.length;
                            const doneSub = subtasks.filter(s => s.completed).length;
                            if (totalSub > 0) {
                                return `
                                    <button type="button" class="badge-subtasks-toggle ${doneSub === totalSub ? 'has-completed' : ''}" title="Bấm để xem/quản lý việc con">
                                        <i class="ri-checkbox-multiple-line"></i> ☑️ ${doneSub}/${totalSub}
                                    </button>
                                `;
                            } else {
                                return `
                                    <button type="button" class="btn-subtask-add-quick" title="Thêm việc con cho công việc này">
                                        <i class="ri-node-tree"></i> + Việc con
                                    </button>
                                `;
                            }
                        })()}

                        ${!isCompleted && task.status === 'in-progress' ? `
                            <span class="task-date" style="font-weight: 500;">
                                <i class="ri-loader-4-line"></i> Đang làm
                            </span>
                        ` : ''}
                    </div>

                    ${(() => {
                        const isExpanded = expandedSubtaskTaskIds.has(String(task.id));
                        if (!isExpanded) return '';

                        const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
                        const totalSub = subtasks.length;
                        const doneSub = subtasks.filter(s => s.completed).length;
                        const percent = totalSub > 0 ? Math.round((doneSub / totalSub) * 100) : 0;

                        return `
                            <div class="task-subtasks-container">
                                <div class="subtasks-header">
                                    <span class="subtasks-title">Danh sách việc con (${doneSub}/${totalSub})</span>
                                    <div class="subtasks-progress-mini">
                                        <div class="subtasks-progress-fill" style="width: ${percent}%;"></div>
                                    </div>
                                </div>
                                <ul class="subtasks-list">
                                    ${subtasks.map(s => `
                                        <li class="subtask-item ${s.completed ? 'is-completed' : ''}" data-subtask-id="${escapeHTML(s.id)}">
                                            <label class="subtask-checkbox-label">
                                                <input type="checkbox" class="subtask-item-checkbox" ${s.completed ? 'checked' : ''}>
                                                <span class="subtask-text">${escapeHTML(s.title)}</span>
                                            </label>
                                            <button type="button" class="btn-delete-subtask" title="Xóa việc con này">
                                                <i class="ri-close-line"></i>
                                            </button>
                                        </li>
                                    `).join('')}
                                </ul>
                                <form class="subtask-add-form" novalidate>
                                    <input type="text" class="subtask-input" placeholder="Thêm việc con mới..." required autocomplete="off">
                                    <button type="submit" class="btn-add-subtask-submit" title="Thêm việc con"><i class="ri-add-line"></i></button>
                                </form>
                            </div>
                        `;
                    })()}
                </div>
            </div>
            <div class="task-actions">
                ${!isCompleted ? `
                    <button type="button" class="btn-icon btn-edit-title" title="Sửa tên công việc">
                        <i class="ri-edit-line"></i>
                        <span class="action-text">Sửa</span>
                    </button>
                    <button type="button" class="btn-icon btn-progress" title="Chuyển trạng thái: Cần làm / Đang thực hiện">
                        <i class="${task.status === 'in-progress' ? 'ri-pause-circle-line' : 'ri-play-circle-line'}"></i>
                        <span class="action-text">${task.status === 'in-progress' ? 'Đang làm' : 'Bắt đầu'}</span>
                    </button>
                ` : ''}
                <button type="button" class="btn-icon btn-delete delete-btn" title="Xóa công việc">
                    <i class="ri-delete-bin-line"></i>
                    <span class="action-text">Xóa</span>
                </button>
            </div>
        `;

        return li;
    }

    function renderTasks() {
        const filteredTasks = getFilteredTasks();
        const sortedTasks = sortTasks(filteredTasks);

        // 1. Render List View
        taskListEl.innerHTML = '';
        if (sortedTasks.length === 0) {
            taskListEl.innerHTML = `
                <li class="task-empty-state" role="status">
                    <div class="empty-state-card">
                        <div class="empty-icon-wrapper">
                            <i class="ri-search-eye-line"></i>
                        </div>
                        <h3 class="empty-title">Không tìm thấy công việc phù hợp</h3>
                        <p class="empty-desc">Không có công việc nào khớp với các tiêu chí bộ lọc hoặc từ khóa tìm kiếm hiện tại.</p>
                        <button type="button" class="btn btn-primary btn-sm btn-empty-reset" onclick="window.__resetAllAppFilters && window.__resetAllAppFilters()">
                            <i class="ri-refresh-line"></i>
                            <span>Xóa bộ lọc để xem tất cả</span>
                        </button>
                    </div>
                </li>
            `;
        } else {
            const listFragment = document.createDocumentFragment();
            sortedTasks.forEach(task => {
                listFragment.appendChild(createTaskElement(task));
            });
            taskListEl.appendChild(listFragment);
        }

        // 2. Render Matrix View (4 Ô Q1, Q2, Q3, Q4)
        ['q1', 'q2', 'q3', 'q4'].forEach(qKey => {
            const listContainer = matrixLists[qKey];
            const countBadge = matrixCounts[qKey];
            if (!listContainer || !countBadge) return;

            listContainer.innerHTML = '';
            const quadrantTasks = sortedTasks.filter(t => (t.quadrant || 'q2') === qKey);
            countBadge.textContent = quadrantTasks.length;

            if (quadrantTasks.length === 0) {
                listContainer.innerHTML = `
                    <li class="quadrant-empty">
                        <i class="ri-drag-drop-line"></i>
                        <span>Trống — Kéo thả công việc vào đây hoặc nhập ở ô phía trên</span>
                    </li>
                `;
            } else {
                const quadFragment = document.createDocumentFragment();
                quadrantTasks.forEach(task => {
                    quadFragment.appendChild(createTaskElement(task));
                });
                listContainer.appendChild(quadFragment);
            }
        });

        updateDashboardStats();
        if (window.__kanbanInstance && typeof window.__kanbanInstance.render === 'function') {
            window.__kanbanInstance.render(tasks);
        }
        if (window.__calendarInstance && typeof window.__calendarInstance.render === 'function') {
            window.__calendarInstance.render(getFilteredTasks());
        }
    }

    // =========================================================================
    // 6. BỘ 5 CHỨC NĂNG CHỈNH SỬA TRỰC TIẾP TRÊN THẺ (INLINE EDITING)
    // =========================================================================
    function enableInlineTitleEdit(taskItem) {
        const existingInput = taskItem.querySelector('.inline-edit-input');
        if (existingInput) {
            existingInput.focus();
            const len = existingInput.value.length;
            existingInput.setSelectionRange(len, len);
            return;
        }

        const targetId = String(taskItem.dataset.id);
        const taskObj = tasks.find(t => String(t.id) === targetId);
        const taskNameEl = taskItem.querySelector('.task-name');
        if (!taskObj || !taskNameEl) return;

        taskItem.classList.add('is-editing');
        taskItem.setAttribute('draggable', 'false');

        const inputEl = document.createElement('input');
        inputEl.type = 'text';
        inputEl.className = 'inline-edit-input';
        inputEl.value = taskObj.title;
        inputEl.setAttribute('autocomplete', 'off');
        inputEl.setAttribute('aria-label', 'Sửa tên công việc');

        taskNameEl.replaceWith(inputEl);
        inputEl.focus();
        try {
            const len = inputEl.value.length;
            inputEl.setSelectionRange(len, len);
        } catch (err) {}

        let isHandled = false;
        const saveChanges = () => {
            if (isHandled) return;
            isHandled = true;
            const newTitle = inputEl.value.trim();
            if (newTitle && newTitle !== taskObj.title) {
                tasks = tasks.map(t => (String(t.id) === targetId ? { ...t, title: newTitle } : t));
                saveTasksToStorage('UPDATE', targetId, { title: newTitle });
            }
            renderTasks();
            syncTimeModuleUI();
        };
        const cancelChanges = () => {
            if (isHandled) return;
            isHandled = true;
            isInputComposing = false;
            renderTasks();
        };

        if (inputEl) inputEl.addEventListener('keydown', (e) => {
            if (e.isComposing || isInputComposing) return;
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable) {
                if (e.key === 'Backspace' || e.key === 'Delete') return;
            }
            if (e.key === 'Enter') { e.preventDefault(); saveChanges(); }
            else if (e.key === 'Escape') { e.preventDefault(); cancelChanges(); }
        });
        if (inputEl) inputEl.addEventListener('blur', () => {
            setTimeout(() => {
                if (document.activeElement === inputEl) return;
                saveChanges();
            }, 200);
        });
    }

    function enableInlineCategoryEdit(taskItem, catBadgeEl) {
        const targetId = String(taskItem.dataset.id);
        const taskObj = tasks.find(t => String(t.id) === targetId);
        if (!taskObj) return;

        const selectEl = document.createElement('select');
        selectEl.className = 'inline-edit-select';

        categories.forEach(cat => {
            const optionEl = document.createElement('option');
            optionEl.value = cat.id;
            optionEl.textContent = `${cat.icon} ${cat.name}`;
            if (String(cat.id) === String(taskObj.categoryId)) optionEl.selected = true;
            selectEl.appendChild(optionEl);
        });

        if (taskObj.categoryId === 'none' || !categories.some(c => String(c.id) === String(taskObj.categoryId))) {
            const noneOpt = document.createElement('option');
            noneOpt.value = 'none';
            noneOpt.textContent = '📁 Chưa phân loại';
            noneOpt.selected = true;
            selectEl.prepend(noneOpt);
        }

        catBadgeEl.replaceWith(selectEl);
        selectEl.focus();

        let isHandled = false;
        const saveCategory = () => {
            if (isHandled) return;
            isHandled = true;
            const newCatId = selectEl.value;
            if (newCatId && String(newCatId) !== String(taskObj.categoryId)) {
                tasks = tasks.map(t => (String(t.id) === targetId ? { ...t, categoryId: newCatId } : t));
                saveTasksToStorage('UPDATE', targetId, { categoryId: newCatId });
            }
            renderTasks();
            syncTimeModuleUI();
        };
        const cancelCategory = () => {
            if (isHandled) return;
            isHandled = true;
            renderTasks();
        };

        if (selectEl) selectEl.addEventListener('change', saveCategory);
        if (selectEl) selectEl.addEventListener('blur', saveCategory);
        if (selectEl) selectEl.addEventListener('keydown', (e) => {
            if (e.isComposing || isInputComposing) return;
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable) {
                if (e.key === 'Backspace' || e.key === 'Delete') return;
            }
            if (e.key === 'Escape') { e.preventDefault(); cancelCategory(); }
            else if (e.key === 'Enter') { e.preventDefault(); saveCategory(); }
        });
    }

    function enableInlineQuadrantEdit(taskItem, quadBadgeEl) {
        const targetId = String(taskItem.dataset.id);
        const taskObj = tasks.find(t => String(t.id) === targetId);
        if (!taskObj) return;

        const selectEl = document.createElement('select');
        selectEl.className = 'inline-edit-select';
        selectEl.setAttribute('aria-label', 'Chọn góc ma trận Eisenhower');

        const options = [
            { value: 'q1', text: '🔴 Ô 1: Làm ngay' },
            { value: 'q2', text: '🔵 Ô 2: Lên kế hoạch' },
            { value: 'q3', text: '🟡 Ô 3: Ủy quyền' },
            { value: 'q4', text: '⚪ Ô 4: Tối thiểu' }
        ];

        options.forEach(opt => {
            const optionEl = document.createElement('option');
            optionEl.value = opt.value;
            optionEl.textContent = opt.text;
            if (opt.value === (taskObj.quadrant || 'q2')) optionEl.selected = true;
            selectEl.appendChild(optionEl);
        });

        quadBadgeEl.replaceWith(selectEl);
        selectEl.focus();

        let isHandled = false;
        const saveQuadrant = () => {
            if (isHandled) return;
            isHandled = true;
            const newQuad = selectEl.value;
            if (newQuad && newQuad !== taskObj.quadrant) {
                tasks = tasks.map(t => (String(t.id) === targetId ? { ...t, quadrant: newQuad } : t));
                saveTasksToStorage('UPDATE', targetId, { quadrant: newQuad });
            }
            renderTasks();
            syncTimeModuleUI();
        };
        const cancelQuadrant = () => {
            if (isHandled) return;
            isHandled = true;
            renderTasks();
        };

        if (selectEl) selectEl.addEventListener('change', saveQuadrant);
        if (selectEl) selectEl.addEventListener('blur', saveQuadrant);
        if (selectEl) selectEl.addEventListener('keydown', (e) => {
            if (e.isComposing || isInputComposing) return;
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable) {
                if (e.key === 'Backspace' || e.key === 'Delete') return;
            }
            if (e.key === 'Escape') { e.preventDefault(); cancelQuadrant(); }
            else if (e.key === 'Enter') { e.preventDefault(); saveQuadrant(); }
        });
    }

    function enableInlinePriorityEdit(taskItem, badgeEl) {
        const targetId = String(taskItem.dataset.id);
        const taskObj = tasks.find(t => String(t.id) === targetId);
        if (!taskObj) return;

        const selectEl = document.createElement('select');
        selectEl.className = 'inline-edit-select';

        const options = [
            { value: 'high', text: '🔥 Cao' },
            { value: 'medium', text: '🚩 Trung bình' },
            { value: 'low', text: '🌿 Thấp' }
        ];

        const currentPriority = taskObj.priority !== 'none' ? taskObj.priority : 'medium';
        options.forEach(opt => {
            const optionEl = document.createElement('option');
            optionEl.value = opt.value;
            optionEl.textContent = opt.text;
            if (opt.value === currentPriority) optionEl.selected = true;
            selectEl.appendChild(optionEl);
        });

        badgeEl.replaceWith(selectEl);
        selectEl.focus();

        let isHandled = false;
        const savePriority = () => {
            if (isHandled) return;
            isHandled = true;
            const newPriority = selectEl.value;
            if (newPriority && newPriority !== taskObj.priority) {
                tasks = tasks.map(t => (String(t.id) === targetId ? { ...t, priority: newPriority } : t));
                saveTasksToStorage('UPDATE', targetId, { priority: newPriority });
            }
            renderTasks();
            syncTimeModuleUI();
        };
        const cancelPriority = () => {
            if (isHandled) return;
            isHandled = true;
            renderTasks();
        };

        if (selectEl) selectEl.addEventListener('change', savePriority);
        if (selectEl) selectEl.addEventListener('blur', savePriority);
        if (selectEl) selectEl.addEventListener('keydown', (e) => {
            if (e.isComposing || isInputComposing) return;
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable) {
                if (e.key === 'Backspace' || e.key === 'Delete') return;
            }
            if (e.key === 'Escape') { e.preventDefault(); cancelPriority(); }
            else if (e.key === 'Enter') { e.preventDefault(); savePriority(); }
        });
    }

    function enableInlineDateEdit(taskItem, dateEl) {
        const targetId = String(taskItem.dataset.id);
        const taskObj = tasks.find(t => String(t.id) === targetId);
        if (!taskObj) return;

        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.className = 'inline-edit-date';
        dateInput.value = taskObj.dueDate || getTodayISO();

        dateEl.replaceWith(dateInput);
        dateInput.focus();

        try {
            if (typeof dateInput.showPicker === 'function') dateInput.showPicker();
        } catch (err) {}

        let isHandled = false;
        const saveDate = () => {
            if (isHandled) return;
            isHandled = true;
            const newDate = dateInput.value;
            if (newDate !== taskObj.dueDate) {
                const newScope = calculateTaskScope(newDate);
                tasks = tasks.map(t => (String(t.id) === targetId ? {
                    ...t,
                    dueDate: newDate,
                    scope: newScope
                } : t));
                saveTasksToStorage('UPDATE', targetId, { dueDate: newDate, scope: newScope });
            }
            renderTasks();
            syncTimeModuleUI();
        };
        const cancelDate = () => {
            if (isHandled) return;
            isHandled = true;
            renderTasks();
        };

        if (dateInput) dateInput.addEventListener('change', saveDate);
        if (dateInput) dateInput.addEventListener('blur', saveDate);
        if (dateInput) dateInput.addEventListener('keydown', (e) => {
            if (e.isComposing || isInputComposing) return;
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable) {
                if (e.key === 'Backspace' || e.key === 'Delete') return;
            }
            if (e.key === 'Escape') { e.preventDefault(); cancelDate(); }
            else if (e.key === 'Enter') { e.preventDefault(); saveDate(); }
        });
    }

    // =========================================================================
    // 7. HTML5 DRAG & DROP API TRÊN MA TRẬN EISENHOWER 2x2
    // =========================================================================
    if (tasksWorkspace) tasksWorkspace.addEventListener('dragstart', (e) => {
        // Cho phép thẻ Kanban tự xử lý kéo thả
        if (e.target.closest('.task-card')) {
            return;
        }
        // Chỉ cho phép kéo thả ở Ma trận Eisenhower (viewMode === 'matrix')
        if (currentViewMode !== 'matrix') {
            e.preventDefault();
            return;
        }
        const taskItem = e.target.closest('.task-item');
        if (!taskItem || !taskItem.dataset.id || taskItem.classList.contains('is-editing')) {
            e.preventDefault();
            return;
        }
        draggedTaskId = String(taskItem.dataset.id);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedTaskId);
        setTimeout(() => {
            taskItem.classList.add('is-dragging');
        }, 0);
    });

    if (tasksWorkspace) tasksWorkspace.addEventListener('dragend', (e) => {
        const taskItem = e.target.closest('.task-item');
        if (taskItem) taskItem.classList.remove('is-dragging');
        quadrantCards.forEach(card => card.classList.remove('drag-over'));
        draggedTaskId = null;
    });

    quadrantCards.forEach(card => {
        if (card) card.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (!card.classList.contains('drag-over')) {
                card.classList.add('drag-over');
            }
        });

        if (card) card.addEventListener('dragenter', (e) => {
            e.preventDefault();
            card.classList.add('drag-over');
        });

        if (card) card.addEventListener('dragleave', (e) => {
            if (!card.contains(e.relatedTarget)) {
                card.classList.remove('drag-over');
            }
        });

        if (card) card.addEventListener('drop', (e) => {
            e.preventDefault();
            card.classList.remove('drag-over');

            const targetQuadrant = card.dataset.quadrant;
            const droppedId = String(e.dataTransfer.getData('text/plain') || draggedTaskId || '');
            if (!targetQuadrant || !droppedId) return;

            const targetTask = tasks.find(t => String(t.id) === droppedId);
            if (targetTask && targetTask.quadrant !== targetQuadrant) {
                tasks = tasks.map(t => (String(t.id) === droppedId ? { ...t, quadrant: targetQuadrant } : t));
                saveTasksToStorage('UPDATE', droppedId, { quadrant: targetQuadrant });
                renderTasks();
                syncTimeModuleUI();
            }
        });
    });

    // =========================================================================
    // 8. TRÌNH QUẢN LÝ LOẠI VIỆC (CATEGORY MANAGER)
    // =========================================================================
    function updateCategoryLivePreview() {
        if (!catLivePreview || !catPreviewIcon || !catPreviewName) return;
        const icon = catIconInput.value.trim() || '📁';
        const name = catNameInput.value.trim() || 'Loại việc mới';
        const color = catColorInput.value || '#2563EB';

        catPreviewIcon.textContent = icon;
        catPreviewName.textContent = name;
        catLivePreview.style = getCategoryBadgeStyle(color);
    }

    function resetCategoryForm() {
        editingCategoryId = null;
        categoryForm.reset();
        catIconInput.value = '💼';
        catColorInput.value = '#2563EB';
        catFormModeLabel.textContent = 'Thêm loại việc mới';
        btnSaveCategory.innerHTML = `<i class="ri-add-line"></i><span>Thêm loại việc</span>`;
        btnCancelCatEdit.style.display = 'none';
        updateCategoryLivePreview();
    }

    function openCategoryManager() {
        resetCategoryForm();
        renderCategoryManagerList();
        categoryModal.classList.add('active');
        categoryModal.setAttribute('aria-hidden', 'false');
        catNameInput.focus();
    }

    function closeCategoryManager() {
        categoryModal.classList.remove('active');
        categoryModal.setAttribute('aria-hidden', 'true');
        resetCategoryForm();
    }

    if (btnOpenCatManager) btnOpenCatManager.addEventListener('click', openCategoryManager);
    if (btnCloseCatModal) btnCloseCatModal.addEventListener('click', closeCategoryManager);
    if (btnCancelCatEdit) btnCancelCatEdit.addEventListener('click', resetCategoryForm);
    if (categoryModal) categoryModal.addEventListener('click', (e) => {
        if (e.target === categoryModal) closeCategoryManager();
    });

    if (catIconInput) catIconInput.addEventListener('input', () => {
        updateCategoryLivePreview();
    });
    if (catNameInput) catNameInput.addEventListener('input', () => {
        updateCategoryLivePreview();
    });
    if (catColorInput) catColorInput.addEventListener('input', updateCategoryLivePreview);

    if (emojiSuggestions) emojiSuggestions.addEventListener('click', (e) => {
        const emojiBtn = e.target.closest('.emoji-btn');
        if (!emojiBtn) return;
        catIconInput.value = emojiBtn.dataset.emoji;
        updateCategoryLivePreview();
        catNameInput.focus();
    });

    if (categoryForm) categoryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = catNameInput.value.trim();
        const icon = catIconInput.value.trim() || '📁';
        const color = catColorInput.value || '#2563EB';

        if (!name) {
            showToast('Vui lòng nhập tên loại việc!', 'warning');
            catNameInput.focus();
            return;
        }

        if (editingCategoryId) {
            categories = categories.map(cat => (String(cat.id) === String(editingCategoryId) ? { ...cat, icon, name, color } : cat));
        } else {
            categories.push({ id: generateUniqueId('cat'), name, icon, color });
        }

        saveCategoriesToStorage();
        populateCategoryDropdowns();
        renderCategoryManagerList();
        renderTasks();
        syncTimeModuleUI();
        resetCategoryForm();
    });

    if (categoryManagerListEl) categoryManagerListEl.addEventListener('click', (e) => {
        const itemEl = e.target.closest('.cat-manager-item');
        if (!itemEl) return;
        const catId = String(itemEl.dataset.id);
        const targetCat = categories.find(c => String(c.id) === catId);
        if (!targetCat) return;

        if (e.target.closest('.btn-edit-cat')) {
            editingCategoryId = targetCat.id;
            catIconInput.value = targetCat.icon;
            catNameInput.value = targetCat.name;
            catColorInput.value = targetCat.color;
            catFormModeLabel.textContent = `Đang sửa: ${targetCat.icon} ${targetCat.name}`;
            btnSaveCategory.innerHTML = `<i class="ri-save-line"></i><span>Lưu sửa</span>`;
            btnCancelCatEdit.style.display = 'inline-block';
            updateCategoryLivePreview();
            catNameInput.focus();
            return;
        }

        if (e.target.closest('.btn-delete-cat')) {
            const usedCount = tasks.filter(t => String(t.categoryId) === catId).length;
            const warningMsg = usedCount > 0
                ? `Loại "${targetCat.icon} ${targetCat.name}" đang được gắn cho ${usedCount} công việc.\nNếu xóa, các công việc này sẽ chuyển về "Chưa phân loại". Bạn có chắc chắn muốn xóa?`
                : `Bạn có chắc chắn muốn xóa loại việc "${targetCat.icon} ${targetCat.name}" không?`;

            if (safeConfirm(warningMsg)) {
                categories = categories.filter(c => String(c.id) !== catId);
                tasks = tasks.map(t => (String(t.categoryId) === catId ? { ...t, categoryId: 'none' } : t));
                if (String(editingCategoryId) === catId) resetCategoryForm();

                saveCategoriesToStorage();
                saveTasksToStorage();
                populateCategoryDropdowns();
                renderCategoryManagerList();
                renderTasks();
                syncTimeModuleUI();
            }
        }
    });

    // =========================================================================
    // 9. TỰ ĐỘNG GỢI Ý GÓC MA TRẬN & XỬ LÝ TẠO TASK MỚI (ĐÃ FIX TRIỆT ĐỂ BUG 1 & 2)
    // =========================================================================
    if (quadrantInput) quadrantInput.addEventListener('change', () => {
        isQuadrantManuallySelected = quadrantInput.value !== '';
    });

    function autoUpdateFormQuadrant() {
        if (isQuadrantManuallySelected) return;
        if (!priorityInput.value && !dueDateInput.value) {
            quadrantInput.value = '';
            return;
        }
        quadrantInput.value = suggestEisenhowerQuadrant(priorityInput.value || 'medium', dueDateInput.value);
    }

    if (priorityInput) priorityInput.addEventListener('change', autoUpdateFormQuadrant);
    if (dueDateInput) dueDateInput.addEventListener('change', autoUpdateFormQuadrant);

    function autoUpdateModalQuadrant() {
        modalQuadrantInput.value = suggestEisenhowerQuadrant(modalPriorityInput.value, modalDueDateInput.value);
    }

    if (modalPriorityInput) modalPriorityInput.addEventListener('change', autoUpdateModalQuadrant);
    if (modalDueDateInput) modalDueDateInput.addEventListener('change', autoUpdateModalQuadrant);

    function openUpdateModal(task) {
        pendingModalTaskId = String(task.id);
        modalTaskNameEl.textContent = `"${task.title}"`;

        const defaultCatId = categories.length > 0 ? categories[0].id : 'none';
        modalCategoryInput.value = (task.categoryId && task.categoryId !== 'none') ? task.categoryId : defaultCatId;
        modalPriorityInput.value = (task.priority && task.priority !== 'none') ? task.priority : 'medium';
        modalDueDateInput.value = task.dueDate ? task.dueDate : getTodayISO();
        if (modalRecurringInput) {
            modalRecurringInput.value = task.recurring || 'none';
        }
        modalQuadrantInput.value = task.quadrant || suggestEisenhowerQuadrant(modalPriorityInput.value, modalDueDateInput.value);

        updateModal.classList.add('active');
        updateModal.setAttribute('aria-hidden', 'false');
    }

    function closeUpdateModal() {
        pendingModalTaskId = null;
        updateModal.classList.remove('active');
        updateModal.setAttribute('aria-hidden', 'true');
    }

    if (modalForm) modalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!pendingModalTaskId) return;

        const targetId = String(pendingModalTaskId);
        const resolvedDueDate = modalDueDateInput.value;
        const resolvedRecurring = modalRecurringInput ? modalRecurringInput.value : 'none';

        tasks = tasks.map(task => {
            if (String(task.id) === targetId) {
                return {
                    ...task,
                    categoryId: modalCategoryInput.value || 'none',
                    priority: modalPriorityInput.value || 'medium',
                    dueDate: resolvedDueDate,
                    quadrant: modalQuadrantInput.value || suggestEisenhowerQuadrant(modalPriorityInput.value || 'medium', resolvedDueDate),
                    scope: calculateTaskScope(resolvedDueDate),
                    recurring: resolvedRecurring
                };
            }
            return task;
        });

        const updatedTask = tasks.find(t => String(t.id) === targetId);
        saveTasksToStorage('UPDATE', targetId, updatedTask || {});
        renderTasks();
        syncTimeModuleUI();
        closeUpdateModal();
    });

    if (btnCloseModal) btnCloseModal.addEventListener('click', closeUpdateModal);
    if (btnSkipModal) btnSkipModal.addEventListener('click', closeUpdateModal);
    if (updateModal) updateModal.addEventListener('click', (e) => {
        if (e.target === updateModal) closeUpdateModal();
    });

    document.addEventListener('keydown', (e) => {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable) {
            if (e.key !== 'Escape') {
                return; // Để bàn phím hoạt động tự nhiên
            }
        }
        if (e.key === 'Escape') {
            const uModal = document.getElementById('update-modal');
            if (uModal && uModal.classList.contains('active') && typeof closeUpdateModal === 'function') closeUpdateModal();

            const cModal = document.getElementById('category-modal');
            if (cModal && cModal.classList.contains('active') && typeof closeCategoryManager === 'function') closeCategoryManager();

            const sModal = document.getElementById('settingsModal') || document.getElementById('settings-modal');
            if (sModal && sModal.classList.contains('active') && typeof closeSettingsModal === 'function') closeSettingsModal();

            const hModal = document.getElementById('habit-modal');
            if (hModal && hModal.classList.contains('active') && typeof closeHabitModal === 'function') closeHabitModal();

            const nModal = document.getElementById('note-modal');
            if (nModal && nModal.classList.contains('active') && typeof closeNoteModal === 'function') closeNoteModal();

            if (typeof toggleFilterDropdown === 'function') toggleFilterDropdown(false);
            if (typeof toggleDataMenu === 'function') toggleDataMenu(false);
        }
    });

    // =========================================================================
    // 9B. BỘ PHÂN TÍCH NGÔN NGỮ TỰ NHIÊN TIẾNG VIỆT (SMART NLP QUICK-ADD v4.0)
    // =========================================================================
    function parseSmartTaskInput(rawText) {
        if (!rawText) return { title: '', dueDate: '', startTime: null, endTime: null, priority: '', categoryId: '' };
        let cleanTitle = rawText.trim();
        let parsedDate = '';
        let parsedStartTime = null;
        let parsedEndTime = null;
        let parsedPriority = '';
        let parsedCategoryId = '';

        // 1. Tách khung giờ: "9h-11h", "09:00-10:30", "14h30-16h00"
        const timeRangeRegex = /\b(\d{1,2})(?:[:h](\d{2}))?\s*-\s*(\d{1,2})(?:[:h](\d{2}))?\b/i;
        const rangeMatch = cleanTitle.match(timeRangeRegex);
        if (rangeMatch) {
            const h1 = String(Math.min(23, parseInt(rangeMatch[1], 10))).padStart(2, '0');
            const m1 = String(rangeMatch[2] ? parseInt(rangeMatch[2], 10) : 0).padStart(2, '0');
            const h2 = String(Math.min(23, parseInt(rangeMatch[3], 10))).padStart(2, '0');
            const m2 = String(rangeMatch[4] ? parseInt(rangeMatch[4], 10) : 0).padStart(2, '0');
            parsedStartTime = `${h1}:${m1}`;
            parsedEndTime = `${h2}:${m2}`;
            cleanTitle = cleanTitle.replace(rangeMatch[0], '').trim();
        } else {
            // Giờ đơn: "lúc 14h30", "lúc 9h", "15:00"
            const singleTimeRegex = /(?:lúc\s+)?\b(\d{1,2})[:h](\d{2})?\b/i;
            const singleMatch = cleanTitle.match(singleTimeRegex);
            if (singleMatch && (singleMatch[0].includes(':') || singleMatch[0].toLowerCase().includes('h'))) {
                const h1 = parseInt(singleMatch[1], 10);
                const m1 = singleMatch[2] ? parseInt(singleMatch[2], 10) : 0;
                if (h1 >= 0 && h1 <= 23 && m1 >= 0 && m1 <= 59) {
                    parsedStartTime = `${String(h1).padStart(2, '0')}:${String(m1).padStart(2, '0')}`;
                    const endH = Math.min(23, h1 + 1);
                    parsedEndTime = `${String(endH).padStart(2, '0')}:${String(m1).padStart(2, '0')}`;
                    cleanTitle = cleanTitle.replace(singleMatch[0], '').trim();
                }
            }
        }

        // 2. Tách từ khóa ngày tiếng Việt
        if (/\b(hôm nay|hnay|nay)\b/i.test(cleanTitle)) {
            parsedDate = getTodayISO();
            cleanTitle = cleanTitle.replace(/\b(hôm nay|hnay|nay)\b/i, '').trim();
        } else if (/\b(ngày mai|mai)\b/i.test(cleanTitle)) {
            parsedDate = getOffsetDateISO(1);
            cleanTitle = cleanTitle.replace(/\b(ngày mai|mai)\b/i, '').trim();
        } else if (/\b(ngày mốt|mốt)\b/i.test(cleanTitle)) {
            parsedDate = getOffsetDateISO(2);
            cleanTitle = cleanTitle.replace(/\b(ngày mốt|mốt)\b/i, '').trim();
        } else {
            // Thử bắt thứ: thứ 2, thứ hai, thứ 3... chủ nhật, cn
            const dowMatch = cleanTitle.match(/\b(thứ\s*[2-7]|thứ\s*hai|thứ\s*ba|thứ\s*tư|thứ\s*năm|thứ\s*sáu|thứ\s*bảy|chủ\s*nhật|cn)\b/i);
            if (dowMatch) {
                const mapDow = {
                    'thứ 2': 1, 'thứ hai': 1, 'thứ2': 1,
                    'thứ 3': 2, 'thứ ba': 2, 'thứ3': 2,
                    'thứ 4': 3, 'thứ tư': 3, 'thứ4': 3,
                    'thứ 5': 4, 'thứ năm': 4, 'thứ5': 4,
                    'thứ 6': 5, 'thứ sáu': 5, 'thứ6': 5,
                    'thứ 7': 6, 'thứ bảy': 6, 'thứ7': 6,
                    'chủ nhật': 0, 'cn': 0
                };
                const normDow = dowMatch[0].toLowerCase().replace(/\s+/g, ' ');
                const targetDay = mapDow[normDow] !== undefined ? mapDow[normDow] : mapDow[normDow.replace(' ', '')];
                if (targetDay !== undefined) {
                    const today = new Date();
                    const curDay = today.getDay();
                    let diff = targetDay - curDay;
                    if (diff <= 0) diff += 7;
                    parsedDate = getOffsetDateISO(diff);
                    cleanTitle = cleanTitle.replace(dowMatch[0], '').trim();
                }
            } else {
                // Thử bắt dd/mm hoặc dd/mm/yyyy
                const dateRegex = /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?\b/;
                const dateMatch = cleanTitle.match(dateRegex);
                if (dateMatch) {
                    const d = parseInt(dateMatch[1], 10);
                    const m = parseInt(dateMatch[2], 10);
                    const y = dateMatch[3] ? parseInt(dateMatch[3], 10) : new Date().getFullYear();
                    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
                        parsedDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        cleanTitle = cleanTitle.replace(dateMatch[0], '').trim();
                    }
                }
            }
        }

        // 3. Tách mức độ ưu tiên: !cao, !gấp, !1, !!, !vừa, !tb, !2, !thấp, !3
        if (/!(cao|gấp|1)\b|!!/i.test(cleanTitle)) {
            parsedPriority = 'high';
            cleanTitle = cleanTitle.replace(/!(cao|gấp|1)\b|!!/i, '').trim();
        } else if (/!(vừa|tb|2)\b/i.test(cleanTitle)) {
            parsedPriority = 'medium';
            cleanTitle = cleanTitle.replace(/!(vừa|tb|2)\b/i, '').trim();
        } else if (/!(thấp|3)\b/i.test(cleanTitle)) {
            parsedPriority = 'low';
            cleanTitle = cleanTitle.replace(/!(thấp|3)\b/i, '').trim();
        }

        // 4. Tách #hashtag loại việc
        const tagMatch = cleanTitle.match(/#([^\s#]+)/);
        if (tagMatch) {
            const tagNorm = removeVietnameseTones(tagMatch[1]).toLowerCase();
            const matchedCat = categories.find(c => {
                const catNorm = removeVietnameseTones(c.name || '').toLowerCase().replace(/\s+/g, '');
                return catNorm.includes(tagNorm) || tagNorm.includes(catNorm);
            });
            if (matchedCat) {
                parsedCategoryId = matchedCat.id;
                cleanTitle = cleanTitle.replace(tagMatch[0], '').trim();
            }
        }

        cleanTitle = cleanTitle.replace(/\s{2,}/g, ' ').trim();
        return {
            title: cleanTitle || rawText.trim(),
            dueDate: parsedDate,
            startTime: parsedStartTime,
            endTime: parsedEndTime,
            priority: parsedPriority,
            categoryId: parsedCategoryId
        };
    }

    // Gợi ý hiển thị NLP thời gian thực khi người dùng nhập tiêu đề (An toàn IME & Tuyệt đối không gán lại .value)
    const nlpPreviewEl = document.getElementById('task-nlp-preview');
    if (titleInput && nlpPreviewEl) {
        let nlpDebounceTimer = null;

        titleInput.addEventListener('input', (e) => {
            if (e && e.isComposing) return;
            if (isInputComposing) return;

            const rawVal = e && e.target ? e.target.value : titleInput.value;

            if (nlpDebounceTimer) clearTimeout(nlpDebounceTimer);
            nlpDebounceTimer = setTimeout(() => {
                if (isInputComposing) return;
                const val = (rawVal || '').trim();
                if (!val || val.length < 3) {
                    nlpPreviewEl.style.display = 'none';
                    nlpPreviewEl.innerHTML = '';
                    return;
                }

                const parsed = parseSmartTaskInput(val);
                const chips = [];
                if (parsed.dueDate) {
                    chips.push(`<span class="task-nlp-chip"><i class="ri-calendar-line"></i> ${parsed.dueDate}</span>`);
                }
                if (parsed.startTime) {
                    chips.push(`<span class="task-nlp-chip"><i class="ri-time-line"></i> ${parsed.startTime}${parsed.endTime ? ' - ' + parsed.endTime : ''}</span>`);
                }
                if (parsed.priority) {
                    const prioText = parsed.priority === 'high' ? 'Cao 🔴' : (parsed.priority === 'low' ? 'Thấp 🟢' : 'Vừa 🟡');
                    chips.push(`<span class="task-nlp-chip"><i class="ri-flag-line"></i> ${prioText}</span>`);
                }
                if (parsed.categoryId) {
                    const c = getCategoryById(parsed.categoryId);
                    chips.push(`<span class="task-nlp-chip"><i class="ri-price-tag-3-line"></i> #${c ? c.name : 'Loại việc'}</span>`);
                }

                if (chips.length > 0) {
                    nlpPreviewEl.style.display = 'flex';
                    nlpPreviewEl.innerHTML = `<span style="color: var(--text-muted); font-size: 11px;">Nhận diện:</span> ${chips.join('')}`;
                } else {
                    nlpPreviewEl.style.display = 'none';
                    nlpPreviewEl.innerHTML = '';
                }
            }, 200);
        });

        titleInput.addEventListener('keydown', (e) => {
            if (e.isComposing || isInputComposing) return;
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable) {
                if (e.key === 'Backspace' || e.key === 'Delete') return;
            }
        });
    }

    // Bắt sự kiện submit duy nhất trên thẻ <form id="task-form">
    if (taskForm) taskForm.addEventListener('submit', (e) => {
        // Nếu người dùng đang IME composition (ghép từ tiếng Việt), không submit form
        if (isInputComposing) {
            e.preventDefault();
            return;
        }
        e.preventDefault();

        // Lấy tên công việc NGAY ĐẦU HÀM trước khi reset form
        const rawTitle = titleInput.value.trim();
        if (!rawTitle) {
            showToast('Vui lòng nhập tên công việc trước khi thêm!', 'warning');
            titleInput.focus();
            return;
        }

        const parsedNLP = parseSmartTaskInput(rawTitle);
        const title = parsedNLP.title || rawTitle;

        const rawCategory = categoryInput.value || parsedNLP.categoryId;
        const rawPriority = priorityInput.value || parsedNLP.priority;
        const rawDueDate = dueDateInput.value || parsedNLP.dueDate;
        const rawStartTime = parsedNLP.startTime || null;
        const rawEndTime = parsedNLP.endTime || null;
        const isAllDay = rawStartTime ? false : true;
        const rawRecurring = recurringInput ? recurringInput.value : 'none';
        const rawQuadrant = quadrantInput.value;
        const resolvedQuadrant = rawQuadrant || suggestEisenhowerQuadrant(rawPriority || 'medium', rawDueDate);

        // Object task mới tạo chuẩn v4.0
        const newTask = normalizeTaskV4({
            id: generateUniqueId('task'),
            title: title,
            categoryId: rawCategory || 'none',
            priority: rawPriority || 'none',
            dueDate: rawDueDate || '',
            startDate: rawDueDate || '',
            startTime: rawStartTime,
            endTime: rawEndTime,
            isAllDay: isAllDay,
            quadrant: resolvedQuadrant,
            scope: calculateTaskScope(rawDueDate),
            recurring: rawRecurring || 'none',
            lastResetDate: getTodayISO(),
            subtasks: [],
            status: 'pending',
            actualTime: 0
        });

        tasks.unshift(newTask);
        saveTasksToStorage('CREATE', newTask.id, newTask);

        // Reset form sau khi đã lấy đầy đủ dữ liệu
        taskForm.reset();
        taskForm.classList.remove('is-expanded');
        taskForm.classList.add('is-collapsed');
        if (nlpPreviewEl) {
            nlpPreviewEl.style.display = 'none';
            nlpPreviewEl.innerHTML = '';
        }
        isQuadrantManuallySelected = false;

        renderTasks();
        syncTimeModuleUI();
        if (window.__calendarInstance && typeof window.__calendarInstance.render === 'function') {
            window.__calendarInstance.render(getFilteredTasks());
        }

        if (!rawCategory || !rawPriority || !rawDueDate) {
            openUpdateModal(newTask);
        }
    });

    // --- Task 3: Progressive Disclosure cho thanh thêm công việc nhanh (1 Hàng) ---
    if (titleInput && taskForm) {
        const expandQuickAdd = () => {
            taskForm.classList.remove('is-collapsed');
            taskForm.classList.add('is-expanded');
        };
        const collapseQuickAdd = () => {
            taskForm.classList.remove('is-expanded');
            taskForm.classList.add('is-collapsed');
        };

        titleInput.addEventListener('focus', expandQuickAdd);
        titleInput.addEventListener('click', expandQuickAdd);

        document.addEventListener('click', (e) => {
            if (!taskForm.contains(e.target)) {
                collapseQuickAdd();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable) {
                if (e.key !== 'Escape') return; // Để bàn phím hoạt động tự nhiên
            }
            if (e.key === 'Escape' && taskForm.classList.contains('is-expanded')) {
                collapseQuickAdd();
            }
        });
    }

    // Thêm nhanh công việc trực tiếp trong từng Ô Ma trận Eisenhower
    quickAddForms.forEach(qForm => {
        if (!qForm) return;
const qInput = qForm.querySelector('.quadrant-input');
        if (qInput) {
            qInput.addEventListener('click', e => e.stopPropagation());
            qInput.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
            qInput.addEventListener('keydown', (e) => {
                if (e.isComposing || isInputComposing) return;
                if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable) {
                    if (e.key === 'Backspace' || e.key === 'Delete') return;
                }
            });
        }

        qForm.addEventListener('submit', (e) => {
            if (isInputComposing) {
                e.preventDefault();
                return;
            }
            e.preventDefault();
            const inputEl = qForm.querySelector('.quadrant-input');
            const title = inputEl ? inputEl.value.trim() : '';
            const targetQuadrant = qForm.dataset.quadrant;

            if (!title) {
                showToast('Vui lòng nhập tên công việc!', 'warning');
                if (inputEl) {
                    inputEl.focus();
                    const len = inputEl.value.length;
                    inputEl.setSelectionRange(len, len);
                }
                return;
            }

            const quadrantDefaults = {
                q1: { priority: 'high', dueDate: getTodayISO() },
                q2: { priority: 'high', dueDate: getOffsetDateISO(5) },
                q3: { priority: 'medium', dueDate: getTodayISO() },
                q4: { priority: 'low', dueDate: getOffsetDateISO(7) }
            };

            const defaults = quadrantDefaults[targetQuadrant] || quadrantDefaults.q2;
            const defaultCatId = currentCategoryFilter !== 'all' && currentCategoryFilter !== 'none'
                ? currentCategoryFilter
                : (categories[0] ? categories[0].id : 'none');

            const newTask = {
                id: generateUniqueId('task'),
                title: title,
                categoryId: defaultCatId,
                priority: defaults.priority,
                dueDate: defaults.dueDate,
                quadrant: targetQuadrant,
                scope: calculateTaskScope(defaults.dueDate),
                recurring: 'none',
                lastResetDate: getTodayISO(),
                subtasks: [],
                status: 'pending',
                actualTime: 0
            };

            tasks.unshift(newTask);
            saveTasksToStorage('CREATE', newTask.id, newTask);
            if (inputEl) inputEl.value = '';

            renderTasks();
            syncTimeModuleUI();
        });
    });

    // =========================================================================
    // 10. ỦY QUYỀN SỰ KIỆN TRÊN DANH SÁCH & BỘ LỌC TÌM KIẾM
    // =========================================================================
    if (tasksWorkspace) tasksWorkspace.addEventListener('dblclick', (e) => {
        const taskNameEl = e.target.closest('.task-name');
        if (taskNameEl) {
            const taskItem = taskNameEl.closest('.task-item');
            if (taskItem && taskItem.dataset.id) enableInlineTitleEdit(taskItem);
        }
    });

    if (tasksWorkspace) tasksWorkspace.addEventListener('click', (e) => {
        if (e.target && e.target.matches && e.target.matches('.subtask-input, .inline-edit-input, .quadrant-input')) {
            return;
        }

        const taskItem = e.target.closest('.task-item');
        if (!taskItem || !taskItem.dataset.id) return;
        const targetId = String(taskItem.dataset.id);

        const catBadgeEl = e.target.closest('.category-editable');
        if (catBadgeEl) {
            enableInlineCategoryEdit(taskItem, catBadgeEl);
            return;
        }

        const quadBadgeEl = e.target.closest('.quadrant-editable');
        if (quadBadgeEl) {
            enableInlineQuadrantEdit(taskItem, quadBadgeEl);
            return;
        }

        const prioBadgeEl = e.target.closest('.badge-editable');
        if (prioBadgeEl) {
            enableInlinePriorityEdit(taskItem, prioBadgeEl);
            return;
        }

        const dateEl = e.target.closest('.date-editable');
        if (dateEl) {
            enableInlineDateEdit(taskItem, dateEl);
            return;
        }


        // Toggle mở rộng việc con
        if (e.target.closest('.badge-subtasks-toggle') || e.target.closest('.btn-subtask-add-quick')) {
            if (expandedSubtaskTaskIds.has(targetId)) {
                expandedSubtaskTaskIds.delete(targetId);
            } else {
                expandedSubtaskTaskIds.add(targetId);
            }
            renderTasks();
            return;
        }

        // Toggle hoàn thành subtask
        if (e.target.classList.contains('subtask-item-checkbox')) {
            const subItem = e.target.closest('.subtask-item');
            if (subItem && subItem.dataset.subtaskId) {
                const subId = String(subItem.dataset.subtaskId);
                tasks = tasks.map(t => {
                    if (String(t.id) === targetId) {
                        const updatedSubtasks = (t.subtasks || []).map(s => {
                            if (String(s.id) === subId) {
                                return { ...s, completed: e.target.checked };
                            }
                            return s;
                        });
                        return { ...t, subtasks: updatedSubtasks };
                    }
                    return t;
                });
                const updatedTask = tasks.find(t => String(t.id) === targetId);
                saveTasksToStorage('UPDATE', targetId, updatedTask || {});
                renderTasks();
            }
            return;
        }

        // Xóa subtask
        if (e.target.closest('.btn-delete-subtask')) {
            const subItem = e.target.closest('.subtask-item');
            if (subItem && subItem.dataset.subtaskId) {
                const subId = String(subItem.dataset.subtaskId);
                tasks = tasks.map(t => {
                    if (String(t.id) === targetId) {
                        return {
                            ...t,
                            subtasks: (t.subtasks || []).filter(s => String(s.id) !== subId)
                        };
                    }
                    return t;
                });
                const updatedTask = tasks.find(t => String(t.id) === targetId);
                saveTasksToStorage('UPDATE', targetId, updatedTask || {});
                renderTasks();
            }
            return;
        }

        if (e.target.classList.contains('task-checkbox')) {
            const isChecked = e.target.checked;
            handleTaskCheckboxToggle(taskItem, targetId, isChecked);
            return;
        }

        if (e.target.closest('.btn-edit-title') || (e.target.closest('.task-name') && window.innerWidth <= 900)) {
            enableInlineTitleEdit(taskItem);
            return;
        }

        if (e.target.closest('.btn-progress')) {
            tasks = tasks.map(t => (
                String(t.id) === targetId
                    ? { ...t, status: t.status === 'in-progress' ? 'pending' : 'in-progress' }
                    : t
            ));
            const updatedTask = tasks.find(t => String(t.id) === targetId);
            saveTasksToStorage('UPDATE', targetId, updatedTask || {});
            renderTasks();
            syncTimeModuleUI();
            return;
        }

        if (e.target.closest('.btn-delete')) {
            const taskToDelete = tasks.find(t => String(t.id) === targetId);
            if (taskToDelete && safeConfirm(`Bạn có chắc chắn muốn xóa công việc:\n"${taskToDelete.title}" không?`)) {
                tasks = tasks.filter(t => String(t.id) !== targetId);
                saveTasksToStorage('DELETE', targetId, { id: targetId });
                renderTasks();
                syncTimeModuleUI();
                showToast('Đã xóa công việc!', 'info');
            }
        }
    });


    // Hủy bỏ draggable khi người dùng bấm/focus vào ô nhập liệu để bàn phím ảo không xung đột
    if (tasksWorkspace) {
        tasksWorkspace.addEventListener('focusin', (e) => {
            if (e.target && e.target.matches && e.target.matches('.subtask-input, .inline-edit-input, .quadrant-input')) {
                const taskItem = e.target.closest('.task-item');
                if (taskItem) {
                    taskItem.setAttribute('draggable', 'false');
                }
            }
        });
    }

    // Xử lý submit thêm việc con (.subtask-add-form)
    if (tasksWorkspace) {
        tasksWorkspace.addEventListener('submit', (e) => {
            const form = e.target.closest('.subtask-add-form');
            if (!form) return;
            e.preventDefault();

            const taskItem = form.closest('.task-item');
            if (!taskItem || !taskItem.dataset.id) return;
            const targetId = String(taskItem.dataset.id);

            const subInput = form.querySelector('.subtask-input');
            const title = subInput ? subInput.value.trim() : '';
            if (!title) {
                if (subInput) {
                    subInput.focus();
                    const len = subInput.value.length;
                    subInput.setSelectionRange(len, len);
                }
                return;
            }

            let taskFound = false;
            tasks = tasks.map(t => {
                if (String(t.id) === targetId) {
                    taskFound = true;
                    const existingSubtasks = Array.isArray(t.subtasks) ? t.subtasks : [];
                    return {
                        ...t,
                        subtasks: [
                            ...existingSubtasks,
                            { id: generateUniqueId('sub'), title, completed: false }
                        ]
                    };
                }
                return t;
            });

            if (taskFound) {
                expandedSubtaskTaskIds.add(targetId);
                const updatedTask = tasks.find(t => String(t.id) === targetId);
                saveTasksToStorage('UPDATE', targetId, updatedTask || {});
                renderTasks();

                // Tự động focus lại vào ô .subtask-input của task đó để nhập liên tiếp việc con trên bàn phím
                const reloadedItem = tasksWorkspace.querySelector(`.task-item[data-id="${targetId}"]`);
                if (reloadedItem) {
                    const reloadedInput = reloadedItem.querySelector('.subtask-input');
                    if (reloadedInput) {
                        reloadedInput.focus();
                        const len = reloadedInput.value.length;
                        reloadedInput.setSelectionRange(len, len);
                    }
                }
            }
        });
    }


    // =========================================================================
    // 10. LẮNG NGHE SỰ KIỆN TÌM KIẾM, BỘ LỌC POPOVER & SẮP XẾP
    // =========================================================================
    function toggleFilterDropdown(forceState) {
        if (!filterDropdownPanel || !btnToggleFilterDropdown) return;
        const isCurrentlyOpen = filterDropdownPanel.style.display === 'block';
        const willOpen = forceState !== undefined ? forceState : !isCurrentlyOpen;
        
        if (willOpen) {
            filterDropdownPanel.style.display = 'block';
            btnToggleFilterDropdown.classList.add('active');
            btnToggleFilterDropdown.setAttribute('aria-expanded', 'true');
        } else {
            filterDropdownPanel.style.display = 'none';
            btnToggleFilterDropdown.classList.remove('active');
            btnToggleFilterDropdown.setAttribute('aria-expanded', 'false');
        }
    }

    if (btnToggleFilterDropdown) {
        btnToggleFilterDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFilterDropdown();
        });
    }

    if (btnCloseFilterPanel) {
        btnCloseFilterPanel.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFilterDropdown(false);
        });
    }

    if (btnApplyFilter) {
        btnApplyFilter.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFilterDropdown(false);
        });
    }

    // Đóng dropdown khi click ra ngoài vùng popover
    document.addEventListener('click', (e) => {
        if (filterPopoverContainer && !filterPopoverContainer.contains(e.target)) {
            toggleFilterDropdown(false);
        }
    });

    // Tìm kiếm thời gian thực theo từ khóa có Debounce (250ms) & An toàn IME tiếng Việt
    if (searchTaskInput) {
        let searchDebounceTimer = null;

        const executeSearch = (queryVal) => {
            if (isInputComposing) return;
            currentSearchQuery = (queryVal !== undefined ? queryVal : (searchTaskInput.value || '')).trim();
            updateActiveFiltersBadge();
            renderTasks();
        };

        const handleSearch = (e) => {
            if (e && e.isComposing) return;
            if (isInputComposing) return;

            const val = e && e.target ? e.target.value : searchTaskInput.value;

            if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                executeSearch(val);
            }, 250);
        };

        searchTaskInput.addEventListener('input', handleSearch);

        searchTaskInput.addEventListener('search', () => {
            if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
            executeSearch(searchTaskInput.value);
        });

        searchTaskInput.addEventListener('keydown', (e) => {
            if (e.isComposing || isInputComposing) return;
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable) {
                if (e.key === 'Backspace' || e.key === 'Delete') {
                    return;
                }
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
                executeSearch(searchTaskInput.value);
            }
        });
    }

    // Lọc theo Filter Pills (nếu có)
    if (filterBtns && filterBtns.length > 0) {
        filterBtns.forEach(btn => {
            if (btn) btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentStatusFilter = btn.dataset.filter || 'all';
                if (filterStatusSelect) {
                    filterStatusSelect.value = currentStatusFilter;
                }
                updateActiveFiltersBadge();
                renderTasks(); 
            });
        });
    }

    // Lọc theo Danh mục
    if (filterCategorySelect) {
        filterCategorySelect.addEventListener('change', () => {
            currentCategoryFilter = filterCategorySelect.value;
            updateActiveFiltersBadge();
            renderTasks(); 
        });
    }

    // Lọc theo Mức độ ưu tiên
    if (filterPrioritySelect) {
        filterPrioritySelect.addEventListener('change', () => {
            currentPriorityFilter = filterPrioritySelect.value;
            updateActiveFiltersBadge();
            renderTasks(); 
        });
    }

    // Lọc theo Thời hạn
    if (filterDueDateSelect) {
        filterDueDateSelect.addEventListener('change', () => {
            currentDueDateFilter = filterDueDateSelect.value;
            updateActiveFiltersBadge();
            renderTasks(); 
        });
    }

    // Lọc theo Trạng thái
    if (filterStatusSelect) {
        filterStatusSelect.addEventListener('change', () => {
            currentStatusFilter = filterStatusSelect.value;
            updateActiveFiltersBadge();
            renderTasks(); 
        });
    }

    // Nút Xóa bộ lọc (Reset)
    // Nút Xóa tất cả trên thanh Active Filter Chips
    if (btnClearAllFilterChips) {
        btnClearAllFilterChips.addEventListener('click', () => {
            resetAllFilters();
        });
    }

    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            resetAllFilters();
        });
    }

    // Lắng nghe sự kiện thay đổi tiêu chí sắp xếp
    if (taskSortSelect) {
        taskSortSelect.addEventListener('change', () => {
            currentSortMode = taskSortSelect.value || 'smart';
            renderTasks(); 
        });
    }

    // =========================================================================
    // 11. HỆ THỐNG ÂM THANH WEB AUDIO API (POMODORO BEEP)
    // =========================================================================
    let sharedAudioCtx = null;

    function getAudioContext() {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return null;
        if (!sharedAudioCtx) {
            sharedAudioCtx = new AudioContextClass();
        }
        if (sharedAudioCtx.state === 'suspended') {
            sharedAudioCtx.resume();
        }
        return sharedAudioCtx;
    }

    /**
     * Tiếng Beep chuông báo Web Audio API (kiểm tra enableSound)
     */
    function playBeepSound() {
        if (!pomoSettings || pomoSettings.enableSound === false) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // 2 hồi Beep 880Hz rõ ràng
            [0, 0.16].forEach(offset => {
                const osc = ctx.createOscillator();
                const gainNode = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, now + offset);

                gainNode.gain.setValueAtTime(0.0001, now + offset);
                gainNode.gain.linearRampToValueAtTime(0.2, now + offset + 0.02);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.12);

                osc.connect(gainNode);
                gainNode.connect(ctx.destination);

                osc.start(now + offset);
                osc.stop(now + offset + 0.13);

                osc.onended = () => {
                    osc.disconnect();
                    gainNode.disconnect();
                };
            });
        } catch (err) {}
    }

    function handleTaskCheckboxToggle(taskItem, targetId, isChecked) {
        const safeTargetId = String(targetId);
        const newStatus = isChecked ? 'completed' : 'pending';
        
        tasks = tasks.map(t => (String(t.id) === safeTargetId ? { ...t, status: newStatus } : t));
        saveTasksToStorage('UPDATE', safeTargetId, { status: newStatus });
        updateSmartListCounts();

        if (taskItem) {
            taskItem.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
            taskItem.style.opacity = '0';
            taskItem.style.transform = isChecked ? 'translateX(10px)' : 'translateX(-10px)';
            taskItem.style.pointerEvents = 'none';
            setTimeout(() => {
                renderTasks();
                syncTimeModuleUI();
            }, 150);
        } else {
            renderTasks();
            syncTimeModuleUI();
        }
    }

    // =========================================================================
    // 12. MODULE 2: QUẢN LÝ THỜI GIAN (POMODORO, TAB TITLE & DAILY STATS)
    // =========================================================================
    const POMO_MODES = {
        'focus': { minutes: 25, label: 'Tập trung cao độ' },
        'short-break': { minutes: 5, label: 'Nghỉ giải lao ngắn' },
        'long-break': { minutes: 15, label: 'Nghỉ giải lao dài' }
    };
    const RING_CIRCUMFERENCE = 2 * Math.PI * 116;

    let selectedFocusTaskId = '';
    let currentPomoMode = 'focus';
    let totalModeSeconds = POMO_MODES['focus'].minutes * 60;
    let remainingSeconds = totalModeSeconds;
    let unloggedFocusSeconds = 0;
    let pomoIntervalId = null;
    let isTimerRunning = false;
    let pomoTargetEndTime = null;
    let pomoLastTickTime = null;

    // 12.1. Chuyển đổi mượt giữa các Module (Single Page Navigation)
    function switchModule(targetModule) {
        currentActiveModule = targetModule;
        if (typeof window.__closeMobileSidebar === 'function' && window.innerWidth <= 900) {
            window.__closeMobileSidebar();
        }

        const topbarRight = document.querySelector('.treth-topbar-right');
        const dashboardBar = document.querySelector('.treth-dashboard-bar');
        const viewSwitcher = document.querySelector('.view-switcher');

        // Ẩn tất cả các module view trước
        if (moduleTasksView) moduleTasksView.style.display = 'none';
        if (moduleCalendarView) moduleCalendarView.style.display = 'none';
        if (moduleTimeView) moduleTimeView.style.display = 'none';
        if (moduleHabitsView) moduleHabitsView.style.display = 'none';
        if (moduleNotesView) moduleNotesView.style.display = 'none';
        if (moduleAnalyticsView) moduleAnalyticsView.style.display = 'none';

        // Bỏ active tất cả nav buttons
        if (navBtnTasks) navBtnTasks.classList.remove('active');
        if (navBtnCalendar) navBtnCalendar.classList.remove('active');
        if (navBtnTime) navBtnTime.classList.remove('active');
        if (navBtnHabits) navBtnHabits.classList.remove('active');
        if (navBtnNotes) navBtnNotes.classList.remove('active');
        if (navBtnAnalytics) navBtnAnalytics.classList.remove('active');

        if (headerModuleBadge) {
            headerModuleBadge.style.display = 'none';
            headerModuleBadge.innerHTML = '';
        }

        if (targetModule === 'calendar') {
            if (moduleTasksView) moduleTasksView.style.display = 'block';
            if (navBtnCalendar) navBtnCalendar.classList.add('active');
            if (btnOpenCatManager) btnOpenCatManager.style.display = '';

            if (topbarRight) topbarRight.style.display = '';
            if (dashboardBar) dashboardBar.style.display = '';
            if (viewSwitcher) viewSwitcher.style.display = 'flex';

            if (headerModuleTitle) headerModuleTitle.textContent = 'Lịch biểu';
            if (headerModuleSlogan) headerModuleSlogan.textContent = 'Theo dõi tiến độ và phân bổ kế hoạch trực quan theo dòng thời gian.';

            currentViewMode = 'calendar';
            saveViewModeToStorage();
            applyViewMode();
        } else if (targetModule === 'time') {
            if (moduleTimeView) moduleTimeView.style.display = 'block';
            if (navBtnTime) navBtnTime.classList.add('active');
            if (btnOpenCatManager) btnOpenCatManager.style.display = 'none';

            if (topbarRight) topbarRight.style.display = 'none';
            if (dashboardBar) dashboardBar.style.display = 'none';
            if (viewSwitcher) viewSwitcher.style.display = 'none';

            if (headerModuleTitle) headerModuleTitle.textContent = 'Thời gian';
            if (headerModuleSlogan) headerModuleSlogan.textContent = 'Làm việc sâu với phương pháp Pomodoro, đo lường chính xác thời gian thực tế.';

            syncTimeModuleUI();
        } else if (targetModule === 'habits') {
            if (moduleHabitsView) moduleHabitsView.style.display = 'block';
            if (navBtnHabits) navBtnHabits.classList.add('active');
            if (btnOpenCatManager) btnOpenCatManager.style.display = 'none';

            if (topbarRight) topbarRight.style.display = 'none';
            if (dashboardBar) dashboardBar.style.display = 'none';
            if (viewSwitcher) viewSwitcher.style.display = 'none';

            if (headerModuleTitle) headerModuleTitle.textContent = 'Thói quen';
            if (headerModuleSlogan) headerModuleSlogan.textContent = 'Duy trì kỷ luật mỗi ngày để tạo nên sự thay đổi vượt bậc.';

            renderHabits();
            updateHabitStats();
        } else if (targetModule === 'notes') {
            if (moduleNotesView) moduleNotesView.style.display = 'block';
            if (navBtnNotes) navBtnNotes.classList.add('active');
            if (btnOpenCatManager) btnOpenCatManager.style.display = 'none';

            if (topbarRight) topbarRight.style.display = 'none';
            if (dashboardBar) dashboardBar.style.display = 'none';
            if (viewSwitcher) viewSwitcher.style.display = 'none';

            if (headerModuleTitle) headerModuleTitle.textContent = 'Ghi chú';
            if (headerModuleSlogan) headerModuleSlogan.textContent = 'Ghi lại ý tưởng tức thì, lưu trữ kiến thức và suy nghĩ sáng tạo.';

            renderNotes();
            renderNoteTags();
        } else if (targetModule === 'analytics') {
            if (moduleAnalyticsView) moduleAnalyticsView.style.display = 'block';
            if (navBtnAnalytics) navBtnAnalytics.classList.add('active');
            if (btnOpenCatManager) btnOpenCatManager.style.display = 'none';

            if (topbarRight) topbarRight.style.display = 'none';
            if (dashboardBar) dashboardBar.style.display = 'none';
            if (viewSwitcher) viewSwitcher.style.display = 'none';

            if (headerModuleTitle) headerModuleTitle.textContent = 'Thống kê';
            if (headerModuleSlogan) headerModuleSlogan.textContent = 'Phân tích hiệu suất làm việc, tiến độ hoàn thành và phân bổ thời gian.';

            renderAnalyticsDashboard();
        } else {
            // Mặc định: tasks
            if (moduleTasksView) moduleTasksView.style.display = 'block';
            if (navBtnTasks) navBtnTasks.classList.add('active');
            if (btnOpenCatManager) btnOpenCatManager.style.display = '';

            if (topbarRight) topbarRight.style.display = '';
            if (dashboardBar) dashboardBar.style.display = '';
            if (viewSwitcher) viewSwitcher.style.display = '';

            if (headerModuleTitle) headerModuleTitle.textContent = 'Công việc';
            if (headerModuleSlogan) headerModuleSlogan.textContent = 'Tập trung vào điều quan trọng, hoàn thành từng mục tiêu nhỏ mỗi ngày.';

            renderTasks();
        }
        updateTimerDisplay();
    }

    if (navBtnTasks) navBtnTasks.addEventListener('click', () => switchModule('tasks'));
    if (navBtnCalendar) navBtnCalendar.addEventListener('click', () => switchModule('calendar'));
    if (navBtnTime) navBtnTime.addEventListener('click', () => switchModule('time'));
    if (navBtnHabits) navBtnHabits.addEventListener('click', () => switchModule('habits'));
    if (navBtnNotes) navBtnNotes.addEventListener('click', () => switchModule('notes'));
    if (navBtnAnalytics) navBtnAnalytics.addEventListener('click', () => switchModule('analytics'));

    // --- Task 1: Bộ điều khiển Thống kê & Biểu đồ thuần (Vanilla SVG Pie/Donut Charts) ---
    function getAnalyticsFilteredTasks() {
        const todayStr = getTodayISO();
        const next7DaysStr = getOffsetDateISO(7);
        const past7DaysStr = getOffsetDateISO(-7);
        const currentMonthStr = todayStr.substring(0, 7);

        const all = tasks.filter(t => !t.isDeleted);
        if (analyticsTimeRange === 'today') {
            return all.filter(t => t.dueDate === todayStr || (t.updatedAt && t.updatedAt.startsWith(todayStr)) || t.lastResetDate === todayStr);
        }
        if (analyticsTimeRange === 'week') {
            return all.filter(t => (t.dueDate && t.dueDate >= past7DaysStr && t.dueDate <= next7DaysStr) || (t.updatedAt && t.updatedAt >= past7DaysStr));
        }
        if (analyticsTimeRange === 'month') {
            return all.filter(t => (t.dueDate && t.dueDate.startsWith(currentMonthStr)) || (t.updatedAt && t.updatedAt.startsWith(currentMonthStr)));
        }
        return all;
    }

    function renderSvgDonut(containerEl, legendEl, slices, totalCount, centerLabel) {
        if (!containerEl || !legendEl) return;
        const radius = 60;
        const strokeWidth = 24;
        const circumference = 2 * Math.PI * radius; // ~376.991

        if (totalCount === 0) {
            containerEl.innerHTML = `
                <svg viewBox="0 0 160 160" width="160" height="160">
                    <circle cx="80" cy="80" r="${radius}" fill="none" stroke="rgba(148, 163, 184, 0.15)" stroke-width="${strokeWidth}" />
                    <text x="80" y="85" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor" transform="rotate(90 80 80)">0 việc</text>
                </svg>
            `;
            legendEl.innerHTML = `<div style="color: var(--text-muted); font-size: 12px; font-style: italic;">Không có dữ liệu trong khoảng này</div>`;
            return;
        }

        let cumulativePercent = 0;
        let svgCircles = '';
        let legendHTML = '';

        slices.forEach(slice => {
            if (slice.count <= 0) return;
            const percent = (slice.count / totalCount) * 100;
            const dashArray = `${(percent / 100) * circumference} ${circumference}`;
            const dashOffset = -((cumulativePercent / 100) * circumference);
            cumulativePercent += percent;

            svgCircles += `
                <circle cx="80" cy="80" r="${radius}" fill="none"
                    stroke="${slice.color}"
                    stroke-width="${strokeWidth}"
                    stroke-dasharray="${dashArray}"
                    stroke-dashoffset="${dashOffset}"
                    stroke-linecap="butt"
                />
            `;

            legendHTML += `
                <div class="chart-legend-item">
                    <span class="chart-legend-dot" style="background-color: ${slice.color};"></span>
                    <span class="chart-legend-name" title="${escapeHTML(slice.label)}">${escapeHTML(slice.label)}</span>
                    <span class="chart-legend-val">${slice.count} <span style="font-weight: 400; opacity: 0.7;">(${Math.round(percent)}%)</span></span>
                </div>
            `;
        });

        containerEl.innerHTML = `
            <svg viewBox="0 0 160 160" width="160" height="160">
                <circle cx="80" cy="80" r="${radius}" fill="none" stroke="rgba(148, 163, 184, 0.12)" stroke-width="${strokeWidth}" />
                ${svgCircles}
                <text x="80" y="78" text-anchor="middle" font-size="18" font-weight="700" fill="currentColor" transform="rotate(90 80 80)">${totalCount}</text>
                <text x="80" y="93" text-anchor="middle" font-size="10" font-weight="500" fill="var(--text-muted)" transform="rotate(90 80 80)">${centerLabel || 'công việc'}</text>
            </svg>
        `;
        legendEl.innerHTML = legendHTML;
    }

    function renderAnalyticsDashboard() {
        const filtered = getAnalyticsFilteredTasks();
        const total = filtered.length;
        const completed = filtered.filter(t => t.status === 'completed').length;
        const pending = total - completed;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        const urgentOrOverdue = filtered.filter(t => {
            if (t.status === 'completed') return false;
            const d = getDeadlineAndTermInfo(t.dueDate, t.status);
            return d && d.isUrgentOrOverdue;
        }).length;

        // Cập nhật các thẻ chỉ số Summary Cards
        if (statTotalEl) statTotalEl.textContent = String(total).padStart(2, '0');
        if (statCompletedEl) statCompletedEl.textContent = String(completed).padStart(2, '0');
        if (statPendingEl) statPendingEl.textContent = String(pending).padStart(2, '0');
        if (statUrgentEl) statUrgentEl.textContent = String(urgentOrOverdue).padStart(2, '0');
        if (statProgressTextEl) statProgressTextEl.textContent = `${percent}%`;
        if (statProgressBarEl) statProgressBarEl.style.width = `${percent}%`;

        const totalFocusMins = filtered.reduce((acc, t) => acc + (Number(t.actualTime) || 0), 0);
        const focusMinsEl = document.getElementById('analytics-focus-minutes');
        const pomoCyclesEl = document.getElementById('analytics-pomo-cycles');
        if (focusMinsEl) focusMinsEl.textContent = `${totalFocusMins} phút`;
        if (pomoCyclesEl) pomoCyclesEl.textContent = pomoStats ? pomoStats.completedCycles || 0 : 0;

        // 1. Biểu đồ Trạng thái: Hoàn thành, Đang làm, Cần làm, Quá hạn
        const inProgress = filtered.filter(t => t.status === 'in-progress').length;
        const overdueCount = filtered.filter(t => {
            if (t.status === 'completed') return false;
            const d = getDeadlineAndTermInfo(t.dueDate, t.status);
            return d && d.isUrgentOrOverdue;
        }).length;
        const regularPending = Math.max(0, pending - inProgress - overdueCount);

        const statusSlices = [
            { label: 'Hoàn thành', count: completed, color: '#10B981' },
            { label: 'Đang làm', count: inProgress, color: '#3B82F6' },
            { label: 'Cần làm', count: regularPending, color: '#F59E0B' },
            { label: 'Gấp / Quá hạn', count: overdueCount, color: '#EF4444' }
        ];
        renderSvgDonut(
            document.getElementById('chart-status-visual'),
            document.getElementById('chart-status-legend'),
            statusSlices,
            total,
            'công việc'
        );

        // 2. Biểu đồ Phân bổ Loại việc
        const catMap = {};
        filtered.forEach(t => {
            const catId = t.categoryId || 'none';
            catMap[catId] = (catMap[catId] || 0) + 1;
        });
        const categorySlices = Object.keys(catMap).map(catId => {
            const cat = getCategoryById(catId);
            return {
                label: (cat.name || 'Khác'),
                count: catMap[catId],
                color: cat.color || '#6366F1'
            };
        }).sort((a, b) => b.count - a.count);

        renderSvgDonut(
            document.getElementById('chart-category-visual'),
            document.getElementById('chart-category-legend'),
            categorySlices,
            total,
            'loại việc'
        );

        // 3. Biểu đồ Góc ma trận Eisenhower
        const q1Count = filtered.filter(t => (t.quadrant || 'q2') === 'q1').length;
        const q2Count = filtered.filter(t => (t.quadrant || 'q2') === 'q2').length;
        const q3Count = filtered.filter(t => (t.quadrant || 'q2') === 'q3').length;
        const q4Count = filtered.filter(t => (t.quadrant || 'q2') === 'q4').length;

        const quadrantSlices = [
            { label: 'Ô 1: Làm ngay', count: q1Count, color: '#EF4444' },
            { label: 'Ô 2: Lên lịch', count: q2Count, color: '#3B82F6' },
            { label: 'Ô 3: Ủy quyền', count: q3Count, color: '#F59E0B' },
            { label: 'Ô 4: Xóa', count: q4Count, color: '#94A3B8' }
        ];
        renderSvgDonut(
            document.getElementById('chart-quadrant-visual'),
            document.getElementById('chart-quadrant-legend'),
            quadrantSlices,
            total,
            'ma trận'
        );
    }

    // Lắng nghe sự kiện đổi bộ lọc thời gian Thống kê
    document.querySelectorAll('.analytics-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.analytics-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            analyticsTimeRange = btn.getAttribute('data-time-range') || 'all';
            renderAnalyticsDashboard();
        });
    });

    // 12.2. Đồng bộ Tiêu đề Tab trình duyệt (Browser Tab Title)
    function formatTimerMMSS(totalSec) {
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    function updateBrowserTabTitle() {
        if (isTimerRunning) {
            const timeStr = formatTimerMMSS(remainingSeconds);
            const icon = currentPomoMode === 'focus' ? '⏱️' : '☕';
            document.title = `(${timeStr}) ${icon} TreTH`;
        } else {
            document.title = DEFAULT_DOCUMENT_TITLE;
        }
    }

    function updateTimerDisplay() {
        if (pomoTimeDisplay) {
            pomoTimeDisplay.textContent = formatTimerMMSS(remainingSeconds);
        }
        if (pomoRingProgress && totalModeSeconds > 0) {
            const fraction = remainingSeconds / totalModeSeconds;
            const offset = RING_CIRCUMFERENCE * (1 - fraction);
            pomoRingProgress.style.strokeDashoffset = offset;
        }

        // Đồng bộ Floating Mini-Pomodoro Widget
        const floatWidget = document.getElementById('floating-pomo-widget');
        if (floatWidget) {
            const isOutsideTimeModule = (currentActiveModule !== 'time');
            if (isTimerRunning && isOutsideTimeModule) {
                floatWidget.style.display = 'flex';
                const timeText = formatTimerMMSS(remainingSeconds);
                const floatTimeDisp = document.getElementById('floating-pomo-time-display');
                if (floatTimeDisp) floatTimeDisp.textContent = timeText;

                const floatTaskName = document.getElementById('floating-pomo-task-name');
                if (floatTaskName) {
                    const focusTask = tasks.find(t => String(t.id) === String(selectedFocusTaskId));
                    floatTaskName.textContent = focusTask ? focusTask.title : 'Đang tập trung...';
                }

                const ring = document.getElementById('floating-pomo-ring');
                if (ring && totalModeSeconds > 0) {
                    const pct = Math.round((remainingSeconds / totalModeSeconds) * 100);
                    ring.style.setProperty('--pomo-percent', pct);
                }
            } else {
                floatWidget.style.display = 'none';
            }
        }

        updateBrowserTabTitle();
    }

    // 12.3. Liên kết Công việc & Thống kê Pomodoro trong ngày
    function populateFocusTaskDropdown() {
        if (!focusTaskSelect) return;

        const incompleteTasks = tasks.filter(t => t.status !== 'completed');
        focusTaskSelect.innerHTML = `<option value="">-- Chọn công việc chưa hoàn thành (${incompleteTasks.length} việc) --</option>`;

        incompleteTasks.forEach(task => {
            const cat = getCategoryById(task.categoryId);
            const quad = getQuadrantConfig(task.quadrant);
            const spentText = task.actualTime > 0 ? ` • ⏱️ ${task.actualTime}p` : '';
            const rawTitle = (task.title || '').trim();
            const displayTitle = rawTitle.length > 45 ? rawTitle.substring(0, 45).trim() + '...' : rawTitle;
            const option = document.createElement('option');
            option.value = String(task.id);
            option.textContent = `${quad.dot} [${cat.icon} ${cat.name}] ${displayTitle}${spentText}`;
            focusTaskSelect.appendChild(option);
        });

        if (selectedFocusTaskId && incompleteTasks.some(t => String(t.id) === String(selectedFocusTaskId))) {
            focusTaskSelect.value = String(selectedFocusTaskId);
        } else {
            selectedFocusTaskId = incompleteTasks.length > 0 ? String(incompleteTasks[0].id) : '';
            focusTaskSelect.value = selectedFocusTaskId;
        }

        updateSelectedFocusTaskMeta();
    }

    function updateSelectedFocusTaskMeta() {
        if (!focusTaskMetaBar) return;
        const task = tasks.find(t => String(t.id) === String(selectedFocusTaskId));

        if (!task || task.status === 'completed') {
            focusTaskMinutesEl.textContent = '0';
            if (btnCompleteFocusedTask) btnCompleteFocusedTask.disabled = true;
            focusTaskMetaBar.style.display = 'none';
            return;
        }

        focusTaskMinutesEl.textContent = task.actualTime || 0;
        if (btnCompleteFocusedTask) btnCompleteFocusedTask.disabled = false;

        const catInfo = getCategoryById(task.categoryId);
        const quadInfo = getQuadrantConfig(task.quadrant);
        const prioInfo = getPriorityConfig(task.priority);

        focusMetaCategory.style = getCategoryBadgeStyle(catInfo.color);
        focusMetaCategory.innerHTML = `<span>${escapeHTML(catInfo.icon)}</span><span>${escapeHTML(catInfo.name)}</span>`;

        focusMetaQuadrant.className = `badge-quadrant ${quadInfo.class}`;
        focusMetaQuadrant.innerHTML = `<span>${quadInfo.dot}</span><span>${quadInfo.shortLabel}</span>`;

        focusMetaPriority.className = `badge ${prioInfo.class}`;
        focusMetaPriority.innerHTML = `<i class="${prioInfo.icon}"></i> ${prioInfo.label}`;

        focusMetaDue.innerHTML = `<i class="ri-calendar-line"></i> Hạn: ${formatDateVN(task.dueDate)}`;
        focusTaskMetaBar.style.display = 'flex';
    }

    function renderTimeTrackingListAndPomoStats() {
        pomoStats = loadPomoStats();
        savePomoStatsToStorage();

        if (pomoCycleCounter) {
            pomoCycleCounter.textContent = `Chu kỳ hôm nay: ${pomoStats.completedCycles}`;
        }
        if (pomoStatTodayCyclesEl) {
            pomoStatTodayCyclesEl.textContent = `${pomoStats.completedCycles} chu kỳ`;
        }
        if (pomoStatTodayMinutesEl) {
            pomoStatTodayMinutesEl.textContent = `${pomoStats.totalFocusMinutes} phút`;
        }

        const totalMinutes = tasks.reduce((sum, t) => sum + (Number(t.actualTime) || 0), 0);
        const trackedCount = tasks.filter(t => (Number(t.actualTime) || 0) > 0).length;

        if (totalActualTimeAllEl) totalActualTimeAllEl.textContent = `${totalMinutes} phút`;
        if (totalTrackedTasksEl) totalTrackedTasksEl.textContent = `${trackedCount} việc`;

        if (!timeTrackedListEl) return;
        const sortedTasks = [...tasks].sort((a, b) => (b.actualTime || 0) - (a.actualTime || 0));

        timeTrackedListEl.innerHTML = '';
        if (sortedTasks.length === 0) {
            timeTrackedListEl.innerHTML = `
                <li style="text-align: center; padding: 2rem 1rem; color: var(--text-muted); font-size: 0.85rem;">
                    Chưa có công việc nào trong hệ thống.
                </li>
            `;
            return;
        }

        sortedTasks.forEach(task => {
            const cat = getCategoryById(task.categoryId);
            const isSelected = String(task.id) === String(selectedFocusTaskId);
            const li = document.createElement('li');
            li.className = `time-tracked-item ${isSelected ? 'is-selected' : ''}`;

            li.innerHTML = `
                <div class="time-tracked-info">
                    <span class="time-tracked-title" style="${task.status === 'completed' ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">
                        ${escapeHTML(task.title)}
                    </span>
                    <div class="time-tracked-sub">
                        <span>${escapeHTML(cat.icon)} ${escapeHTML(cat.name)}</span>
                        <span>•</span>
                        <span>${getStatusLabel(task.status)}</span>
                    </div>
                </div>
                <div class="time-tracked-right">
                    <span class="badge-time-spent">
                        <i class="ri-timer-flash-line"></i> ${task.actualTime || 0} phút
                    </span>
                    ${task.status !== 'completed' ? `
                        <button type="button" class="btn-quick-focus" data-id="${escapeHTML(String(task.id))}" title="Chọn công việc này để bấm giờ">
                            <i class="ri-focus-2-line"></i> Chọn
                        </button>
                    ` : ''}
                </div>
            `;
            timeTrackedListEl.appendChild(li);
        });
    }

    function syncTimeModuleUI() {
        populateFocusTaskDropdown();
        renderTimeTrackingListAndPomoStats();
    }

    /**
     * Cộng dồn số phút tập trung vào thuộc tính actualTime của Task đang chọn
     * và cập nhật thống kê Pomodoro trong ngày (personal_workspace_pomo_stats_v1)
     */
    function commitElapsedFocusTime(isFullCycleCompleted = false) {
        if (currentPomoMode !== 'focus') {
            unloggedFocusSeconds = 0;
            return;
        }

        pomoStats = loadPomoStats();
        let addedMinutes = 0;

        if (isFullCycleCompleted) {
            addedMinutes = Math.max(1, Math.round(unloggedFocusSeconds / 60));
            pomoStats.completedCycles += 1;
            pomoStats.totalFocusMinutes += addedMinutes;
            savePomoStatsToStorage();

            if (selectedFocusTaskId) {
                const targetId = String(selectedFocusTaskId);
                tasks = tasks.map(t => {
                    if (String(t.id) === targetId) {
                        const updatedMinutes = (Number(t.actualTime) || 0) + addedMinutes;
                        return {
                            ...t,
                            status: t.status === 'pending' ? 'in-progress' : t.status,
                            actualTime: updatedMinutes,
                            _accumulatedSeconds: updatedMinutes * 60
                        };
                    }
                    return t;
                });
                const updatedTask = tasks.find(t => String(t.id) === targetId);
                saveTasksToStorage('UPDATE', targetId, updatedTask || {});
            }
            unloggedFocusSeconds = 0;
        } else if (unloggedFocusSeconds > 0) {
            if (selectedFocusTaskId) {
                const targetId = String(selectedFocusTaskId);
                const targetTask = tasks.find(t => String(t.id) === targetId);
                if (targetTask) {
                    const prevMinutes = Number(targetTask.actualTime) || 0;
                    const prevSeconds = typeof targetTask._accumulatedSeconds === 'number'
                        ? targetTask._accumulatedSeconds
                        : prevMinutes * 60;
                    const newTotalSeconds = prevSeconds + unloggedFocusSeconds;
                    const newActualMinutes = Math.floor(newTotalSeconds / 60);
                    const deltaMinutes = Math.max(0, newActualMinutes - prevMinutes);

                    tasks = tasks.map(t => {
                        if (String(t.id) === targetId) {
                            return {
                                ...t,
                                status: t.status === 'pending' ? 'in-progress' : t.status,
                                actualTime: newActualMinutes,
                                _accumulatedSeconds: newTotalSeconds
                            };
                        }
                        return t;
                    });
                    const updatedTask = tasks.find(t => String(t.id) === targetId);
                    saveTasksToStorage('UPDATE', targetId, updatedTask || {});

                    if (deltaMinutes > 0) {
                        pomoStats.totalFocusMinutes += deltaMinutes;
                        savePomoStatsToStorage();
                    }
                }
            } else {
                const prevSec = typeof pomoStats._accumulatedSeconds === 'number' ? pomoStats._accumulatedSeconds : 0;
                const newTotalSec = prevSec + unloggedFocusSeconds;
                const deltaMinutes = Math.floor(newTotalSec / 60);
                pomoStats._accumulatedSeconds = newTotalSec % 60;
                if (deltaMinutes > 0) {
                    pomoStats.totalFocusMinutes += deltaMinutes;
                    savePomoStatsToStorage();
                }
            }
            unloggedFocusSeconds = 0;
        }

        updateSelectedFocusTaskMeta();
        renderTimeTrackingListAndPomoStats();
        renderTasks();
    }

    if (focusTaskSelect) {
        focusTaskSelect.addEventListener('change', () => {
            if (unloggedFocusSeconds > 0 && selectedFocusTaskId) {
                commitElapsedFocusTime(false);
            }
            selectedFocusTaskId = String(focusTaskSelect.value || '');
            updateSelectedFocusTaskMeta();
            renderTimeTrackingListAndPomoStats();
        });
    }

    if (timeTrackedListEl) {
        timeTrackedListEl.addEventListener('click', (e) => {
            const quickBtn = e.target.closest('.btn-quick-focus');
            if (!quickBtn) return;
            const targetId = String(quickBtn.dataset.id);
            if (unloggedFocusSeconds > 0 && selectedFocusTaskId) {
                commitElapsedFocusTime(false);
            }
            selectedFocusTaskId = targetId;
            focusTaskSelect.value = targetId;
            updateSelectedFocusTaskMeta();
            renderTimeTrackingListAndPomoStats();
        });
    }

    if (btnCompleteFocusedTask) {
        btnCompleteFocusedTask.addEventListener('click', () => {
            if (!selectedFocusTaskId) return;
            if (isTimerRunning) pausePomodoroTimer();
            commitElapsedFocusTime(false);

            const targetId = String(selectedFocusTaskId);
            tasks = tasks.map(t => (String(t.id) === targetId ? { ...t, status: 'completed' } : t));
            saveTasksToStorage('UPDATE', targetId, { status: 'completed' });

            syncTimeModuleUI();
            renderTasks();
        });
    }

    function startPomodoroTimer() {
        if (isTimerRunning) return;

        if (currentPomoMode === 'focus' && !selectedFocusTaskId) {
            const incomplete = tasks.filter(t => t.status !== 'completed');
            if (incomplete.length > 0) {
                alert('Vui lòng chọn một công việc chưa hoàn thành ở danh sách phía trên để bắt đầu tập trung!');
                focusTaskSelect.focus();
                return;
            }
        }

        // Tự động xin quyền gửi thông báo đẩy khi người dùng bắt đầu chạy đồng hồ Pomodoro
        if ('Notification' in window && Notification.permission === 'default') {
            requestNotificationPermission();
        }

        isTimerRunning = true;
        btnPomoStart.disabled = true;
        btnPomoPause.disabled = false;
        pomoStatusBadge.textContent = currentPomoMode === 'focus' ? '🔥 Đang tập trung...' : '☕ Đang nghỉ ngơi...';

        if (currentPomoMode === 'focus' && selectedFocusTaskId) {
            const targetId = String(selectedFocusTaskId);
            tasks = tasks.map(t => (String(t.id) === targetId && t.status === 'pending' ? { ...t, status: 'in-progress' } : t));
            const updatedTask = tasks.find(t => String(t.id) === targetId);
            saveTasksToStorage('UPDATE', targetId, updatedTask || {});
            renderTimeTrackingListAndPomoStats();
        }

        const now = Date.now();
        pomoTargetEndTime = now + remainingSeconds * 1000;
        pomoLastTickTime = now;

        updateTimerDisplay();

        pomoIntervalId = setInterval(() => {
            const currentNow = Date.now();
            const elapsed = Math.floor((currentNow - pomoLastTickTime) / 1000);

            if (elapsed >= 1) {
                pomoLastTickTime += elapsed * 1000;
                const calculatedRemaining = Math.max(0, Math.round((pomoTargetEndTime - currentNow) / 1000));
                const deltaSeconds = remainingSeconds - calculatedRemaining;
                remainingSeconds = calculatedRemaining;

                if (currentPomoMode === 'focus' && deltaSeconds > 0) {
                    unloggedFocusSeconds += deltaSeconds;
                }
                updateTimerDisplay();

                if (remainingSeconds <= 0) {
                    clearInterval(pomoIntervalId);
                    pomoIntervalId = null;
                    isTimerRunning = false;
                    pomoTargetEndTime = null;
                    pomoLastTickTime = null;

                    btnPomoStart.disabled = false;
                    btnPomoStart.innerHTML = `<i class="ri-play-fill"></i><span>Bắt đầu</span>`;
                    btnPomoPause.disabled = true;

                    const modeMins = (POMO_MODES[currentPomoMode] && POMO_MODES[currentPomoMode].minutes) || 25;

                    if (currentPomoMode === 'focus') {
                        sendPomodoroNotification('⏱️ Hết giờ tập trung!', `Bạn đã hoàn thành 1 chu kỳ Pomodoro (${modeMins} phút). Hãy nghỉ ngơi!`);
                        playBeepSound();
                        commitElapsedFocusTime(true);
                        pomoStatusBadge.textContent = '🎉 Hoàn thành phiên tập trung!';
                        showToast(`🎉 Chúc mừng! Bạn đã hoàn thành 1 chu kỳ Tập trung (${modeMins} phút). Thời gian đã được cộng vào công việc!`, 'success');
                    } else {
                        sendPomodoroNotification('🔔 Hết giờ nghỉ ngơi!', 'Đã hết thời gian giải lao. Hãy bắt đầu phiên tập trung mới nhé!');
                        playBeepSound();
                        pomoStatusBadge.textContent = '✨ Hết giờ nghỉ!';
                        showToast('Đã hết thời gian nghỉ ngơi. Hãy quay lại tập trung nhé!', 'info');
                    }

                    remainingSeconds = totalModeSeconds;
                    updateTimerDisplay();
                }
            }
        }, 500);
    }

    function pausePomodoroTimer() {
        if (!isTimerRunning) return;
        if (pomoLastTickTime) {
            const now = Date.now();
            const elapsed = Math.floor((now - pomoLastTickTime) / 1000);
            if (elapsed > 0) {
                remainingSeconds = Math.max(0, remainingSeconds - elapsed);
                if (currentPomoMode === 'focus') {
                    unloggedFocusSeconds += elapsed;
                }
            }
        }
        clearInterval(pomoIntervalId);
        pomoIntervalId = null;
        isTimerRunning = false;
        pomoTargetEndTime = null;
        pomoLastTickTime = null;

        btnPomoStart.disabled = false;
        btnPomoStart.innerHTML = `<i class="ri-play-fill"></i><span>Tiếp tục</span>`;
        btnPomoPause.disabled = true;
        pomoStatusBadge.textContent = '⏸️ Đang tạm dừng';

        if (currentPomoMode === 'focus' && unloggedFocusSeconds > 0) {
            commitElapsedFocusTime(false);
        }
        updateBrowserTabTitle();
    }

    function resetPomodoroTimer() {
        if (isTimerRunning) {
            clearInterval(pomoIntervalId);
            pomoIntervalId = null;
            isTimerRunning = false;
        }
        pomoTargetEndTime = null;
        pomoLastTickTime = null;

        if (currentPomoMode === 'focus' && unloggedFocusSeconds > 0) {
            commitElapsedFocusTime(false);
        }

        unloggedFocusSeconds = 0;

        // Đọc số phút trực tiếp từ pomo_settings vừa lưu để đặt lại thời gian đếm ngược tương ứng
        pomoSettings = loadPomoSettings();
        let modeMinutes = 25;
        if (currentPomoMode === 'focus') {
            modeMinutes = Number(pomoSettings.focusTime) || 25;
        } else if (currentPomoMode === 'short-break') {
            modeMinutes = Number(pomoSettings.shortBreak) || 5;
        } else if (currentPomoMode === 'long-break') {
            modeMinutes = Number(pomoSettings.longBreak) || 15;
        }

        if (POMO_MODES[currentPomoMode]) {
            POMO_MODES[currentPomoMode].minutes = modeMinutes;
        }

        totalModeSeconds = modeMinutes * 60;
        remainingSeconds = totalModeSeconds;

        btnPomoStart.disabled = false;
        btnPomoStart.innerHTML = `<i class="ri-play-fill"></i><span>Bắt đầu</span>`;
        btnPomoPause.disabled = true;
        pomoStatusBadge.textContent = POMO_MODES[currentPomoMode].label;
        updateTimerDisplay();
    }

    pomoModeBtns.forEach(btn => {
        if (btn) btn.addEventListener('click', () => {
            const targetMode = btn.dataset.mode;
            if (targetMode === currentPomoMode) return;

            if (isTimerRunning || unloggedFocusSeconds > 0) {
                pausePomodoroTimer();
            }

            currentPomoMode = targetMode;

            // Đọc số phút trực tiếp từ pomo_settings vừa lưu để đặt lại thời gian đếm ngược tương ứng
            pomoSettings = loadPomoSettings();
            let modeMinutes = 25;
            if (targetMode === 'focus') {
                modeMinutes = Number(pomoSettings.focusTime) || 25;
            } else if (targetMode === 'short-break') {
                modeMinutes = Number(pomoSettings.shortBreak) || 5;
            } else if (targetMode === 'long-break') {
                modeMinutes = Number(pomoSettings.longBreak) || 15;
            }

            if (POMO_MODES[targetMode]) {
                POMO_MODES[targetMode].minutes = modeMinutes;
            }

            totalModeSeconds = modeMinutes * 60;
            remainingSeconds = totalModeSeconds;
            unloggedFocusSeconds = 0;

            pomoModeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (pomodoroCard) pomodoroCard.dataset.mode = targetMode;

            btnPomoStart.disabled = false;
            btnPomoStart.innerHTML = `<i class="ri-play-fill"></i><span>Bắt đầu</span>`;
            btnPomoPause.disabled = true;
            pomoStatusBadge.textContent = POMO_MODES[targetMode].label;

            updateTimerDisplay();
        });
    });

    if (btnPomoStart) btnPomoStart.addEventListener('click', startPomodoroTimer);
    if (btnPomoPause) btnPomoPause.addEventListener('click', pausePomodoroTimer);
    if (btnPomoReset) btnPomoReset.addEventListener('click', resetPomodoroTimer);

    // =========================================================================
    // 13. KHỞI CHẠY ỨNG DỤNG LẦN ĐẦU
    // =========================================================================
    checkAndResetRecurringTasks();
    saveCategoriesToStorage();
    saveTasksToStorage();
    savePomoStatsToStorage();
    populateCategoryDropdowns();
    applyViewMode();
    renderTasks();
    updateTimerDisplay();
    syncTimeModuleUI();

    // =========================================================================
    // 14. SAO LƯU (EXPORT), KHÔI PHỤC (IMPORT) DỮ LIỆU & CÀI ĐẶT
    // =========================================================================
    // Helper tải Blob về máy (Hỗ trợ Electron, Trình duyệt máy tính & Android Web Share API)
    function triggerAnchorDownload(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 400);
    }

    function downloadBlobFile(blob, fileName) {
        if (navigator.canShare && navigator.share) {
            try {
                const file = new File([blob], fileName, { type: blob.type || 'application/octet-stream' });
                if (navigator.canShare({ files: [file] })) {
                    navigator.share({
                        files: [file],
                        title: fileName,
                        text: `Tải/Chia sẻ file: ${fileName}`
                    }).catch(() => {
                        triggerAnchorDownload(blob, fileName);
                    });
                    return;
                }
            } catch (e) {
                // Fallback xuống triggerAnchorDownload
            }
        }
        triggerAnchorDownload(blob, fileName);
    }

    if (btnExportJson) {
        btnExportJson.addEventListener('click', () => {
            try {
                const backupData = {
                    version: "2.0",
                    exportDate: new Date().toISOString(),
                    tasks: loadJSONFromStorage(TASKS_STORAGE_KEY, tasks),
                    categories: loadJSONFromStorage(CATEGORIES_STORAGE_KEY, categories),
                    pomoStats: loadJSONFromStorage(POMO_STATS_STORAGE_KEY, pomoStats),
                    pomoSettings: loadJSONFromStorage(POMO_SETTINGS_STORAGE_KEY, pomoSettings),
                    habits: loadJSONFromStorage(HABITS_STORAGE_KEY, habits),
                    notes: loadJSONFromStorage(NOTES_STORAGE_KEY, notes)
                };

                const jsonStr = JSON.stringify(backupData, null, 2);
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const fileName = `TreTH_Backup_${getTodayISO()}.json`;
                downloadBlobFile(blob, fileName);
                showToast('Đã sao lưu toàn bộ dữ liệu ra file JSON!', 'success');
            } catch (err) {
                alert('Có lỗi xảy ra khi sao lưu dữ liệu!');
            }
        });
    }

    if (btnImportJson && importJsonInput) {
        if (btnImportJson) btnImportJson.addEventListener('click', () => {
            importJsonInput.click();
        });

        if (importJsonInput) importJsonInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    // 1. Parse dữ liệu an toàn bằng try...catch
                    const data = JSON.parse(event.target.result);
                    if (!data) {
                        throw new Error('Dữ liệu file JSON rỗng!');
                    }

                    if (!safeConfirm('Khôi phục dữ liệu sẽ ghi đè lên dữ liệu hiện tại, bạn có chắc chắn không?')) {
                        importJsonInput.value = '';
                        return;
                    }

                    let rawTasks = null;
                    let rawCategories = null;
                    let rawPomoStats = null;
                    let rawPomoSettings = null;
                    let rawHabits = null;
                    let rawNotes = null;

                    // 2. Xử lý đa dạng cấu trúc File JSON (Cả Object chứa key lẫn Mảng Array)
                    if (Array.isArray(data)) {
                        // Trường hợp File là Mảng (Array) các task
                        rawTasks = data;
                    } else if (typeof data === 'object') {
                        // Trường hợp File là Object chứa các key chuẩn (hỗ trợ cả prefix lẫn key rút gọn)
                        rawTasks = data.personal_workspace_tasks_v1 || data.tasks || null;
                        rawCategories = data.personal_workspace_categories_v1 || data.categories || null;
                        rawPomoStats = data.personal_workspace_pomo_stats_v1 || data.pomoStats || null;
                        rawPomoSettings = data.personal_workspace_pomo_settings_v1 || data.pomoSettings || null;
                        rawHabits = data.personal_workspace_habits_v1 || data.habits || null;
                        rawNotes = data.personal_workspace_notes_v1 || data.notes || null;
                    }

                    // Chuẩn hóa và lưu Tasks
                    if (Array.isArray(rawTasks)) {
                        tasks = rawTasks.map(t => {
                            const rawStatus = t.status === 'completed'
                                ? 'completed'
                                : (t.status === 'in-progress' ? 'in-progress' : 'pending');
                            const rawQuad = t.quadrant ? String(t.quadrant).toLowerCase() : 'q2';
                            const validQuad = ['q1', 'q2', 'q3', 'q4'].includes(rawQuad)
                                ? rawQuad
                                : suggestEisenhowerQuadrant(t.priority || 'medium', t.dueDate);

                            return {
                                id: String(t.id || generateUniqueId('task')),
                                title: String(t.title || 'Công việc chưa đặt tên'),
                                categoryId: t.categoryId ? String(t.categoryId) : 'none',
                                priority: t.priority ? String(t.priority).toLowerCase() : 'medium',
                                dueDate: t.dueDate || '',
                                quadrant: validQuad,
                                scope: t.scope || calculateTaskScope(t.dueDate),
                                recurring: t.recurring || 'none',
                                lastResetDate: t.lastResetDate || getTodayISO(),
                                status: rawStatus,
                                actualTime: typeof t.actualTime === 'number' && !isNaN(t.actualTime) ? t.actualTime : 0,
                                subtasks: Array.isArray(t.subtasks) ? t.subtasks.map(s => ({
                                    id: String(s.id || generateUniqueId('sub')),
                                    title: String(s.title || ''),
                                    completed: Boolean(s.completed)
                                })) : []
                            };
                        });
                        saveTasksToStorage();
                    }

                    // Chuẩn hóa và lưu Categories
                    if (Array.isArray(rawCategories) && rawCategories.length > 0) {
                        categories = rawCategories.map(c => ({
                            id: String(c.id || generateUniqueId('cat')),
                            name: String(c.name || 'Loại việc'),
                            icon: String(c.icon || '📁'),
                            color: String(c.color || '#2563EB')
                        }));
                        saveCategoriesToStorage();
                    }

                    // Chuẩn hóa và lưu Pomo Stats
                    if (rawPomoStats && typeof rawPomoStats === 'object') {
                        pomoStats = {
                            date: rawPomoStats.date || getTodayISO(),
                            completedCycles: Number(rawPomoStats.completedCycles) || 0,
                            totalFocusMinutes: Number(rawPomoStats.totalFocusMinutes) || 0
                        };
                        savePomoStatsToStorage();
                    }

                    // Chuẩn hóa và lưu Pomo Settings
                    if (rawPomoSettings && typeof rawPomoSettings === 'object') {
                        pomoSettings = {
                            focusTime: Number(rawPomoSettings.focusTime ?? rawPomoSettings.focusMinutes) || 25,
                            shortBreak: Number(rawPomoSettings.shortBreak ?? rawPomoSettings.shortBreakMinutes) || 5,
                            longBreak: Number(rawPomoSettings.longBreak ?? rawPomoSettings.longBreakMinutes) || 15,
                            enableSound: rawPomoSettings.enableSound !== false
                        };
                        savePomoSettingsToStorage();
                        applyPomoSettings();
                    }

                    // 3. ĐẶT LẠI BỘ LỌC VỀ TRẠNG THÁI MẶC ĐỊNH
                    currentStatusFilter = 'all';
                    currentCategoryFilter = 'all';
                    currentPriorityFilter = 'all';
                    currentDueDateFilter = 'all';
                    currentSearchQuery = '';
                    currentSortMode = 'smart';

                    if (searchTaskInput) searchTaskInput.value = '';
                    if (filterBtns) {
                        filterBtns.forEach(btn => {
                            btn.classList.toggle('active', btn.dataset.filter === 'all');
                        });
                    }
                    if (filterCategorySelect) filterCategorySelect.value = 'all';
                    if (filterPrioritySelect) filterPrioritySelect.value = 'all';
                    if (filterDueDateSelect) filterDueDateSelect.value = 'all';
                    if (filterStatusSelect) filterStatusSelect.value = 'all';
                    if (taskSortSelect) taskSortSelect.value = 'smart';
                    updateActiveFiltersBadge();

                    // Khôi phục Habits & Notes nếu có
                    if (Array.isArray(rawHabits)) {
                        habits = rawHabits;
                        saveHabitsToStorage();
                        renderHabits();
                        updateHabitStats();
                    }
                    if (Array.isArray(rawNotes)) {
                        notes = rawNotes;
                        saveNotesToStorage();
                        renderNotes();
                        renderNoteTags();
                    }

                    // 4. ĐỒNG BỘ LẠI TẤT CẢ CÁC HÀM RENDER NGAY LẬP TỨC
                    populateCategoryDropdowns();
                    renderCategoryManagerList();
                    renderTasks();
                    updateDashboardStats();
                    syncTimeModuleUI();

                    alert('🎉 Khôi phục dữ liệu thành công!');
                } catch (err) {
                    alert('Lỗi: File JSON không đúng định dạng hoặc bị hỏng! Chi tiết: ' + err.message);
                } finally {
                    importJsonInput.value = '';
                }
            };
            reader.readAsText(file, 'utf-8');
        });
    }

    // =========================================================================
    // =========================================================================
    // 15. TOAST THÔNG BÁO & MODAL CÀI ĐẶT HỆ THỐNG & POMODORO
    // =========================================================================
    function triggerConfetti() {
        // Hiệu ứng pháo giấy Confetti chúc mừng hoàn thành xuất sắc
        const confettiContainer = document.createElement('div');
        confettiContainer.className = 'treth-confetti-layer toast-celebration';
        document.body.appendChild(confettiContainer);
        setTimeout(() => {
            if (confettiContainer.parentNode) confettiContainer.parentNode.removeChild(confettiContainer);
        }, 2500);
    }
    window.triggerConfetti = triggerConfetti;

    function showToast(message, type = 'success', options = {}) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'app-toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'app-toast toast-' + type;

        let iconHtml = '<i class="ri-checkbox-circle-fill" style="font-size: 1.25rem; flex-shrink: 0;"></i>';
        let extraHtml = '';

        if (type === 'overdue' || type === 'urgent') {
            iconHtml = '<i class="ri-alarm-warning-fill" style="font-size: 1.35rem; color: #EF4444; flex-shrink: 0;"></i>';
            extraHtml = '<span class="toast-countdown-badge">00:02</span>';
        } else if (type === 'celebration' || type === 'toast-celebration') {
            iconHtml = '<i class="ri-sparkling-fill" style="font-size: 1.35rem; color: #F59E0B; flex-shrink: 0;"></i>';
            extraHtml = '<span class="toast-celebration-badge">🎉</span>';
            triggerConfetti();
        } else if (type === 'success') {
            iconHtml = '<i class="ri-checkbox-circle-fill" style="font-size: 1.35rem; color: #00FF87; flex-shrink: 0;"></i>';
        } else {
            iconHtml = '<i class="ri-information-fill" style="font-size: 1.25rem; flex-shrink: 0;"></i>';
        }

        toast.innerHTML = iconHtml + '<span style="flex: 1;">' + escapeHTML(message) + '</span>' + extraHtml;

        container.appendChild(toast);

        const duration = (options && options.duration) ? options.duration : 3200;
        setTimeout(() => {
            toast.classList.add('toast-hide');
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, duration);
    }
    window.showToast = showToast;

    function openSettingsModal() {
        if (!settingsModal) return;
        updateNotificationUI();
        // Điền đúng các giá trị hiện tại trong LocalStorage vào các ô Input và công tắc Toggle
        pomoSettings = loadPomoSettings();

        if (settingFocusTime) settingFocusTime.value = pomoSettings.focusTime;
        if (settingShortBreak) settingShortBreak.value = pomoSettings.shortBreak;
        if (settingLongBreak) settingLongBreak.value = pomoSettings.longBreak;
        if (settingEnableSound) settingEnableSound.checked = pomoSettings.enableSound !== false;

        settingsModal.classList.add('active');
        settingsModal.setAttribute('aria-hidden', 'false');
    }

    function closeSettingsModal() {
        if (!settingsModal) return;
        settingsModal.classList.remove('active');
        settingsModal.setAttribute('aria-hidden', 'true');
    }

    if (btnOpenSettings) btnOpenSettings.addEventListener('click', openSettingsModal);
    if (btnCloseSettingsModal) btnCloseSettingsModal.addEventListener('click', closeSettingsModal);
    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) closeSettingsModal();
        });
    }

    if (btnResetSettings) {
        btnResetSettings.addEventListener('click', () => {
            if (safeConfirm('Khôi phục cài đặt Pomodoro và âm thanh về mặc định?')) {
                pomoSettings = { ...DEFAULT_POMO_SETTINGS };
                savePomoSettingsToStorage();
                applyPomoSettings();
                if (settingFocusTime) settingFocusTime.value = DEFAULT_POMO_SETTINGS.focusTime;
                if (settingShortBreak) settingShortBreak.value = DEFAULT_POMO_SETTINGS.shortBreak;
                if (settingLongBreak) settingLongBreak.value = DEFAULT_POMO_SETTINGS.longBreak;
                if (settingEnableSound) settingEnableSound.checked = DEFAULT_POMO_SETTINGS.enableSound;
                showToast('Đã khôi phục cài đặt mặc định!');
            }
        });
    }

    if (settingsForm) {
        settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const focusVal = Math.max(1, parseInt(settingFocusTime.value, 10) || 25);
            const shortVal = Math.max(1, parseInt(settingShortBreak.value, 10) || 5);
            const longVal = Math.max(1, parseInt(settingLongBreak.value, 10) || 15);
            const soundVal = settingEnableSound ? settingEnableSound.checked : true;

            pomoSettings = {
                focusTime: focusVal,
                shortBreak: shortVal,
                longBreak: longVal,
                enableSound: soundVal
            };

            savePomoSettingsToStorage();
            applyPomoSettings();
            closeSettingsModal();
            showToast('Đã lưu cài đặt!');
        });
    }

    // Áp dụng cấu hình Pomodoro đã lưu ngay khi khởi động
        // =========================================================================
    // 16. CHẾ ĐỘ TỐI (DARK MODE) & WEB NOTIFICATION API
    // =========================================================================
    function applyTheme(theme) {
        const isDark = theme === 'dark';
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        try {
            localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
        } catch(e) {}

        if (themeToggleIcon) {
            themeToggleIcon.className = isDark ? 'ri-sun-line' : 'ri-moon-line';
        }

        if (themeToggleText) {
            themeToggleText.textContent = isDark ? 'Sáng' : 'Tối';
        }
        if (btnToggleTheme) {
            btnToggleTheme.title = isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối';
        }
    }

    function initTheme() {
        try {
            const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
            if (savedTheme === 'dark' || savedTheme === 'light') {
                applyTheme(savedTheme);
            } else {
                const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                applyTheme(prefersDark ? 'dark' : 'light');
            }
        } catch(e) {
            applyTheme('light');
        }
    }

    if (btnToggleTheme) {
        btnToggleTheme.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(nextTheme);
            showToast(nextTheme === 'dark' ? 'Đã bật Chế độ Tối (Dark Mode)' : 'Đã bật Chế độ Sáng (Light Mode)');
        });
    }

    // Cập nhật giao diện trạng thái Web Notification
    function updateNotificationUI() {
        if (!('Notification' in window)) {
            if (notifStatusBadge) {
                notifStatusBadge.textContent = '✕ Trình duyệt không hỗ trợ';
                notifStatusBadge.className = 'notif-badge notif-badge-denied';
            }
            if (btnRequestNotif) btnRequestNotif.disabled = true;
            if (btnPomoNotifToggle) btnPomoNotifToggle.disabled = true;
            return;
        }

        const perm = Notification.permission;
        if (perm === 'granted') {
            if (notifStatusBadge) {
                notifStatusBadge.textContent = '✓ Đã cấp quyền thông báo';
                notifStatusBadge.className = 'notif-badge notif-badge-granted';
            }
            if (btnRequestNotifText) btnRequestNotifText.textContent = 'Đã bật ✓';
            if (pomoNotifBtnText) pomoNotifBtnText.textContent = 'Thông báo: Đã bật ✓';
        } else if (perm === 'denied') {
            if (notifStatusBadge) {
                notifStatusBadge.textContent = '✕ Đang bị chặn trên trình duyệt';
                notifStatusBadge.className = 'notif-badge notif-badge-denied';
            }
            if (btnRequestNotifText) btnRequestNotifText.textContent = 'Bị chặn ⚠️';
            if (pomoNotifBtnText) pomoNotifBtnText.textContent = 'Thông báo: Bị chặn ⚠️';
        } else {
            if (notifStatusBadge) {
                notifStatusBadge.textContent = 'Chưa bật thông báo';
                notifStatusBadge.className = 'notif-badge notif-badge-default';
            }
            if (btnRequestNotifText) btnRequestNotifText.textContent = 'Bật thông báo';
            if (pomoNotifBtnText) pomoNotifBtnText.textContent = 'Bật thông báo đẩy';
        }
    }

    async function requestNotificationPermission() {
        if (!('Notification' in window)) {
            showToast('Trình duyệt của bạn không hỗ trợ thông báo đẩy.', 'info');
            updateNotificationUI();
            return false;
        }

        if (Notification.permission === 'granted') {
            updateNotificationUI();
            showToast('Thông báo đẩy đã được cấp quyền trước đó.', 'success');
            return true;
        }

        if (Notification.permission === 'denied') {
            showToast('Thông báo đang bị chặn. Vui lòng bật lại trong cài đặt trang web của trình duyệt.', 'warning');
            updateNotificationUI();
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            updateNotificationUI();
            if (permission === 'granted') {
                showToast('Đã bật thông báo đẩy trình duyệt!', 'success');
                sendPomodoroNotification('🔔 Thông báo đẩy đã kích hoạt', 'Bạn sẽ nhận được thông báo khi hết giờ Pomodoro!');
                return true;
            } else {
                showToast('Bạn đã từ chối quyền thông báo.', 'info');
                return false;
            }
        } catch (err) {
            console.error('Lỗi yêu cầu quyền thông báo:', err);
            return false;
        }
    }

    function sendPomodoroNotification(title, body) {
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;

        try {
            const notifIcon = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="64" height="64"><circle cx="12" cy="12" r="10" fill="%234F46E5"/><circle cx="12" cy="12" r="7" fill="%23ffffff"/><polygon points="12,7 12,12 15,14" fill="%234F46E5"/></svg>';
            const notification = new Notification(title, {
                body: body,
                icon: notifIcon,
                badge: notifIcon,
                requireInteraction: true,
                tag: 'pomodoro-timer-alert',
                renotify: true
            });

            notification.onclick = function() {
                try {
                    window.focus();
                } catch(e) {}
                this.close();
            };
        } catch (err) {
            console.error('Lỗi gửi Web Notification:', err);
        }
    }

    if (btnRequestNotif) {
        btnRequestNotif.addEventListener('click', () => {
            requestNotificationPermission();
        });
    }

    if (btnPomoNotifToggle) {
        btnPomoNotifToggle.addEventListener('click', () => {
            requestNotificationPermission();
        });
    }

    // Khởi tạo Theme & Notification UI
    initTheme();
    updateNotificationUI();
    applyPomoSettings();


// 17. XUẤT / NHẬP DỮ LIỆU BẰNG FILE EXCEL (.XLSX / .CSV) - SHEETJS & NATIVE FALLBACK
    // =========================================================================
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const importExcelBtn = document.getElementById('importExcelBtn');
    const importExcelInput = document.getElementById('importExcelInput');
    const downloadExcelTemplateBtn = document.getElementById('downloadExcelTemplateBtn');

    // Helper escape ô cho định dạng CSV chuẩn RFC 4180
    function escapeCSVCell(val) {
        if (val === null || val === undefined) return '""';
        let str = String(val);
        if (str.includes('"') || str.includes(',') || str.includes(';') || str.includes('\n') || str.includes('\r')) {
            str = '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    }

    // Helper format ngày thành YYYY-MM-DD
    function formatDateToISO(val) {
        if (!val) return '';
        if (val instanceof Date && !isNaN(val.getTime())) {
            const y = val.getFullYear();
            const m = String(val.getMonth() + 1).padStart(2, '0');
            const d = String(val.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        const str = String(val).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            return str;
        }
        const parsed = new Date(str);
        if (!isNaN(parsed.getTime())) {
            const y = parsed.getFullYear();
            const m = String(parsed.getMonth() + 1).padStart(2, '0');
            const d = String(parsed.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        return '';
    }

    // 1. Logic Xuất file Excel (Hỗ trợ SheetJS .xlsx & Native Fallback .csv)
    function exportTasksToExcel() {
        const categoryMap = new Map();
        categories.forEach(c => categoryMap.set(c.id, c.name));

        const priorityLabelMap = {
            high: 'Cao',
            medium: 'Trung bình',
            low: 'Thấp'
        };

        const quadrantLabelMap = {
            q1: 'Q1',
            q2: 'Q2',
            q3: 'Q3',
            q4: 'Q4'
        };

        const recurringLabelMap = {
            none: 'Một lần',
            daily: 'Hằng ngày',
            weekly: 'Hằng tuần'
        };

        const excelRows = tasks.map(t => {
            const catName = categoryMap.get(t.categoryId) || (t.categoryId === 'none' ? 'Không có' : t.categoryId);
            const prioLabel = priorityLabelMap[t.priority] || 'Trung bình';
            const quadLabel = quadrantLabelMap[t.quadrant] || 'Q2';
            const statusLabel = t.status === 'completed' ? 'Đã xong' : 'Cần làm';
            const recurLabel = recurringLabelMap[t.recurring] || 'Một lần';
            const subtasksStr = Array.isArray(t.subtasks) 
                ? t.subtasks.map(s => s.title ? s.title.trim() : '').filter(Boolean).join('; ') 
                : '';

            return {
                'Mã Task': t.id,
                'Tên công việc': t.title,
                'Loại việc': catName,
                'Mức ưu tiên': prioLabel,
                'Ngày đến hạn': t.dueDate || '',
                'Ma trận': quadLabel,
                'Trạng thái': statusLabel,
                'Chu kỳ': recurLabel,
                'Việc con': subtasksStr
            };
        });

        if (typeof XLSX !== 'undefined') {
            try {
                const worksheet = XLSX.utils.json_to_sheet(excelRows);
                worksheet['!cols'] = [
                    { wch: 16 },
                    { wch: 42 },
                    { wch: 18 },
                    { wch: 14 },
                    { wch: 15 },
                    { wch: 10 },
                    { wch: 14 },
                    { wch: 14 },
                    { wch: 35 }
                ];

                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, 'CongViec');

                const fileName = `TreTH_Tasks_${getTodayISO()}.xlsx`;
                XLSX.writeFile(workbook, fileName);
                showToast(`Đã xuất ${tasks.length} công việc ra file Excel (.xlsx)!`, 'success');
                return;
            } catch (err) {
                console.warn('Lỗi khi dùng XLSX.writeFile, chuyển sang Native CSV export:', err);
            }
        }

        const headers = ['Mã Task', 'Tên công việc', 'Loại việc', 'Mức ưu tiên', 'Ngày đến hạn', 'Ma trận', 'Trạng thái', 'Chu kỳ', 'Việc con'];
        const csvLines = [headers.map(escapeCSVCell).join(',')];

        excelRows.forEach(row => {
            const line = headers.map(h => escapeCSVCell(row[h] || '')).join(',');
            csvLines.push(line);
        });

        const csvContent = '\uFEFF' + csvLines.join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const fileName = `TreTH_Tasks_${getTodayISO()}.csv`;
        downloadBlobFile(blob, fileName);
        showToast(`Đã xuất ${tasks.length} công việc ra file CSV (Tương thích Excel)!`, 'success');
    }

    // 2. Logic Tải file Mẫu Excel
    function downloadExcelTemplate() {
        const templateData = [
            {
                'Mã Task': 'TASK-001',
                'Tên công việc': 'Hoàn thành báo cáo đánh giá quý',
                'Loại việc': 'Báo cáo',
                'Mức ưu tiên': 'Cao',
                'Ngày đến hạn': getOffsetDateISO(2),
                'Ma trận': 'Q1',
                'Trạng thái': 'Cần làm',
                'Chu kỳ': 'Một lần',
                'Việc con': 'Tổng hợp số liệu; Soạn thảo slide trình chiếu; Gửi email duyệt'
            },
            {
                'Mã Task': 'TASK-002',
                'Tên công việc': 'Chạy bộ 30 phút rèn luyện thể lực',
                'Loại việc': 'Sức khỏe',
                'Mức ưu tiên': 'Trung bình',
                'Ngày đến hạn': getTodayISO(),
                'Ma trận': 'Q2',
                'Trạng thái': 'Cần làm',
                'Chu kỳ': 'Hằng ngày',
                'Việc con': 'Khởi động 5 phút; Chạy bộ 25 phút'
            },
            {
                'Mã Task': 'TASK-003',
                'Tên công việc': 'Đọc sách chuyên môn 20 trang',
                'Loại việc': 'Học tập',
                'Mức ưu tiên': 'Thấp',
                'Ngày đến hạn': getOffsetDateISO(5),
                'Ma trận': 'Q2',
                'Trạng thái': 'Đã xong',
                'Chu kỳ': 'Hằng tuần',
                'Việc con': 'Ghi chú các ý quan trọng'
            }
        ];

        if (typeof XLSX !== 'undefined') {
            try {
                const worksheet = XLSX.utils.json_to_sheet(templateData);
                worksheet['!cols'] = [
                    { wch: 14 },
                    { wch: 38 },
                    { wch: 16 },
                    { wch: 14 },
                    { wch: 14 },
                    { wch: 10 },
                    { wch: 12 },
                    { wch: 12 },
                    { wch: 35 }
                ];

                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, 'MauNhapTask');
                XLSX.writeFile(workbook, 'Mau_Nhap_Cong_Viec_TreTH.xlsx');
                showToast('Đã tải xuống file mẫu Excel (.xlsx)!', 'success');
                return;
            } catch (err) {
                console.warn('Lỗi khi dùng XLSX.writeFile cho template, chuyển sang Native CSV:', err);
            }
        }

        const headers = ['Mã Task', 'Tên công việc', 'Loại việc', 'Mức ưu tiên', 'Ngày đến hạn', 'Ma trận', 'Trạng thái', 'Chu kỳ', 'Việc con'];
        const csvLines = [headers.map(escapeCSVCell).join(',')];

        templateData.forEach(row => {
            const line = headers.map(h => escapeCSVCell(row[h] || '')).join(',');
            csvLines.push(line);
        });

        const csvContent = '\uFEFF' + csvLines.join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        downloadBlobFile(blob, 'Mau_Nhap_Cong_Viec_TreTH.csv');
        showToast('Đã tải xuống file mẫu CSV (Tương thích Excel)!', 'success');
    }

    function parseCSVLine(line, delimiter = ',') {
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (c === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    cur += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c === delimiter && !inQuotes) {
                result.push(cur.trim());
                cur = '';
            } else {
                cur += c;
            }
        }
        result.push(cur.trim());
        return result;
    }

    function processImportedTaskRows(rows) {
        if (!rows || rows.length === 0) {
            showToast('File không có dữ liệu!', 'warning');
            return;
        }

        let importedCount = 0;
        let updatedCount = 0;

        rows.forEach(row => {
            const titleKey = Object.keys(row).find(k => /tên\s*công\s*việc|tiêu\s*đề|tÃªn\s*cÃ´ng\s*viá»‡c|tiÃªu\s*Ä‘á»\x81|task|title/i.test(k));
            const rawTitle = titleKey ? String(row[titleKey]).trim() : '';
            if (!rawTitle) return;

            const catKey = Object.keys(row).find(k => /loại\s*việc|danh\s*mục|loáº¡i\s*viá»‡c|danh\s*má»¥c|category/i.test(k));
            const rawCat = catKey ? String(row[catKey]).trim() : '';
            let matchedCatId = 'none';

            if (rawCat && rawCat !== 'Không có' && rawCat !== 'KhÃ´ng cÃ³') {
                const existingCat = categories.find(c => c.name.toLowerCase() === rawCat.toLowerCase());
                if (existingCat) {
                    matchedCatId = existingCat.id;
                } else {
                    const newCat = {
                        id: generateUniqueId('cat'),
                        name: rawCat,
                        icon: '📁',
                        color: '#2563EB'
                    };
                    categories.push(newCat);
                    matchedCatId = newCat.id;
                    saveCategoriesToStorage();
                    populateCategoryDropdowns(); 
                    renderCategoryManagerList();
                }
            }

            const prioKey = Object.keys(row).find(k => /mức\s*ưu\s*tiên|ưu\s*tiên|má»©c\s*Æ°u\s*tiÃªn|Æ°u\s*tiÃªn|priority/i.test(k));
            const rawPrio = prioKey ? String(row[prioKey]).trim().toLowerCase() : '';
            let priority = 'medium';
            if (rawPrio.includes('cao') || rawPrio === 'high') priority = 'high';
            else if ((rawPrio.includes('thấp') || rawPrio.includes('tháº¥p')) || rawPrio === 'low') priority = 'low';

            const dueKey = Object.keys(row).find(k => /ngày\s*đến\s*hạn|hạn\s*chót|hạn|ngày\s*Ä‘áº¿n\s*háº¡n|háº¡n\s*chÃ³t|háº¡n|due/i.test(k));
            const dueDate = dueKey ? formatDateToISO(row[dueKey]) : '';

            const quadKey = Object.keys(row).find(k => /ma\s*trận|ma\s*trận|quadrant/i.test(k));
            const rawQuad = quadKey ? String(row[quadKey]).trim().toLowerCase() : '';
            let quadrant = 'q2';
            if (['q1', 'q2', 'q3', 'q4'].includes(rawQuad)) {
                quadrant = rawQuad;
            } else if (rawQuad.includes('1')) quadrant = 'q1';
            else if (rawQuad.includes('2')) quadrant = 'q2';
            else if (rawQuad.includes('3')) quadrant = 'q3';
            else if (rawQuad.includes('4')) quadrant = 'q4';
            else {
                quadrant = suggestEisenhowerQuadrant(priority, dueDate);
            }

            const statusKey = Object.keys(row).find(k => /trạng\s*thái|tráº¡ng\s*thÃ¡i|status/i.test(k));
            const rawStatus = statusKey ? String(row[statusKey]).trim().toLowerCase() : '';
            let status = 'pending';
            if ((rawStatus.includes('xong') || rawStatus.includes('hoàn thành') || rawStatus.includes('hoÃ n thÃ nh')) || rawStatus === 'completed') {
                status = 'completed';
            }

            const recurKey = Object.keys(row).find(k => /chu\s*kỳ|lặp|chu\s*ká»³|láº·p|recurring/i.test(k));
            const rawRecur = recurKey ? String(row[recurKey]).trim().toLowerCase() : '';
            let recurring = 'none';
            if ((rawRecur.includes('ngày') || rawRecur.includes('ngày')) || rawRecur === 'daily') recurring = 'daily';
            else if ((rawRecur.includes('tuần') || rawRecur.includes('tuáº§n')) || rawRecur === 'weekly') recurring = 'weekly';

            const subKey = Object.keys(row).find(k => /việc\s*con|viá»‡c\s*con|subtask/i.test(k));
            const rawSub = subKey ? String(row[subKey]).trim() : '';
            let subtasks = [];
            if (rawSub) {
                subtasks = rawSub.split(';')
                    .map(s => s.trim())
                    .filter(Boolean)
                    .map(s => ({
                                id: generateUniqueId('sub'),
                        title: s,
                        completed: false
                    }));
            }

            const idKey = Object.keys(row).find(k => /mã\s*task|mã|mÃ£\s*task|mÃ£|id/i.test(k));
            const rawId = idKey ? String(row[idKey]).trim() : '';

            const existingTaskIndex = rawId ? tasks.findIndex(t => t.id === rawId) : -1;

            if (existingTaskIndex !== -1) {
                const prevTask = tasks[existingTaskIndex];
                tasks[existingTaskIndex] = {
                    ...prevTask,
                    title: rawTitle,
                    categoryId: matchedCatId,
                    priority: priority,
                    dueDate: dueDate,
                    quadrant: quadrant,
                    scope: calculateTaskScope(dueDate),
                    status: status,
                    recurring: recurring,
                    subtasks: subtasks.length > 0 ? subtasks : prevTask.subtasks
                };
                updatedCount++;
            } else {
                const newTask = {
                    id: rawId || generateUniqueId('task'),
                    title: rawTitle,
                    categoryId: matchedCatId,
                    priority: priority,
                    dueDate: dueDate,
                    quadrant: quadrant,
                    scope: calculateTaskScope(dueDate),
                    recurring: recurring,
                    lastResetDate: getTodayISO(),
                    status: status,
                    actualTime: 0,
                    subtasks: subtasks
                };
                tasks.push(newTask);
                importedCount++;
            }
        });

        saveTasksToStorage('UPDATE');
        renderTasks(); 
        updateDashboardStats();
        syncTimeModuleUI();

        const msg = updatedCount > 0 
            ? `Đã nhập xong: thêm mới ${importedCount} và cập nhật ${updatedCount} công việc!`
            : `Đã nhập thành công ${importedCount} công việc từ file!`;
        showToast(msg, 'success');
    }

    // 3. Logic Nhập file Excel
    function importTasksFromExcel(file) {
        if (!file) return;

        if (typeof XLSX !== 'undefined') {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                        showToast('File Excel không có sheet nào!', 'warning');
                        return;
                    }

                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
                    processImportedTaskRows(rows);
                } catch (err) {
                    console.error('Lỗi khi đọc file bằng SheetJS:', err);
                    showToast('Lỗi khi đọc file Excel: ' + err.message, 'warning');
                } finally {
                    if (importExcelInput) importExcelInput.value = '';
                }
            };
            reader.onerror = function() {
                showToast('Không thể đọc file đã chọn!', 'warning');
                if (importExcelInput) importExcelInput.value = '';
            };
            reader.readAsArrayBuffer(file);
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                let text = e.target.result || '';
                if (text.charCodeAt(0) === 0xFEFF) {
                    text = text.slice(1);
                }
                const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
                if (lines.length < 2) {
                    showToast('File CSV không có dữ liệu hợp lệ!', 'warning');
                    return;
                }

                const firstLine = lines[0];
                const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
                const headers = parseCSVLine(firstLine, delimiter);

                const rows = [];
                for (let i = 1; i < lines.length; i++) {
                    const values = parseCSVLine(lines[i], delimiter);
                    const rowObj = {};
                    headers.forEach((h, idx) => {
                        rowObj[h] = values[idx] !== undefined ? values[idx] : '';
                    });
                    rows.push(rowObj);
                }

                processImportedTaskRows(rows);
            } catch (err) {
                console.error('Lỗi khi parse file CSV:', err);
                showToast('Lỗi khi đọc file CSV: ' + err.message, 'warning');
            } finally {
                if (importExcelInput) importExcelInput.value = '';
            }
        };
        reader.onerror = function() {
            showToast('Không thể đọc file đã chọn!', 'warning');
            if (importExcelInput) importExcelInput.value = '';
        };
        reader.readAsText(file, 'utf-8');
    }

    if (exportExcelBtn) exportExcelBtn.addEventListener('click', exportTasksToExcel);

    if (downloadExcelTemplateBtn) downloadExcelTemplateBtn.addEventListener('click', downloadExcelTemplate);

    if (importExcelBtn && importExcelInput) {
        if (importExcelBtn) importExcelBtn.addEventListener('click', () => {
            importExcelInput.click();
        });
    }

    if (importExcelInput) {
        importExcelInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) {
                importTasksFromExcel(file);
            }
        });
    }

    // =========================================================================
    // 17B. MENU POPOVER QUẢN LÝ DỮ LIỆU (DATA DROPDOWN POPOVER CONTROLLER)
    // =========================================================================
    function toggleDataMenu(forceState) {
        if (!dataDropdownPanel || !btnToggleDataMenu) return;
        const isCurrentlyOpen = dataDropdownPanel.classList.contains('active');
        const willOpen = forceState !== undefined ? forceState : !isCurrentlyOpen;

        if (willOpen) {
            const btnRect = btnToggleDataMenu.getBoundingClientRect();
            dataDropdownPanel.classList.add('active');
            dataDropdownPanel.setAttribute('aria-hidden', 'false');
            btnToggleDataMenu.classList.add('active');
            btnToggleDataMenu.setAttribute('aria-expanded', 'true');
        } else {
            dataDropdownPanel.classList.remove('active');
            dataDropdownPanel.setAttribute('aria-hidden', 'true');
            btnToggleDataMenu.classList.remove('active');
            btnToggleDataMenu.setAttribute('aria-expanded', 'false');
        }
    }

    if (btnToggleDataMenu) {
        btnToggleDataMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDataMenu();
        });
    }

    // Đóng modal khi bấm nút "✕" hoặc nút "Đóng" ở footer modal
    const btnCloseDataModal = document.getElementById('btn-close-data-modal');
    if (btnCloseDataModal) {
        btnCloseDataModal.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDataMenu(false);
        });
    }
    const btnCloseDataModalFooter = document.getElementById('btn-close-data-modal-footer');
    if (btnCloseDataModalFooter) {
        btnCloseDataModalFooter.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDataMenu(false);
        });
    }

    // Đóng khi click vào phần nền đen ngoài thẻ modal (backdrop overlay)
    if (dataDropdownPanel) {
        dataDropdownPanel.addEventListener('click', (e) => {
            if (e.target === dataDropdownPanel) {
                toggleDataMenu(false);
            }
        });
    }

    // Đóng khi click ra ngoài thẻ modal (hỗ trợ click backdrop & test suite)
    document.addEventListener('click', (e) => {
        if (dataDropdownPanel && dataDropdownPanel.classList.contains('active')) {
            const isClickInsideCard = e.target.closest('.modal-card');
            const isToggleBtn = e.target.closest('#btnToggleDataMenu');
            if (!isClickInsideCard && !isToggleBtn) {
                toggleDataMenu(false);
            }
        }
    });

    // Tự động đóng dropdown ngay sau khi người dùng bấm 1 trong 5 tùy chọn bên trong
    if (dataDropdownPanel) {
        const dataActionBtns = dataDropdownPanel.querySelectorAll('.data-dropdown-item');
        dataActionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                toggleDataMenu(false);
            });
        });
    }


    // =========================================================================
    // 18. MODULE 03: HABIT TRACKER (XÂY DỰNG THÓI QUEN & STREAK COUNTER)
    // =========================================================================
    const HABITS_STORAGE_KEY = 'personal_workspace_habits_v1';

    const DEFAULT_HABITS = [
        {
            id: 'habit_def_01',
            title: 'Chạy bộ 30 phút rèn thể lực',
            category: 'Sức khỏe',
            frequency: 'daily',
            emoji: '🏃',
            note: 'Duy trì thể lực và sự dẻo dai',
            history: {},
            streak: 0,
            bestStreak: 0,
            createdAt: getTodayISO()
        },
        {
            id: 'habit_def_02',
            title: 'Đọc 20 trang sách chuyên môn',
            category: 'Học tập',
            frequency: 'daily',
            emoji: '📚',
            note: 'Tích lũy tri thức từng ngày',
            history: {},
            streak: 0,
            bestStreak: 0,
            createdAt: getTodayISO()
        },
        {
            id: 'habit_def_03',
            title: 'Uống đủ 2 lít nước',
            category: 'Sức khỏe',
            frequency: 'daily',
            emoji: '💧',
            note: 'Thanh lọc cơ thể và tăng tập trung',
            history: {},
            streak: 0,
            bestStreak: 0,
            createdAt: getTodayISO()
        }
    ];

    let habits = loadJSONFromStorage(HABITS_STORAGE_KEY, DEFAULT_HABITS);
    let currentHabitFilter = 'all';
    let currentHabitSearch = '';

    // DOM Elements for Habits
    const habitCardsGrid = document.getElementById('habit-cards-grid');
    const habitSearchInput = document.getElementById('habit-search-input');
    const btnAddHabit = document.getElementById('btn-add-habit');
    const habitModal = document.getElementById('habit-modal');
    const habitForm = document.getElementById('habit-form');
    const btnCloseHabitModal = document.getElementById('btn-close-habit-modal');
    const btnCancelHabitModal = document.getElementById('btn-cancel-habit-modal');
    const habitEditId = document.getElementById('habit-edit-id');
    const habitTitleInput = document.getElementById('habit-title-input');
    const habitCategoryInput = document.getElementById('habit-category-input');
    const habitFrequencyInput = document.getElementById('habit-frequency-input');
    const habitTargetNote = document.getElementById('habit-target-note');
    const habitSelectedEmojiInput = document.getElementById('habit-selected-emoji');
    const habitEmojiBtns = document.querySelectorAll('.habit-emoji-btn');

    // Stats elements
    const habitStatTodayDone = document.getElementById('habit-stat-today-done');
    const habitStatPercentage = document.getElementById('habit-stat-percentage');
    const habitTodayProgressFill = document.getElementById('habit-today-progress-fill');
    const habitStatBestStreak = document.getElementById('habit-stat-best-streak');
    const habitStatTotalCount = document.getElementById('habit-stat-total-count');
    const habitStatTotalCheckins = document.getElementById('habit-stat-total-checkins');

    function saveHabitsToStorage() {
        try {
            localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(habits));
        } catch(e) {}
    }

    function calculateHabitStreak(habit) {
        if (!habit.history || typeof habit.history !== 'object') return 0;
        const freq = habit.frequency || 'daily';
        const todayStr = getTodayISO();

        // 1. Tần suất 3 ngày/tuần hoặc 5 ngày/tuần (cho phép bỏ qua ngày nghỉ xen kẽ)
        if (freq === '3days' || freq === '5days') {
            const targetDays = freq === '5days' ? 5 : 3;
            let streak = 0;
            const currentMonday = new Date(getMondayOfDate(todayStr) + 'T00:00:00');

            const countCheckinsInWeek = (monDate) => {
                let count = 0;
                for (let i = 0; i < 7; i++) {
                    const temp = new Date(monDate);
                    temp.setDate(temp.getDate() + i);
                    const y = temp.getFullYear();
                    const m = String(temp.getMonth() + 1).padStart(2, '0');
                    const day = String(temp.getDate()).padStart(2, '0');
                    const iso = `${y}-${m}-${day}`;
                    if (habit.history[iso]) count++;
                }
                return count;
            };

            const thisWeekCount = countCheckinsInWeek(currentMonday);
            const prevMonday = new Date(currentMonday);
            prevMonday.setDate(prevMonday.getDate() - 7);
            const prevWeekCount = countCheckinsInWeek(prevMonday);

            if (thisWeekCount >= targetDays) {
                streak += thisWeekCount;
                let checkMon = new Date(prevMonday);
                let limitWeeks = 52;
                while (limitWeeks-- > 0) {
                    const cnt = countCheckinsInWeek(checkMon);
                    if (cnt >= targetDays) {
                        streak += cnt;
                        checkMon.setDate(checkMon.getDate() - 7);
                    } else {
                        break;
                    }
                }
            } else if (prevWeekCount >= targetDays) {
                streak += thisWeekCount;
                streak += prevWeekCount;
                let checkMon = new Date(prevMonday);
                checkMon.setDate(checkMon.getDate() - 7);
                let limitWeeks = 52;
                while (limitWeeks-- > 0) {
                    const cnt = countCheckinsInWeek(checkMon);
                    if (cnt >= targetDays) {
                        streak += cnt;
                        checkMon.setDate(checkMon.getDate() - 7);
                    } else {
                        break;
                    }
                }
            } else {
                streak = thisWeekCount;
            }
            return streak;
        }

        // 2. Tần suất Ngày làm việc (weekdays) và Hằng ngày (daily)
        let streak = 0;
        let d = new Date();

        if (!habit.history[todayStr]) {
            if (freq === 'weekdays') {
                const todayDay = d.getDay();
                if (todayDay === 0) {
                    d.setDate(d.getDate() - 2);
                } else if (todayDay === 6) {
                    d.setDate(d.getDate() - 1);
                } else {
                    d.setDate(d.getDate() - 1);
                }
            } else {
                d.setDate(d.getDate() - 1);
            }
        }

        let safetyLimit = 3650;
        while (safetyLimit-- > 0) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const iso = `${y}-${m}-${day}`;
            const dayOfWeek = d.getDay();

            if (habit.history[iso]) {
                streak++;
                d.setDate(d.getDate() - 1);
            } else {
                if (freq === 'weekdays' && (dayOfWeek === 0 || dayOfWeek === 6)) {
                    d.setDate(d.getDate() - 1);
                } else {
                    break;
                }
            }
        }
        return streak;
    }

    function updateHabitStats() {
        if (!habits) habits = [];
        const todayStr = getTodayISO();
        const total = habits.length;
        let doneToday = 0;
        let bestStreak = 0;
        let totalCheckins = 0;

        habits.forEach(h => {
            const streak = calculateHabitStreak(h);
            h.streak = streak;
            h.bestStreak = Math.max(h.bestStreak || 0, streak);
            if (h.history && h.history[todayStr]) doneToday++;
            if (h.history) {
                totalCheckins += Object.values(h.history).filter(Boolean).length;
            }
            if (h.bestStreak > bestStreak) bestStreak = h.bestStreak;
        });

        const pct = total > 0 ? Math.round((doneToday / total) * 100) : 0;

        if (habitStatTodayDone) habitStatTodayDone.textContent = `${doneToday}/${total}`;
        if (habitStatPercentage) habitStatPercentage.textContent = `${pct}%`;
        if (habitTodayProgressFill) habitTodayProgressFill.style.width = `${pct}%`;
        if (habitStatBestStreak) habitStatBestStreak.textContent = `${bestStreak} ngày`;
        if (habitStatTotalCount) habitStatTotalCount.textContent = `${total} mục`;
        if (habitStatTotalCheckins) habitStatTotalCheckins.textContent = `${totalCheckins} lần`;

        renderHabitsHeatmap();
    }

    function renderHabits() {
        if (!habitCardsGrid) return;
        const todayStr = getTodayISO();

        let filtered = habits.filter(h => {
            if (currentHabitSearch) {
                const q = currentHabitSearch.toLowerCase();
                const matchTitle = (h.title || '').toLowerCase().includes(q);
                const matchCat = (h.category || '').toLowerCase().includes(q);
                if (!matchTitle && !matchCat) return false;
            }
            const isDoneToday = Boolean(h.history && h.history[todayStr]);
            if (currentHabitFilter === 'pending' && isDoneToday) return false;
            if (currentHabitFilter === 'completed' && !isDoneToday) return false;
            return true;
        });

        if (filtered.length === 0) {
            habitCardsGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; padding: 3rem 1rem; text-align: center;">
                    <div class="empty-icon" style="font-size: 3rem; margin-bottom: 0.5rem;">🌱</div>
                    <h3 style="font-size: 1.1rem; color: var(--text-main); margin-bottom: 0.35rem;">Chưa có thói quen nào</h3>
                    <p style="color: var(--text-muted); font-size: 0.88rem; max-width: 400px; margin: 0 auto 1rem;">
                        Hãy bấm nút <strong>"Thêm thói quen mới"</strong> để bắt đầu xây dựng chuỗi ngày rèn luyện kiên trì!
                    </p>
                </div>
            `;
            return;
        }

        // Tạo danh sách 7 ngày gần nhất để render dải lịch sử
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const dt = new Date();
            dt.setDate(dt.getDate() - i);
            const y = dt.getFullYear();
            const m = String(dt.getMonth() + 1).padStart(2, '0');
            const day = String(dt.getDate()).padStart(2, '0');
            const iso = `${y}-${m}-${day}`;
            const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
            last7Days.push({
                iso: iso,
                name: i === 0 ? 'Nay' : dayNames[dt.getDay()],
                isToday: i === 0
            });
        }

        habitCardsGrid.innerHTML = filtered.map(h => {
            const streak = calculateHabitStreak(h);
            const isDoneToday = Boolean(h.history && h.history[todayStr]);
            const freqLabel = h.frequency === 'weekdays' ? 'T2 - T6' : (h.frequency === '3days' ? '3 ngày/tuần' : (h.frequency === '5days' ? '5 ngày/tuần' : 'Hằng ngày'));

            const historyHtml = last7Days.map(d => {
                const checked = Boolean(h.history && h.history[d.iso]);
                const ringClass = d.isToday ? 'today-ring' : '';
                const checkedClass = checked ? 'checked' : '';
                const icon = checked ? '<i class="ri-check-line"></i>' : (d.isToday ? '•' : '');
                return `
                    <div class="habit-day-bubble" 
                         data-habit-id="${escapeHTML(h.id)}" 
                         data-day-iso="${d.iso}"
                         title="${d.name} (${d.iso}): ${checked ? 'Đã điểm danh' : 'Bấm để điểm danh bù'}" 
                         style="cursor: pointer;">
                        <span class="habit-day-name">${d.name}</span>
                        <div class="habit-day-dot ${ringClass} ${checkedClass}">${icon}</div>
                    </div>
                `;
            }).join('');

            return `
                <div class="habit-card ${isDoneToday ? 'completed-today' : ''}" data-id="${escapeHTML(h.id)}">
                    <div class="habit-card-header">
                        <div class="habit-header-main">
                            <div class="habit-emoji-badge">${escapeHTML(h.emoji || '🌱')}</div>
                            <div class="habit-title-box">
                                <h3 class="habit-title" title="${escapeHTML(h.title)}">${escapeHTML(h.title)}</h3>
                                <div class="habit-meta-badges">
                                    <span class="habit-tag">${escapeHTML(h.category || 'Chung')}</span>
                                    <span class="habit-tag" style="background: rgba(79, 70, 229, 0.1); color: var(--primary);">${freqLabel}</span>
                                </div>
                            </div>
                        </div>
                        <div class="habit-actions-menu">
                            <button type="button" class="btn-habit-icon btn-edit-habit" data-id="${escapeHTML(h.id)}" title="Sửa thói quen">
                                <i class="ri-edit-line"></i>
                            </button>
                            <button type="button" class="btn-habit-icon btn-delete btn-delete-habit" data-id="${escapeHTML(h.id)}" title="Xóa thói quen">
                                <i class="ri-delete-bin-line"></i>
                            </button>
                        </div>
                    </div>

                    ${h.note ? `<p style="font-size: 0.8rem; color: var(--text-muted); margin: 0; line-height: 1.4;"><em>"${escapeHTML(h.note)}"</em></p>` : ''}

                    <div class="habit-streak-banner">
                        <div class="habit-current-streak">
                            <i class="ri-fire-fill"></i>
                            <span>Chuỗi: ${streak} ngày</span>
                        </div>
                        <div class="habit-best-streak">
                            🏆 Kỷ lục: ${h.bestStreak || streak} ngày
                        </div>
                    </div>

                    <div class="habit-history-strip">
                        ${historyHtml}
                    </div>

                    <button type="button" class="habit-check-cta ${isDoneToday ? 'completed' : ''}" data-id="${escapeHTML(h.id)}">
                        <i class="${isDoneToday ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'}"></i>
                        <span>${isDoneToday ? 'Đã hoàn thành hôm nay' : 'Điểm danh hôm nay'}</span>
                    </button>
                </div>
            `;
        }).join('');
    }

    if (habitCardsGrid) {
        habitCardsGrid.addEventListener('click', (e) => {
            const bubble = e.target.closest('.habit-day-bubble');
            if (bubble) {
                const habitId = bubble.dataset.habitId;
                const dayIso = bubble.dataset.dayIso;
                if (habitId && dayIso) {
                    toggleHabitCheckinForDate(habitId, dayIso);
                    return;
                }
            }

            const checkBtn = e.target.closest('.habit-check-cta');
            if (checkBtn) {
                const habitId = checkBtn.dataset.id;
                if (habitId) toggleHabitCheckin(habitId);
                return;
            }

            const editBtn = e.target.closest('.btn-edit-habit');
            if (editBtn) {
                const habitId = editBtn.dataset.id;
                const habit = habits.find(x => x.id === habitId);
                if (habit) openHabitModal(habit);
                return;
            }

            const deleteBtn = e.target.closest('.btn-delete-habit');
            if (deleteBtn) {
                const habitId = deleteBtn.dataset.id;
                const habit = habits.find(x => x.id === habitId);
                if (habit && safeConfirm(`Bạn có chắc muốn xóa thói quen "${habit.title}" không?`)) {
                    habits = habits.filter(x => x.id !== habitId);
                    saveHabitsToStorage();
                    renderHabits();
                    updateHabitStats();
                    showToast('Đã xóa thói quen thành công!', 'info');
                }
                return;
            }
        });
    }

    function toggleHabitCheckin(habitId) {
        toggleHabitCheckinForDate(habitId, getTodayISO());
    }

    function toggleHabitCheckinForDate(habitId, targetDateStr) {
        const habit = habits.find(h => h.id === habitId);
        if (!habit) return;
        const dateStr = targetDateStr || getTodayISO();
        if (!habit.history) habit.history = {};

        const isCurrentlyDone = Boolean(habit.history[dateStr]);
        habit.history[dateStr] = !isCurrentlyDone;

        const newStreak = calculateHabitStreak(habit);
        habit.streak = newStreak;
        habit.bestStreak = Math.max(habit.bestStreak || 0, newStreak);

        saveHabitsToStorage();
        renderHabits();
        updateHabitStats();

        if (window.__calendarInstance && typeof window.__calendarInstance.render === 'function') {
            window.__calendarInstance.render(getFilteredTasks());
        }

        if (!isCurrentlyDone) {
            // Vừa hoàn thành
            showToast(`Tuyệt vời! Đã điểm danh "${habit.title}" (${dateStr}) (Chuỗi: ${newStreak} ngày 🔥)`, 'success');
        } else {
            showToast(`Đã hủy điểm danh cho "${habit.title}" (${dateStr})`, 'info');
        }
    }

    function renderHabitsHeatmap() {
        const grid = document.getElementById('habit-heatmap-grid');
        if (!grid) return;

        const totalWeeks = 22;
        const totalDays = totalWeeks * 7;
        const cells = [];
        const today = new Date();
        const totalHabits = habits.length;
        let totalYearlyCheckins = 0;

        for (let i = totalDays - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            let doneCount = 0;
            habits.forEach(h => {
                if (h.history && h.history[iso]) doneCount++;
            });

            totalYearlyCheckins += doneCount;

            let level = 0;
            if (totalHabits > 0 && doneCount > 0) {
                const ratio = doneCount / totalHabits;
                if (ratio <= 0.25) level = 1;
                else if (ratio <= 0.5) level = 2;
                else if (ratio <= 0.75) level = 3;
                else level = 4;
            }

            cells.push(`
                <div class="heatmap-cell level-${level}" 
                     data-date="${iso}" 
                     title="${iso}: ${doneCount}/${totalHabits} thói quen đã hoàn thành"></div>
            `);
        }

        grid.innerHTML = cells.join('');

        const badge = document.getElementById('heatmap-summary-badge');
        if (badge) {
            badge.textContent = `${totalYearlyCheckins} lượt điểm danh trong ${totalWeeks} tuần qua`;
        }
    }

    function openHabitModal(habitToEdit = null) {
        if (!habitModal) return;
        if (habitToEdit) {
            if (habitEditId) habitEditId.value = habitToEdit.id;
            if (habitTitleInput) habitTitleInput.value = habitToEdit.title || '';
            if (habitCategoryInput) habitCategoryInput.value = habitToEdit.category || 'Sức khỏe';
            if (habitFrequencyInput) habitFrequencyInput.value = habitToEdit.frequency || 'daily';
            if (habitTargetNote) habitTargetNote.value = habitToEdit.note || '';
            if (habitSelectedEmojiInput) habitSelectedEmojiInput.value = habitToEdit.emoji || '🌱';

            habitEmojiBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.emoji === (habitToEdit.emoji || '🌱'));
            });
            const titleEl = document.getElementById('habit-modal-title');
            if (titleEl) titleEl.textContent = 'Chỉnh Sửa Thói Quen';
        } else {
            if (habitForm) habitForm.reset();
            if (habitEditId) habitEditId.value = '';
            if (habitSelectedEmojiInput) habitSelectedEmojiInput.value = '🌱';
            habitEmojiBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.emoji === '🌱');
            });
            const titleEl = document.getElementById('habit-modal-title');
            if (titleEl) titleEl.textContent = 'Thêm Thói Quen Mới';
        }
        habitModal.classList.add('active');
        habitModal.setAttribute('aria-hidden', 'false');
        if (habitTitleInput) habitTitleInput.focus();
    }

    function closeHabitModal() {
        if (!habitModal) return;
        habitModal.classList.remove('active');
        habitModal.setAttribute('aria-hidden', 'true');
    }

    // Sự kiện Habit Tracker
    if (btnAddHabit) btnAddHabit.addEventListener('click', () => openHabitModal());
    if (btnCloseHabitModal) btnCloseHabitModal.addEventListener('click', closeHabitModal);
    if (btnCancelHabitModal) btnCancelHabitModal.addEventListener('click', closeHabitModal);
    if (habitModal) {
        habitModal.addEventListener('click', (e) => {
            if (e.target === habitModal) closeHabitModal();
        });
    }

    habitEmojiBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            habitEmojiBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (habitSelectedEmojiInput) habitSelectedEmojiInput.value = btn.dataset.emoji;
        });
    });

    if (habitSearchInput) {
let habitSearchDebounce = null;
        const execHabitSearch = (val) => {
            if (isInputComposing) return;
            currentHabitSearch = (val !== undefined ? val : (habitSearchInput.value || '')).trim();
            renderHabits();
        };

        habitSearchInput.addEventListener('input', (e) => {
            if (e && e.isComposing) return;
            if (isInputComposing) return;
            const val = e && e.target ? e.target.value : habitSearchInput.value;
            if (habitSearchDebounce) clearTimeout(habitSearchDebounce);
            habitSearchDebounce = setTimeout(() => {
                execHabitSearch(val);
            }, 250);
        });

        habitSearchInput.addEventListener('search', () => {
            if (habitSearchDebounce) clearTimeout(habitSearchDebounce);
            execHabitSearch(habitSearchInput.value);
        });

        habitSearchInput.addEventListener('keydown', (e) => {
            if (e.isComposing || isInputComposing) return;
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable) {
                if (e.key === 'Backspace' || e.key === 'Delete') return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                if (habitSearchDebounce) clearTimeout(habitSearchDebounce);
                execHabitSearch(habitSearchInput.value);
            }
        });
    }

    document.querySelectorAll('.habit-filter-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.habit-filter-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentHabitFilter = btn.dataset.filter;
            renderHabits();
        });
    });

    if (habitForm) {
        habitForm.addEventListener('submit', (e) => {
            if (isInputComposing) {
                e.preventDefault();
                return;
            }
            e.preventDefault();
            const title = habitTitleInput ? habitTitleInput.value.trim() : '';
            if (!title) return;

            const editId = habitEditId ? habitEditId.value.trim() : '';
            const category = habitCategoryInput ? habitCategoryInput.value : 'Sức khỏe';
            const frequency = habitFrequencyInput ? habitFrequencyInput.value : 'daily';
            const emoji = habitSelectedEmojiInput ? habitSelectedEmojiInput.value : '🌱';
            const note = habitTargetNote ? habitTargetNote.value.trim() : '';

            if (editId) {
                const idx = habits.findIndex(h => h.id === editId);
                if (idx !== -1) {
                    habits[idx] = {
                        ...habits[idx],
                        title,
                        category,
                        frequency,
                        emoji,
                        note
                    };
                    showToast('Đã cập nhật thói quen!', 'success');
                }
            } else {
                const newHabit = {
                    id: generateUniqueId('habit'),
                    title,
                    category,
                    frequency,
                    emoji,
                    note,
                    history: {},
                    streak: 0,
                    bestStreak: 0,
                    createdAt: getTodayISO()
                };
                habits.unshift(newHabit);
                showToast('Đã thêm thói quen mới!', 'success');
            }

            saveHabitsToStorage();
            closeHabitModal();
            renderHabits();
            updateHabitStats();
        });
    }

    // =========================================================================
    // 19. MODULE 04: QUICK NOTES & KNOWLEDGE BASE (GHI CHÚ & MARKDOWN)
    // =========================================================================
    const NOTES_STORAGE_KEY = 'personal_workspace_notes_v1';

    const DEFAULT_NOTES = [
        {
            id: 'note_def_01',
            title: '🎋 Hướng dẫn sử dụng TreTH',
            tags: ['Hướng dẫn', 'Hệ thống'],
            color: '#10B981',
            isPinned: true,
            content: '# Chào mừng đến với TreTH! 🎋\n\nỨng dụng kết hợp Trello & TickTick theo kiến trúc Offline-First:\n- [x] **Quản lý công việc**: Danh sách thông minh, Kanban 3 cột, Lịch công việc & Ma trận Eisenhower\n- [x] **Thời gian**: Pomodoro Timer, Web Audio Sound chuông báo & Web Notification\n- [x] **Thói quen**: Streak Counter điểm danh hằng ngày và dải lịch sử 7 ngày\n- [x] **Ghi chú**: Soạn thảo Markdown với trình xem trước thời gian thực\n\n> Hãy tập trung vào những mục tiêu quan trọng nhất hôm nay!',
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
        },
        {
            id: 'note_def_02',
            title: '🚀 Kế hoạch phát triển bản thân tuần này',
            tags: ['Kế hoạch', 'Phát triển'],
            color: '#10B981',
            isPinned: false,
            content: '### Mục tiêu trọng tâm:\n- Duy trì chuỗi chạy bộ 30 phút mỗi ngày\n- Đọc 2 chương sách *Deep Work*\n- Thử nghiệm các tính năng mới của ứng dụng',
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
        }
    ];

    let notes = loadJSONFromStorage(NOTES_STORAGE_KEY, DEFAULT_NOTES);

    let currentNoteFilterTag = 'all';
    let currentNoteSearch = '';

    // DOM Elements for Notes
    const notesPinnedSection = document.getElementById('notes-pinned-section');
    const notesPinnedGrid = document.getElementById('notes-pinned-grid');
    const notesCardsGrid = document.getElementById('notes-cards-grid');
    const notesSearchInput = document.getElementById('notes-search-input');
    const notesTagPills = document.getElementById('notes-tag-pills');
    const btnAddNote = document.getElementById('btn-add-note');
    const noteModal = document.getElementById('note-modal');
    const noteForm = document.getElementById('note-form');
    const btnCloseNoteModal = document.getElementById('btn-close-note-modal');
    const btnCancelNoteModal = document.getElementById('btn-cancel-note-modal');
    const noteEditId = document.getElementById('note-edit-id');
    const noteTitleInput = document.getElementById('note-title-input');
    const noteTagsInput = document.getElementById('note-tags-input');
    const noteColorSelect = document.getElementById('note-color-select');
    const notePinCheckbox = document.getElementById('note-pin-checkbox');
    const noteContentInput = document.getElementById('note-content-input');
    const noteTabWrite = document.getElementById('note-tab-write');
    const noteTabPreview = document.getElementById('note-tab-preview');
    const noteEditorWrapper = document.getElementById('note-editor-wrapper');
    const notePreviewWrapper = document.getElementById('note-preview-wrapper');

    function saveNotesToStorage() {
        try {
            localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
        } catch(e) {}
    }

    function renderMarkdownToHTML(mdText) {
        if (!mdText) return '<em style="color: var(--text-muted);">Chưa có nội dung...</em>';
        let html = escapeHTML(mdText);

        // 1. Khối mã Code block (trích xuất để bảo toàn thụt lề và tránh chèn <br> bên trong)
        const codeBlocks = [];
        html = html.replace(/```([\s\S]*?)```/g, (_, code) => {
            const index = codeBlocks.length;
            codeBlocks.push(`<pre><code>${code.trim()}</code></pre>`);
            return `__CODE_BLOCK_${index}__`;
        });

        // 2. Inline code (trích xuất để bảo vệ nội dung không bị regex định dạng khác can thiệp)
        const inlineCodes = [];
        html = html.replace(/`([^`]+)`/g, (_, code) => {
            const index = inlineCodes.length;
            inlineCodes.push(`<code>${code}</code>`);
            return `__INLINE_CODE_${index}__`;
        });

        // 3. Tiêu đề Headers
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

        // 4. Task checkboxes
        html = html.replace(/^- \[x\] (.*$)/gim, '<div style="display:flex;align-items:center;gap:0.35rem;"><input type="checkbox" checked disabled> <s>$1</s></div>');
        html = html.replace(/^- \[ \] (.*$)/gim, '<div style="display:flex;align-items:center;gap:0.35rem;"><input type="checkbox" disabled> <span>$1</span></div>');

        // 5. Bullet lists: chuyển từng dòng bullet thành <li>
        html = html.replace(/^- (.*$)/gim, '<li>$1</li>');

        // Gom các thẻ <li> liên tiếp nhau vào duy nhất 1 thẻ <ul>...</ul>
        html = html.replace(/(?:<li>[\s\S]*?<\/li>(?:\r?\n)?)+/g, (match) => {
            const inner = match.replace(/\r?\n/g, '');
            return `<ul>${inner}</ul>`;
        });

        // 6. Bold & Italic
        html = html.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*([^\*]+)\*/g, '<em>$1</em>');

        // 7. Blockquote
        html = html.replace(/^&gt; (.*$)/gim, '<blockquote style="border-left:3px solid var(--primary);padding-left:0.75rem;margin:0.5rem 0;color:var(--text-secondary);">$1</blockquote>');

        // 8. Chuyển đổi xuống dòng \n sang <br> và dọn dẹp <br> thừa xung quanh/bên trong block tags
        html = html.replace(/\n/g, '<br>');
        html = html.replace(/<br>\s*(<\/?(?:h[1-3]|ul|li|blockquote|pre))/gi, '$1');
        html = html.replace(/(<\/(?:h[1-3]|ul|blockquote|pre)>)\s*<br>/gi, '$1');
        html = html.replace(/<ul>\s*<br>/gi, '<ul>');
        html = html.replace(/<br>\s*<\/ul>/gi, '</ul>');
        html = html.replace(/<\/li>\s*<br>\s*<li>/gi, '</li><li>');

        // 9. Khôi phục lại các khối mã Code blocks và Inline codes (dùng callback để an toàn với ký tự $)
        codeBlocks.forEach((block, idx) => {
            html = html.replace(`__CODE_BLOCK_${idx}__`, () => block);
        });
        inlineCodes.forEach((code, idx) => {
            html = html.replace(`__INLINE_CODE_${idx}__`, () => code);
        });

        return html;
    }

    function renderNoteTags() {
        if (!notesTagPills) return;
        const allTags = new Set();
        notes.forEach(n => {
            if (Array.isArray(n.tags)) {
                n.tags.forEach(t => t && allTags.add(t.trim()));
            }
        });

        let pillsHtml = `<button type="button" class="note-tag-pill ${currentNoteFilterTag === 'all' ? 'active' : ''}" data-tag="all">Tất cả thẻ</button>`;
        allTags.forEach(t => {
            pillsHtml += `<button type="button" class="note-tag-pill ${currentNoteFilterTag === t ? 'active' : ''}" data-tag="${escapeHTML(t)}">#${escapeHTML(t)}</button>`;
        });
        notesTagPills.innerHTML = pillsHtml;

        notesTagPills.querySelectorAll('.note-tag-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                currentNoteFilterTag = btn.dataset.tag;
                renderNoteTags();
                renderNotes();
            });
        });
    }

    function renderNotes() {
        if (!notesCardsGrid) return;

        let filtered = notes.filter(n => {
            if (currentNoteFilterTag !== 'all') {
                if (!Array.isArray(n.tags) || !n.tags.includes(currentNoteFilterTag)) {
                    return false;
                }
            }
            if (currentNoteSearch) {
                const q = currentNoteSearch.toLowerCase();
                const matchTitle = (n.title || '').toLowerCase().includes(q);
                const matchContent = (n.content || '').toLowerCase().includes(q);
                const matchTag = Array.isArray(n.tags) && n.tags.some(t => t.toLowerCase().includes(q));
                if (!matchTitle && !matchContent && !matchTag) return false;
            }
            return true;
        });

        const pinnedNotes = filtered.filter(n => n.isPinned);
        const otherNotes = filtered.filter(n => !n.isPinned);

        function renderNoteCard(n) {
            const tagsHtml = (Array.isArray(n.tags) && n.tags.length > 0)
                ? `<div class="note-tags-row">${n.tags.map(t => `<span class="note-tag-badge">#${escapeHTML(t)}</span>`).join('')}</div>`
                : '';
            const previewHtml = renderMarkdownToHTML(n.content || '');
            const timeStr = n.updatedAt ? new Date(n.updatedAt).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

            return `
                <div class="note-card ${n.isPinned ? 'is-pinned' : ''}" style="--note-accent: ${n.color || '#4F46E5'};" data-id="${escapeHTML(n.id)}">
                    <div class="note-card-header">
                        <h3 class="note-card-title">${escapeHTML(n.title)}</h3>
                        <button type="button" class="note-pin-btn ${n.isPinned ? 'pinned' : ''} btn-toggle-pin" data-id="${escapeHTML(n.id)}" title="${n.isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}">
                            <i class="${n.isPinned ? 'ri-pushpin-2-fill' : 'ri-pushpin-2-line'}"></i>
                        </button>
                    </div>

                    ${tagsHtml}

                    <div class="note-content-preview">
                        ${previewHtml}
                    </div>

                    <div class="note-card-footer">
                        <span class="note-updated-time">${timeStr}</span>
                        <div class="note-card-actions">
                            <button type="button" class="btn-habit-icon btn-edit-note" data-id="${escapeHTML(n.id)}" title="Chỉnh sửa">
                                <i class="ri-edit-line"></i>
                            </button>
                            <button type="button" class="btn-habit-icon btn-delete btn-delete-note" data-id="${escapeHTML(n.id)}" title="Xóa ghi chú">
                                <i class="ri-delete-bin-line"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        if (pinnedNotes.length > 0 && notesPinnedSection && notesPinnedGrid) {
            notesPinnedSection.style.display = 'block';
            notesPinnedGrid.innerHTML = pinnedNotes.map(renderNoteCard).join('');
        } else if (notesPinnedSection) {
            notesPinnedSection.style.display = 'none';
        }

        if (otherNotes.length > 0) {
            notesCardsGrid.innerHTML = otherNotes.map(renderNoteCard).join('');
        } else if (pinnedNotes.length === 0) {
            notesCardsGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; padding: 3rem 1rem; text-align: center;">
                    <div class="empty-icon" style="font-size: 3rem; margin-bottom: 0.5rem;">📝</div>
                    <h3 style="font-size: 1.1rem; color: var(--text-main); margin-bottom: 0.35rem;">Chưa có ghi chú nào</h3>
                    <p style="color: var(--text-muted); font-size: 0.88rem; max-width: 400px; margin: 0 auto 1rem;">
                        Hãy bấm nút <strong>"Tạo ghi chú mới"</strong> để ghi lại ý tưởng, kiến thức hoặc ghi nhớ công việc!
                    </p>
                </div>
            `;
        } else {
            notesCardsGrid.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">Tất cả ghi chú hiện tại đang được ghim ở phía trên.</p>`;
        }
    }

    if (moduleNotesView) {
        moduleNotesView.addEventListener('click', (e) => {
            const pinBtn = e.target.closest('.btn-toggle-pin');
            if (pinBtn) {
                e.stopPropagation();
                const noteId = pinBtn.dataset.id;
                const note = notes.find(n => n.id === noteId);
                if (note) {
                    note.isPinned = !note.isPinned;
                    note.updatedAt = new Date().toISOString();
                    saveNotesToStorage();
                    renderNotes();
                    showToast(note.isPinned ? 'Đã ghim ghi chú lên đầu!' : 'Đã bỏ ghim ghi chú!', 'info');
                }
                return;
            }

            const editBtn = e.target.closest('.btn-edit-note');
            if (editBtn) {
                e.stopPropagation();
                const noteId = editBtn.dataset.id;
                const note = notes.find(n => n.id === noteId);
                if (note) openNoteModal(note);
                return;
            }

            const deleteBtn = e.target.closest('.btn-delete-note');
            if (deleteBtn) {
                e.stopPropagation();
                const noteId = deleteBtn.dataset.id;
                const note = notes.find(n => n.id === noteId);
                if (note && safeConfirm(`Bạn có chắc muốn xóa ghi chú "${note.title}" không?`)) {
                    notes = notes.filter(n => n.id !== noteId);
                    saveNotesToStorage();
                    renderNotes();
                    renderNoteTags();
                    showToast('Đã xóa ghi chú!', 'info');
                }
                return;
            }
        });
    }

    function openNoteModal(noteToEdit = null) {
        if (!noteModal) return;
        // Chuyển về tab soạn thảo mặc định
        if (noteTabWrite && noteTabPreview) {
            noteTabWrite.classList.add('active');
            noteTabPreview.classList.remove('active');
            if (noteEditorWrapper) noteEditorWrapper.style.display = 'block';
            if (notePreviewWrapper) notePreviewWrapper.style.display = 'none';
        }

        if (noteToEdit) {
            if (noteEditId) noteEditId.value = noteToEdit.id;
            if (noteTitleInput) noteTitleInput.value = noteToEdit.title || '';
            if (noteTagsInput) noteTagsInput.value = Array.isArray(noteToEdit.tags) ? noteToEdit.tags.join(', ') : '';
            if (noteColorSelect) noteColorSelect.value = noteToEdit.color || '#4F46E5';
            if (notePinCheckbox) notePinCheckbox.checked = Boolean(noteToEdit.isPinned);
            if (noteContentInput) noteContentInput.value = noteToEdit.content || '';

            const titleEl = document.getElementById('note-modal-title');
            if (titleEl) titleEl.textContent = 'Chỉnh Sửa Ghi Chú';
        } else {
            if (noteForm) noteForm.reset();
            if (noteEditId) noteEditId.value = '';
            if (notePinCheckbox) notePinCheckbox.checked = false;
            const titleEl = document.getElementById('note-modal-title');
            if (titleEl) titleEl.textContent = 'Ghi Chú Mới';
        }

        noteModal.classList.add('active');
        noteModal.setAttribute('aria-hidden', 'false');
        if (noteTitleInput) noteTitleInput.focus();
    }

    function closeNoteModal() {
        if (!noteModal) return;
        noteModal.classList.remove('active');
        noteModal.setAttribute('aria-hidden', 'true');
    }

    // Tab chuyển đổi Soạn thảo / Xem trước
    if (noteTabWrite && noteTabPreview) {
        noteTabWrite.addEventListener('click', () => {
            noteTabWrite.classList.add('active');
            noteTabPreview.classList.remove('active');
            if (noteEditorWrapper) noteEditorWrapper.style.display = 'block';
            if (notePreviewWrapper) notePreviewWrapper.style.display = 'none';
        });

        noteTabPreview.addEventListener('click', () => {
            noteTabPreview.classList.add('active');
            noteTabWrite.classList.remove('active');
            if (noteEditorWrapper) noteEditorWrapper.style.display = 'none';
            if (notePreviewWrapper) {
                notePreviewWrapper.style.display = 'block';
                const text = noteContentInput ? noteContentInput.value : '';
                notePreviewWrapper.innerHTML = renderMarkdownToHTML(text);
            }
        });
    }

    if (btnAddNote) btnAddNote.addEventListener('click', () => openNoteModal());
    if (btnCloseNoteModal) btnCloseNoteModal.addEventListener('click', closeNoteModal);
    if (btnCancelNoteModal) btnCancelNoteModal.addEventListener('click', closeNoteModal);
    if (noteModal) {
        noteModal.addEventListener('click', (e) => {
            if (e.target === noteModal) closeNoteModal();
        });
    }

    if (notesSearchInput) {
let noteSearchDebounce = null;
        const execNoteSearch = (val) => {
            if (isInputComposing) return;
            currentNoteSearch = (val !== undefined ? val : (notesSearchInput.value || '')).trim();
            renderNotes();
        };

        notesSearchInput.addEventListener('input', (e) => {
            if (e && e.isComposing) return;
            if (isInputComposing) return;
            const val = e && e.target ? e.target.value : notesSearchInput.value;
            if (noteSearchDebounce) clearTimeout(noteSearchDebounce);
            noteSearchDebounce = setTimeout(() => {
                execNoteSearch(val);
            }, 250);
        });

        notesSearchInput.addEventListener('search', () => {
            if (noteSearchDebounce) clearTimeout(noteSearchDebounce);
            execNoteSearch(notesSearchInput.value);
        });

        notesSearchInput.addEventListener('keydown', (e) => {
            if (e.isComposing || isInputComposing) return;
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable) {
                if (e.key === 'Backspace' || e.key === 'Delete') return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                if (noteSearchDebounce) clearTimeout(noteSearchDebounce);
                execNoteSearch(notesSearchInput.value);
            }
        });
    }

    if (noteForm) {
        noteForm.addEventListener('submit', (e) => {
            if (isInputComposing) {
                e.preventDefault();
                return;
            }
            e.preventDefault();
            const title = noteTitleInput ? noteTitleInput.value.trim() : '';
            if (!title) return;

            const editId = noteEditId ? noteEditId.value.trim() : '';
            const rawTags = noteTagsInput ? noteTagsInput.value : '';
            const tags = rawTags.split(',').map(t => t.trim()).filter(Boolean);
            const color = noteColorSelect ? noteColorSelect.value : '#4F46E5';
            const isPinned = notePinCheckbox ? notePinCheckbox.checked : false;
            const content = noteContentInput ? noteContentInput.value : '';
            const nowISO = new Date().toISOString();

            if (editId) {
                const idx = notes.findIndex(n => n.id === editId);
                if (idx !== -1) {
                    notes[idx] = {
                        ...notes[idx],
                        title,
                        tags,
                        color,
                        isPinned,
                        content,
                        updatedAt: nowISO
                    };
                    showToast('Đã lưu thay đổi ghi chú!', 'success');
                }
            } else {
                const newNote = {
                    id: generateUniqueId('note'),
                    title,
                    tags,
                    color,
                    isPinned,
                    content,
                    createdAt: nowISO,
                    updatedAt: nowISO
                };
                notes.unshift(newNote);
                showToast('Đã tạo ghi chú mới!', 'success');
            }

            saveNotesToStorage();
            closeNoteModal();
            renderNotes();
            renderNoteTags();
        });
    }

    // =========================================================================
    // ĐĂNG KÝ SERVICE WORKER & XỬ LÝ CÀI ĐẶT PWA
    // =========================================================================
    let deferredInstallPrompt = null;
    const btnInstallPwa = document.getElementById('btn-install-pwa');
    const pwaStatusText = document.getElementById('pwa-status-text');

    // 1. Kiểm tra trạng thái đang chạy standalone (đã cài đặt làm app)
    const isAppStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
    if (isAppStandalone && pwaStatusText) {
        pwaStatusText.textContent = 'Ứng dụng đã được cài đặt và đang chạy ở chế độ App độc lập.';
        if (btnInstallPwa) btnInstallPwa.style.display = 'none';
    }

    // 2. Bắt sự kiện beforeinstallprompt để hiển thị nút cài đặt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;

        if (btnInstallPwa && !isAppStandalone) {
            btnInstallPwa.style.display = 'inline-flex';
            if (pwaStatusText) {
                pwaStatusText.textContent = 'Sẵn sàng cài đặt ứng dụng lên máy tính hoặc điện thoại của bạn.';
            }
        }
    });

    // 3. Xử lý khi người dùng nhấn nút Cài đặt App
    if (btnInstallPwa) {
        btnInstallPwa.addEventListener('click', async () => {
            if (!deferredInstallPrompt) {
                showToast('Để cài đặt, bạn cũng có thể nhấn biểu tượng Cài đặt trên thanh địa chỉ trình duyệt!', 'info');
                return;
            }

            deferredInstallPrompt.prompt();
            const choiceResult = await deferredInstallPrompt.userChoice;

            if (choiceResult && choiceResult.outcome === 'accepted') {
                showToast('Đang cài đặt TreTH...', 'success');
                btnInstallPwa.style.display = 'none';
                if (pwaStatusText) {
                    pwaStatusText.textContent = 'Ứng dụng đã được cài đặt thành công.';
                }
            }
            deferredInstallPrompt = null;
        });
    }

    // 4. Lắng nghe sự kiện cài đặt thành công
    window.addEventListener('appinstalled', () => {
        if (btnInstallPwa) btnInstallPwa.style.display = 'none';
        if (pwaStatusText) {
            pwaStatusText.textContent = 'Ứng dụng đã được cài đặt thành công trên thiết bị.';
        }
        showToast('Chúc mừng! TreTH đã được cài đặt thành app.', 'success');
    });

    // 5. Đăng ký Service Worker an toàn & Tự động xóa cache phiên bản cũ
    const CURRENT_APP_CACHE = 'treth-v4.3.0';
    function registerServiceWorker() {
        // Tự động dọn dẹp cache phiên bản cũ ngay trên trình duyệt / PWA / WebView
        if ('caches' in window) {
            caches.keys().then(keys => {
                keys.forEach(k => {
                    if (k !== CURRENT_APP_CACHE) {
                        caches.delete(k).catch(() => {});
                    }
                });
            }).catch(() => {});
        }

        if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            navigator.serviceWorker.register('./sw.js?v=4.3.0', { updateViaCache: 'none' })
                .then(reg => {
                    console.log('[PWA] Service Worker đăng ký thành công:', reg.scope);
                    if (typeof reg.update === 'function') {
                        reg.update().catch(() => {});
                    }
                    if (reg.waiting) {
                        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                    }
                    reg.addEventListener('updatefound', () => {
                        const newWorker = reg.installing;
                        if (!newWorker) return;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                newWorker.postMessage({ type: 'SKIP_WAITING' });
                            }
                        });
                    });
                })
                .catch(err => {
                    console.warn('[PWA] Đăng ký Service Worker thất bại:', err);
                });
        }
    }

    if (document.readyState === 'complete') {
        registerServiceWorker();
    } else {
        window.addEventListener('load', registerServiceWorker);
    }

    // 6. Nút Làm mới phiên bản & Xóa bộ nhớ đệm (#btn-force-update-app)
    const btnForceUpdateApp = document.getElementById('btn-force-update-app');
    if (btnForceUpdateApp) {
        btnForceUpdateApp.addEventListener('click', async () => {
            btnForceUpdateApp.disabled = true;
            showToast('Đang xóa bộ nhớ đệm cũ và tải phiên bản v4.3.0 mới nhất...', 'info');
            try {
                if ('serviceWorker' in navigator) {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    await Promise.all(regs.map(r => r.unregister()));
                }
                if ('caches' in window) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map(k => caches.delete(k)));
                }
            } catch (_) {}
            setTimeout(() => {
                const url = new URL(window.location.href);
                url.searchParams.set('v', '4.3.0');
                url.searchParams.set('_t', String(Date.now()));
                window.location.replace(url.toString());
            }, 350);
        });
    }

    // 7. Đồng bộ GitHub & Tự động kích hoạt Build APK (#btn-github-push)
    const btnGithubPush = document.getElementById('btn-github-push');
    const btnGithubPushText = document.getElementById('btn-github-push-text');
    const githubRepoInput = document.getElementById('github-repo-input');
    const githubTokenInput = document.getElementById('github-token-input');
    const githubSyncStatus = document.getElementById('github-sync-status');

    if (btnGithubPush) {
        btnGithubPush.addEventListener('click', async () => {
            const repo = githubRepoInput ? githubRepoInput.value.trim() : 'vithao-gihub/treth-vthao';
            const token = githubTokenInput ? githubTokenInput.value.trim() : '';

            if (!token) {
                showToast('Vui lòng dán GitHub Personal Access Token vào ô bên trên!', 'warning');
                if (githubTokenInput) githubTokenInput.focus();
                if (githubSyncStatus) {
                    githubSyncStatus.style.display = 'block';
                    githubSyncStatus.style.borderColor = '#F59E0B';
                    githubSyncStatus.innerHTML = '⚠️ Bạn cần nhập <strong>GitHub Personal Access Token</strong> (bắt đầu bằng <code>ghp_...</code> hoặc <code>github_pat_...</code> có quyền <code>repo</code> &amp; <code>workflow</code>) để đẩy code lên GitHub.';
                }
                return;
            }

            btnGithubPush.disabled = true;
            if (btnGithubPushText) btnGithubPushText.textContent = 'Đang đồng bộ & đẩy lên GitHub...';
            if (githubSyncStatus) {
                githubSyncStatus.style.display = 'block';
                githubSyncStatus.style.borderColor = 'var(--border-color)';
                githubSyncStatus.innerHTML = '⏳ Đang đóng gói tài nguyên <code>www/</code> và đẩy mã nguồn v4.3.0 lên GitHub...';
            }

            try {
                const resp = await fetch('/api/github-sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ repo, token })
                });
                const data = await resp.json();

                if (!resp.ok || !data.ok) {
                    throw new Error(data.error || 'Lỗi không xác định khi đẩy lên GitHub.');
                }

                showToast('Đã đẩy code lên GitHub thành công! GitHub Actions đang đóng gói APK mới.', 'success');
                if (githubSyncStatus) {
                    githubSyncStatus.style.borderColor = '#10B981';
                    githubSyncStatus.innerHTML = `
                        <div style="color: #10B981; font-weight: 600; margin-bottom: 4px;">
                            ✅ Đã đẩy thành công lên nhánh <code>${escapeHTML(data.branch)}</code> (Mã commit: <code>${escapeHTML(data.commitSha)}</code>)!
                        </div>
                        <div style="color: var(--text-secondary);">
                            GitHub Actions đang tự động biên dịch file <strong>TreTH-v4.3.0.apk</strong> mới (mất khoảng 2–3 phút).
                        </div>
                        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px;">
                            <a href="${escapeHTML(data.actionsUrl)}" target="_blank" rel="noopener noreferrer" style="color: #2563EB; font-weight: 600; text-decoration: underline;">
                                👉 Xem tiến trình Build APK (GitHub Actions)
                            </a>
                            <a href="${escapeHTML(data.releasesUrl)}" target="_blank" rel="noopener noreferrer" style="color: #10B981; font-weight: 600; text-decoration: underline;">
                                📲 Trang tải file APK (GitHub Releases)
                            </a>
                        </div>
                    `;
                }
            } catch (err) {
                showToast('Lỗi đẩy GitHub: ' + err.message, 'warning');
                if (githubSyncStatus) {
                    githubSyncStatus.style.borderColor = '#EF4444';
                    githubSyncStatus.innerHTML = `<span style="color: #EF4444; font-weight: 600;">❌ ${escapeHTML(err.message)}</span>`;
                }
            } finally {
                btnGithubPush.disabled = false;
                if (btnGithubPushText) btnGithubPushText.textContent = 'Đẩy lên GitHub & Build APK mới';
            }
        });
    }

    // =========================================================================
    // KHỞI TẠO HỆ THỐNG BAN ĐẦU & TRETH v4.0 INTERACTIVE ENGINES
    // =========================================================================

    function updateTaskById(taskId, patch) {
        let updatedTask = null;
        tasks = tasks.map(t => {
            if (String(t.id) === String(taskId)) {
                updatedTask = normalizeTaskV4({ ...t, ...patch, updatedAt: new Date().toISOString() });
                return updatedTask;
            }
            return t;
        });
        if (updatedTask) {
            saveTasksToStorage('UPDATE', taskId, updatedTask);
            updateDashboardStats();
            renderTasks();
            syncTimeModuleUI();
            if (window.__calendarInstance && typeof window.__calendarInstance.render === 'function') {
                window.__calendarInstance.render(getFilteredTasks());
            }
            if (window.__kanbanInstance && typeof window.__kanbanInstance.render === 'function' && currentViewMode === 'kanban') {
                window.__kanbanInstance.render(tasks);
            }
        }
        return updatedTask;
    }

    function createNewTaskFromModule(taskObj) {
        const normalized = normalizeTaskV4({
            ...taskObj,
            id: taskObj.id || generateUniqueId('task'),
            lastResetDate: getTodayISO()
        });
        tasks.unshift(normalized);
        saveTasksToStorage('CREATE', normalized.id, normalized);
        updateDashboardStats();
        renderTasks();
        syncTimeModuleUI();
        if (window.__calendarInstance && typeof window.__calendarInstance.render === 'function') {
            window.__calendarInstance.render(getFilteredTasks());
        }
        if (window.__kanbanInstance && typeof window.__kanbanInstance.render === 'function' && currentViewMode === 'kanban') {
            window.__kanbanInstance.render(tasks);
        }
        return normalized;
    }

    function deleteTaskById(taskId) {
        const targetId = String(taskId);
        tasks = tasks.filter(t => String(t.id) !== targetId);
        saveTasksToStorage('DELETE', targetId, { id: targetId });
        updateDashboardStats();
        renderTasks();
        syncTimeModuleUI();
        if (window.__calendarInstance && typeof window.__calendarInstance.render === 'function') {
            window.__calendarInstance.render(getFilteredTasks());
        }
        if (window.__kanbanInstance && typeof window.__kanbanInstance.render === 'function' && currentViewMode === 'kanban') {
            window.__kanbanInstance.render(tasks);
        }
        if (typeof showToast === 'function') {
            showToast('Đã xóa công việc!', 'info');
        }
    }

    // Bento Cards Interactive Filters on Dashboard (.stats-grid-4)
    function setupBentoCardsInteractivity() {
        const cardTotal = document.querySelector('.stats-grid-4 .stat-card-total');
        const cardCompleted = document.querySelector('.stats-grid-4 .stat-card-completed');
        const cardUrgent = document.querySelector('.stats-grid-4 .stat-card-urgent');
        const cardProgress = document.querySelector('.stats-grid-4 .stat-card-progress');

        if (cardTotal) {
            cardTotal.addEventListener('click', () => {
                resetAllFilters();
                showToast('Đang hiển thị tất cả công việc', 'info');
            });
        }

        if (cardCompleted) {
            cardCompleted.addEventListener('click', () => {
                resetAllFilters();
                if (filterStatusSelect) {
                    filterStatusSelect.value = 'completed';
                    handleFilterChange();
                    showToast('Đang lọc công việc đã hoàn thành', 'info');
                }
            });
        }

        if (cardUrgent) {
            cardUrgent.addEventListener('click', () => {
                resetAllFilters();
                if (filterPrioritySelect) {
                    filterPrioritySelect.value = 'high';
                    handleFilterChange();
                    showToast('Đang lọc công việc gấp & quan trọng', 'info');
                }
            });
        }

        if (cardProgress) {
            cardProgress.addEventListener('click', () => {
                resetAllFilters();
                if (filterStatusSelect) {
                    filterStatusSelect.value = 'in-progress';
                    handleFilterChange();
                    showToast('Đang lọc công việc đang thực hiện', 'info');
                }
            });
        }
    }

    // Offline Web Audio Ambient Soundscape (Synthesized Rain, Ocean Waves, Wind)
    let ambientAudioCtx = null;
    let ambientSourceNode = null;
    let ambientGainNode = null;
    let currentAmbientSound = 'none';

    function initAmbientAudio(type, volume = 0.4) {
        if (ambientSourceNode) {
            try { ambientSourceNode.stop(); ambientSourceNode.disconnect(); } catch (e) {}
            ambientSourceNode = null;
        }
        if (type === 'none') {
            currentAmbientSound = 'none';
            const volRow = document.getElementById('ambient-volume-container');
            if (volRow) volRow.style.display = 'none';
            return;
        }

        const volRow = document.getElementById('ambient-volume-container');
        if (volRow) volRow.style.display = 'flex';

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        if (!ambientAudioCtx) {
            ambientAudioCtx = new AudioContextClass();
        }
        if (ambientAudioCtx.state === 'suspended') {
            ambientAudioCtx.resume();
        }

        const bufferSize = ambientAudioCtx.sampleRate * 2;
        const noiseBuffer = ambientAudioCtx.createBuffer(1, bufferSize, ambientAudioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        if (type === 'white') {
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
        } else if (type === 'brown') {
            let lastOut = 0.0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                output[i] = (lastOut + (0.02 * white)) / 1.02;
                lastOut = output[i];
                output[i] *= 3.5;
            }
        } else if (type === 'rain') {
            let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                b0 = 0.99886 * b0 + white * 0.0555179;
                b1 = 0.99332 * b1 + white * 0.0750759;
                b2 = 0.96900 * b2 + white * 0.1538520;
                b3 = 0.86650 * b3 + white * 0.3104856;
                b4 = 0.55000 * b4 + white * 0.5329522;
                b5 = -0.7616 * b5 - white * 0.0168980;
                output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
                output[i] *= 0.11;
                b6 = white * 0.115926;
            }
        }

        const soundSource = ambientAudioCtx.createBufferSource();
        soundSource.buffer = noiseBuffer;
        soundSource.loop = true;

        const filter = ambientAudioCtx.createBiquadFilter();
        if (type === 'rain') {
            filter.type = 'lowpass';
            filter.frequency.value = 1400;
        } else if (type === 'brown') {
            filter.type = 'lowpass';
            filter.frequency.value = 450;
        } else {
            filter.type = 'bandpass';
            filter.frequency.value = 850;
        }

        if (!ambientGainNode) {
            ambientGainNode = ambientAudioCtx.createGain();
        }
        ambientGainNode.gain.setValueAtTime(volume, ambientAudioCtx.currentTime);

        soundSource.connect(filter);
        filter.connect(ambientGainNode);
        ambientGainNode.connect(ambientAudioCtx.destination);

        soundSource.start();
        ambientSourceNode = soundSource;
        currentAmbientSound = type;
    }

    function setupAmbientSoundscape() {
        const soundBtns = document.querySelectorAll('.ambient-sound-btn');
        const slider = document.getElementById('ambient-volume-slider');
        const label = document.getElementById('ambient-volume-label');

        soundBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                soundBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const soundType = btn.dataset.sound;
                const vol = slider ? parseInt(slider.value, 10) / 100 : 0.4;
                initAmbientAudio(soundType, vol);
            });
        });

        if (slider) {
            slider.addEventListener('input', () => {
                const vol = parseInt(slider.value, 10);
                if (label) label.textContent = `${vol}%`;
                if (ambientGainNode && ambientAudioCtx) {
                    ambientGainNode.gain.setValueAtTime(vol / 100, ambientAudioCtx.currentTime);
                }
            });
        }
    }

    // Floating Pomodoro Controls
    function setupFloatingPomodoroControls() {
        const floatingToggleBtn = document.getElementById('floating-pomo-toggle-btn');
        if (floatingToggleBtn) {
            floatingToggleBtn.addEventListener('click', () => {
                if (isTimerRunning) {
                    pausePomodoroTimer();
                } else {
                    startPomodoroTimer();
                }
            });
        }

        const floatingMaximizeBtn = document.getElementById('floating-pomo-maximize-btn');
        if (floatingMaximizeBtn) {
            floatingMaximizeBtn.addEventListener('click', () => {
                switchModule('time');
            });
        }
    }

    // Command Palette (Ctrl + K / Cmd + K)
    let commandPaletteActiveIndex = 0;
    let commandPaletteCurrentItems = [];

    function toggleCommandPalette(forceState) {
        const modal = document.getElementById('command-palette-modal');
        const input = document.getElementById('command-palette-input');
        if (!modal) return;
        const willOpen = forceState !== undefined ? forceState : (modal.style.display === 'none');
        if (willOpen) {
            modal.style.display = 'flex';
            if (input) {
                input.value = '';
                setTimeout(() => input.focus(), 50);
            }
            renderCommandPaletteResults('');
        } else {
            modal.style.display = 'none';
        }
    }

    function getSystemCommands() {
        return [
            {
                id: 'cmd-cal-week',
                type: 'Lệnh hệ thống',
                icon: 'ri-calendar-2-line',
                title: 'Chuyển sang Lịch biểu (Tuần)',
                action: () => {
                    switchModule('calendar');
                    if (window.__calendarInstance) window.__calendarInstance.setViewMode('week');
                }
            },
            {
                id: 'cmd-cal-month',
                type: 'Lệnh hệ thống',
                icon: 'ri-calendar-line',
                title: 'Chuyển sang Lịch biểu (Tháng)',
                action: () => {
                    switchModule('calendar');
                    if (window.__calendarInstance) window.__calendarInstance.setViewMode('month');
                }
            },
            {
                id: 'cmd-cal-day',
                type: 'Lệnh hệ thống',
                icon: 'ri-calendar-check-line',
                title: 'Chuyển sang Lịch biểu (Ngày)',
                action: () => {
                    switchModule('calendar');
                    if (window.__calendarInstance) window.__calendarInstance.setViewMode('day');
                }
            },
            {
                id: 'cmd-cal-agenda',
                type: 'Lệnh hệ thống',
                icon: 'ri-timeline-view',
                title: 'Chuyển sang Lịch trình (Agenda)',
                action: () => {
                    switchModule('calendar');
                    if (window.__calendarInstance) window.__calendarInstance.setViewMode('agenda');
                }
            },
            {
                id: 'cmd-pomo-start',
                type: 'Lệnh hệ thống',
                icon: 'ri-timer-line',
                title: 'Bắt đầu Pomodoro 25 phút',
                action: () => {
                    switchModule('time');
                    startPomodoroTimer();
                }
            },
            {
                id: 'cmd-theme-toggle',
                type: 'Lệnh hệ thống',
                icon: 'ri-contrast-2-line',
                title: 'Bật / Tắt Giao diện Tối & Sáng',
                action: () => {
                    if (typeof toggleTheme === 'function') toggleTheme();
                }
            },
            {
                id: 'cmd-export-excel',
                type: 'Lệnh hệ thống',
                icon: 'ri-file-excel-2-line',
                title: 'Xuất dữ liệu Excel (.xlsx)',
                action: () => {
                    const btn = document.getElementById('exportExcelBtn');
                    if (btn) btn.click();
                }
            },
            {
                id: 'cmd-backup-json',
                type: 'Lệnh hệ thống',
                icon: 'ri-file-code-line',
                title: 'Sao lưu toàn bộ dữ liệu (JSON)',
                action: () => {
                    const btn = document.getElementById('btn-export-json');
                    if (btn) btn.click();
                }
            },
            {
                id: 'cmd-new-task',
                type: 'Lệnh hệ thống',
                icon: 'ri-add-line',
                title: 'Tạo công việc mới',
                action: () => {
                    switchModule('tasks');
                    if (titleInput) titleInput.focus();
                }
            },
            {
                id: 'cmd-new-habit',
                type: 'Lệnh hệ thống',
                icon: 'ri-plant-line',
                title: 'Tạo thói quen mới',
                action: () => {
                    switchModule('habits');
                    openHabitModal();
                }
            },
            {
                id: 'cmd-new-note',
                type: 'Lệnh hệ thống',
                icon: 'ri-sticky-note-line',
                title: 'Tạo ghi chú mới',
                action: () => {
                    switchModule('notes');
                    openNoteModal();
                }
            }
        ];
    }

    function renderCommandPaletteResults(query) {
        const container = document.getElementById('command-palette-results');
        if (!container) return;

        const q = (query || '').toLowerCase().trim();
        const normQ = removeVietnameseTones(q);

        const systemCmds = getSystemCommands().filter(cmd => {
            if (!q) return true;
            return removeVietnameseTones(cmd.title.toLowerCase()).includes(normQ);
        });

        const matchedTasks = q ? tasks.filter(t => !t.isDeleted && removeVietnameseTones((t.title || '').toLowerCase()).includes(normQ)).slice(0, 5) : [];
        const matchedHabits = q ? habits.filter(h => removeVietnameseTones((h.title || '').toLowerCase()).includes(normQ)).slice(0, 3) : [];
        const matchedNotes = q ? notes.filter(n => removeVietnameseTones((n.title || '').toLowerCase()).includes(normQ)).slice(0, 3) : [];

        const allItems = [];

        if (systemCmds.length > 0) {
            allItems.push({ isHeader: true, title: 'Lệnh Nhanh Hệ Thống' });
            systemCmds.forEach(c => allItems.push({ ...c, isCmd: true }));
        }

        if (matchedTasks.length > 0) {
            allItems.push({ isHeader: true, title: 'Công Việc Khớp' });
            matchedTasks.forEach(t => {
                allItems.push({
                    id: `task-${t.id}`,
                    icon: 'ri-checkbox-circle-line',
                    title: t.title,
                    tag: t.dueDate || 'Không hạn',
                    action: () => {
                        switchModule('tasks');
                        openUpdateModal(t);
                    }
                });
            });
        }

        if (matchedHabits.length > 0) {
            allItems.push({ isHeader: true, title: 'Thói Quen Khớp' });
            matchedHabits.forEach(h => {
                allItems.push({
                    id: `habit-${h.id}`,
                    icon: 'ri-plant-line',
                    title: h.title,
                    tag: `Chuỗi: ${h.streak || 0} ngày`,
                    action: () => {
                        switchModule('habits');
                        openHabitModal(h);
                    }
                });
            });
        }

        if (matchedNotes.length > 0) {
            allItems.push({ isHeader: true, title: 'Ghi Chú Khớp' });
            matchedNotes.forEach(n => {
                allItems.push({
                    id: `note-${n.id}`,
                    icon: 'ri-file-text-line',
                    title: n.title,
                    tag: 'Ghi chú',
                    action: () => {
                        switchModule('notes');
                        openNoteModal(n);
                    }
                });
            });
        }

        commandPaletteCurrentItems = allItems.filter(item => !item.isHeader);
        commandPaletteActiveIndex = 0;

        if (allItems.length === 0) {
            container.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: var(--text-muted); font-size: 13px;">
                    Không tìm thấy lệnh hoặc kết quả nào cho "${escapeHTML(query)}"!
                </div>
            `;
            return;
        }

        let selectableCounter = 0;
        container.innerHTML = allItems.map(item => {
            if (item.isHeader) {
                return `<div class="command-palette-group-title">${item.title}</div>`;
            }
            const index = selectableCounter++;
            const isActive = index === commandPaletteActiveIndex;

            return `
                <div class="command-palette-item ${isActive ? 'active' : ''}" data-cp-index="${index}">
                    <div class="command-palette-item-left">
                        <i class="${item.icon || 'ri-arrow-right-s-line'} command-palette-item-icon"></i>
                        <span class="command-palette-item-title">${escapeHTML(item.title)}</span>
                    </div>
                    ${item.tag ? `<span class="command-palette-item-tag">${escapeHTML(item.tag)}</span>` : ''}
                </div>
            `;
        }).join('');
    }

    function setupCommandPalette() {
        const modal = document.getElementById('command-palette-modal');
        const input = document.getElementById('command-palette-input');
        const results = document.getElementById('command-palette-results');

        document.addEventListener('keydown', (e) => {
if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable) {
                if (e.key !== 'Escape' && !((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
                    return; // Để bàn phím hoạt động tự nhiên
                }
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                toggleCommandPalette();
            } else if (e.key === 'Escape' && modal && modal.style.display !== 'none') {
                toggleCommandPalette(false);
            }
        });

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) toggleCommandPalette(false);
            });
        }

        if (input) {
let cpDebounceTimer = null;
            input.addEventListener('input', (e) => {
                if (e && e.isComposing) return;
                if (isInputComposing) return;
                const val = e && e.target ? e.target.value : input.value;
                if (cpDebounceTimer) clearTimeout(cpDebounceTimer);
                cpDebounceTimer = setTimeout(() => {
                    renderCommandPaletteResults(val);
                }, 150);
            });

            input.addEventListener('keydown', (e) => {
                if (e.isComposing || isInputComposing) return;
                if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable) {
                    if (e.key === 'Backspace' || e.key === 'Delete') return;
                }
                if (commandPaletteCurrentItems.length === 0) return;

                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    commandPaletteActiveIndex = (commandPaletteActiveIndex + 1) % commandPaletteCurrentItems.length;
                    updateCommandPaletteActiveItem();
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    commandPaletteActiveIndex = (commandPaletteActiveIndex - 1 + commandPaletteCurrentItems.length) % commandPaletteCurrentItems.length;
                    updateCommandPaletteActiveItem();
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const chosen = commandPaletteCurrentItems[commandPaletteActiveIndex];
                    if (chosen && typeof chosen.action === 'function') {
                        toggleCommandPalette(false);
                        chosen.action();
                    }
                }
            });
        }

        if (results) {
            results.addEventListener('click', (e) => {
                const itemEl = e.target.closest('.command-palette-item');
                if (!itemEl) return;
                const idx = parseInt(itemEl.dataset.cpIndex, 10);
                const chosen = commandPaletteCurrentItems[idx];
                if (chosen && typeof chosen.action === 'function') {
                    toggleCommandPalette(false);
                    chosen.action();
                }
            });
        }
    }

    function updateCommandPaletteActiveItem() {
        const container = document.getElementById('command-palette-results');
        if (!container) return;
        const domItems = container.querySelectorAll('.command-palette-item');
        domItems.forEach((domItem, idx) => {
            domItem.classList.toggle('active', idx === commandPaletteActiveIndex);
            if (idx === commandPaletteActiveIndex) {
                domItem.scrollIntoView({ block: 'nearest' });
            }
        });
    }

    // Markdown Formatting Toolbar & Extract Tasks from Note
    function setupNoteMarkdownToolbar() {
        const toolbar = document.getElementById('note-md-toolbar');
        const textarea = document.getElementById('note-content-input');
        const extractBtn = document.getElementById('btn-extract-tasks-from-note');
        if (!toolbar || !textarea) return;

        toolbar.addEventListener('click', (e) => {
            const btn = e.target.closest('.note-md-btn');
            if (!btn || btn.id === 'btn-extract-tasks-from-note') return;

            const action = btn.dataset.mdAction;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const val = textarea.value;
            const selectedText = val.substring(start, end);

            let replacement = '';
            let newCursorPos = start;

            if (action === 'h1') {
                replacement = `\n# ${selectedText || 'Tiêu đề lớn'}\n`;
                newCursorPos = start + replacement.length;
            } else if (action === 'h2') {
                replacement = `\n## ${selectedText || 'Tiêu đề phụ'}\n`;
                newCursorPos = start + replacement.length;
            } else if (action === 'bold') {
                replacement = `**${selectedText || 'Văn bản đậm'}**`;
                newCursorPos = start + (selectedText ? replacement.length : 2);
            } else if (action === 'italic') {
                replacement = `*${selectedText || 'Văn bản nghiêng'}*`;
                newCursorPos = start + (selectedText ? replacement.length : 1);
            } else if (action === 'checklist') {
                replacement = `\n- [ ] ${selectedText || 'Việc cần làm'}\n`;
                newCursorPos = start + replacement.length;
            } else if (action === 'code') {
                replacement = `\`${selectedText || 'Mã code'}\``;
                newCursorPos = start + (selectedText ? replacement.length : 1);
            }

            textarea.value = val.substring(0, start) + replacement + val.substring(end);
            textarea.focus();
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        });

        if (extractBtn) {
            extractBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const content = textarea.value;
                const lines = content.split('\n');
                let count = 0;

                lines.forEach(line => {
                    const match = line.match(/^-\s*\[\s*\]\s*(.+)$/);
                    if (match) {
                        const taskTitle = match[1].trim();
                        if (taskTitle) {
                            createNewTaskFromModule({
                                title: taskTitle,
                                dueDate: getTodayISO(),
                                priority: 'medium',
                                status: 'pending'
                            });
                            count++;
                        }
                    }
                });

                if (count > 0) {
                    showToast(`⚡ Tuyệt vời! Đã trích xuất ${count} việc từ ghi chú thành công việc thực tế.`, 'success');
                } else {
                    showToast('Không tìm thấy dòng "- [ ] Việc cần làm" nào để trích xuất!', 'info');
                }
            });
        }
    }

    // =========================================================================
    // KHỞI CHẠY HỆ THỐNG
    // =========================================================================
    updateActiveFiltersBadge();
    renderHabits();
    updateHabitStats();
    renderNotes();
    renderNoteTags();

    setupBentoCardsInteractivity();
    setupAmbientSoundscape();
    setupFloatingPomodoroControls();
    setupCommandPalette();
    setupNoteMarkdownToolbar();

    // =========================================================================
    // KHỞI TẠO TRETH KANBAN VIEW & SYNC QUEUE & TRETH CORE (OFFLINE-FIRST ARCHITECTURE)
    // =========================================================================
    if (typeof LocalRepository === 'function') {
        const localRepo = new LocalRepository();
        window.__localRepo = localRepo;

        if (typeof KanbanView === 'function' && kanbanViewContainer) {
            const kanbanInstance = new KanbanView(kanbanViewContainer, localRepo);
            window.__kanbanInstance = kanbanInstance;
        }

        if (typeof CalendarView === 'function' && calendarViewContainer) {
            const calendarInstance = new CalendarView(calendarViewContainer, localRepo);
            window.__calendarInstance = calendarInstance;
        }

        // Khởi tạo CloudSyncService (Cloud Sync & Multi-device Abstraction)
        if (typeof CloudSyncService === 'function') {
            const cloudSync = new CloudSyncService({ repository: localRepo, syncQueue: localRepo.syncQueue });
            window.__cloudSync = cloudSync;
        }

        // Khởi tạo các Module chức năng
        if (typeof TasksModule === 'function') {
            window.__tasksModule = new TasksModule(localRepo);
        }
        if (typeof PomodoroModule === 'function') {
            window.__pomodoroModule = new PomodoroModule(localRepo);
        }
        if (typeof HabitsModule === 'function') {
            window.__habitsModule = new HabitsModule(localRepo);
        }
        if (typeof NotesModule === 'function') {
            window.__notesModule = new NotesModule(localRepo);
        }
        if (typeof StatsModule === 'function') {
            window.__statsModule = new StatsModule(localRepo);
        }
        if (typeof SettingsModule === 'function') {
            window.__settingsModule = new SettingsModule(localRepo);
        }

        // Cầu nối TreTH Architecture hoàn chỉnh (Scalable & Testable API)
        window.TreTH = {
            version: '4.3.0',
            repo: localRepo,
            sync: window.__cloudSync,
            tasks: window.__tasksModule,
            pomodoro: window.__pomodoroModule,
            habits: window.__habitsModule,
            notes: window.__notesModule,
            stats: window.__statsModule,
            settings: window.__settingsModule,
            kanban: window.__kanbanInstance,
            calendar: window.__calendarInstance
        };

        // Cầu nối toàn cục TreTHCore
        window.TreTHCore = {
            getTasks: () => tasks,
            getFilteredTasks: () => getFilteredTasks(),
            getCategories: () => categories,
            getCategoryById: (id) => getCategoryById(id),
            getHabits: () => habits,
            toggleHabitCheckin: (habitId, dateISO) => toggleHabitCheckinForDate(habitId, dateISO),
            updateTask: (taskId, patch) => updateTaskById(taskId, patch),
            createTask: (taskObj) => createNewTaskFromModule(taskObj),
            deleteTask: (taskId) => deleteTaskById(taskId),
            startFocusOnTask: (taskId) => {
                selectedFocusTaskId = String(taskId);
                switchModule('time');
                syncTimeModuleUI();
                startPomodoroTimer();
            },
            openEditModal: (task) => openUpdateModal(task),
            showToast: (msg, type) => showToast(msg, type)
        };

        // Đồng bộ 2 chiều thống nhất: Khi thao tác trên Kanban, Calendar hoặc Repository
        localRepo.subscribe(updatedTasks => {
            tasks = updatedTasks;
            updateDashboardStats();
            syncTimeModuleUI();

            if (currentViewMode === 'kanban' && window.__kanbanInstance && typeof window.__kanbanInstance.render === 'function') {
                window.__kanbanInstance.render(tasks);
            } else {
                renderTasks();
            }

            if (window.__calendarInstance && typeof window.__calendarInstance.render === 'function') {
                window.__calendarInstance.render(getFilteredTasks());
            }
        });
    }
});
