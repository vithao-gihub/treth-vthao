// services/SyncQueue.js
/**
 * TreTH - Offline-First Sync Queue Service
 * Ghi nhận các biến đổi dữ liệu (CREATE, UPDATE, DELETE) dưới dạng pending operations.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SyncQueue = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  class SyncQueue {
    constructor(storageKey = 'treth_sync_queue') {
      this.storageKey = storageKey;
      this.listeners = new Set();
      this._init();
    }

    _init() {
      try {
        if (!localStorage.getItem(this.storageKey)) {
          localStorage.setItem(this.storageKey, JSON.stringify([]));
        }
      } catch (e) {
        console.warn('[SyncQueue] Storage warning:', e);
      }
    }

    getQueue() {
      try {
        const raw = localStorage.getItem(this.storageKey);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        console.error('[SyncQueue] Error parsing queue:', e);
        return [];
      }
    }

    _saveQueue(queue) {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(queue));
        this._notify(queue);
      } catch (e) {
        console.error('[SyncQueue] Error saving queue:', e);
      }
    }

    subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      this.listeners.add(listener);
      listener(this.getQueue());
      return () => this.listeners.delete(listener);
    }

    _notify(queue) {
      this.listeners.forEach(fn => {
        try {
          fn(queue);
        } catch (err) {
          console.error('[SyncQueue] Listener error:', err);
        }
      });
    }

    enqueue(actionType, entityId, payload, baseVersion = 0) {
      const queue = this.getQueue();
      const op = {
        opId: `op_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        entity: 'TASK',
        entityId: String(entityId),
        action: actionType, // 'CREATE' | 'UPDATE' | 'DELETE'
        payload: payload || {},
        baseVersion: Number(baseVersion) || 0,
        timestamp: Date.now(),
        status: 'PENDING',
        retryCount: 0
      };
      queue.push(op);
      this._saveQueue(queue);
      return op;
    }

    getPendingCount() {
      return this.getQueue().filter(op => op.status === 'PENDING').length;
    }

    clearQueue() {
      this._saveQueue([]);
    }

    markStatus(opId, status) {
      const queue = this.getQueue();
      const item = queue.find(o => o.opId === opId);
      if (item) {
        item.status = status;
        this._saveQueue(queue);
      }
    }
  }

  return SyncQueue;
}));

