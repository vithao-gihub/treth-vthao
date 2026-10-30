// services/LocalRepository.js
/**
 * TreTH - Offline-First Local Repository (Single Source of Truth)
 * Quản lý dữ liệu công việc trong LocalStorage, kết nối trực tiếp với SyncQueue.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const SyncQueue = require('./SyncQueue');
    module.exports = factory(SyncQueue);
  } else {
    root.LocalRepository = factory(root.SyncQueue);
  }
}(typeof self !== 'undefined' ? self : this, function (SyncQueueClass) {
  class LocalRepository {
    constructor(options = {}) {
      this.TASKS_KEY = options.tasksKey || 'personal_workspace_tasks_v1';
      this.LEGACY_KEY = options.legacyKey || 'treth_tasks_db';
      this.SYNC_QUEUE_KEY = options.syncQueueKey || 'treth_sync_queue';
      this.CATEGORIES_KEY = options.categoriesKey || 'personal_workspace_categories_v1';

      const QueueConstructor = SyncQueueClass || (typeof window !== 'undefined' ? window.SyncQueue : null);
      this.syncQueue = QueueConstructor ? new QueueConstructor(this.SYNC_QUEUE_KEY) : null;

      this.listeners = new Set();
      this._init();
    }

    _init() {
      try {
        let rawTasks = localStorage.getItem(this.TASKS_KEY);
        // Kiểm tra xem có dữ liệu từ treth_tasks_db chưa
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

    // Lấy danh mục để hydrat hóa category object
    _getCategories() {
      try {
        const raw = localStorage.getItem(this.CATEGORIES_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
      return [
        { id: 'cat-work', name: 'Công việc', icon: '💼', emoji: '💼', color: '#2563EB' },
        { id: 'cat-personal', name: 'Cá nhân', icon: '👤', emoji: '👤', color: '#16A34A' },
        { id: 'cat-study', name: 'Học tập', icon: '📚', emoji: '📚', color: '#9333EA' },
        { id: 'cat-finance', name: 'Tài chính', icon: '💰', emoji: '💰', color: '#D97706' }
      ];
    }

    // Chuẩn hóa một task entity để tương thích 100% giữa Kanban, Eisenhower, Pomodoro và Dashboard
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

      // Chuẩn hóa status 2 chiều (TODO/IN_PROGRESS/DONE <-> pending/in-progress/completed)
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

      // Chuẩn hóa quadrant (q1/q2/q3/q4 <-> Q1/Q2/Q3/Q4)
      let quadrant = String(raw.quadrant || 'q2').toLowerCase();
      if (!['q1', 'q2', 'q3', 'q4'].includes(quadrant)) {
        quadrant = 'q2';
      }

      // Chuẩn hóa actualTime (lưu theo phút, nếu > 180 thì chuyển từ giây sang phút)
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
        this._notify();
      } catch (err) {
        console.error('[LocalRepository] Save error:', err);
      }
    }

    subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      this.listeners.add(listener);
      listener(this.getAllTasks());
      return () => this.listeners.delete(listener);
    }

    _notify() {
      const activeTasks = this.getAllTasks();
      this.listeners.forEach(fn => {
        try {
          fn(activeTasks);
        } catch (err) {
          console.error('[LocalRepository] Listener error:', err);
        }
      });
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

    getCategories() {
      return this._getCategories();
    }

    getHabits() {
      try {
        const raw = localStorage.getItem('personal_workspace_habits_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {
        console.warn('[LocalRepository] getHabits error:', e);
      }
      return [];
    }

    getTaskById(taskId) {
      const rawList = this._loadRawTasks();
      const raw = rawList.find(t => String(t.id) === String(taskId));
      return raw ? this._normalizeTask(raw) : null;
    }

    _enqueueSyncOperation(actionType, entityId, payload, baseVersion) {
      if (this.syncQueue) {
        return this.syncQueue.enqueue(actionType, entityId, payload, baseVersion);
      }
      // Fallback nếu không có instance syncQueue
      try {
        const queue = JSON.parse(localStorage.getItem(this.SYNC_QUEUE_KEY) || '[]');
        const op = {
          opId: `op_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          entity: 'TASK',
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

    // THÊM MỚI (CREATE)
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
      this._enqueueSyncOperation('CREATE', newTask.id, newTask, 0);
      return newTask;
    }

    // CẬP NHẬT (UPDATE)
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
      this._enqueueSyncOperation('UPDATE', taskId, partialChanges, current.version);
      return updated;
    }

    // XÓA MỀM (SOFT DELETE)
    softDeleteTask(taskId) {
      const res = this.updateTask(taskId, { isDeleted: true });
      if (res) {
        this._enqueueSyncOperation('DELETE', taskId, { isDeleted: true }, res.baseVersion);
      }
      return res;
    }

    // XÓA CỨNG (DELETE)
    deleteTask(taskId) {
      return this.softDeleteTask(taskId);
    }
  }

  return LocalRepository;
}));

