// modules/notes/NotesModule.js
/**
 * TreTH - Notes Module
 * Quản lý ghi chú nhanh, gắn thẻ phân loại, ghim đầu trang và bộ phân tích Markdown.
 * Kết nối dữ liệu trực tiếp qua LocalRepository.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NotesModule = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  class NotesModule {
    constructor(repository, options = {}) {
      this.repo = repository || (typeof window !== 'undefined' ? window.__localRepo : null);
      this.options = options;
      this.currentTag = 'all';
      this.searchQuery = '';
      this.listeners = new Set();

      if (this.repo) {
        this.repo.subscribe('notes', () => this._notify());
      }
    }

    getAllNotes() {
      return this.repo ? this.repo.getNotes() : [];
    }

    getFilteredNotes() {
      let list = this.getAllNotes();

      // Lọc theo tag
      if (this.currentTag !== 'all') {
        list = list.filter(n => Array.isArray(n.tags) && n.tags.includes(this.currentTag));
      }

      // Tìm kiếm theo từ khóa
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase().trim();
        list = list.filter(n => {
          const inTitle = (n.title || '').toLowerCase().includes(q);
          const inContent = (n.content || '').toLowerCase().includes(q);
          const inTags = Array.isArray(n.tags) && n.tags.some(t => t.toLowerCase().includes(q));
          return inTitle || inContent || inTags;
        });
      }

      // Sắp xếp: Ghim lên trước, sau đó theo thời gian cập nhật mới nhất
      return list.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
        const timeA = new Date(a.updatedAt || 0).getTime();
        const timeB = new Date(b.updatedAt || 0).getTime();
        return timeB - timeA;
      });
    }

    getPinnedNotes() {
      return this.getFilteredNotes().filter(n => n.isPinned);
    }

    getRegularNotes() {
      return this.getFilteredNotes().filter(n => !n.isPinned);
    }

    getAllTags() {
      const notes = this.getAllNotes();
      const tagsSet = new Set();
      notes.forEach(n => {
        if (Array.isArray(n.tags)) {
          n.tags.forEach(t => {
            const clean = String(t).trim();
            if (clean) tagsSet.add(clean);
          });
        }
      });
      return Array.from(tagsSet);
    }

    getNoteById(id) {
      return this.repo ? this.repo.getNoteById(id) : null;
    }

    createNote(noteData) {
      if (!this.repo) return null;
      const created = this.repo.createNote(noteData);
      this._notify();
      return created;
    }

    updateNote(id, changes) {
      if (!this.repo) return null;
      const updated = this.repo.updateNote(id, changes);
      this._notify();
      return updated;
    }

    deleteNote(id) {
      if (!this.repo) return null;
      const deleted = this.repo.deleteNote(id);
      this._notify();
      return deleted;
    }

    togglePin(id) {
      const note = this.getNoteById(id);
      if (!note) return null;
      return this.updateNote(id, { isPinned: !note.isPinned });
    }

    setFilterTag(tag) {
      this.currentTag = tag || 'all';
      this._notify();
    }

    setSearch(query) {
      this.searchQuery = query || '';
      this._notify();
    }

    /**
     * Trình phân tích Markdown an toàn, hỗ trợ tiêu đề, in đậm, checklist, trích dẫn
     */
    parseMarkdown(mdText) {
      if (!mdText) return '';
      let escaped = mdText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Headers (# -> h1, ## -> h2, ### -> h3)
      escaped = escaped.replace(/^### (.*$)/gim, '<h3 style="margin: 6px 0; font-size: 1.1rem; color: var(--text-main);">$1</h3>');
      escaped = escaped.replace(/^## (.*$)/gim, '<h2 style="margin: 8px 0; font-size: 1.25rem; color: var(--text-main);">$1</h2>');
      escaped = escaped.replace(/^# (.*$)/gim, '<h1 style="margin: 10px 0; font-size: 1.4rem; color: var(--text-main); font-weight: 700;">$1</h1>');

      // Bold & Italic
      escaped = escaped.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
      escaped = escaped.replace(/\*(.*?)\*/gim, '<em>$1</em>');

      // Checklist [x] and [ ]
      escaped = escaped.replace(/^- \[x\] (.*$)/gim, '<div style="display:flex; align-items:center; gap:6px; margin:3px 0;"><span style="color:#10B981;">☑</span> <span style="text-decoration: line-through; opacity:0.75;">$1</span></div>');
      escaped = escaped.replace(/^- \[ \] (.*$)/gim, '<div style="display:flex; align-items:center; gap:6px; margin:3px 0;"><span style="opacity:0.5;">☐</span> <span>$1</span></div>');

      // Lists (- or *)
      escaped = escaped.replace(/^\- (.*$)/gim, '<li style="margin-left: 18px;">$1</li>');

      // Blockquotes (> text)
      escaped = escaped.replace(/^> (.*$)/gim, '<blockquote style="border-left: 3px solid #10B981; padding-left: 10px; margin: 8px 0; color: var(--text-muted); font-style: italic;">$1</blockquote>');

      // Line breaks
      escaped = escaped.replace(/\n/gim, '<br>');

      return escaped;
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
        try { fn(state); } catch (e) { console.error('[NotesModule] Listener error:', e); }
      });
    }

    getState() {
      return {
        tag: this.currentTag,
        search: this.searchQuery,
        notes: this.getFilteredNotes(),
        pinnedNotes: this.getPinnedNotes(),
        regularNotes: this.getRegularNotes(),
        allTags: this.getAllTags(),
        totalCount: this.getAllNotes().length
      };
    }
  }

  return NotesModule;
}));
