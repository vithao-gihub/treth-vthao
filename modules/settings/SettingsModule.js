// modules/settings/SettingsModule.js
/**
 * TreTH - Settings, Theme & Data Management Module
 * Quản lý cấu hình hệ thống, Chế độ sáng/tối, Xuất/Nhập dữ liệu JSON và Excel.
 * Kết nối trực tiếp qua LocalRepository.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SettingsModule = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  class SettingsModule {
    constructor(repository, options = {}) {
      this.repo = repository || (typeof window !== 'undefined' ? window.__localRepo : null);
      this.options = options;
      this.currentTheme = this.repo ? this.repo.getTheme() : 'dark';
      this.deferredInstallPrompt = null;
      this.listeners = new Set();
    }

    getTheme() {
      return this.currentTheme;
    }

    setTheme(theme) {
      this.currentTheme = theme === 'light' ? 'light' : 'dark';
      if (this.repo) this.repo.setTheme(this.currentTheme);

      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        document.body.setAttribute('data-theme', this.currentTheme);
      }
      this._notify();
    }

    toggleTheme() {
      const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
      this.setTheme(nextTheme);
      return nextTheme;
    }

    // =========================================================================
    // JSON EXPORT / IMPORT
    // =========================================================================
    exportJSON() {
      if (!this.repo) return null;
      const data = this.repo.exportAllData();
      const jsonStr = JSON.stringify(data, null, 2);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `TreTH_Backup_${dateStr}.json`;

      this._downloadFile(jsonStr, filename, 'application/json');
      return { success: true, filename };
    }

    async importJSON(file) {
      if (!file || !this.repo) return { success: false, message: 'Tệp không hợp lệ' };
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const ok = this.repo.importAllData(parsed);
        if (ok) {
          this._notify();
          return { success: true, message: 'Khôi phục dữ liệu TreTH thành công!' };
        } else {
          return { success: false, message: 'Định dạng tệp không khớp' };
        }
      } catch (err) {
        return { success: false, message: `Lỗi đọc tệp: ${err.message}` };
      }
    }

    // =========================================================================
    // EXCEL EXPORT / IMPORT (SheetJS)
    // =========================================================================
    exportExcel() {
      if (!this.repo) return { success: false };
      const tasks = this.repo.getAllTasks();
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `TreTH_Tasks_${dateStr}.xlsx`;

      if (typeof XLSX === 'undefined') {
        console.warn('[SettingsModule] SheetJS (XLSX) not found');
        return { success: false, message: 'Thư viện SheetJS chưa sẵn sàng' };
      }

      const rows = tasks.map((t, idx) => ({
        'STT': idx + 1,
        'Tiêu đề': t.title,
        'Trạng thái': t.status === 'completed' ? 'Hoàn thành' : (t.status === 'in-progress' ? 'Đang làm' : 'Chưa làm'),
        'Loại việc': t.category ? t.category.name : '',
        'Góc ma trận': t.quadrant ? t.quadrant.toUpperCase() : 'Q2',
        'Độ ưu tiên': t.priority || 'medium',
        'Hạn chót': t.dueDate || '',
        'Thời gian tập trung (phút)': t.actualTime || 0,
        'Ghi chú': t.description || ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Công việc TreTH');
      XLSX.writeFile(workbook, filename);

      return { success: true, filename, count: rows.length };
    }

    downloadExcelTemplate() {
      if (typeof XLSX === 'undefined') return { success: false };
      const sampleRows = [
        {
          'Tiêu đề': 'Soạn thảo báo cáo tuần mới',
          'Trạng thái': 'Chưa làm',
          'Loại việc': 'Công việc',
          'Góc ma trận': 'Q1',
          'Độ ưu tiên': 'high',
          'Hạn chót': new Date().toISOString().split('T')[0],
          'Ghi chú': 'Báo cáo tổng kết hiệu suất'
        },
        {
          'Tiêu đề': 'Học thêm 1 bài tiếng Anh',
          'Trạng thái': 'Chưa làm',
          'Loại việc': 'Học tập',
          'Góc ma trận': 'Q2',
          'Độ ưu tiên': 'medium',
          'Hạn chót': '',
          'Ghi chú': 'Từ vựng chuyên ngành'
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(sampleRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Mẫu Nhập Liệu');
      XLSX.writeFile(workbook, 'Mau_Nhap_Cong_Viec_TreTH.xlsx');
      return { success: true };
    }

    async importExcel(file) {
      if (!file || !this.repo || typeof XLSX === 'undefined') {
        return { success: false, message: 'Không thể xử lý tệp Excel' };
      }
      try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet);

        let importedCount = 0;
        rows.forEach(r => {
          const title = r['Tiêu đề'] || r['Tên công việc'] || r['Title'];
          if (title) {
            let status = 'pending';
            const rawStatus = String(r['Trạng thái'] || '').toLowerCase();
            if (rawStatus.includes('hoàn thành') || rawStatus === 'done' || rawStatus === 'completed') status = 'completed';
            else if (rawStatus.includes('đang') || rawStatus === 'in_progress') status = 'in-progress';

            let quadrant = String(r['Góc ma trận'] || 'q2').toLowerCase();
            if (!['q1', 'q2', 'q3', 'q4'].includes(quadrant)) quadrant = 'q2';

            this.repo.createTask({
              title: String(title).trim(),
              status,
              quadrant,
              priority: r['Độ ưu tiên'] || 'medium',
              dueDate: r['Hạn chót'] || '',
              description: r['Ghi chú'] || ''
            });
            importedCount++;
          }
        });

        this._notify();
        return { success: true, count: importedCount, message: `Đã nhập thành công ${importedCount} công việc!` };
      } catch (err) {
        return { success: false, message: `Lỗi đọc Excel: ${err.message}` };
      }
    }

    // Helper tải Blob về máy (Web, Electron & Android)
    _downloadFile(content, filename, mimeType) {
      if (typeof window === 'undefined') return;
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 200);
    }

    setInstallPrompt(e) {
      this.deferredInstallPrompt = e;
      this._notify();
    }

    async promptPWAInstall() {
      if (!this.deferredInstallPrompt) return false;
      this.deferredInstallPrompt.prompt();
      const choice = await this.deferredInstallPrompt.userChoice;
      this.deferredInstallPrompt = null;
      this._notify();
      return choice.outcome === 'accepted';
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
        try { fn(state); } catch (e) { console.error('[SettingsModule] Listener error:', e); }
      });
    }

    getState() {
      return {
        theme: this.currentTheme,
        canInstallPWA: Boolean(this.deferredInstallPrompt)
      };
    }
  }

  return SettingsModule;
}));

