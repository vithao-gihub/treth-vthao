import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Setup in-memory localStorage mock for Node environment
const storageMap = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); }
};

const SyncQueue = require('./SyncQueue.js');
const LocalRepository = require('./LocalRepository.js');

test('LocalRepository creates, normalizes, updates, and soft-deletes tasks', () => {
  storageMap.clear();
  const repo = new LocalRepository();

  const created = repo.createTask({
    title: 'Hoàn thành báo cáo quý',
    status: 'IN_PROGRESS',
    quadrant: 'Q1',
    startTime: '09:00'
  });

  assert.equal(created.title, 'Hoàn thành báo cáo quý');
  assert.equal(created.status, 'in-progress');
  assert.equal(created.kanbanStatus, 'IN_PROGRESS');
  assert.equal(created.quadrant, 'q1');
  assert.equal(created.endTime, '10:00');
  assert.equal(created.isAllDay, false);

  const allTasks = repo.getAllTasks();
  assert.equal(allTasks.length, 1);

  const updated = repo.updateTask(created.id, { status: 'DONE' });
  assert.equal(updated.status, 'completed');
  assert.equal(updated.kanbanStatus, 'DONE');
  assert.equal(updated.version, 2);

  repo.deleteTask(created.id);
  assert.equal(repo.getAllTasks().length, 0);
});

test('SyncQueue records pending operations accurately', () => {
  storageMap.clear();
  const queue = new SyncQueue('test_sync_queue');
  assert.equal(queue.getPendingCount(), 0);

  const op = queue.enqueue('CREATE', 'task_1', { title: 'Test' }, 0);
  assert.equal(queue.getPendingCount(), 1);

  queue.markStatus(op.opId, 'SYNCED');
  assert.equal(queue.getPendingCount(), 0);
});
