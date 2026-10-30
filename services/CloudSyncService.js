// services/CloudSyncService.js
/**
 * TreTH - Cloud Sync & Multi-Device Synchronization Service
 * Cung cấp tầng Abstraction cho đồng bộ hóa dữ liệu đám mây và xử lý xung đột đa thiết bị.
 * Hoạt động theo mô hình Offline-First, tương thích Web, Desktop (Electron) và Mobile (Capacitor).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CloudSyncService = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  const SyncStatus = {
    IDLE: 'IDLE',
    SYNCING: 'SYNCING',
    ONLINE: 'ONLINE',
    OFFLINE: 'OFFLINE',
    ERROR: 'ERROR'
  };

  const ConflictStrategy = {
    LAST_WRITE_WINS: 'LAST_WRITE_WINS', // Ưu tiên bản ghi có updatedAt mới hơn
    SERVER_WINS: 'SERVER_WINS',         // Luôn ưu tiên dữ liệu máy chủ
    CLIENT_WINS: 'CLIENT_WINS'          // Luôn giữ dữ liệu thiết bị cục bộ
  };

  /**
   * Bộ giải quyết xung đột dữ liệu đa thiết bị (Multi-Device Conflict Resolver)
   */
  class ConflictResolver {
    constructor(strategy = ConflictStrategy.LAST_WRITE_WINS) {
      this.strategy = strategy;
    }

    resolve(localEntity, remoteEntity) {
      if (!localEntity) return remoteEntity;
      if (!remoteEntity) return localEntity;

      switch (this.strategy) {
        case ConflictStrategy.SERVER_WINS:
          return { ...remoteEntity };

        case ConflictStrategy.CLIENT_WINS:
          return { ...localEntity };

        case ConflictStrategy.LAST_WRITE_WINS:
        default: {
          const localTime = Number(localEntity.updatedAt) || 0;
          const remoteTime = Number(remoteEntity.updatedAt) || 0;

          if (remoteTime > localTime) {
            return { ...remoteEntity };
          } else if (localTime > remoteTime) {
            return { ...localEntity };
          } else {
            // Nếu thời gian bằng nhau, so sánh số version
            const localVer = Number(localEntity.version) || 1;
            const remoteVer = Number(remoteEntity.version) || 1;
            return remoteVer >= localVer ? { ...remoteEntity } : { ...localEntity };
          }
        }
      }
    }
  }

  /**
   * Abstract Base Provider cho các dịch vụ đám mây (REST API, Supabase, Firebase...)
   */
  class BaseCloudProvider {
    constructor(config = {}) {
      this.config = config;
      this.name = 'BaseCloudProvider';
    }

    async authenticate() {
      throw new Error('[BaseCloudProvider] authenticate() must be implemented');
    }

    async ping() {
      return true;
    }

    async pushOperations(operations) {
      throw new Error('[BaseCloudProvider] pushOperations() must be implemented');
    }

    async pullChanges(sinceTimestamp) {
      throw new Error('[BaseCloudProvider] pullChanges() must be implemented');
    }
  }

  /**
   * Mock Cloud Provider phục vụ kiểm thử và mô phỏng môi trường đồng bộ không cần máy chủ thật
   */
  class MockCloudProvider extends BaseCloudProvider {
    constructor(config = {}) {
      super(config);
      this.name = 'MockCloudProvider';
      this.remoteStorage = {
        tasks: new Map(),
        habits: new Map(),
        notes: new Map()
      };
      this.simulatedLatency = config.simulatedLatency || 50;
      this.authenticated = true;
    }

    async authenticate() {
      await new Promise(r => setTimeout(r, this.simulatedLatency));
      this.authenticated = true;
      return true;
    }

    async ping() {
      return this.authenticated;
    }

    async pushOperations(operations) {
      await new Promise(r => setTimeout(r, this.simulatedLatency));
      const succeeded = [];
      const failed = [];
      const conflicts = [];

      for (const op of operations) {
        try {
          const entityType = String(op.entity || 'TASK').toLowerCase() + 's';
          const table = this.remoteStorage[entityType] || this.remoteStorage.tasks;

          if (op.action === 'CREATE' || op.action === 'UPDATE') {
            const existing = table.get(op.entityId);
            if (existing && existing.version > (op.baseVersion || 0)) {
              conflicts.push({ opId: op.opId, entityId: op.entityId, local: op.payload, remote: existing });
            } else {
              table.set(op.entityId, { ...op.payload, updatedAt: Date.now() });
              succeeded.push(op.opId);
            }
          } else if (op.action === 'DELETE') {
            table.delete(op.entityId);
            succeeded.push(op.opId);
          }
        } catch (e) {
          failed.push(op.opId);
        }
      }

      return { succeeded, failed, conflicts };
    }

    async pullChanges(sinceTimestamp = 0) {
      await new Promise(r => setTimeout(r, this.simulatedLatency));
      const result = {
        tasks: [],
        habits: [],
        notes: [],
        serverTimestamp: Date.now()
      };

      for (const [_, item] of this.remoteStorage.tasks) {
        if (!sinceTimestamp || (item.updatedAt && item.updatedAt > sinceTimestamp)) {
          result.tasks.push(item);
        }
      }
      for (const [_, item] of this.remoteStorage.habits) {
        if (!sinceTimestamp || (item.updatedAt && item.updatedAt > sinceTimestamp)) {
          result.habits.push(item);
        }
      }
      for (const [_, item] of this.remoteStorage.notes) {
        if (!sinceTimestamp || (item.updatedAt && item.updatedAt > sinceTimestamp)) {
          result.notes.push(item);
        }
      }

      return result;
    }
  }

  /**
   * REST Cloud Provider chuẩn bị sẵn sàng để kết nối đến bất kỳ backend REST API nào
   */
  class RestCloudProvider extends BaseCloudProvider {
    constructor(config = {}) {
      super(config);
      this.name = 'RestCloudProvider';
      this.baseUrl = config.baseUrl || 'https://api.treth.app/v1';
      this.token = config.token || '';
    }

    getHeaders() {
      const h = { 'Content-Type': 'application/json' };
      if (this.token) {
        h['Authorization'] = `Bearer ${this.token}`;
      }
      return h;
    }

    async authenticate(credentials = {}) {
      if (credentials.token) {
        this.token = credentials.token;
      }
      return Boolean(this.token);
    }

    async ping() {
      try {
        const res = await fetch(`${this.baseUrl}/health`, { method: 'GET', headers: this.getHeaders() });
        return res.ok;
      } catch (e) {
        return false;
      }
    }

    async pushOperations(operations) {
      const res = await fetch(`${this.baseUrl}/sync/push`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ operations })
      });
      if (!res.ok) throw new Error(`Push failed with status ${res.status}`);
      return await res.json();
    }

    async pullChanges(sinceTimestamp = 0) {
      const res = await fetch(`${this.baseUrl}/sync/pull?since=${sinceTimestamp}`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error(`Pull failed with status ${res.status}`);
      return await res.json();
    }
  }

  /**
   * Lớp điều phối trung tâm CloudSyncService
   */
  class CloudSyncService {
    constructor(options = {}) {
      this.repository = options.repository || null;
      this.syncQueue = options.syncQueue || null;
      this.provider = options.provider || new MockCloudProvider();
      this.resolver = new ConflictResolver(options.conflictStrategy || ConflictStrategy.LAST_WRITE_WINS);

      this.status = SyncStatus.IDLE;
      this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      this.lastSyncTime = Number(localStorage.getItem('treth_last_sync_timestamp')) || 0;
      this.listeners = new Set();
      this.autoSyncInterval = null;

      this._initNetworkListeners();
    }

    _initNetworkListeners() {
      if (typeof window !== 'undefined') {
        window.addEventListener('online', () => {
          this.isOnline = true;
          this._notifyStateChange(SyncStatus.ONLINE);
          this.sync();
        });
        window.addEventListener('offline', () => {
          this.isOnline = false;
          this._notifyStateChange(SyncStatus.OFFLINE);
        });
      }
    }

    setRepository(repo) {
      this.repository = repo;
      if (repo && repo.syncQueue && !this.syncQueue) {
        this.syncQueue = repo.syncQueue;
      }
    }

    setProvider(provider) {
      this.provider = provider;
    }

    subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      this.listeners.add(listener);
      listener(this.getState());
      return () => this.listeners.delete(listener);
    }

    _notifyStateChange(status = this.status) {
      this.status = status;
      const state = this.getState();
      this.listeners.forEach(fn => {
        try { fn(state); } catch (e) { console.error('[CloudSyncService] Listener error:', e); }
      });
    }

    getState() {
      const pendingCount = this.syncQueue ? this.syncQueue.getPendingCount() : 0;
      return {
        status: this.status,
        isOnline: this.isOnline,
        lastSyncTime: this.lastSyncTime,
        pendingCount: pendingCount,
        providerName: this.provider ? this.provider.name : 'None'
      };
    }

    /**
     * Tiến trình đồng bộ hai chiều (Bi-directional Synchronization)
     */
    async sync() {
      if (!this.isOnline || !this.provider) {
        this._notifyStateChange(SyncStatus.OFFLINE);
        return { success: false, reason: 'offline' };
      }

      if (this.status === SyncStatus.SYNCING) {
        return { success: false, reason: 'already_syncing' };
      }

      this._notifyStateChange(SyncStatus.SYNCING);

      try {
        let pushedOps = 0;
        let conflictsResolved = 0;

        // 1. ĐẨY CÁC THAY ĐỔI CỤC BỘ (PUSH)
        if (this.syncQueue) {
          const queue = this.syncQueue.getQueue();
          const pendingOps = queue.filter(op => op.status === 'PENDING');

          if (pendingOps.length > 0) {
            const pushResult = await this.provider.pushOperations(pendingOps);

            // Đánh dấu thành công
            if (Array.isArray(pushResult.succeeded)) {
              pushResult.succeeded.forEach(opId => {
                this.syncQueue.markStatus(opId, 'SYNCED');
                pushedOps++;
              });
            }

            // Xử lý xung đột
            if (Array.isArray(pushResult.conflicts) && pushResult.conflicts.length > 0) {
              for (const c of pushResult.conflicts) {
                const resolved = this.resolver.resolve(c.local, c.remote);
                if (this.repository && resolved) {
                  this.repository.updateTask(c.entityId, resolved);
                  conflictsResolved++;
                }
              }
            }
          }
        }

        // 2. KÉO CÁC THAY ĐỔI TỪ MÁY CHỦ (PULL)
        const remoteChanges = await this.provider.pullChanges(this.lastSyncTime);
        let pulledItems = 0;

        if (this.repository && remoteChanges) {
          // Cập nhật tasks từ xa
          if (Array.isArray(remoteChanges.tasks)) {
            for (const rTask of remoteChanges.tasks) {
              const localTask = this.repository.getTaskById(rTask.id);
              if (!localTask) {
                this.repository.createTask(rTask);
                pulledItems++;
              } else {
                const resolved = this.resolver.resolve(localTask, rTask);
                this.repository.updateTask(rTask.id, resolved);
                pulledItems++;
              }
            }
          }
        }

        this.lastSyncTime = remoteChanges.serverTimestamp || Date.now();
        try {
          localStorage.setItem('treth_last_sync_timestamp', String(this.lastSyncTime));
        } catch (e) {}

        this._notifyStateChange(SyncStatus.IDLE);
        return {
          success: true,
          pushedOps,
          pulledItems,
          conflictsResolved,
          timestamp: this.lastSyncTime
        };
      } catch (err) {
        console.error('[CloudSyncService] Sync error:', err);
        this._notifyStateChange(SyncStatus.ERROR);
        return { success: false, error: err.message };
      }
    }

    startAutoSync(intervalMs = 60000) {
      this.stopAutoSync();
      this.autoSyncInterval = setInterval(() => {
        if (this.isOnline) this.sync();
      }, intervalMs);
    }

    stopAutoSync() {
      if (this.autoSyncInterval) {
        clearInterval(this.autoSyncInterval);
        this.autoSyncInterval = null;
      }
    }
  }

  // Export các thành phần
  CloudSyncService.SyncStatus = SyncStatus;
  CloudSyncService.ConflictStrategy = ConflictStrategy;
  CloudSyncService.ConflictResolver = ConflictResolver;
  CloudSyncService.BaseCloudProvider = BaseCloudProvider;
  CloudSyncService.MockCloudProvider = MockCloudProvider;
  CloudSyncService.RestCloudProvider = RestCloudProvider;

  return CloudSyncService;
}));

