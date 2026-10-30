// modules/stats/StatsModule.js
/**
 * TreTH - Stats & Analytics Module
 * Phân tích dữ liệu hiệu suất cá nhân và vẽ biểu đồ Donut thuần SVG (Zero dependencies).
 * Kết nối dữ liệu 100% qua LocalRepository.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.StatsModule = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  class StatsModule {
    constructor(repository, options = {}) {
      this.repo = repository || (typeof window !== 'undefined' ? window.__localRepo : null);
      this.options = options;
      this.timeRange = 'all'; // 'today' | 'week' | 'month' | 'all'
      this.listeners = new Set();

      if (this.repo) {
        this.repo.subscribe('all', () => this._notify());
      }
    }

    setTimeRange(range) {
      if (['today', 'week', 'month', 'all'].includes(range)) {
        this.timeRange = range;
        this._notify();
      }
    }

    getTimeRange() {
      return this.timeRange;
    }

    _isWithinRange(dateStr) {
      if (!dateStr || this.timeRange === 'all') return true;
      const target = new Date(dateStr);
      if (isNaN(target.getTime())) return false;

      const now = new Date();
      now.setHours(23, 59, 59, 999);

      if (this.timeRange === 'today') {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        return target >= start && target <= now;
      } else if (this.timeRange === 'week') {
        const start = new Date();
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        return target >= start && target <= now;
      } else if (this.timeRange === 'month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        return target >= start && target <= now;
      }
      return true;
    }

    getFilteredTasks() {
      if (!this.repo) return [];
      const all = this.repo.getAllTasks();
      if (this.timeRange === 'all') return all;
      return all.filter(t => this._isWithinRange(t.dueDate || t.startDate));
    }

    getSummary() {
      const tasks = this.getFilteredTasks();
      const total = tasks.length;
      const completed = tasks.filter(t => t.status === 'completed').length;
      const pending = tasks.filter(t => t.status === 'pending').length;
      const inProgress = tasks.filter(t => t.status === 'in-progress').length;
      const urgent = tasks.filter(t => t.quadrant === 'q1' || t.priority === 'urgent').length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      const pomo = this.repo ? this.repo.getPomoStats() : { focusMinutes: 0, completedCycles: 0 };
      const habits = this.repo ? this.repo.getHabits() : [];
      const today = new Date().toISOString().split('T')[0];
      const habitsTodayDone = habits.filter(h => h.history && h.history[today]).length;

      return {
        total,
        completed,
        pending,
        inProgress,
        urgent,
        completionRate,
        focusMinutes: pomo.focusMinutes || 0,
        completedCycles: pomo.completedCycles || 0,
        habitsTodayDone,
        habitsTotal: habits.length
      };
    }

    getStatusDistribution() {
      const tasks = this.getFilteredTasks();
      const total = tasks.length;
      const completed = tasks.filter(t => t.status === 'completed').length;
      const inProgress = tasks.filter(t => t.status === 'in-progress').length;
      const pending = tasks.filter(t => t.status === 'pending').length;

      return [
        { label: 'Hoàn thành', count: completed, color: '#10B981', percent: total ? Math.round((completed / total) * 100) : 0 },
        { label: 'Đang làm', count: inProgress, color: '#3B82F6', percent: total ? Math.round((inProgress / total) * 100) : 0 },
        { label: 'Chưa làm', count: pending, color: '#94A3B8', percent: total ? Math.round((pending / total) * 100) : 0 }
      ];
    }

    getCategoryDistribution() {
      const tasks = this.getFilteredTasks();
      const total = tasks.length;
      const categories = this.repo ? this.repo.getCategories() : [];
      const catCountMap = {};

      tasks.forEach(t => {
        const cId = t.categoryId || (t.category && t.category.id) || 'other';
        catCountMap[cId] = (catCountMap[cId] || 0) + 1;
      });

      const slices = [];
      categories.forEach(c => {
        const count = catCountMap[c.id] || 0;
        if (count > 0 || total === 0) {
          slices.push({
            label: c.name,
            count,
            color: c.color || '#6366F1',
            icon: c.icon || c.emoji || '📋',
            percent: total ? Math.round((count / total) * 100) : 0
          });
        }
      });

      return slices.length > 0 ? slices : [{ label: 'Trống', count: 0, color: '#64748B', percent: 0 }];
    }

    getQuadrantDistribution() {
      const tasks = this.getFilteredTasks();
      const total = tasks.length;
      const q1 = tasks.filter(t => t.quadrant === 'q1').length;
      const q2 = tasks.filter(t => t.quadrant === 'q2').length;
      const q3 = tasks.filter(t => t.quadrant === 'q3').length;
      const q4 = tasks.filter(t => t.quadrant === 'q4').length;

      return [
        { label: 'Q1: Gấp & Quan trọng', count: q1, color: '#EF4444', percent: total ? Math.round((q1 / total) * 100) : 0 },
        { label: 'Q2: Kế hoạch dài hạn', count: q2, color: '#10B981', percent: total ? Math.round((q2 / total) * 100) : 0 },
        { label: 'Q3: Khẩn nhưng ủy quyền', count: q3, color: '#F59E0B', percent: total ? Math.round((q3 / total) * 100) : 0 },
        { label: 'Q4: Loại bỏ / Khác', count: q4, color: '#64748B', percent: total ? Math.round((q4 / total) * 100) : 0 }
      ];
    }

    /**
     * Tạo chuỗi SVG Donut Chart thuần với bán kính chuẩn và animation
     */
    generateSvgDonutMarkup(slices, centerText = '') {
      const total = slices.reduce((acc, s) => acc + s.count, 0);
      const radius = 60;
      const strokeWidth = 22;
      const circumference = 2 * Math.PI * radius;

      let svgPaths = '';
      let accumulatedOffset = 0;

      if (total === 0) {
        svgPaths = `<circle cx="80" cy="80" r="${radius}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="${strokeWidth}" />`;
      } else {
        slices.forEach(slice => {
          if (slice.count <= 0) return;
          const strokeDash = (slice.count / total) * circumference;
          const strokeDashOffset = -accumulatedOffset;

          svgPaths += `
            <circle cx="80" cy="80" r="${radius}"
              fill="none"
              stroke="${slice.color}"
              stroke-width="${strokeWidth}"
              stroke-dasharray="${strokeDash} ${circumference}"
              stroke-dashoffset="${strokeDashOffset}"
              style="transition: stroke-dasharray 0.4s ease, stroke-dashoffset 0.4s ease;"
            />
          `;
          accumulatedOffset += strokeDash;
        });
      }

      return `
        <svg viewBox="0 0 160 160" width="100%" height="100%" style="transform: rotate(-90deg); overflow: visible;">
          ${svgPaths}
          <text x="80" y="80" text-anchor="middle" dominant-baseline="central"
            style="transform: rotate(90deg); transform-origin: 80px 80px; font-weight: 700; font-size: 1.1rem; fill: var(--text-main);">
            ${centerText || total}
          </text>
        </svg>
      `;
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
        try { fn(state); } catch (e) { console.error('[StatsModule] Listener error:', e); }
      });
    }

    getState() {
      return {
        timeRange: this.timeRange,
        summary: this.getSummary(),
        statusDist: this.getStatusDistribution(),
        categoryDist: this.getCategoryDistribution(),
        quadrantDist: this.getQuadrantDistribution()
      };
    }
  }

  return StatsModule;
}));

