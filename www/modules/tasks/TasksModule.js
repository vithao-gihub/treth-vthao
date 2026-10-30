// modules/tasks/TasksModule.js
/**
 * TreTH - Tasks Module
 * Quản lý logic công việc, bộ phân tích ngôn ngữ tự nhiên tiếng Việt (Smart NLP Quick-Add),
 * Smart Filters (Hôm nay, 7 ngày tới, Quá hạn & Gấp, Đã hoàn thành) và Ma trận Eisenhower.
 * Kết nối dữ liệu 100% qua LocalRepository (Single Source of Truth).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TasksModule = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  class TasksModule {
    constructor(repository, options = {}) {
      this.repo = repository || (typeof window !== 'undefined' ? window.__localRepo : null);
      this.options = options;

      this.currentSmartFilter = 'all'; // 'all' | 'today' | 'next7days' | 'urgent' | 'completed'
      this.searchQuery = '';
      this.selectedCategory = 'all';
      this.selectedQuadrant = 'all';
      this.selectedPriority = 'all';
      this.sortBy = 'dueDate';

      this.listeners = new Set();

      if (this.repo) {
        this.repo.subscribe('tasks', () => this._notify());
      }
    }

    getTodayISO() {
      return new Date().toISOString().split('T')[0];
    }

    getAllTasks() {
      return this.repo ? this.repo.getAllTasks() : [];
    }

    /**
     * Lọc danh sách công việc chính xác theo Smart Filter và các tiêu chí tìm kiếm
     */
    getFilteredTasks() {
      const allTasks = this.getAllTasks();
      const today = this.getTodayISO();

      let filtered = allTasks.filter(task => {
        // Tách biệt việc hoàn thành và việc chưa hoàn thành
        if (this.currentSmartFilter === 'completed') {
          return task.status === 'completed';
        }
        if (task.status === 'completed') {
          return false;
        }

        // Bộ lọc danh sách thông minh
        if (this.currentSmartFilter === 'today') {
          return task.dueDate === today;
        }
        if (this.currentSmartFilter === 'next7days') {
          if (!task.dueDate) return false;
          const taskDate = new Date(task.dueDate);
          const nowDate = new Date(today);
          const diffDays = Math.ceil((taskDate - nowDate) / (1000 * 60 * 60 * 24));
          return diffDays >= 0 && diffDays <= 7;
        }
        if (this.currentSmartFilter === 'urgent') {
          const isOverdue = task.dueDate && task.dueDate < today;
          const isQ1 = task.quadrant === 'q1';
          const isHighPriority = task.priority === 'urgent' || task.priority === 'high';
          return isOverdue || isQ1 || isHighPriority;
        }
        return true;
      });

      // Lọc theo loại công việc (Category)
      if (this.selectedCategory !== 'all') {
        filtered = filtered.filter(t => String(t.categoryId) === String(this.selectedCategory));
      }

      // Lọc theo góc ma trận (Quadrant)
      if (this.selectedQuadrant !== 'all') {
        filtered = filtered.filter(t => t.quadrant === this.selectedQuadrant);
      }

      // Lọc theo độ ưu tiên (Priority)
      if (this.selectedPriority !== 'all') {
        filtered = filtered.filter(t => t.priority === this.selectedPriority);
      }

      // Lọc theo từ khóa tìm kiếm
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase().trim();
        filtered = filtered.filter(t => {
          const inTitle = (t.title || '').toLowerCase().includes(q);
          const inDesc = (t.description || '').toLowerCase().includes(q);
          const inCat = (t.category && t.category.name || '').toLowerCase().includes(q);
          return inTitle || inDesc || inCat;
        });
      }

      // Sắp xếp
      return filtered.sort((a, b) => {
        if (this.sortBy === 'priority') {
          const pOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          return (pOrder[a.priority] || 2) - (pOrder[b.priority] || 2);
        }
        if (this.sortBy === 'title') {
          return (a.title || '').localeCompare(b.title || '');
        }
        // Mặc định sắp theo hạn chót (dueDate)
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
    }

    getSmartListCounts() {
      const allTasks = this.getAllTasks();
      const today = this.getTodayISO();

      let activeAll = 0;
      let activeToday = 0;
      let activeNext7 = 0;
      let activeUrgent = 0;
      let completedCount = 0;

      allTasks.forEach(task => {
        if (task.status === 'completed') {
          completedCount++;
        } else {
          activeAll++;
          if (task.dueDate === today) activeToday++;
          if (task.dueDate) {
            const diffDays = Math.ceil((new Date(task.dueDate) - new Date(today)) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays <= 7) activeNext7++;
          }
          if ((task.dueDate && task.dueDate < today) || task.quadrant === 'q1' || task.priority === 'urgent' || task.priority === 'high') {
            activeUrgent++;
          }
        }
      });

      return {
        all: activeAll,
        today: activeToday,
        next7days: activeNext7,
        urgent: activeUrgent,
        completed: completedCount
      };
    }

    setSmartFilter(filterName) {
      this.currentSmartFilter = filterName || 'all';
      this._notify();
    }

    setSearch(query) {
      this.searchQuery = query || '';
      this._notify();
    }

    setCategoryFilter(catId) {
      this.selectedCategory = catId || 'all';
      this._notify();
    }

    setQuadrantFilter(quad) {
      this.selectedQuadrant = quad || 'all';
      this._notify();
    }

    setPriorityFilter(prio) {
      this.selectedPriority = prio || 'all';
      this._notify();
    }

    createTask(data) {
      if (!this.repo) return null;
      const created = this.repo.createTask(data);
      this._notify();
      return created;
    }

    updateTask(id, changes) {
      if (!this.repo) return null;
      const updated = this.repo.updateTask(id, changes);
      this._notify();
      return updated;
    }

    deleteTask(id) {
      if (!this.repo) return null;
      const deleted = this.repo.deleteTask(id);
      this._notify();
      return deleted;
    }

    toggleComplete(taskId) {
      const task = this.repo ? this.repo.getTaskById(taskId) : null;
      if (!task) return null;
      const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
      return this.updateTask(taskId, { status: nextStatus });
    }

    /**
     * BỘ PHÂN TÍCH NGÔN NGỮ TỰ NHIÊN TIẾNG VIỆT (SMART NLP QUICK-ADD)
     */
    parseSmartInput(rawText) {
      if (!rawText || typeof rawText !== 'string') return null;

      let cleanTitle = rawText.trim();
      let detectedDueDate = '';
      let detectedPriority = 'medium';
      let detectedQuadrant = 'q2';
      let detectedCategoryId = 'cat-work';
      let detectedMinutes = 60;

      const today = new Date();
      const formatISO = (d) => d.toISOString().split('T')[0];

      // Nhận diện ngày bằng tiếng Việt
      if (/hôm nay/i.test(cleanTitle)) {
        detectedDueDate = formatISO(today);
        cleanTitle = cleanTitle.replace(/hôm nay/gi, '').trim();
      } else if (/ngày mai/i.test(cleanTitle)) {
        const tmr = new Date();
        tmr.setDate(tmr.getDate() + 1);
        detectedDueDate = formatISO(tmr);
        cleanTitle = cleanTitle.replace(/ngày mai/gi, '').trim();
      } else if (/ngày kia/i.test(cleanTitle)) {
        const aft = new Date();
        aft.setDate(aft.getDate() + 2);
        detectedDueDate = formatISO(aft);
        cleanTitle = cleanTitle.replace(/ngày kia/gi, '').trim();
      }

      // Nhận diện độ ưu tiên qua ký hiệu !
      if (/!(gap|khan|urgent|cao)/i.test(cleanTitle)) {
        detectedPriority = 'high';
        detectedQuadrant = 'q1';
        cleanTitle = cleanTitle.replace(/!(gap|khan|urgent|cao)/gi, '').trim();
      } else if (/!(thap|low)/i.test(cleanTitle)) {
        detectedPriority = 'low';
        detectedQuadrant = 'q4';
        cleanTitle = cleanTitle.replace(/!(thap|low)/gi, '').trim();
      }

      // Nhận diện góc ma trận qua #q1, #q2, #q3, #q4
      const quadMatch = cleanTitle.match(/#(q[1-4])/i);
      if (quadMatch) {
        detectedQuadrant = quadMatch[1].toLowerCase();
        cleanTitle = cleanTitle.replace(quadMatch[0], '').trim();
      }

      // Nhận diện thời lượng Pomodoro qua ~
      const pomoMatch = cleanTitle.match(/~(\d+)(p|m|h)?/i);
      if (pomoMatch) {
        const val = parseInt(pomoMatch[1], 10);
        const unit = (pomoMatch[2] || 'p').toLowerCase();
        detectedMinutes = unit === 'h' ? val * 60 : val;
        cleanTitle = cleanTitle.replace(pomoMatch[0], '').trim();
      }

      return {
        title: cleanTitle || 'Công việc mới',
        dueDate: detectedDueDate,
        priority: detectedPriority,
        quadrant: detectedQuadrant,
        categoryId: detectedCategoryId,
        estimatedMinutes: detectedMinutes
      };
    }

    subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      this.listeners.add(listener);
      listener(this.getState());
      return () => this.listeners.delete(listener);
    }

    _notify() {
      const state = this.getState();
      this.listeners.forEach(fn => {
        try { fn(state); } catch (e) { console.error('[TasksModule] Listener error:', e); }
      });
    }

    getState() {
      return {
        smartFilter: this.currentSmartFilter,
        search: this.searchQuery,
        filteredTasks: this.getFilteredTasks(),
        counts: this.getSmartListCounts(),
        totalAllCount: this.getAllTasks().length
      };
    }
  }

  return TasksModule;
}));
