// ui/KanbanView.js
/**
 * TreTH - Kanban View Component (Trello + TickTick Hybrid)
 * Hỗ trợ kéo thả 3 cột (To Do, In Progress, Done), chỉnh sửa inline không cần nút rườm rà,
 * và tích hợp giải pháp xử lý bàn phím di động (Mobile Keyboard Fix).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.KanbanView = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  class KanbanView {
    constructor(containerEl, repository, options = {}) {
      this.container = containerEl;
      this.repo = repository;
      this.options = options;
      this.columns = [
        { id: 'TODO', statusMatch: ['TODO', 'pending'], title: 'Cần làm (To Do)', icon: 'ri-list-check' },
        { id: 'IN_PROGRESS', statusMatch: ['IN_PROGRESS', 'in-progress'], title: 'Đang làm (In Progress)', icon: 'ri-loader-4-line' },
        { id: 'DONE', statusMatch: ['DONE', 'completed'], title: 'Hoàn thành (Done)', icon: 'ri-checkbox-circle-line' }
      ];

      this._setupMobileKeyboardFix();
      if (this.repo && typeof this.repo.subscribe === 'function') {
        this.unsubscribe = this.repo.subscribe(tasks => this.render(tasks));
      }
    }

    /**
     * Lắng nghe VisualViewport để không bị vỡ giao diện hoặc che mất input khi bật bàn phím ảo trên Mobile Android
     */
    _setupMobileKeyboardFix() {
      if (typeof window !== 'undefined' && window.visualViewport) {
        let prevOffset = 0;
        const updateOffset = () => {
          const offset = Math.max(0, window.innerHeight - window.visualViewport.height);
          document.documentElement.style.setProperty('--keyboard-offset', `${offset}px`);

          // Chỉ cuộn nhẹ khi bàn phím ảo vừa bật lên (tránh cuộn lặp khi đang gõ hoặc bấm phím xóa)
          if (offset > 80 && prevOffset <= 60 && document.activeElement) {
            const el = document.activeElement;
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) {
              setTimeout(() => {
                try {
                  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } catch (e) {}
              }, 60);
            }
          }
          prevOffset = offset;
        };

        window.visualViewport.addEventListener('resize', updateOffset);
      }
    }

    render(tasks) {
      if (!this.container) return;

      const taskList = Array.isArray(tasks) ? tasks.filter(t => !t.isDeleted) : [];

      this.container.innerHTML = `
        <div class="kanban-board">
          ${this.columns.map(col => {
            const colTasks = taskList.filter(t => {
              const currentStatus = t.kanbanStatus || t.status || 'pending';
              return col.statusMatch.includes(currentStatus) || col.id === currentStatus;
            });

            return `
              <div class="kanban-column" data-status="${col.id}">
                <div class="column-header">
                  <span class="column-title">
                    <i class="${col.icon}"></i> ${col.title}
                  </span>
                  <span class="count-badge">${colTasks.length}</span>
                </div>
                
                <div class="card-list" data-dropzone="${col.id}">
                  ${colTasks.length === 0 ? `
                    <div class="kanban-empty-zone">
                      <i class="ri-drag-drop-line"></i>
                      <span>Kéo thả thẻ vào đây</span>
                    </div>
                  ` : colTasks.map(task => this._renderCard(task, col.id)).join('')}
                </div>

                <div class="column-footer">
                  <form class="column-quick-add" data-column="${col.id}">
                    <input 
                      type="text" 
                      class="column-quick-input" 
                      placeholder="+ Thêm thẻ..." 
                      autocomplete="off" 
                      required
                    >
                    <button type="submit" class="column-quick-submit" title="Tạo thẻ mới">
                      <i class="ri-add-line"></i>
                    </button>
                  </form>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      this._bindEvents();
    }

    _renderCard(task, currentColumnId) {
      const rawTime = Number(task.actualTime) || 0;
      const mins = rawTime > 180 ? Math.round(rawTime / 60) : Math.round(rawTime);
      const isPending = task.syncStatus === 'PENDING';

      // Phòng thủ an toàn cho category
      const category = task.category || {
        name: 'Chung',
        emoji: '📋',
        color: '#4F46E5'
      };
      const catColor = category.color || '#4F46E5';
      const catEmoji = category.emoji || category.icon || '📋';
      const catName = category.name || 'Chung';

      const quadrantDisplay = String(task.quadrant || 'Q2').toUpperCase();

      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 900;

      return `
        <div class="task-card" draggable="${isMobile ? 'false' : 'true'}" data-id="${task.id}" data-column="${currentColumnId}">
          <div class="card-top-bar">
            <span class="category-tag" style="color: ${catColor}; border-color: ${catColor}33; background: ${catColor}14;">
              ${catEmoji} ${catName}
            </span>
            ${isPending 
              ? `<span class="sync-badge pending" title="Đang chờ đồng bộ đám mây"><i class="ri-cloud-off-line"></i> Chờ đồng bộ</span>` 
              : `<span class="sync-badge synced" title="Đã lưu an toàn trong CSDL cục bộ"><i class="ri-cloud-line"></i> Đồng bộ</span>`
            }
          </div>
          
          <div class="card-title" contenteditable="true" data-inline-id="${task.id}" title="Nhấn để sửa trực tiếp">${this._escapeHTML(task.title)}</div>
          
          <div class="card-meta">
            <span class="meta-item meta-time" title="Thời gian tập trung Pomodoro">
              <i class="ri-timer-flash-line"></i> ${mins} phút
            </span>
            <span class="meta-item meta-quadrant" title="Góc ma trận Eisenhower">
              <i class="ri-compass-3-line"></i> ${quadrantDisplay}
            </span>
          </div>

          <!-- Nút chuyển trạng thái nhanh & Xóa cho thiết bị di động / cảm ứng -->
          <div class="card-touch-actions">
            ${currentColumnId === 'TODO' ? `
              <button type="button" class="btn-card-move" data-move-to="IN_PROGRESS" title="Chuyển sang Đang làm">
                <span>Bắt đầu</span> <i class="ri-arrow-right-line"></i>
              </button>
            ` : ''}

            ${currentColumnId === 'IN_PROGRESS' ? `
              <button type="button" class="btn-card-move" data-move-to="TODO" title="Trả lại Cần làm">
                <i class="ri-arrow-left-line"></i> <span>Cần làm</span>
              </button>
              <button type="button" class="btn-card-move btn-move-success" data-move-to="DONE" title="Đánh dấu Hoàn thành">
                <i class="ri-check-line"></i> <span>Xong</span>
              </button>
            ` : ''}

            ${currentColumnId === 'DONE' ? `
              <button type="button" class="btn-card-move" data-move-to="IN_PROGRESS" title="Mở lại công việc">
                <i class="ri-refresh-line"></i> <span>Mở lại</span>
              </button>
            ` : ''}
            <button type="button" class="btn-card-move btn-card-delete" data-delete-id="${task.id}" title="Xóa công việc">
              <i class="ri-delete-bin-line"></i> <span>Xóa</span>
            </button>
          </div>
        </div>
      `;
    }

    _escapeHTML(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    _bindEvents() {
      // 1. Kéo-thả Card giữa các cột trên Desktop
      const cards = this.container.querySelectorAll('.task-card');
      const dropzones = this.container.querySelectorAll('[data-dropzone]');

      cards.forEach(card => {
        card.addEventListener('dragstart', e => {
          card.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', card.dataset.id);
        });

        card.addEventListener('dragend', () => {
          card.classList.remove('dragging');
          dropzones.forEach(z => z.classList.remove('drag-over'));
        });
      });

      dropzones.forEach(zone => {
        zone.addEventListener('dragover', e => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          zone.classList.add('drag-over');
        });

        zone.addEventListener('dragleave', e => {
          if (!zone.contains(e.relatedTarget)) {
            zone.classList.remove('drag-over');
          }
        });

        zone.addEventListener('drop', e => {
          e.preventDefault();
          zone.classList.remove('drag-over');
          const taskId = e.dataTransfer.getData('text/plain');
          const newStatus = zone.dataset.dropzone;
          if (taskId && newStatus && this.repo) {
            this.repo.updateTask(taskId, { 
              status: newStatus === 'DONE' ? 'completed' : (newStatus === 'IN_PROGRESS' ? 'in-progress' : 'pending'),
              kanbanStatus: newStatus 
            });
          }
        });
      });

      // 2. Chỉnh sửa tiêu đề trực tiếp (Inline Editing)
      const inlineTitles = this.container.querySelectorAll('[data-inline-id]');
      inlineTitles.forEach(el => {
        let initialText = el.innerText.trim();

        el.addEventListener('focus', () => {
          initialText = el.innerText.trim();
          const card = el.closest('.task-card');
          if (card) card.setAttribute('draggable', 'false');
        });

        el.addEventListener('keydown', e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            el.blur();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            el.innerText = initialText;
            el.blur();
          }
        });

        el.addEventListener('blur', () => {
          const card = el.closest('.task-card');
          if (card && typeof window !== 'undefined' && window.innerWidth > 900) {
            card.setAttribute('draggable', 'true');
          }
          const taskId = el.dataset.inlineId;
          const newTitle = el.innerText.trim();
          if (newTitle && newTitle !== initialText && this.repo) {
            this.repo.updateTask(taskId, { title: newTitle });
          } else if (!newTitle) {
            el.innerText = initialText;
          }
        });
      });

      // 3. Thêm việc nhanh ở đáy mỗi cột
      const addForms = this.container.querySelectorAll('.column-quick-add');
      addForms.forEach(form => {
        form.addEventListener('submit', e => {
          e.preventDefault();
          const input = form.querySelector('.column-quick-input');
          const colId = form.dataset.column;
          if (!input || !colId) return;

          const title = input.value.trim();
          if (!title) return;

          if (this.repo) {
            this.repo.createTask({
              title,
              status: colId === 'DONE' ? 'completed' : (colId === 'IN_PROGRESS' ? 'in-progress' : 'pending'),
              kanbanStatus: colId,
              quadrant: 'q2'
            });
          }
          input.value = '';
        });
      });

      // 4. Nút chuyển cột nhanh & xóa trên thiết bị cảm ứng / Mobile
      const moveBtns = this.container.querySelectorAll('.btn-card-move');
      moveBtns.forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const card = btn.closest('.task-card');
          const deleteId = btn.dataset.deleteId;
          if (deleteId) {
            const confirmFn = (typeof window !== 'undefined' && typeof window.__trethSafeConfirm === 'function')
              ? window.__trethSafeConfirm
              : (msg => typeof confirm === 'function' ? confirm(msg) : true);
            if (confirmFn('Bạn có chắc chắn muốn xóa công việc này không?')) {
              if (typeof window !== 'undefined' && window.TreTHCore && typeof window.TreTHCore.deleteTask === 'function') {
                window.TreTHCore.deleteTask(deleteId);
              } else if (this.repo && typeof this.repo.deleteTask === 'function') {
                this.repo.deleteTask(deleteId);
              }
            }
            return;
          }
          const targetStatus = btn.dataset.moveTo;
          if (card && targetStatus && this.repo) {
            const taskId = card.dataset.id;
            this.repo.updateTask(taskId, {
              status: targetStatus === 'DONE' ? 'completed' : (targetStatus === 'IN_PROGRESS' ? 'in-progress' : 'pending'),
              kanbanStatus: targetStatus
            });
          }
        });
      });
    }

    destroy() {
      if (typeof this.unsubscribe === 'function') {
        this.unsubscribe();
      }
    }
  }

  return KanbanView;
}));

