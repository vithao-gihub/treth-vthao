// modules/habits/HabitsModule.js
/**
 * TreTH - Habits Module
 * Quản lý logic theo dõi thói quen, điểm danh hàng ngày (check-in) và chuỗi streak.
 * Kết nối dữ liệu 100% qua LocalRepository.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.HabitsModule = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  class HabitsModule {
    constructor(repository, options = {}) {
      this.repo = repository || (typeof window !== 'undefined' ? window.__localRepo : null);
      this.options = options;
      this.currentFilter = 'all';
      this.searchQuery = '';
      this.listeners = new Set();

      if (this.repo) {
        this.repo.subscribe('habits', () => this._notify());
      }
    }

    getTodayKey() {
      return new Date().toISOString().split('T')[0];
    }

    getAllHabits() {
      return this.repo ? this.repo.getHabits() : [];
    }

    getFilteredHabits() {
      const today = this.getTodayKey();
      let list = this.getAllHabits();

      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase().trim();
        list = list.filter(h => (h.title || '').toLowerCase().includes(q) || (h.category || '').toLowerCase().includes(q));
      }

      if (this.currentFilter === 'done') {
        list = list.filter(h => h.history && h.history[today]);
      } else if (this.currentFilter === 'pending') {
        list = list.filter(h => !h.history || !h.history[today]);
      }

      return list;
    }

    getHabitById(id) {
      return this.repo ? this.repo.getHabitById(id) : null;
    }

    createHabit(habitData) {
      if (!this.repo) return null;
      const created = this.repo.createHabit(habitData);
      this._notify();
      return created;
    }

    updateHabit(id, changes) {
      if (!this.repo) return null;
      const updated = this.repo.updateHabit(id, changes);
      this._notify();
      return updated;
    }

    deleteHabit(id) {
      if (!this.repo) return null;
      const deleted = this.repo.deleteHabit(id);
      this._notify();
      return deleted;
    }

    toggleCheckin(id, dateStr) {
      if (!this.repo) return null;
      const targetDate = dateStr || this.getTodayKey();
      const res = this.repo.toggleHabitCheckin(id, targetDate);
      this._notify();
      return res;
    }

    isDoneToday(habit) {
      const today = this.getTodayKey();
      return Boolean(habit && habit.history && habit.history[today]);
    }

    getLast7DaysHistory(habit) {
      const results = [];
      const hist = (habit && habit.history) || {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dKey = d.toISOString().split('T')[0];
        const dayLabel = i === 0 ? 'Nay' : (d.getDay() === 0 ? 'CN' : `T${d.getDay() + 1}`);
        results.push({
          dateKey: dKey,
          label: dayLabel,
          completed: Boolean(hist[dKey])
        });
      }
      return results;
    }

    getStats() {
      const habits = this.getAllHabits();
      const today = this.getTodayKey();
      const total = habits.length;
      const doneToday = habits.filter(h => h.history && h.history[today]).length;
      const rate = total > 0 ? Math.round((doneToday / total) * 100) : 0;
      let maxStreak = 0;
      habits.forEach(h => {
        if ((h.streak || 0) > maxStreak) maxStreak = h.streak;
      });

      return {
        total,
        doneToday,
        pendingToday: total - doneToday,
        completionRate: rate,
        maxStreak
      };
    }

    setFilter(filter) {
      this.currentFilter = filter;
      this._notify();
    }

    setSearch(query) {
      this.searchQuery = query;
      this._notify();
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
        try { fn(state); } catch (e) { console.error('[HabitsModule] Listener error:', e); }
      });
    }

    getState() {
      return {
        filter: this.currentFilter,
        search: this.searchQuery,
        habits: this.getFilteredHabits(),
        allCount: this.getAllHabits().length,
        stats: this.getStats()
      };
    }
  }

  return HabitsModule;
}));

