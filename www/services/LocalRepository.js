// services/LocalRepository.js
/**
 * TreTH - Offline-First Local Repository (Single Source of Truth)
 * Quản lý tập trung toàn bộ dữ liệu ứng dụng:
 * 1. Tasks & Categories
 * 2. Habits (Thói quen & Streak Counter)
 * 3. Notes (Ghi chú & Markdown Knowledge Base)
 * 4. Pomodoro Stats & Settings
 * 5. App Preferences (View Mode, Theme)
 * 
 * Kết nối trực tiếp với SyncQueue và sẵn sàng cho CloudSyncService.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const SyncQueue = require('./SyncQueue');
    module.exports = factory(SyncQueue);
  } else {
    root.LocalRepository = factory(root.SyncQueue);
  }
}(typeof self !== 'undefined' ? self : this, function (SyncQueueClass) {

  // Default Categories
  const DEFAULT_CATEGORIES = [
    { id: 'cat-work', name: 'Công việc', icon: '💼', emoji: '💼', color: '#2563EB' },
    { id: 'cat-personal', name: 'Cá nhân', icon: '👤', emoji: '👤', color: '#16A34A' },
    { id: 'cat-study', name: 'Học tập', icon: '📚', emoji: '📚', color: '#9333EA' },
    { id: 'cat-finance', name: 'Tài chính', icon: '💰', emoji: '💰', color: '#D97706' }
  ];

  // Default Habits
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
      version: 1,
      createdAt: new Date().toISOString().split('T')[0]
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
      version: 1,
      createdAt: new Date().toISOString().split('T')[0]
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
      version: 1,
      createdAt: new Date().toISOString().split('T')[0]
    }
  ];

  // Default Notes
  const DEFAULT_NOTES = [
    {
      id: 'note_def_01',
      title: '🎋 Hướng dẫn sử dụng TreTH',
      tags: ['Hướng dẫn', 'Hệ thống'],
      color: '#10B981',
      isPinned: true,
      content: '# Chào mừng đến với TreTH! 🎋\n\nỨng dụng kết hợp Trello & TickTick theo kiến trúc Offline-First:\n- [x] **Quản lý công việc**: Danh sách thông minh, Kanban 3 cột, Lịch công việc & Ma trận Eisenhower\n- [x] **Thời gian**: Pomodoro Timer, Web Audio Sound chuông báo & Web Notification\n- [x] **Thói quen**: Streak Counter điểm danh hằng ngày và dải lịch sử 7 ngày\n- [x] **Ghi chú**: Soạn thảo Markdown với trình xem trước thời gian thực\n\n> Hãy tập trung vào những mục tiêu quan trọng nhất hôm nay!',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      version: 1
    },
    {
      id: 'note_def_02',
      title: '🚀 Kế hoạch phát triển bản thân tuần này',
      tags: ['Kế hoạch', 'Phát triển'],
      color: '#10B981',
      isPinned: false,
      content: '### Mục tiêu trọng tâm:\n- Duy trì chuỗi chạy bộ 30 phút mỗi ngày\n- Đọc 2 chương sách *Deep Work*\n- Thử nghiệm các tính năng mới của ứng dụng',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      version: 1
    }
  ];

  class LocalRepository {
    constructor(options = {}) {
      this.TASKS_KEY = options.tasksKey || 'personal_workspace_tasks_v1';
      this.LEGACY_KEY = options.legacyKey || 'treth_tasks_db';
      this.SYNC_QUEUE_KEY = options.syncQueueKey || 'treth_sync_queue';
      this.CATEGORIES_KEY = options.categoriesKey || 'personal_workspace_categories_v1';
      this.HABITS_KEY = options.habitsKey || 'personal_workspace_habits_v1';
      this.NOTES_KEY = options.notesKey || 'personal_workspace_notes_v1';
      this.POMO_STATS_KEY = options.pomoStatsKey || 'personal_workspace_pomo_stats_v1';
      this.POMO_SETTINGS_KEY = options.pomoSettingsKey || 'personal_workspace_pomo_settings_v1';
      this.VIEW_MODE_KEY = options.viewModeKey || 'personal_workspace_view_mode_v1';
      this.THEME_KEY = options.themeKey || 'personal_workspace_theme_v1';

      const QueueConstructor = SyncQueueClass || (typeof window !== 'undefined' ? window.SyncQueue : null);
      this.syncQueue = QueueConstructor ? new QueueConstructor(this.SYNC_QUEUE_KEY) : null;

      // Event Listeners theo Domain
      this.listeners = new Map();
      this.listeners.set('tasks', new Set());
      this.listeners.set('habits', new Set());
      this.listeners.set('notes', new Set());
      this.listeners.set('pomo', new Set());
      this.listeners.set('all', new Set());

      this._init();
    }

    _init() {
      try {
        let rawTasks = localStorage.getItem(this.TASKS_KEY);
        if (!rawTasks) {
          const legacy = localStorage.getItem(this.LEGACY_KEY);
          if (legacy) {
            rawTasks = legacy;
            localStorage.setItem(this.TASKS_KEY, legacy);
          }
        }
        if (!localStorage.getItem(this.SYNC_QUEUE_KEY)) {
          localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify([]));
        }
      } catch (err) {
        console.warn('[LocalRepository] Init warning:', err);
      }
    }

    // =========================================================================
    // SUBSCRIPTIONS & EVENT BUS
    // =========================================================================
    subscribe(domainOrListener, maybeListener) {
      let domain = 'tasks';
      let fn = null;

      if (typeof domainOrListener === 'function') {
        fn = domainOrListener;
        domain = 'tasks';
      } else if (typeof domainOrListener === 'string' && typeof maybeListener === 'function') {
        domain = domainOrListener.toLowerCase();
        fn = maybeListener;
      }

      if (!fn) return () => {};

      if (!this.listeners.has(domain)) {
        this.listeners.set(domain, new Set());
      }
      this.listeners.get(domain).add(fn);

      // Bắn dữ liệu khởi tạo
      if (domain === 'tasks') {
        fn(this.getAllTasks());
      } else if (domain === 'habits') {
        fn(this.getHabits());
      } else if (domain === 'notes') {
        fn(this.getNotes());
      }

      return () => {
        const set = this.listeners.get(domain);
        if (set) set.delete(fn);
      };
    }

    _notify(domain = 'tasks') {
      const set = this.listeners.get(domain);
      const allSet = this.listeners.get('all');

      let data = null;
      if (domain === 'tasks') data = this.getAllTasks();
      else if (domain === 'habits') data = this.getHabits();
      else if (domain === 'notes') data = this.getNotes();
      else if (domain === 'pomo') data = this.getPomoStats();

      if (set) {
        set.forEach(fn => {
          try { fn(data); } catch (e) { console.error(`[LocalRepository] ${domain} listener error:`, e); }
        });
      }
      if (allSet) {
        allSet.forEach(fn => {
          try { fn({ domain, data }); } catch (e) { console.error('[LocalRepository] all listener error:', e); }
        });
      }
    }

    _enqueueSyncOperation(actionType, entityId, payload, baseVersion, entityType = 'TASK') {
      if (this.syncQueue) {
        return this.syncQueue.enqueue(actionType, entityId, payload, baseVersion, entityType);
      }
      try {
        const queue = JSON.parse(localStorage.getItem(this.SYNC_QUEUE_KEY) || '[]');
        const op = {
          opId: `op_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          entity: entityType,
          entityId: String(entityId),
          action: actionType,
          payload: payload || {},
          baseVersion: Number(baseVersion) || 0,
          timestamp: Date.now(),
          status: 'PENDING',
          retryCount: 0
        };
        queue.push(op);
        localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(queue));
        return op;
      } catch (e) {
        console.error('[LocalRepository] Fallback enqueue error:', e);
      }
    }

    // =========================================================================
    // 1. CATEGORIES DOMAIN
    // =========================================================================
    _getCategories() {
      try {
        const raw = localStorage.getItem(this.CATEGORIES_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
      return DEFAULT_CATEGORIES;
    }

    getCategories() {
      return this._getCategories();
    }

    saveCategory(catData) {
      const categories = this._getCategories();
      const existingIdx = categories.findIndex(c => String(c.id) === String(catData.id));
      if (existingIdx !== -1) {
        categories[existingIdx] = { ...categories[existingIdx], ...catData };
      } else {
        categories.push({
          id: catData.id || `cat-${Date.now()}`,
          name: catData.name || 'Loại mới',
          icon: catData.icon || catData.emoji || '📋',
          emoji: catData.emoji || catData.icon || '📋',
          color: catData.color || '#4F46E5'
        });
      }
      try {
        localStorage.setItem(this.CATEGORIES_KEY, JSON.stringify(categories));
      } catch (e) {
        console.error('[LocalRepository] saveCategory error:', e);
      }
      return categories;
    }

    deleteCategory(catId) {
      let categories = this._getCategories();
      categories = categories.filter(c => String(c.id) !== String(catId));
      try {
        localStorage.setItem(this.CATEGORIES_KEY, JSON.stringify(categories));
      } catch (e) {
        console.error('[LocalRepository] deleteCategory error:', e);
      }
      return categories;
    }

    // =========================================================================
    // 2. TASKS DOMAIN
    // =========================================================================
    _normalizeTask(raw) {
      if (!raw || typeof raw !== 'object') return null;

      const categories = this._getCategories();
      let catId = raw.categoryId || (raw.category && raw.category.id) || 'cat-work';
      let foundCat = categories.find(c => String(c.id) === String(catId)) || categories[0];

      const categoryObj = {
        id: foundCat.id,
        name: foundCat.name,
        icon: foundCat.icon || foundCat.emoji || '📋',
        emoji: foundCat.emoji || foundCat.icon || '📋',
        color: foundCat.color || '#4F46E5'
      };

      let status = raw.status || 'pending';
      let kanbanStatus = 'TODO';
      if (status === 'completed' || status === 'DONE') {
        status = 'completed';
        kanbanStatus = 'DONE';
      } else if (status === 'in-progress' || status === 'IN_PROGRESS') {
        status = 'in-progress';
        kanbanStatus = 'IN_PROGRESS';
      } else {
        status = 'pending';
        kanbanStatus = 'TODO';
      }

      let quadrant = String(raw.quadrant || 'q2').toLowerCase();
      if (!['q1', 'q2', 'q3', 'q4'].includes(quadrant)) {
        quadrant = 'q2';
      }

      let actualTime = Number(raw.actualTime) || 0;
      if (actualTime > 180) {
        actualTime = Math.round(actualTime / 60);
      }

      const resolvedDueDate = raw.dueDate || '';
      const resolvedStartDate = raw.startDate || resolvedDueDate || '';
      const rawStartTime = raw.startTime || null;
      let rawEndTime = raw.endTime || null;
      if (rawStartTime && !rawEndTime) {
        const parts = rawStartTime.split(':').map(Number);
        const endH = Math.min(23, (parts[0] || 0) + 1);
        const endM = parts[1] || 0;
        rawEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
      }

      return {
        id: String(raw.id || `task_${Date.now()}`),
        title: String(raw.title || 'Công việc mới'),
        status: status,
        kanbanStatus: kanbanStatus,
        quadrant: quadrant,
        categoryId: categoryObj.id,
        category: categoryObj,
        priority: raw.priority || 'medium',
        dueDate: resolvedDueDate,
        startDate: resolvedStartDate,
        startTime: rawStartTime,
        endTime: rawEndTime,
        estimatedMinutes: Number(raw.estimatedMinutes) || 60,
        isAllDay: rawStartTime ? false : (raw.isAllDay !== false),
        description: String(raw.description || ''),
        location: String(raw.location || ''),
        reminderMinutes: raw.reminderMinutes !== undefined ? Number(raw.reminderMinutes) : 15,
        pomodoroSessions: Array.isArray(raw.pomodoroSessions) ? raw.pomodoroSessions : [],
        scope: raw.scope || 'medium',
        recurring: raw.recurring || 'none',
        lastResetDate: raw.lastResetDate || '',
        actualTime: actualTime,
        subtasks: Array.isArray(raw.subtasks) ? raw.subtasks : [],
        version: Number(raw.version) || 1,
        baseVersion: Number(raw.baseVersion) || 0,
        updatedAt: Number(raw.updatedAt) || Date.now(),
        isDeleted: Boolean(raw.isDeleted),
        syncStatus: raw.syncStatus || 'PENDING'
      };
    }

    _loadRawTasks() {
      try {
        const raw = localStorage.getItem(this.TASKS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        console.error('[LocalRepository] Parse error:', err);
        return [];
      }
    }

    _saveRawTasks(tasks) {
      try {
        const str = JSON.stringify(tasks);
        localStorage.setItem(this.TASKS_KEY, str);
        this._notify('tasks');
      } catch (err) {
        console.error('[LocalRepository] Save error:', err);
      }
    }

    getAllTasks() {
      const rawList = this._loadRawTasks();
      return rawList
        .map(t => this._normalizeTask(t))
        .filter(t => t && !t.isDeleted);
    }

    getTasks() {
      return this.getAllTasks();
    }

    getTaskById(taskId) {
      const rawList = this._loadRawTasks();
      const raw = rawList.find(t => String(t.id) === String(taskId));
      return raw ? this._normalizeTask(raw) : null;
    }

    createTask(taskData) {
      const tasks = this._loadRawTasks();
      const newTask = this._normalizeTask({
        ...taskData,
        id: taskData.id || `task_${Date.now()}`,
        version: 1,
        baseVersion: 0,
        updatedAt: Date.now(),
        isDeleted: false,
        syncStatus: 'PENDING'
      });

      tasks.push(newTask);
      this._saveRawTasks(tasks);
      this._enqueueSyncOperation('CREATE', newTask.id, newTask, 0, 'TASK');
      return newTask;
    }

    updateTask(taskId, partialChanges) {
      const tasks = this._loadRawTasks();
      const idx = tasks.findIndex(t => String(t.id) === String(taskId));
      if (idx === -1) return null;

      const current = this._normalizeTask(tasks[idx]);
      const updated = this._normalizeTask({
        ...current,
        ...partialChanges,
        version: (current.version || 1) + 1,
        baseVersion: current.version || 1,
        updatedAt: Date.now(),
        syncStatus: 'PENDING'
      });

      tasks[idx] = updated;
      this._saveRawTasks(tasks);
      this._enqueueSyncOperation('UPDATE', taskId, partialChanges, current.version, 'TASK');
      return updated;
    }

    softDeleteTask(taskId) {
      const res = this.updateTask(taskId, { isDeleted: true });
      if (res) {
        this._enqueueSyncOperation('DELETE', taskId, { isDeleted: true }, res.baseVersion, 'TASK');
      }
      return res;
    }

    deleteTask(taskId) {
      return this.softDeleteTask(taskId);
    }

    // =========================================================================
    // 3. HABITS DOMAIN (XÂY DỰNG THÓI QUEN & STREAK COUNTER)
    // =========================================================================
    _loadRawHabits() {
      try {
        const raw = localStorage.getItem(this.HABITS_KEY);
        if (!raw) return DEFAULT_HABITS;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_HABITS;
      } catch (e) {
        console.warn('[LocalRepository] getHabits error:', e);
        return DEFAULT_HABITS;
      }
    }

    _saveRawHabits(habits) {
      try {
        localStorage.setItem(this.HABITS_KEY, JSON.stringify(habits));
        this._notify('habits');
      } catch (e) {
        console.error('[LocalRepository] saveHabits error:', e);
      }
    }

    getHabits() {
      const raw = this._loadRawHabits();
      return raw.filter(h => !h.isDeleted);
    }

    getHabitById(id) {
      return this.getHabits().find(h => String(h.id) === String(id)) || null;
    }

    createHabit(habitData) {
      const habits = this._loadRawHabits();
      const newHabit = {
        id: habitData.id || `habit_${Date.now()}`,
        title: String(habitData.title || habitData.name || 'Thói quen mới'),
        category: habitData.category || 'Sức khỏe',
        frequency: habitData.frequency || 'daily',
        emoji: habitData.emoji || '🎯',
        note: habitData.note || '',
        history: habitData.history || {},
        streak: Number(habitData.streak) || 0,
        bestStreak: Number(habitData.bestStreak) || 0,
        version: 1,
        baseVersion: 0,
        updatedAt: Date.now(),
        createdAt: habitData.createdAt || new Date().toISOString().split('T')[0],
        isDeleted: false
      };
      habits.push(newHabit);
      this._saveRawHabits(habits);
      this._enqueueSyncOperation('CREATE', newHabit.id, newHabit, 0, 'HABIT');
      return newHabit;
    }

    updateHabit(id, changes) {
      const habits = this._loadRawHabits();
      const idx = habits.findIndex(h => String(h.id) === String(id));
      if (idx === -1) return null;

      const current = habits[idx];
      const updated = {
        ...current,
        ...changes,
        version: (current.version || 1) + 1,
        baseVersion: current.version || 1,
        updatedAt: Date.now()
      };
      habits[idx] = updated;
      this._saveRawHabits(habits);
      this._enqueueSyncOperation('UPDATE', id, changes, current.version, 'HABIT');
      return updated;
    }

    deleteHabit(id) {
      const res = this.updateHabit(id, { isDeleted: true });
      if (res) {
        this._enqueueSyncOperation('DELETE', id, { isDeleted: true }, res.baseVersion, 'HABIT');
      }
      return res;
    }

    toggleHabitCheckin(id, dateStr) {
      const habit = this.getHabitById(id);
      if (!habit) return null;

      const dateKey = dateStr || new Date().toISOString().split('T')[0];
      const history = { ...(habit.history || {}) };
      const wasDone = Boolean(history[dateKey]);

      if (wasDone) {
        delete history[dateKey];
      } else {
        history[dateKey] = true;
      }

      // Tính lại streak đơn giản
      let streak = 0;
      let checkDate = new Date();
      while (true) {
        const dKey = checkDate.toISOString().split('T')[0];
        if (history[dKey]) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      const bestStreak = Math.max(habit.bestStreak || 0, streak);
      return this.updateHabit(id, { history, streak, bestStreak });
    }

    // =========================================================================
    // 4. NOTES DOMAIN (GHI CHÚ & MARKDOWN)
    // =========================================================================
    _loadRawNotes() {
      try {
        const raw = localStorage.getItem(this.NOTES_KEY);
        if (!raw) return DEFAULT_NOTES;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_NOTES;
      } catch (e) {
        console.warn('[LocalRepository] getNotes error:', e);
        return DEFAULT_NOTES;
      }
    }

    _saveRawNotes(notes) {
      try {
        localStorage.setItem(this.NOTES_KEY, JSON.stringify(notes));
        this._notify('notes');
      } catch (e) {
        console.error('[LocalRepository] saveNotes error:', e);
      }
    }

    getNotes() {
      const raw = this._loadRawNotes();
      return raw.filter(n => !n.isDeleted);
    }

    getNoteById(id) {
      return this.getNotes().find(n => String(n.id) === String(id)) || null;
    }

    createNote(noteData) {
      const notes = this._loadRawNotes();
      const newNote = {
        id: noteData.id || `note_${Date.now()}`,
        title: String(noteData.title || 'Ghi chú mới'),
        tags: Array.isArray(noteData.tags) ? noteData.tags : [],
        color: noteData.color || '#10B981',
        isPinned: Boolean(noteData.isPinned),
        content: String(noteData.content || ''),
        version: 1,
        baseVersion: 0,
        createdAt: noteData.createdAt || new Date().toISOString(),
        updatedAt: Date.now(),
        isDeleted: false
      };
      notes.push(newNote);
      this._saveRawNotes(notes);
      this._enqueueSyncOperation('CREATE', newNote.id, newNote, 0, 'NOTE');
      return newNote;
    }

    updateNote(id, changes) {
      const notes = this._loadRawNotes();
      const idx = notes.findIndex(n => String(n.id) === String(id));
      if (idx === -1) return null;

      const current = notes[idx];
      const updated = {
        ...current,
        ...changes,
        version: (current.version || 1) + 1,
        baseVersion: current.version || 1,
        updatedAt: Date.now()
      };
      notes[idx] = updated;
      this._saveRawNotes(notes);
      this._enqueueSyncOperation('UPDATE', id, changes, current.version, 'NOTE');
      return updated;
    }

    deleteNote(id) {
      const res = this.updateNote(id, { isDeleted: true });
      if (res) {
        this._enqueueSyncOperation('DELETE', id, { isDeleted: true }, res.baseVersion, 'NOTE');
      }
      return res;
    }

    // =========================================================================
    // 5. POMODORO DOMAIN
    // =========================================================================
    getPomoStats() {
      try {
        const raw = localStorage.getItem(this.POMO_STATS_KEY);
        return raw ? JSON.parse(raw) : { focusMinutes: 0, completedCycles: 0, dailyRecords: {} };
      } catch (e) {
        return { focusMinutes: 0, completedCycles: 0, dailyRecords: {} };
      }
    }

    savePomoStats(stats) {
      try {
        localStorage.setItem(this.POMO_STATS_KEY, JSON.stringify(stats));
        this._notify('pomo');
      } catch (e) {
        console.error('[LocalRepository] savePomoStats error:', e);
      }
    }

    incrementPomoCycle(focusMinutes = 25, taskId = null) {
      const stats = this.getPomoStats();
      const today = new Date().toISOString().split('T')[0];

      stats.focusMinutes = (stats.focusMinutes || 0) + focusMinutes;
      stats.completedCycles = (stats.completedCycles || 0) + 1;

      if (!stats.dailyRecords) stats.dailyRecords = {};
      if (!stats.dailyRecords[today]) stats.dailyRecords[today] = { minutes: 0, cycles: 0 };

      stats.dailyRecords[today].minutes += focusMinutes;
      stats.dailyRecords[today].cycles += 1;

      this.savePomoStats(stats);

      // Nếu có taskId, cộng thời gian tập trung vào task
      if (taskId) {
        const task = this.getTaskById(taskId);
        if (task) {
          const actualTime = (task.actualTime || 0) + focusMinutes;
          this.updateTask(taskId, { actualTime });
        }
      }
      return stats;
    }

    getPomoSettings() {
      try {
        const raw = localStorage.getItem(this.POMO_SETTINGS_KEY);
        return raw ? JSON.parse(raw) : { workDuration: 25, shortBreakDuration: 5, longBreakDuration: 15, autoStartBreaks: false, soundEnabled: true };
      } catch (e) {
        return { workDuration: 25, shortBreakDuration: 5, longBreakDuration: 15, autoStartBreaks: false, soundEnabled: true };
      }
    }

    savePomoSettings(settings) {
      try {
        localStorage.setItem(this.POMO_SETTINGS_KEY, JSON.stringify(settings));
      } catch (e) {}
    }

    // =========================================================================
    // 6. PREFERENCES DOMAIN (VIEW MODE & THEME)
    // =========================================================================
    getViewMode() {
      return localStorage.getItem(this.VIEW_MODE_KEY) || 'list';
    }

    setViewMode(mode) {
      try {
        localStorage.setItem(this.VIEW_MODE_KEY, mode);
      } catch (e) {}
    }

    getTheme() {
      return localStorage.getItem(this.THEME_KEY) || 'dark';
    }

    setTheme(theme) {
      try {
        localStorage.setItem(this.THEME_KEY, theme);
      } catch (e) {}
    }

    // =========================================================================
    // 7. EXPORT / IMPORT ALL
    // =========================================================================
    exportAllData() {
      return {
        version: '3.1.0',
        exportedAt: new Date().toISOString(),
        tasks: this.getAllTasks(),
        categories: this.getCategories(),
        habits: this.getHabits(),
        notes: this.getNotes(),
        pomoStats: this.getPomoStats(),
        pomoSettings: this.getPomoSettings(),
        theme: this.getTheme(),
        viewMode: this.getViewMode()
      };
    }

    importAllData(data) {
      if (!data || typeof data !== 'object') return false;
      try {
        if (Array.isArray(data.tasks)) this._saveRawTasks(data.tasks);
        if (Array.isArray(data.categories)) localStorage.setItem(this.CATEGORIES_KEY, JSON.stringify(data.categories));
        if (Array.isArray(data.habits)) this._saveRawHabits(data.habits);
        if (Array.isArray(data.notes)) this._saveRawNotes(data.notes);
        if (data.pomoStats) this.savePomoStats(data.pomoStats);
        if (data.pomoSettings) this.savePomoSettings(data.pomoSettings);
        if (data.theme) this.setTheme(data.theme);
        if (data.viewMode) this.setViewMode(data.viewMode);
        this._notify('tasks');
        this._notify('habits');
        this._notify('notes');
        return true;
      } catch (e) {
        console.error('[LocalRepository] importAllData error:', e);
        return false;
      }
    }
  }

  return LocalRepository;
}));
