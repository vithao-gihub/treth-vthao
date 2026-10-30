// ui/CalendarView.js
/**
 * TreTH v4.0 - Next-Gen Productivity & Time-Blocking Calendar Suite
 * Lấy cảm hứng từ Notion Calendar (Cron), TickTick, Morgen & Sunsama.
 * Hỗ trợ:
 * - 4 chế độ xem: Ngày (Day), Tuần (Week - Mặc định), Tháng (Month), Lịch trình (Agenda)
 * - Lưới thời gian 24 giờ (Time-Grid) với HOUR_HEIGHT = 64px, snap 15 phút
 * - Vạch đỏ thời gian thực (Live Current Time Indicator / Now Line) cập nhật mỗi phút
 * - Thuật toán chống đè chập nhiều cột sự kiện (Multi-Column Collision Layout)
 * - Tương tác trực tiếp: Kéo di chuyển (Drag-to-Move), Kéo giãn thời lượng (Resize Handle), Kéo quét tạo mới
 * - Ngăn Backlog việc chưa xếp lịch (Unscheduled / All-day / Overdue Drawer)
 * - Âm lịch Việt Nam chuẩn Intl (Zero-dependency)
 * - Lớp phủ Thói quen (Habits Overlay) điểm danh trực tiếp & Phiên Pomodoro
 * - Hộp thoại tạo & chỉnh sửa sự kiện thời gian thực (Event Modal)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CalendarView = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  // =========================================================================
  // TIỆN ÍCH THỜI GIAN & ÂM LỊCH VIỆT NAM (ZERO-DEPENDENCY)
  // =========================================================================

  function formatDateISO(date) {
    if (!date) return '';
    const d = (date instanceof Date) ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function parseISOToDate(isoStr) {
    if (!isoStr) return new Date();
    const parts = String(isoStr).split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return new Date(isoStr);
  }

  function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  function getVietnameseLunarDate(dateInput) {
    try {
      const d = typeof dateInput === 'string' ? parseISOToDate(dateInput) : dateInput;
      if (!(d instanceof Date) || isNaN(d.getTime())) return { day: '', month: '', isSpecial: false, label: '' };
      const formatter = new Intl.DateTimeFormat('vi-VN-u-ca-chinese', {
        day: 'numeric',
        month: 'numeric'
      });
      const parts = formatter.formatToParts(d);
      let lunarDay = '';
      let lunarMonth = '';
      parts.forEach(p => {
        if (p.type === 'day') lunarDay = p.value;
        if (p.type === 'month') lunarMonth = p.value;
      });
      const dayNum = parseInt(lunarDay, 10) || 1;
      const monthNum = parseInt(lunarMonth, 10) || 1;
      const isSpecial = (dayNum === 1 || dayNum === 15);
      const isFirstDaySolar = (d.getDate() === 1);
      const label = (dayNum === 1 || isFirstDaySolar) ? `${dayNum}/${monthNum} ÂL` : `${dayNum}`;
      return { day: dayNum, month: monthNum, isSpecial, label };
    } catch (e) {
      return { day: '', month: '', isSpecial: false, label: '' };
    }
  }

  function parseTimeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const parts = timeStr.trim().split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return Math.min(1439, Math.max(0, h * 60 + m));
  }

  function formatMinutesToTime(totalMinutes) {
    const clamped = Math.min(1439, Math.max(0, Math.round(totalMinutes)));
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function snapMinutesTo15(rawMinutes) {
    return Math.min(1425, Math.max(0, Math.round(rawMinutes / 15) * 15));
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // =========================================================================
  // CLASS CALENDARVIEW v4.0
  // =========================================================================
  class CalendarView {
    constructor(containerEl, repository, options = {}) {
      this.container = containerEl;
      this.repo = repository;
      this.options = options;

      const now = new Date();
      this.currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      this.selectedDateISO = formatDateISO(this.currentDate);

      // Chế độ xem: 'month' (mặc định), 'week', 'day', 'agenda'
      const savedSubView = localStorage.getItem('treth_calendar_subview_v4');
      this.viewMode = ['week', 'day', 'month', 'agenda'].includes(savedSubView) ? savedSubView : 'month';

      // Ngăn Backlog (Unscheduled Drawer) - Mặc định thu gọn trên màn hình nhỏ di động để không che khuất lưới lịch
      const isMobileScreen = typeof window !== 'undefined' && window.innerWidth <= 900;
      const savedBacklogPref = localStorage.getItem('treth_cal_show_backlog_v4');
      this.showBacklog = isMobileScreen ? false : (savedBacklogPref !== 'false');
      this.backlogActiveTab = 'all_day'; // 'all_day' | 'no_date' | 'overdue'
      this.backlogSearchQuery = '';

      // Lớp phủ Thói quen & Pomodoro
      this.showHabitsLayer = localStorage.getItem('treth_cal_show_habits_v4') !== 'false';
      this.showPomoLayer = localStorage.getItem('treth_cal_show_pomo_v4') !== 'false';

      // Chiều cao 1 giờ chuẩn Time-Grid (px)
      this.hourHeight = 64;

      this.tasksCache = [];
      this.nowLineInterval = null;
      this.isSubscribed = false;

      // Trạng thái Drag & Resize
      this.activeDrag = null;

      this._init();
    }

    _init() {
      if (this.repo && typeof this.repo.subscribe === 'function' && !this.isSubscribed) {
        this.unsubscribe = this.repo.subscribe(tasks => {
          this.tasksCache = tasks || [];
          this.render(this.tasksCache);
        });
        this.isSubscribed = true;
      }

      // Lắng nghe phím tắt bàn phím tiện lợi
      this._bindKeyboardShortcuts();
    }

    destroy() {
      if (this.nowLineInterval) {
        clearInterval(this.nowLineInterval);
        this.nowLineInterval = null;
      }
      if (typeof this.unsubscribe === 'function') {
        this.unsubscribe();
      }
    }

    // =======================================================================
    // ĐIỀU HƯỚNG THỜI GIAN
    // =======================================================================

    goToToday() {
      const now = new Date();
      this.currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      this.selectedDateISO = formatDateISO(this.currentDate);
      this.render();
    }

    prev() {
      if (this.viewMode === 'day') {
        this.currentDate.setDate(this.currentDate.getDate() - 1);
      } else if (this.viewMode === 'week') {
        this.currentDate.setDate(this.currentDate.getDate() - 7);
      } else if (this.viewMode === 'month') {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      } else {
        // Agenda: lùi 14 ngày
        this.currentDate.setDate(this.currentDate.getDate() - 14);
      }
      this.selectedDateISO = formatDateISO(this.currentDate);
      this.render();
    }

    next() {
      if (this.viewMode === 'day') {
        this.currentDate.setDate(this.currentDate.getDate() + 1);
      } else if (this.viewMode === 'week') {
        this.currentDate.setDate(this.currentDate.getDate() + 7);
      } else if (this.viewMode === 'month') {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      } else {
        // Agenda: tiến 14 ngày
        this.currentDate.setDate(this.currentDate.getDate() + 14);
      }
      this.selectedDateISO = formatDateISO(this.currentDate);
      this.render();
    }

    // Tương thích ngược với các test cũ
    prevMonth() { this.prev(); }
    nextMonth() { this.next(); }

    setViewMode(mode) {
      if (!['week', 'day', 'month', 'agenda'].includes(mode)) return;
      this.viewMode = mode;
      localStorage.setItem('treth_calendar_subview_v4', mode);
      this.render();
    }

    toggleBacklog() {
      this.showBacklog = !this.showBacklog;
      localStorage.setItem('treth_cal_show_backlog_v4', String(this.showBacklog));
      this.render();
    }

    // Tương thích ngược với toggleUnscheduled
    toggleUnscheduled() {
      this.toggleBacklog();
    }

    toggleHabitsLayer() {
      this.showHabitsLayer = !this.showHabitsLayer;
      localStorage.setItem('treth_cal_show_habits_v4', String(this.showHabitsLayer));
      this.render();
    }

    togglePomoLayer() {
      this.showPomoLayer = !this.showPomoLayer;
      localStorage.setItem('treth_cal_show_pomo_v4', String(this.showPomoLayer));
      this.render();
    }

    selectDate(dateISO) {
      this.selectedDateISO = dateISO;
      this.currentDate = parseISOToDate(dateISO);
      this.render();
    }

    // =======================================================================
    // TÍNH TOÁN DỮ LIỆU & BỘ LỌC
    // =======================================================================

    _getAllTasks() {
      if (Array.isArray(this.tasksCache) && this.tasksCache.length > 0) {
        return this.tasksCache.filter(t => t && !t.isDeleted);
      }
      if (this.repo && typeof this.repo.getAllTasks === 'function') {
        return this.repo.getAllTasks();
      }
      if (typeof window !== 'undefined' && window.TreTHCore && typeof window.TreTHCore.getTasks === 'function') {
        return window.TreTHCore.getTasks().filter(t => t && !t.isDeleted);
      }
      return [];
    }

    _getCategories() {
      if (this.repo && typeof this.repo.getCategories === 'function') {
        return this.repo.getCategories();
      }
      if (typeof window !== 'undefined' && window.TreTHCore && typeof window.TreTHCore.getCategories === 'function') {
        return window.TreTHCore.getCategories();
      }
      try {
        const raw = localStorage.getItem('personal_workspace_categories_v1');
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return [];
    }

    _getHabits() {
      if (this.repo && typeof this.repo.getHabits === 'function') {
        return this.repo.getHabits();
      }
      if (typeof window !== 'undefined' && window.TreTHCore && typeof window.TreTHCore.getHabits === 'function') {
        return window.TreTHCore.getHabits();
      }
      try {
        const raw = localStorage.getItem('personal_workspace_habits_v1');
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return [];
    }

    _normalizeTaskDates(task) {
      const todayISO = formatDateISO(new Date());
      let dueDate = task.dueDate || '';
      let startDate = task.startDate || dueDate || '';
      let startTime = task.startTime || null;
      let endTime = task.endTime || null;
      const isAllDay = startTime ? false : (task.isAllDay !== false);

      if (startTime && !endTime) {
        const parts = startTime.split(':').map(Number);
        const endH = Math.min(23, (parts[0] || 0) + 1);
        const endM = parts[1] || 0;
        endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
      }

      return {
        ...task,
        dueDate,
        startDate,
        startTime,
        endTime,
        isAllDay,
        estimatedMinutes: Number(task.estimatedMinutes) || 60
      };
    }

    // =======================================================================
    // THUẬT TOÁN COLLISION & MULTI-COLUMN (TIME-GRID LAYOUT)
    // =======================================================================

    /**
     * Sắp xếp và phân bổ các task trùng giờ vào các cột cạnh nhau
     * để không đè khít lên nhau làm khuất nội dung.
     */
    _computeTimeBlockLayout(tasks) {
      if (!Array.isArray(tasks) || tasks.length === 0) return [];

      // 1. Chuẩn hóa startMinutes và endMinutes
      const items = tasks.map(task => {
        let sMin = parseTimeToMinutes(task.startTime) || 540; // Mặc định 09:00 nếu thiếu
        let eMin = parseTimeToMinutes(task.endTime) || (sMin + (task.estimatedMinutes || 60));
        if (eMin <= sMin) eMin = Math.min(1440, sMin + 30);
        return {
          task,
          sMin,
          eMin,
          duration: eMin - sMin
        };
      });

      // 2. Sắp xếp tăng dần theo giờ bắt đầu, sau đó giảm dần theo thời lượng
      items.sort((a, b) => {
        if (a.sMin !== b.sMin) return a.sMin - b.sMin;
        return b.duration - a.duration;
      });

      // 3. Gom các task giao nhau vào cùng một Collision Cluster
      const clusters = [];
      let currentCluster = [];
      let clusterMaxEnd = -1;

      items.forEach(item => {
        if (currentCluster.length === 0) {
          currentCluster.push(item);
          clusterMaxEnd = item.eMin;
        } else {
          if (item.sMin < clusterMaxEnd) {
            // Có giao nhau -> chung cụm
            currentCluster.push(item);
            clusterMaxEnd = Math.max(clusterMaxEnd, item.eMin);
          } else {
            // Không giao nhau -> chốt cụm cũ, mở cụm mới
            clusters.push(currentCluster);
            currentCluster = [item];
            clusterMaxEnd = item.eMin;
          }
        }
      });
      if (currentCluster.length > 0) {
        clusters.push(currentCluster);
      }

      // 4. Phân bổ cột trong từng cụm
      const placedItems = [];

      clusters.forEach(cluster => {
        const columns = []; // mỗi cột lưu endMin của task cuối cùng

        cluster.forEach(item => {
          let assignedCol = -1;
          for (let c = 0; c < columns.length; c++) {
            if (columns[c] <= item.sMin) {
              assignedCol = c;
              columns[c] = item.eMin;
              break;
            }
          }
          if (assignedCol === -1) {
            assignedCol = columns.length;
            columns.push(item.eMin);
          }
          item.col = assignedCol;
        });

        const totalCols = Math.max(1, columns.length);
        cluster.forEach(item => {
          placedItems.push({
            ...item,
            colIndex: item.col,
            totalCols: totalCols
          });
        });
      });

      return placedItems;
    }

    // =======================================================================
    // RENDER MAIN WORKSPACE
    // =======================================================================

    render(tasks) {
      if (!this.container) return;
      if (Array.isArray(tasks)) {
        this.tasksCache = tasks;
      }

      const allTasks = this._getAllTasks().map(t => this._normalizeTaskDates(t));
      const todayISO = formatDateISO(new Date());

      // HTML Khung Vỏ v4.0
      this.container.innerHTML = `
        <div class="cal-v4-shell ${this.showBacklog ? 'has-backlog' : ''}">
          <!-- 1. Thanh Công Cụ Điều Phối (Command Header) -->
          ${this._renderHeader(todayISO)}

          <!-- 2. Thân Lịch Chính (Main Viewport + Backlog Drawer) -->
          <div class="cal-v4-body">
            <main class="cal-v4-main-viewport" role="region" aria-label="Khung lưới lịch">
              ${this._renderActiveSubView(allTasks, todayISO)}
            </main>

            <!-- 3. Ngăn Kéo Việc Chưa Xếp Khung Giờ (Backlog Drawer) -->
            ${this._renderBacklogSidebar(allTasks, todayISO)}
          </div>
        </div>
      `;

      // Kích hoạt sự kiện và vạch thời gian thực
      this._bindEvents();
      this._initNowLine(todayISO);
      this._autoScrollTimeGrid();
    }

    // =======================================================================
    // 1. THANH CÔNG CỤ LỊCH (CALENDAR COMMAND HEADER)
    // =======================================================================

    _renderHeader(todayISO) {
      const monthNames = [
        'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
        'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
        'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
      ];
      const curYear = this.currentDate.getFullYear();
      const curMonth = this.currentDate.getMonth();
      const monthTitle = `${monthNames[curMonth]}, ${curYear}`;
      const weekNum = getWeekNumber(this.currentDate);
      const todayLunar = getVietnameseLunarDate(new Date());

      const isCurrentPeriodToday = (this.viewMode === 'day')
        ? (formatDateISO(this.currentDate) === todayISO)
        : (this.viewMode === 'month' ? (new Date().getMonth() === curMonth && new Date().getFullYear() === curYear) : true);

      // Đếm số việc chưa xếp lịch để hiện badge
      const unscheduledCount = this._getAllTasks().filter(t => !t.isDeleted && (!t.dueDate || !t.startTime)).length;

      return `
        <header class="cal-v4-toolbar" role="toolbar">
          <!-- Cụm 1: Điều hướng thời gian (Trái) -->
          <div class="cal-toolbar-left">
            <button type="button" id="cal-btn-today" class="cal-btn cal-btn-today ${isCurrentPeriodToday ? 'is-current' : ''}" title="Về ngày hôm nay (T)">
              <span class="cal-today-dot"></span>
              <span>Hôm nay</span>
            </button>

            <div class="cal-nav-arrows">
              <button type="button" id="cal-btn-prev" class="cal-btn-icon" title="Trước (J hoặc ←)">
                <i class="ri-arrow-left-s-line"></i>
              </button>
              <button type="button" id="cal-btn-next" class="cal-btn-icon" title="Sau (K hoặc →)">
                <i class="ri-arrow-right-s-line"></i>
              </button>
            </div>

            <div class="cal-title-block">
              <h2 class="cal-month-title">${monthTitle}</h2>
              <div class="cal-sub-badges">
                <span class="cal-badge-pill cal-week-badge" title="Tuần thứ trong năm">Tuần ${weekNum}</span>
                <span class="cal-badge-pill cal-lunar-badge" title="Âm lịch hôm nay">
                  <i class="ri-moon-line"></i> ${todayLunar.label}
                </span>
              </div>
            </div>
          </div>

          <!-- Cụm 2: Chuyển đổi 4 Chế độ xem (Giữa - Segmented Control) -->
          <div class="cal-toolbar-center">
            <div class="cal-view-segmented" role="tablist" aria-label="Chế độ xem lịch">
              <button type="button" class="cal-seg-btn ${this.viewMode === 'day' ? 'active' : ''}" data-cal-view="day" title="Xem theo Ngày (D)">
                <span>Ngày</span>
                <kbd>D</kbd>
              </button>
              <button type="button" class="cal-seg-btn ${this.viewMode === 'week' ? 'active' : ''}" data-cal-view="week" title="Xem theo Tuần (W)">
                <span>Tuần</span>
                <kbd>W</kbd>
              </button>
              <button type="button" class="cal-seg-btn ${this.viewMode === 'month' ? 'active' : ''}" data-cal-view="month" title="Xem theo Tháng (M)">
                <span>Tháng</span>
                <kbd>M</kbd>
              </button>
              <button type="button" class="cal-seg-btn ${this.viewMode === 'agenda' ? 'active' : ''}" data-cal-view="agenda" title="Xem Lịch trình & Dòng thời gian (A)">
                <span>Lịch trình</span>
                <kbd>A</kbd>
              </button>
            </div>
          </div>

          <!-- Cụm 3: Tác vụ & Lớp phủ & Ngăn kéo (Phải) -->
          <div class="cal-toolbar-right">
            <button type="button" id="cal-toggle-habits" class="cal-btn cal-btn-layer ${this.showHabitsLayer ? 'active' : ''}" title="Bật/Tắt lớp phủ Thói quen">
              <i class="ri-plant-line"></i>
              <span>Thói quen</span>
            </button>

            <button type="button" id="cal-toggle-pomo" class="cal-btn cal-btn-layer ${this.showPomoLayer ? 'active' : ''}" title="Bật/Tắt hiển thị phiên Pomodoro">
              <i class="ri-timer-line"></i>
              <span>Tập trung</span>
            </button>

            <button type="button" id="cal-toggle-unscheduled" class="cal-btn cal-btn-backlog ${this.showBacklog ? 'active' : ''}" title="Bật/Tắt Ngăn kéo Việc chưa xếp giờ">
              <i class="ri-inbox-archive-line"></i>
              <span>Backlog</span>
              <span class="cal-backlog-badge">${unscheduledCount}</span>
            </button>

            <button type="button" id="cal-btn-create-event" class="cal-btn cal-btn-primary" title="Tạo công việc / sự kiện mới trên Lịch">
              <i class="ri-add-line"></i>
              <span>+ Sự kiện</span>
            </button>
          </div>
        </header>
      `;
    }

    // =======================================================================
    // 2. RENDER SUBVIEW CHÍNH
    // =======================================================================

    _renderActiveSubView(allTasks, todayISO) {
      if (this.viewMode === 'day') {
        const dayDate = parseISOToDate(this.selectedDateISO || formatDateISO(this.currentDate));
        return this._renderWeekOrDayTimeGrid([dayDate], todayISO, true);
      }
      if (this.viewMode === 'week') {
        const days = this._getDaysOfWeek(this.currentDate);
        return this._renderWeekOrDayTimeGrid(days, todayISO, false);
      }
      if (this.viewMode === 'month') {
        return this._renderMonthGrid(allTasks, todayISO);
      }
      if (this.viewMode === 'agenda') {
        return this._renderAgendaView(allTasks, todayISO);
      }
      return '';
    }

    // Tính 7 ngày trong tuần (Thứ 2 -> Chủ Nhật)
    _getDaysOfWeek(baseDate) {
      const d = new Date(baseDate);
      let dayIndex = d.getDay(); // 0 = CN, 1 = T2...
      const diffToMonday = dayIndex === 0 ? -6 : 1 - dayIndex;
      d.setDate(d.getDate() + diffToMonday);

      const days = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date(d);
        day.setDate(d.getDate() + i);
        days.push(day);
      }
      return days;
    }

    // =======================================================================
    // A. TIME-GRID ENGINE (WEEK & DAY VIEW)
    // =======================================================================

    _renderWeekOrDayTimeGrid(daysArray, todayISO, isDayView = false) {
      const allTasks = this._getAllTasks().map(t => this._normalizeTaskDates(t));
      const habits = this.showHabitsLayer ? this._getHabits() : [];
      const colCount = daysArray.length;
      const colWidthPercent = 100 / colCount;

      const dayNamesShort = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
      const dayNamesFull = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];

      return `
        <div class="cal-timegrid-container ${isDayView ? 'is-day-view' : 'is-week-view'}">
          
          <!-- Hàng Header Ngày cố định -->
          <div class="cal-timegrid-header" style="grid-template-columns: 60px repeat(${colCount}, 1fr);">
            <div class="cal-time-corner">
              <span class="cal-gmt-hint">GMT+7</span>
            </div>
            ${daysArray.map((dateObj, idx) => {
              const dISO = formatDateISO(dateObj);
              const isToday = (dISO === todayISO);
              const isSelected = (dISO === this.selectedDateISO);
              const lunar = getVietnameseLunarDate(dateObj);
              const dayName = isDayView ? dayNamesFull[idx] : dayNamesShort[idx];

              // Đếm số việc hoàn thành trong ngày
              const dayTasks = allTasks.filter(t => t.dueDate === dISO);
              const total = dayTasks.length;
              const done = dayTasks.filter(t => t.status === 'completed').length;
              const percent = total > 0 ? Math.round((done / total) * 100) : 0;

              return `
                <div class="cal-header-col ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}" data-col-date="${dISO}">
                  <div class="cal-header-col-top">
                    <span class="cal-header-dayname">${dayName}</span>
                    <button type="button" class="cal-quick-add-col-btn" data-add-date="${dISO}" title="Tạo sự kiện nhanh cho ngày ${dISO}">
                      <i class="ri-add-line"></i>
                    </button>
                  </div>

                  <div class="cal-header-col-main">
                    <span class="cal-header-daynum ${isToday ? 'is-today-circle' : ''}">${dateObj.getDate()}</span>
                    <span class="cal-header-lunarnum ${lunar.isSpecial ? 'is-special' : ''}" title="Ngày Âm lịch">${lunar.label}</span>
                  </div>

                  ${total > 0 ? `
                    <div class="cal-header-progress" title="Tiến độ: ${done}/${total} (${percent}%)">
                      <div class="cal-progress-bar" style="width: ${percent}%;"></div>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>

          <!-- Hàng Sự kiện Cả ngày & Lớp phủ Thói quen (All-Day & Habits Banner) -->
          <div class="cal-allday-row" style="grid-template-columns: 60px repeat(${colCount}, 1fr);">
            <div class="cal-allday-label">
              <span>Cả ngày</span>
            </div>
            ${daysArray.map(dateObj => {
              const dISO = formatDateISO(dateObj);
              const alldayTasks = allTasks.filter(t => t.dueDate === dISO && (t.isAllDay || !t.startTime));

              return `
                <div class="cal-allday-cell" data-cal-dropzone="${dISO}" data-drop-allday="true">
                  <!-- Lớp phủ Thói quen (nếu bật) -->
                  ${this.showHabitsLayer && habits.length > 0 ? `
                    <div class="cal-habits-strip">
                      ${habits.map(h => {
                        const isDone = Boolean(h.history && h.history[dISO]);
                        return `
                          <button type="button" 
                                  class="cal-habit-pill ${isDone ? 'is-done' : ''}" 
                                  data-habit-id="${escapeHTML(h.id)}" 
                                  data-habit-date="${dISO}"
                                  title="${escapeHTML(h.title)} (${isDone ? 'Đã điểm danh' : 'Bấm để điểm danh'})">
                            <span class="cal-habit-emoji">${h.emoji || '🌱'}</span>
                            <span class="cal-habit-name">${escapeHTML(h.title)}</span>
                            <i class="${isDone ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'}"></i>
                          </button>
                        `;
                      }).join('')}
                    </div>
                  ` : ''}

                  <!-- Các thẻ việc Cả ngày -->
                  <div class="cal-allday-tasks-list">
                    ${alldayTasks.map(t => this._renderAllDayChip(t)).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Lưới Thời Gian 24 Giờ cuộn mượt (Scrollable 24-Hour Time Grid) -->
          <div class="cal-timegrid-scroll" id="cal-timegrid-scroll-viewport">
            <div class="cal-timegrid-canvas" style="grid-template-columns: 60px repeat(${colCount}, 1fr); height: ${24 * this.hourHeight}px;">
              
              <!-- Cột Trục Giờ Bên Trái (00:00 -> 23:00) -->
              <div class="cal-time-axis">
                ${Array.from({ length: 24 }).map((_, h) => {
                  const hourStr = `${String(h).padStart(2, '0')}:00`;
                  return `
                    <div class="cal-hour-label" style="top: ${h * this.hourHeight}px;">
                      <span>${hourStr}</span>
                    </div>
                  `;
                }).join('')}
              </div>

              <!-- Các Cột Ngày Lưới Giờ (Day Columns) -->
              ${daysArray.map(dateObj => {
                const dISO = formatDateISO(dateObj);
                const isToday = (dISO === todayISO);
                const timedTasksForDay = allTasks.filter(t => t.dueDate === dISO && t.startTime && !t.isAllDay);
                const layoutItems = this._computeTimeBlockLayout(timedTasksForDay);

                return `
                  <div class="cal-day-column ${isToday ? 'is-today' : ''}" 
                       data-col-date="${dISO}" 
                       data-cal-dropzone="${dISO}">
                    
                    <!-- Vạch đỏ thời gian thực (Now Line) nếu là ngày hôm nay -->
                    ${isToday ? `<div class="cal-now-line" id="cal-live-now-line"></div>` : ''}

                    <!-- 24 Vạch giờ ngang mờ -->
                    ${Array.from({ length: 24 }).map((_, h) => `
                      <div class="cal-grid-hour-line" style="top: ${h * this.hourHeight}px;" data-hour="${h}"></div>
                    `).join('')}

                    <!-- Các Khối Công Việc Khung Giờ (Time-Blocks) -->
                    ${layoutItems.map(item => this._renderTimeBlock(item)).join('')}
                  </div>
                `;
              }).join('')}

            </div>
          </div>

        </div>
      `;
    }

    _renderTimeBlock(layoutItem) {
      const { task, sMin, eMin, colIndex, totalCols } = layoutItem;
      const isCompleted = task.status === 'completed';
      const category = task.category || {};
      const catColor = category.color || '#4F46E5';
      const safeTitle = escapeHTML(task.title);

      const topPx = (sMin / 60) * this.hourHeight;
      const heightPx = Math.max(26, ((eMin - sMin) / 60) * this.hourHeight - 2);

      const widthPercent = 100 / totalCols;
      const leftPercent = colIndex * widthPercent;

      const timeRangeStr = `${task.startTime} - ${task.endTime}`;
      const priorityBadge = task.priority === 'high' ? '🔥' : (task.priority === 'low' ? '🌱' : '');

      return `
        <div class="cal-time-block ${isCompleted ? 'is-completed' : ''} priority-${task.priority || 'medium'}"
             data-id="${task.id}"
             data-task-id="${task.id}"
             draggable="true"
             style="top: ${topPx}px; height: ${heightPx}px; left: calc(${leftPercent}% + 2px); width: calc(${widthPercent}% - 4px); --block-color: ${catColor};"
             title="${safeTitle} (${timeRangeStr})">
          
          <div class="cal-block-inner">
            <div class="cal-block-header">
              <span class="cal-block-time">${timeRangeStr}</span>
              ${priorityBadge ? `<span class="cal-block-prio">${priorityBadge}</span>` : ''}
              
              <div class="cal-block-actions">
                <button type="button" class="cal-block-btn-pomo" data-focus-task-id="${task.id}" title="Tập trung ngay (Pomodoro)">
                  <i class="ri-play-fill"></i>
                </button>
                <button type="button" class="cal-block-btn-edit" data-edit-task-id="${task.id}" title="Chỉnh sửa chi tiết">
                  <i class="ri-edit-line"></i>
                </button>
              </div>
            </div>

            <div class="cal-block-title-row">
              <input type="checkbox" 
                     class="cal-task-check" 
                     data-check-id="${task.id}" 
                     ${isCompleted ? 'checked' : ''}
                     title="Đánh dấu hoàn thành">
              <span class="cal-block-title">${safeTitle}</span>
            </div>

            ${task.location ? `
              <div class="cal-block-location" title="${escapeHTML(task.location)}">
                <i class="ri-map-pin-line"></i>
                <span>${escapeHTML(task.location)}</span>
              </div>
            ` : ''}
          </div>

          <!-- Mép kéo giãn thời lượng (Bottom Resize Handle) -->
          <div class="cal-resize-handle" data-resize-task-id="${task.id}" title="Kéo lên/xuống để đổi thời lượng"></div>
        </div>
      `;
    }

    _renderAllDayChip(task) {
      const isCompleted = task.status === 'completed';
      const category = task.category || {};
      const catColor = category.color || '#4F46E5';
      const safeTitle = escapeHTML(task.title);

      return `
        <div class="cal-allday-chip ${isCompleted ? 'is-completed' : ''}"
             data-id="${task.id}"
             data-task-id="${task.id}"
             draggable="true"
             style="--chip-cat-color: ${catColor};"
             title="${safeTitle} (Cả ngày)">
          <input type="checkbox" class="cal-task-check" data-check-id="${task.id}" ${isCompleted ? 'checked' : ''}>
          <span class="cal-allday-chip-title">${safeTitle}</span>
          <i class="ri-draggable cal-drag-handle"></i>
        </div>
      `;
    }

    // =======================================================================
    // B. CHẾ ĐỘ XEM THÁNG (MONTH VIEW - EXECUTIVE OVERVIEW)
    // =======================================================================

    _renderMonthGrid(allTasks, todayISO) {
      const curYear = this.currentDate.getFullYear();
      const curMonth = this.currentDate.getMonth();

      const firstDayOfMonth = new Date(curYear, curMonth, 1);
      const lastDayOfMonth = new Date(curYear, curMonth + 1, 0);
      const totalDaysInMonth = lastDayOfMonth.getDate();

      // Day of week: 0 = CN, 1 = T2... Muốn T2 = 0... CN = 6
      let startDayOfWeek = firstDayOfMonth.getDay() - 1;
      if (startDayOfWeek === -1) startDayOfWeek = 6;

      const prevMonthLastDate = new Date(curYear, curMonth, 0).getDate();
      const calendarCells = [];

      // 1. Các ngày tháng trước
      for (let i = startDayOfWeek - 1; i >= 0; i--) {
        const d = prevMonthLastDate - i;
        const prevMonth = curMonth === 0 ? 11 : curMonth - 1;
        const prevYear = curMonth === 0 ? curYear - 1 : curYear;
        const dateObj = new Date(prevYear, prevMonth, d);
        calendarCells.push({
          dateISO: formatDateISO(dateObj),
          dayNumber: d,
          dateObj,
          isCurrentMonth: false,
          isToday: formatDateISO(dateObj) === todayISO
        });
      }

      // 2. Các ngày tháng hiện tại
      for (let d = 1; d <= totalDaysInMonth; d++) {
        const dateObj = new Date(curYear, curMonth, d);
        const dateISO = formatDateISO(dateObj);
        calendarCells.push({
          dateISO,
          dayNumber: d,
          dateObj,
          isCurrentMonth: true,
          isToday: dateISO === todayISO
        });
      }

      // 3. Các ngày tháng sau đủ 35 hoặc 42 ô
      const totalCellsNeeded = Math.ceil(calendarCells.length / 7) * 7;
      let nextDayCounter = 1;
      while (calendarCells.length < totalCellsNeeded) {
        const nextMonth = curMonth === 11 ? 0 : curMonth + 1;
        const nextYear = curMonth === 11 ? curYear + 1 : curYear;
        const dateObj = new Date(nextYear, nextMonth, nextDayCounter);
        calendarCells.push({
          dateISO: formatDateISO(dateObj),
          dayNumber: nextDayCounter,
          dateObj,
          isCurrentMonth: false,
          isToday: formatDateISO(dateObj) === todayISO
        });
        nextDayCounter++;
      }

      // Nhóm tasks theo ngày
      const tasksByDate = {};
      allTasks.forEach(task => {
        if (task.dueDate) {
          if (!tasksByDate[task.dueDate]) tasksByDate[task.dueDate] = [];
          tasksByDate[task.dueDate].push(task);
        }
      });

      return `
        <div class="calendar-month-grid cal-v4-month-grid">
          <!-- Hàng tiêu đề 7 thứ trong tuần -->
          <div class="calendar-weekdays-row">
            <div class="cal-weekday">Thứ 2</div>
            <div class="cal-weekday">Thứ 3</div>
            <div class="cal-weekday">Thứ 4</div>
            <div class="cal-weekday">Thứ 5</div>
            <div class="cal-weekday">Thứ 6</div>
            <div class="cal-weekday cal-weekday-sat">Thứ 7</div>
            <div class="cal-weekday cal-weekday-sun">Chủ Nhật</div>
          </div>

          <!-- Lưới 42 ô ngày -->
          <div class="calendar-days-container cal-v4-month-cells">
            ${calendarCells.map(cell => {
              const dayTasks = tasksByDate[cell.dateISO] || [];
              const lunar = getVietnameseLunarDate(cell.dateObj);
              const cellClasses = [
                'cal-day-cell',
                cell.isCurrentMonth ? 'in-month' : 'other-month',
                cell.isToday ? 'is-today' : ''
              ].filter(Boolean).join(' ');

              const visibleTasks = dayTasks.slice(0, 3);
              const extraCount = dayTasks.length - 3;

              return `
                <div class="${cellClasses}" data-date="${cell.dateISO}" data-cal-dropzone="${cell.dateISO}">
                  <div class="cal-day-header">
                    <div class="cal-day-header-left">
                      <span class="cal-day-number">${cell.dayNumber}</span>
                      ${cell.isToday ? '<span class="cal-today-pill">Hôm nay</span>' : ''}
                      <span class="cal-lunar-mini ${lunar.isSpecial ? 'is-special' : ''}">${lunar.label}</span>
                    </div>

                    <button type="button" class="cal-quick-add-btn" data-add-date="${cell.dateISO}" title="Thêm việc cho ngày ${cell.dateISO}">
                      <i class="ri-add-line"></i>
                    </button>
                  </div>

                  <div class="cal-day-tasks-list">
                    ${visibleTasks.map(t => this._renderTaskChip(t)).join('')}
                    ${extraCount > 0 ? `
                      <button type="button" class="cal-extra-tasks-pill" data-more-date="${cell.dateISO}" title="Xem tất cả ${dayTasks.length} việc của ngày này">
                        +${extraCount} việc khác
                      </button>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    _renderTaskChip(task) {
      const isCompleted = task.status === 'completed';
      const priorityClass = `priority-${task.priority || 'medium'}`;
      const category = task.category || {};
      const catColor = category.color || 'var(--primary)';
      const safeTitle = escapeHTML(task.title);
      const timeStr = task.startTime ? `<span class="cal-chip-time">${task.startTime}</span>` : '';

      return `
        <div class="cal-task-chip ${priorityClass} ${isCompleted ? 'is-completed' : ''}" 
             draggable="true" 
             data-id="${task.id}" 
             data-task-id="${task.id}"
             title="${safeTitle} (${task.priority || 'medium'}${task.startTime ? ' • ' + task.startTime : ''})"
             style="--chip-cat-color: ${catColor};">
          <input type="checkbox" 
                 class="cal-task-check" 
                 data-check-id="${task.id}" 
                 ${isCompleted ? 'checked' : ''} 
                 title="Đánh dấu hoàn thành">
          ${timeStr}
          <span class="cal-task-title">${safeTitle}</span>
          <i class="ri-draggable cal-drag-handle" title="Kéo thả đổi ngày"></i>
        </div>
      `;
    }

    // =======================================================================
    // C. CHẾ ĐỘ XEM LỊCH TRÌNH (AGENDA / TIMELINE VIEW)
    // =======================================================================

    _renderAgendaView(allTasks, todayISO) {
      // Lấy danh sách việc trong 30 ngày tới hoặc toàn bộ việc có hạn
      const activeTasks = allTasks.filter(t => t.dueDate).sort((a, b) => {
        if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        return (a.startTime || '99:99').localeCompare(b.startTime || '99:99');
      });

      // Gom theo ngày
      const grouped = {};
      activeTasks.forEach(t => {
        if (!grouped[t.dueDate]) grouped[t.dueDate] = [];
        grouped[t.dueDate].push(t);
      });

      const dateKeys = Object.keys(grouped).sort();

      return `
        <div class="cal-agenda-container">
          <div class="cal-agenda-header">
            <h3><i class="ri-calendar-event-line"></i> Dòng thời gian & Lịch trình Công việc</h3>
            <span class="cal-agenda-stats-badge">${activeTasks.length} công việc đã lên lịch</span>
          </div>

          <div class="cal-agenda-stream">
            ${dateKeys.length === 0 ? `
              <div class="cal-agenda-empty">
                <i class="ri-inbox-line"></i>
                <p>Không có công việc nào trong lịch trình sắp tới!</p>
                <button type="button" class="cal-btn cal-btn-primary" id="cal-agenda-add-btn">
                  <i class="ri-add-line"></i> Tạo sự kiện đầu tiên
                </button>
              </div>
            ` : dateKeys.map(dateStr => {
              const items = grouped[dateStr];
              const dateObj = parseISOToDate(dateStr);
              const isToday = (dateStr === todayISO);
              const lunar = getVietnameseLunarDate(dateObj);
              const totalEst = items.reduce((acc, x) => acc + (x.estimatedMinutes || 60), 0);
              const totalEstHours = (totalEst / 60).toFixed(1);

              return `
                <section class="cal-agenda-day-group ${isToday ? 'is-today' : ''}">
                  <div class="cal-agenda-day-header">
                    <div class="cal-agenda-day-title">
                      <span class="cal-agenda-day-name">${isToday ? 'Hôm nay • ' : ''}${dateStr}</span>
                      <span class="cal-agenda-lunar-tag">${lunar.label}</span>
                    </div>
                    <span class="cal-agenda-summary">${items.length} việc • Dự kiến ~${totalEstHours}h</span>
                  </div>

                  <div class="cal-agenda-items-list">
                    ${items.map(task => {
                      const isCompleted = task.status === 'completed';
                      const safeTitle = escapeHTML(task.title);
                      const timeStr = task.startTime ? `${task.startTime} - ${task.endTime || ''}` : 'Cả ngày';
                      const category = task.category || {};

                      return `
                        <div class="cal-agenda-card ${isCompleted ? 'is-completed' : ''}" data-task-id="${task.id}">
                          <div class="cal-agenda-time-col">
                            <span class="cal-agenda-time-text">${timeStr}</span>
                            <span class="cal-agenda-cat-badge" style="background: ${category.color || '#4F46E5'}22; color: ${category.color || '#4F46E5'};">
                              ${escapeHTML(category.name || 'Công việc')}
                            </span>
                          </div>

                          <div class="cal-agenda-main-col">
                            <input type="checkbox" class="cal-task-check" data-check-id="${task.id}" ${isCompleted ? 'checked' : ''}>
                            <span class="cal-agenda-title">${safeTitle}</span>
                            ${task.location ? `<span class="cal-agenda-loc"><i class="ri-map-pin-line"></i> ${escapeHTML(task.location)}</span>` : ''}
                          </div>

                          <div class="cal-agenda-actions">
                            <button type="button" class="cal-btn-icon" data-focus-task-id="${task.id}" title="Tập trung ngay (Pomodoro)">
                              <i class="ri-play-fill"></i>
                            </button>
                            <button type="button" class="cal-btn-icon" data-edit-task-id="${task.id}" title="Sửa">
                              <i class="ri-edit-line"></i>
                            </button>
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                </section>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    // =======================================================================
    // 3. NGĂN KÉO BACKLOG (UNSCHEDULED / ALL-DAY TASKS DRAWER)
    // =======================================================================

    _renderBacklogSidebar(allTasks, todayISO) {
      if (!this.showBacklog) {
        return `
          <aside class="cal-backlog-drawer collapsed calendar-unscheduled-sidebar">
            <!-- Collapsed state -->
          </aside>
        `;
      }

      // Phân nhóm
      const noDateTasks = allTasks.filter(t => !t.dueDate);
      const allDayTodayTasks = allTasks.filter(t => t.dueDate === todayISO && (!t.startTime || t.isAllDay));
      const overdueTasks = allTasks.filter(t => t.dueDate && t.dueDate < todayISO && t.status !== 'completed');

      let currentList = [];
      if (this.backlogActiveTab === 'all_day') currentList = allDayTodayTasks;
      else if (this.backlogActiveTab === 'no_date') currentList = noDateTasks;
      else if (this.backlogActiveTab === 'overdue') currentList = overdueTasks;

      if (this.backlogSearchQuery) {
        const q = this.backlogSearchQuery.toLowerCase();
        currentList = currentList.filter(t => (t.title || '').toLowerCase().includes(q));
      }

      return `
        <aside class="cal-backlog-drawer calendar-unscheduled-sidebar" 
               data-cal-dropzone="unscheduled"
               title="Ngăn kéo công việc chưa xếp khung giờ">
          
          <div class="cal-backlog-header">
            <div class="cal-backlog-title">
              <i class="ri-inbox-line"></i>
              <span>Việc Chưa Xếp Giờ</span>
            </div>
            <button type="button" id="cal-close-backlog-btn" class="cal-btn-icon" title="Đóng ngăn kéo">
              <i class="ri-close-line"></i>
            </button>
          </div>

          <!-- Tabs phân loại việc trong Backlog -->
          <div class="cal-backlog-tabs">
            <button type="button" class="cal-backlog-tab ${this.backlogActiveTab === 'all_day' ? 'active' : ''}" data-backlog-tab="all_day">
              <span>Hôm nay (${allDayTodayTasks.length})</span>
            </button>
            <button type="button" class="cal-backlog-tab ${this.backlogActiveTab === 'no_date' ? 'active' : ''}" data-backlog-tab="no_date">
              <span>Chưa đặt hạn (${noDateTasks.length})</span>
            </button>
            <button type="button" class="cal-backlog-tab ${this.backlogActiveTab === 'overdue' ? 'active' : ''}" data-backlog-tab="overdue">
              <span>Quá hạn (${overdueTasks.length})</span>
            </button>
          </div>

          <!-- Ô tìm kiếm trong Backlog -->
          <div class="cal-backlog-search">
            <i class="ri-search-line"></i>
            <input type="text" 
                   id="cal-backlog-search-input" 
                   placeholder="Tìm việc chưa xếp giờ..." 
                   value="${escapeHTML(this.backlogSearchQuery)}"
                   autocomplete="off" 
                   spellcheck="false">
          </div>

          <!-- Vùng gợi ý Kéo thả -->
          <div class="unscheduled-dropzone-hint">
            <i class="ri-drag-drop-line"></i>
            <span>Nắm kéo thẻ việc thả vào khung giờ trên lịch</span>
          </div>

          <!-- Danh sách thẻ việc Backlog -->
          <div class="cal-backlog-tasks-list unscheduled-tasks-list">
            ${currentList.length === 0 ? `
              <div class="cal-backlog-empty unscheduled-empty">
                <i class="ri-checkbox-circle-line"></i>
                <p>Không có công việc nào trong mục này!</p>
              </div>
            ` : currentList.map(t => this._renderBacklogCard(t)).join('')}
          </div>

        </aside>
      `;
    }

    _renderBacklogCard(task) {
      const isCompleted = task.status === 'completed';
      const safeTitle = escapeHTML(task.title);
      const category = task.category || {};
      const catColor = category.color || '#4F46E5';

      return `
        <div class="cal-backlog-card cal-task-chip ${isCompleted ? 'is-completed' : ''}" 
             draggable="true" 
             data-id="${task.id}" 
             data-task-id="${task.id}"
             style="--chip-cat-color: ${catColor};"
             title="${safeTitle} (Kéo vào lịch để xếp giờ)">
          
          <div class="cal-backlog-card-left">
            <input type="checkbox" class="cal-task-check" data-check-id="${task.id}" ${isCompleted ? 'checked' : ''}>
            <div class="cal-backlog-card-info">
              <span class="cal-backlog-card-title">${safeTitle}</span>
              <div class="cal-backlog-card-meta">
                <span class="cal-meta-prio priority-${task.priority || 'medium'}">${task.priority || 'medium'}</span>
                ${task.dueDate ? `<span class="cal-meta-due"><i class="ri-calendar-line"></i> ${task.dueDate}</span>` : ''}
              </div>
            </div>
          </div>

          <i class="ri-draggable cal-drag-handle" title="Kéo thả vào khung giờ"></i>
        </div>
      `;
    }

    // =======================================================================
    // 4. TIỆN ÍCH NOW-LINE & CUỘN MƯỢT TIME-GRID
    // =======================================================================

    _initNowLine(todayISO) {
      if (this.nowLineInterval) {
        clearInterval(this.nowLineInterval);
        this.nowLineInterval = null;
      }

      const updateNowLine = () => {
        const lineEl = this.container.querySelector('#cal-live-now-line');
        if (!lineEl) return;
        const now = new Date();
        const minutes = now.getHours() * 60 + now.getMinutes();
        const topPx = (minutes / 60) * this.hourHeight;
        lineEl.style.top = `${topPx}px`;
      };

      updateNowLine();
      this.nowLineInterval = setInterval(updateNowLine, 60000); // 1 phút
    }

    _autoScrollTimeGrid() {
      setTimeout(() => {
        const scrollEl = this.container.querySelector('#cal-timegrid-scroll-viewport');
        if (!scrollEl) return;
        const now = new Date();
        const curHour = now.getHours();
        // Cuộn đến trước giờ hiện tại 1.5 tiếng hoặc mặc định 07:30
        const targetHour = Math.max(0, curHour - 1.5);
        const targetScrollTop = targetHour * this.hourHeight;
        scrollEl.scrollTop = targetScrollTop;
      }, 50);
    }

    // =======================================================================
    // 5. BINDING CÁC SỰ KIỆN TƯƠNG TÁC
    // =======================================================================

    _bindEvents() {
      // 1. Nút Hôm nay, Trước, Sau
      const btnToday = this.container.querySelector('#cal-btn-today');
      const btnPrev = this.container.querySelector('#cal-btn-prev');
      const btnNext = this.container.querySelector('#cal-btn-next');

      if (btnToday) btnToday.addEventListener('click', () => this.goToToday());
      if (btnPrev) btnPrev.addEventListener('click', () => this.prev());
      if (btnNext) btnNext.addEventListener('click', () => this.next());

      // 2. Chuyển đổi 4 chế độ xem
      const segBtns = this.container.querySelectorAll('[data-cal-view]');
      segBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const mode = btn.dataset.calView;
          this.setViewMode(mode);
        });
      });

      // 3. Toggle các lớp phủ & Backlog
      const btnToggleHabits = this.container.querySelector('#cal-toggle-habits');
      const btnTogglePomo = this.container.querySelector('#cal-toggle-pomo');
      const btnToggleBacklog = this.container.querySelector('#cal-toggle-unscheduled');
      const btnCloseBacklog = this.container.querySelector('#cal-close-backlog-btn');

      if (btnToggleHabits) btnToggleHabits.addEventListener('click', () => this.toggleHabitsLayer());
      if (btnTogglePomo) btnTogglePomo.addEventListener('click', () => this.togglePomoLayer());
      if (btnToggleBacklog) btnToggleBacklog.addEventListener('click', () => this.toggleBacklog());
      if (btnCloseBacklog) btnCloseBacklog.addEventListener('click', () => this.toggleBacklog());

      // 4. Tab trong Backlog
      const backlogTabs = this.container.querySelectorAll('[data-backlog-tab]');
      backlogTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          this.backlogActiveTab = tab.dataset.backlogTab;
          this.render();
        });
      });

      // 5. Ô tìm kiếm trong Backlog
      const backlogSearch = this.container.querySelector('#cal-backlog-search-input');
      if (backlogSearch) {
        backlogSearch.addEventListener('input', (e) => {
          this.backlogSearchQuery = e.target.value;
          this._filterBacklogCardsInline(this.backlogSearchQuery);
        });
      }

      // 6. Checkbox hoàn thành việc
      const checkboxes = this.container.querySelectorAll('.cal-task-check');
      checkboxes.forEach(chk => {
        chk.addEventListener('change', (e) => {
          e.stopPropagation();
          const taskId = chk.dataset.checkId;
          const isDone = chk.checked;
          if (taskId) {
            this._updateTask(taskId, { status: isDone ? 'completed' : 'pending' });
          }
        });
      });

      // 7. Điểm danh Thói quen trực tiếp trên All-Day Banner
      const habitPills = this.container.querySelectorAll('[data-habit-id]');
      habitPills.forEach(pill => {
        pill.addEventListener('click', (e) => {
          e.stopPropagation();
          const habitId = pill.dataset.habitId;
          const dateISO = pill.dataset.habitDate;
          if (habitId && typeof window !== 'undefined' && window.TreTHCore && typeof window.TreTHCore.toggleHabitCheckin === 'function') {
            window.TreTHCore.toggleHabitCheckin(habitId, dateISO);
          }
        });
      });

      // 8. Nút "+ Sự kiện mới", Quick-Add tại chỗ ở ô Lịch Tháng & Thêm nhanh ở Cột Giờ
      const btnCreateEvent = this.container.querySelector('#cal-btn-create-event');
      if (btnCreateEvent) {
        btnCreateEvent.addEventListener('click', () => {
          this._openEventModal({
            dueDate: this.selectedDateISO || formatDateISO(new Date()),
            startTime: '09:00',
            endTime: '10:00',
            isAllDay: false
          });
        });
      }

      // Thêm việc nhanh tại chỗ trên ô ngày Tháng (Inline Quick-Add)
      const quickAddMonthBtns = this.container.querySelectorAll('.cal-quick-add-btn');
      quickAddMonthBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const targetDate = btn.dataset.addDate;
          const dayCell = btn.closest('.cal-day-cell');
          if (dayCell) {
            this._promptInlineQuickAdd(dayCell, targetDate);
          } else {
            this._openEventModal({
              dueDate: targetDate,
              startDate: targetDate,
              startTime: '09:00',
              endTime: '10:00',
              isAllDay: false
            });
          }
        });
      });

      // Thêm việc từ cột ngày / lưới giờ khác (Time Grid Column Header)
      const addColBtns = this.container.querySelectorAll('.cal-quick-add-col-btn');
      addColBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const targetDate = btn.dataset.addDate;
          this._openEventModal({
            dueDate: targetDate,
            startDate: targetDate,
            startTime: '09:00',
            endTime: '10:00',
            isAllDay: false
          });
        });
      });

      // 9. Nút "Tập trung ngay (Pomodoro)" trên Time-Block hoặc Agenda
      const focusBtns = this.container.querySelectorAll('[data-focus-task-id]');
      focusBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const taskId = btn.dataset.focusTaskId;
          if (taskId && typeof window !== 'undefined' && window.TreTHCore && typeof window.TreTHCore.startFocusOnTask === 'function') {
            window.TreTHCore.startFocusOnTask(taskId);
          }
        });
      });

      // 10. Nút "Chỉnh sửa" trên Time-Block hoặc Agenda
      const editBtns = this.container.querySelectorAll('[data-edit-task-id]');
      editBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const taskId = btn.dataset.editTaskId;
          const task = this._getAllTasks().find(t => String(t.id) === String(taskId));
          if (task) {
            this._openEventModal(task);
          }
        });
      });

      // 11. Click đúp vào ô ngày trên Lịch Tháng
      const monthCells = this.container.querySelectorAll('.cal-day-cell');
      monthCells.forEach(cell => {
        cell.addEventListener('dblclick', (e) => {
          if (e.target.closest('.cal-task-chip') || e.target.closest('.cal-quick-add-btn') || e.target.closest('.cal-extra-tasks-pill')) return;
          const d = cell.dataset.date;
          if (d) {
            this._openEventModal({ dueDate: d, startDate: d, isAllDay: true });
          }
        });
      });

      // 12. Popover "+N việc khác" trên Lịch Tháng
      const extraPills = this.container.querySelectorAll('[data-more-date]');
      extraPills.forEach(pill => {
        pill.addEventListener('click', (e) => {
          e.stopPropagation();
          const d = pill.dataset.moreDate;
          this._showDayPopover(d, pill);
        });
      });

      // 13. KÉO THẢ (DRAG & DROP) & RESIZE HANDLE & CLICK-DRAG TO CREATE
      this._bindDragAndDrop();
      this._bindResizeHandles();
      this._bindTimeGridClickDragToCreate();
    }

    _filterBacklogCardsInline(query) {
      const q = (query || '').toLowerCase().trim();
      const cards = this.container.querySelectorAll('.cal-backlog-card');
      cards.forEach(c => {
        const title = (c.querySelector('.cal-backlog-card-title')?.textContent || '').toLowerCase();
        c.style.display = (!q || title.includes(q)) ? '' : 'none';
      });
    }

    // =======================================================================
    // 6. KÉO THẢ NÂNG CAO (ADVANCED TIME-BLOCKING DRAG & DROP)
    // =======================================================================

    _bindDragAndDrop() {
      const draggables = this.container.querySelectorAll('[draggable="true"]');
      const dropzones = this.container.querySelectorAll('[data-cal-dropzone]');

      draggables.forEach(elem => {
        elem.addEventListener('dragstart', (e) => {
          elem.classList.add('cal-dragging');
          e.dataTransfer.effectAllowed = 'move';
          const taskId = elem.dataset.taskId || elem.dataset.id;
          e.dataTransfer.setData('text/plain', taskId);
          this.activeDrag = { taskId };
        });

        elem.addEventListener('dragend', () => {
          elem.classList.remove('cal-dragging');
          dropzones.forEach(z => z.classList.remove('cal-drag-over'));
          this.activeDrag = null;
        });
      });

      dropzones.forEach(zone => {
        zone.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          zone.classList.add('cal-drag-over');
        });

        zone.addEventListener('dragleave', (e) => {
          if (!zone.contains(e.relatedTarget)) {
            zone.classList.remove('cal-drag-over');
          }
        });

        zone.addEventListener('drop', (e) => {
          e.preventDefault();
          zone.classList.remove('cal-drag-over');
          const taskId = e.dataTransfer.getData('text/plain');
          if (!taskId) return;

          const dropTarget = zone.dataset.calDropzone;

          // TH 1: Thả vào Backlog -> Bỏ giờ / Bỏ ngày hạn
          if (dropTarget === 'unscheduled') {
            this._updateTask(taskId, {
              startTime: null,
              endTime: null,
              isAllDay: true,
              dueDate: ''
            });
            return;
          }

          // TH 2: Thả vào ô Cả Ngày (All-Day banner)
          const isAllDayDrop = zone.dataset.dropAllday === 'true';
          if (isAllDayDrop) {
            this._updateTask(taskId, {
              dueDate: dropTarget,
              startDate: dropTarget,
              startTime: null,
              endTime: null,
              isAllDay: true
            });
            return;
          }

          // TH 3: Thả vào cột giờ (Time-Grid Column) -> Snap 15 phút!
          if (zone.classList.contains('cal-day-column')) {
            const rect = zone.getBoundingClientRect();
            const yOffset = e.clientY - rect.top;
            const rawMinutes = (yOffset / this.hourHeight) * 60;
            const snappedStart = snapMinutesTo15(rawMinutes);

            // Tìm task hiện tại để tính duration
            const task = this._getAllTasks().find(t => String(t.id) === String(taskId));
            const duration = (task && task.estimatedMinutes) ? task.estimatedMinutes : 60;
            const snappedEnd = Math.min(1440, snappedStart + duration);

            this._updateTask(taskId, {
              dueDate: dropTarget,
              startDate: dropTarget,
              startTime: formatMinutesToTime(snappedStart),
              endTime: formatMinutesToTime(snappedEnd),
              isAllDay: false,
              estimatedMinutes: duration
            });
            return;
          }

          // TH 4: Thả vào ô ngày Lịch Tháng
          if (zone.classList.contains('cal-day-cell')) {
            this._updateTask(taskId, {
              dueDate: dropTarget,
              startDate: dropTarget
            });
          }
        });
      });
    }

    // =======================================================================
    // 7. KÉO GIÃN THỜI LƯỢNG (RESIZE HANDLE)
    // =======================================================================

    _bindResizeHandles() {
      const handles = this.container.querySelectorAll('.cal-resize-handle');
      handles.forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          e.preventDefault();

          const taskId = handle.dataset.resizeTaskId;
          const block = handle.closest('.cal-time-block');
          if (!taskId || !block) return;

          const initialY = e.clientY;
          const initialHeight = block.offsetHeight;
          const task = this._getAllTasks().find(t => String(t.id) === String(taskId));
          const sMin = parseTimeToMinutes(task?.startTime) || 540;

          const onMouseMove = (moveEvent) => {
            const deltaY = moveEvent.clientY - initialY;
            const newHeight = Math.max(26, initialHeight + deltaY);
            block.style.height = `${newHeight}px`;

            // Snap và hiển thị giờ kết thúc tạm thời
            const durationMin = snapMinutesTo15((newHeight / this.hourHeight) * 60);
            const eMin = Math.min(1440, sMin + Math.max(15, durationMin));
            const timeSpan = block.querySelector('.cal-block-time');
            if (timeSpan && task) {
              timeSpan.textContent = `${task.startTime} - ${formatMinutesToTime(eMin)}`;
            }
          };

          const onMouseUp = (upEvent) => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            const finalHeight = block.offsetHeight;
            const finalDuration = snapMinutesTo15((finalHeight / this.hourHeight) * 60);
            const validDuration = Math.max(15, finalDuration);
            const eMin = Math.min(1440, sMin + validDuration);

            this._updateTask(taskId, {
              endTime: formatMinutesToTime(eMin),
              estimatedMinutes: validDuration
            });
          };

          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        });
      });
    }

    // =======================================================================
    // 8. KÉO TRÊN VÙNG TRỐNG ĐỂ TẠO NHANH (CLICK & DRAG TO CREATE)
    // =======================================================================

    _bindTimeGridClickDragToCreate() {
      const columns = this.container.querySelectorAll('.cal-day-column');
      columns.forEach(col => {
        col.addEventListener('mousedown', (e) => {
          // Bỏ qua nếu click lên time block, nút hoặc thanh resize
          if (e.target.closest('.cal-time-block') || e.target.closest('button') || e.target.closest('input')) return;

          const colDate = col.dataset.colDate;
          const rect = col.getBoundingClientRect();
          const startY = e.clientY - rect.top;
          const rawStartMin = (startY / this.hourHeight) * 60;
          const startMin = snapMinutesTo15(rawStartMin);

          // Tạo khung chọn mờ
          const selectionBox = document.createElement('div');
          selectionBox.className = 'cal-drag-create-selection';
          selectionBox.style.top = `${(startMin / 60) * this.hourHeight}px`;
          selectionBox.style.height = `${(30 / 60) * this.hourHeight}px`;
          col.appendChild(selectionBox);

          let currentEndMin = startMin + 30;

          const onMouseMove = (moveEvt) => {
            const currentY = moveEvt.clientY - rect.top;
            const rawCurMin = (currentY / this.hourHeight) * 60;
            currentEndMin = Math.max(startMin + 15, snapMinutesTo15(rawCurMin));
            const duration = currentEndMin - startMin;
            selectionBox.style.height = `${(duration / 60) * this.hourHeight}px`;
            selectionBox.textContent = `${formatMinutesToTime(startMin)} - ${formatMinutesToTime(currentEndMin)}`;
          };

          const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            selectionBox.remove();

            // Mở modal tạo việc với giờ đã quét chọn
            this._openEventModal({
              dueDate: colDate,
              startDate: colDate,
              startTime: formatMinutesToTime(startMin),
              endTime: formatMinutesToTime(currentEndMin),
              estimatedMinutes: currentEndMin - startMin,
              isAllDay: false
            });
          };

          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        });
      });
    }

    // =======================================================================
    // 9. EVENT DIALOG / MODAL (HỘP THOẠI LÊN LỊCH & CHỈNH SỬA)
    // =======================================================================

    _openEventModal(initialData = {}) {
      // Xóa modal cũ nếu có
      const oldModal = document.getElementById('cal-event-dialog');
      if (oldModal) oldModal.remove();

      const isEdit = Boolean(initialData.id);
      const title = initialData.title || '';
      const catId = initialData.categoryId || 'cat-ke-hoach';
      const prio = initialData.priority || 'medium';
      const dueDate = initialData.dueDate || formatDateISO(new Date());
      const startDate = initialData.startDate || dueDate;
      const startTime = initialData.startTime || '09:00';
      const endTime = initialData.endTime || '10:00';
      const isAllDay = initialData.isAllDay !== false && !initialData.startTime;
      const desc = initialData.description || '';
      const loc = initialData.location || '';
      const rec = initialData.recurring || 'none';

      const categories = this._getCategories();

      const modalEl = document.createElement('div');
      modalEl.id = 'cal-event-dialog';
      modalEl.className = 'cal-event-modal-backdrop active';
      modalEl.innerHTML = `
        <div class="cal-event-modal-card">
          <div class="cal-event-modal-header">
            <h3><i class="ri-calendar-event-line"></i> ${isEdit ? 'Chỉnh sửa Lịch biểu' : 'Tạo Khung Giờ / Sự Kiện'}</h3>
            <button type="button" class="cal-modal-close-btn" id="cal-modal-close"><i class="ri-close-line"></i></button>
          </div>

          <form id="cal-event-form" class="cal-event-form">
            <!-- Tiêu đề -->
            <div class="cal-form-group">
              <label for="cal-form-title">Tên sự kiện / công việc <span class="req">*</span></label>
              <input type="text" id="cal-form-title" class="cal-form-input" value="${escapeHTML(title)}" placeholder="VD: Họp chiến lược sản phẩm..." required autocomplete="off" spellcheck="false">
            </div>

            <!-- Công tắc Cả ngày & Khung giờ -->
            <div class="cal-form-row">
              <label class="cal-checkbox-label">
                <input type="checkbox" id="cal-form-allday" ${isAllDay ? 'checked' : ''}>
                <span>Cả ngày (All-Day)</span>
              </label>
            </div>

            <div class="cal-form-row cal-time-inputs-row" id="cal-time-fields" style="${isAllDay ? 'display: none;' : ''}">
              <div class="cal-form-group cal-flex-1">
                <label for="cal-form-starttime">Bắt đầu</label>
                <input type="time" id="cal-form-starttime" class="cal-form-input" value="${startTime}">
              </div>
              <div class="cal-form-group cal-flex-1">
                <label for="cal-form-endtime">Kết thúc</label>
                <input type="time" id="cal-form-endtime" class="cal-form-input" value="${endTime}">
              </div>
            </div>

            <!-- Ngày tháng -->
            <div class="cal-form-row">
              <div class="cal-form-group cal-flex-1">
                <label for="cal-form-startdate">Ngày bắt đầu</label>
                <input type="date" id="cal-form-startdate" class="cal-form-input" value="${startDate}">
              </div>
              <div class="cal-form-group cal-flex-1">
                <label for="cal-form-duedate">Ngày đến hạn</label>
                <input type="date" id="cal-form-duedate" class="cal-form-input" value="${dueDate}">
              </div>
            </div>

            <!-- Phân loại & Mức độ ưu tiên -->
            <div class="cal-form-row">
              <div class="cal-form-group cal-flex-1">
                <label for="cal-form-category">Loại việc</label>
                <select id="cal-form-category" class="cal-form-select">
                  ${categories.map(c => `
                    <option value="${c.id}" ${c.id === catId ? 'selected' : ''}>${c.icon || c.emoji || '📁'} ${escapeHTML(c.name)}</option>
                  `).join('')}
                </select>
              </div>

              <div class="cal-form-group cal-flex-1">
                <label for="cal-form-priority">Ưu tiên</label>
                <select id="cal-form-priority" class="cal-form-select">
                  <option value="high" ${prio === 'high' ? 'selected' : ''}>🔥 Cao (Khẩn cấp)</option>
                  <option value="medium" ${prio === 'medium' ? 'selected' : ''}>⚡ Vừa (Tiêu chuẩn)</option>
                  <option value="low" ${prio === 'low' ? 'selected' : ''}>🌱 Thấp</option>
                  <option value="none" ${prio === 'none' ? 'selected' : ''}>Không ưu tiên</option>
                </select>
              </div>
            </div>

            <!-- Địa điểm / Họp trực tuyến -->
            <div class="cal-form-group">
              <label for="cal-form-loc"><i class="ri-map-pin-line"></i> Địa điểm / Link họp</label>
              <input type="text" id="cal-form-loc" class="cal-form-input" value="${escapeHTML(loc)}" placeholder="Phòng họp A hoặc link Google Meet / Zoom...">
            </div>

            <!-- Nút Hành động Footer -->
            <div class="cal-event-modal-footer">
              ${isEdit ? `
                <button type="button" id="cal-btn-delete-event" class="cal-btn-danger" title="Xóa sự kiện">
                  <i class="ri-delete-bin-line"></i> Xóa
                </button>
                <button type="button" id="cal-btn-focus-now" class="cal-btn-focus" title="Bắt đầu Pomodoro cho việc này">
                  <i class="ri-play-fill"></i> Tập trung ngay
                </button>
              ` : '<div></div>'}

              <div class="cal-footer-right-btns">
                <button type="button" class="cal-btn-secondary" id="cal-modal-cancel">Hủy</button>
                <button type="submit" class="cal-btn-primary" id="cal-modal-save">
                  <i class="ri-save-line"></i> ${isEdit ? 'Lưu thay đổi' : 'Tạo sự kiện'}
                </button>
              </div>
            </div>

          </form>
        </div>
      `;

      document.body.appendChild(modalEl);

      // Focus ô tiêu đề
      const titleInp = modalEl.querySelector('#cal-form-title');
      if (titleInp) setTimeout(() => titleInp.focus(), 50);

      // Toggle ẩn/hiện giờ khi chọn Cả ngày
      const alldayChk = modalEl.querySelector('#cal-form-allday');
      const timeFields = modalEl.querySelector('#cal-time-fields');
      if (alldayChk && timeFields) {
        alldayChk.addEventListener('change', () => {
          timeFields.style.display = alldayChk.checked ? 'none' : 'flex';
        });
      }

      // Đóng modal
      const closeModal = () => modalEl.remove();
      modalEl.querySelector('#cal-modal-close').addEventListener('click', closeModal);
      modalEl.querySelector('#cal-modal-cancel').addEventListener('click', closeModal);
      modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) closeModal();
      });

      // Submit Form
      const form = modalEl.querySelector('#cal-event-form');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const newTitle = titleInp.value.trim();
        if (!newTitle) return;

        const isAllDayVal = alldayChk.checked;
        const sTime = isAllDayVal ? null : modalEl.querySelector('#cal-form-starttime').value;
        const eTime = isAllDayVal ? null : modalEl.querySelector('#cal-form-endtime').value;
        const sDate = modalEl.querySelector('#cal-form-startdate').value;
        const dDate = modalEl.querySelector('#cal-form-duedate').value || sDate;
        const chosenCat = modalEl.querySelector('#cal-form-category').value;
        const chosenPrio = modalEl.querySelector('#cal-form-priority').value;
        const locationVal = modalEl.querySelector('#cal-form-loc').value.trim();

        let estMin = 60;
        if (!isAllDayVal && sTime && eTime) {
          const sMin = parseTimeToMinutes(sTime) || 0;
          const eMin = parseTimeToMinutes(eTime) || (sMin + 60);
          estMin = Math.max(15, eMin - sMin);
        }

        const payload = {
          title: newTitle,
          categoryId: chosenCat,
          priority: chosenPrio,
          startDate: sDate,
          dueDate: dDate,
          startTime: sTime,
          endTime: eTime,
          isAllDay: isAllDayVal,
          estimatedMinutes: estMin,
          location: locationVal,
          status: initialData.status || 'pending'
        };

        if (isEdit) {
          this._updateTask(initialData.id, payload);
        } else {
          this._createTask(payload);
        }

        closeModal();
      });

      // Nút Xóa
      const delBtn = modalEl.querySelector('#cal-btn-delete-event');
      if (delBtn && isEdit) {
        delBtn.addEventListener('click', () => {
          const confirmFn = (typeof window !== 'undefined' && typeof window.__trethSafeConfirm === 'function')
            ? window.__trethSafeConfirm
            : (msg => typeof confirm === 'function' ? confirm(msg) : true);
          if (confirmFn(`Bạn có chắc chắn muốn xóa sự kiện:\n"${initialData.title}" không?`)) {
            this._deleteTask(initialData.id);
            closeModal();
          }
        });
      }

      // Nút Tập trung ngay
      const focusBtn = modalEl.querySelector('#cal-btn-focus-now');
      if (focusBtn && isEdit) {
        focusBtn.addEventListener('click', () => {
          closeModal();
          if (typeof window !== 'undefined' && window.TreTHCore && typeof window.TreTHCore.startFocusOnTask === 'function') {
            window.TreTHCore.startFocusOnTask(initialData.id);
          }
        });
      }
    }

    _showDayPopover(dateISO, targetElement) {
      // Xóa popover cũ
      const old = document.querySelector('.cal-day-detail-popover');
      if (old) old.remove();

      const dayTasks = this._getAllTasks().filter(t => t.dueDate === dateISO);
      const lunar = getVietnameseLunarDate(dateISO);

      const popover = document.createElement('div');
      popover.className = 'cal-day-detail-popover';
      popover.innerHTML = `
        <div class="cal-popover-header">
          <div>
            <strong>${dateISO}</strong>
            <span class="cal-popover-lunar">${lunar.label}</span>
          </div>
          <button type="button" class="cal-btn-icon" id="cal-close-popover"><i class="ri-close-line"></i></button>
        </div>

        <div class="cal-popover-list">
          ${dayTasks.map(t => this._renderTaskChip(t)).join('')}
        </div>

        <button type="button" class="cal-btn cal-btn-primary cal-popover-add" id="cal-popover-add-btn">
          <i class="ri-add-line"></i> Thêm việc cho ngày này
        </button>
      `;

      document.body.appendChild(popover);

      // Căn vị trí
      const rect = targetElement.getBoundingClientRect();
      popover.style.top = `${Math.min(window.innerHeight - 300, rect.bottom + 8)}px`;
      popover.style.left = `${Math.min(window.innerWidth - 300, rect.left)}px`;

      popover.querySelector('#cal-close-popover').addEventListener('click', () => popover.remove());
      popover.querySelector('#cal-popover-add-btn').addEventListener('click', () => {
        popover.remove();
        this._openEventModal({ dueDate: dateISO, startDate: dateISO });
      });

      // Đóng khi click ngoài
      const onDocClick = (e) => {
        if (!popover.contains(e.target) && e.target !== targetElement) {
          popover.remove();
          document.removeEventListener('click', onDocClick);
        }
      };
      setTimeout(() => document.addEventListener('click', onDocClick), 50);
    }

    // =======================================================================
    // 10. PHÍM TẮT BÀN PHÍM TOÀN CỤC
    // =======================================================================

    _bindKeyboardShortcuts() {
      document.addEventListener('keydown', (e) => {
        // Bỏ qua nếu đang gõ văn bản
        const tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
        // Bỏ qua nếu Calendar view không hiển thị
        if (!this.container || this.container.offsetParent === null) return;

        const key = (e.key || '').toLowerCase();
        if (!key) return;
        if (key === 't') {
          e.preventDefault();
          this.goToToday();
        } else if (key === 'j' || e.key === 'ArrowLeft') {
          e.preventDefault();
          this.prev();
        } else if (key === 'k' || e.key === 'ArrowRight') {
          e.preventDefault();
          this.next();
        } else if (key === 'd') {
          e.preventDefault();
          this.setViewMode('day');
        } else if (key === 'w') {
          e.preventDefault();
          this.setViewMode('week');
        } else if (key === 'm') {
          e.preventDefault();
          this.setViewMode('month');
        } else if (key === 'a') {
          e.preventDefault();
          this.setViewMode('agenda');
        }
      });
    }

    // =======================================================================
    // 11. HÀM CẬP NHẬT DỮ LIỆU QUA REPO / STORE & INLINE QUICK-ADD
    // =======================================================================

    _promptInlineQuickAdd(dayCell, targetDate) {
      // Xóa hộp thoại thêm việc nhanh cũ nếu có
      const existing = this.container.querySelectorAll('.cal-inline-add-box');
      existing.forEach(el => el.remove());

      const inlineBox = document.createElement('div');
      inlineBox.className = 'cal-inline-add-box';
      inlineBox.innerHTML = `
        <input type="text" class="cal-inline-add-input" placeholder="Tên việc cần làm..." autocomplete="off">
        <div class="cal-inline-add-actions">
          <button type="button" class="cal-inline-cancel-btn" title="Hủy bỏ"><i class="ri-close-line"></i></button>
          <button type="button" class="cal-inline-save-btn" title="Lưu việc"><span>Lưu</span></button>
        </div>
      `;

      const header = dayCell.querySelector('.cal-day-header');
      if (header && header.nextSibling) {
        dayCell.insertBefore(inlineBox, header.nextSibling);
      } else {
        dayCell.appendChild(inlineBox);
      }

      const input = inlineBox.querySelector('.cal-inline-add-input');
      const saveBtn = inlineBox.querySelector('.cal-inline-save-btn');
      const cancelBtn = inlineBox.querySelector('.cal-inline-cancel-btn');

      const doSave = () => {
        const title = (input.value || '').trim();
        if (!title) {
          inlineBox.remove();
          return;
        }
        this._createTask({
          title,
          dueDate: targetDate,
          startDate: targetDate,
          status: 'pending',
          priority: 'medium',
          isAllDay: true
        });
        inlineBox.remove();
      };

      const doCancel = () => {
        inlineBox.remove();
      };

      saveBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        doSave();
      });

      cancelBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        doCancel();
      });

      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          doSave();
        } else if (ev.key === 'Escape') {
          ev.preventDefault();
          doCancel();
        }
      });

      inlineBox.addEventListener('click', (ev) => ev.stopPropagation());
      inlineBox.addEventListener('dblclick', (ev) => ev.stopPropagation());

      input.focus();
    }

    _updateTask(taskId, patch) {
      if (typeof window !== 'undefined' && window.TreTHCore && typeof window.TreTHCore.updateTask === 'function') {
        return window.TreTHCore.updateTask(taskId, patch);
      } else if (this.repo && typeof this.repo.updateTask === 'function') {
        return this.repo.updateTask(taskId, patch);
      }
    }

    _createTask(taskData) {
      if (typeof window !== 'undefined' && window.TreTHCore && typeof window.TreTHCore.createTask === 'function') {
        return window.TreTHCore.createTask(taskData);
      } else if (this.repo && typeof this.repo.createTask === 'function') {
        return this.repo.createTask(taskData);
      }
    }

    _deleteTask(taskId) {
      if (typeof window !== 'undefined' && window.TreTHCore && typeof window.TreTHCore.deleteTask === 'function') {
        return window.TreTHCore.deleteTask(taskId);
      } else if (this.repo && typeof this.repo.deleteTask === 'function') {
        return this.repo.deleteTask(taskId);
      }
    }
  }

  return CalendarView;
}));
