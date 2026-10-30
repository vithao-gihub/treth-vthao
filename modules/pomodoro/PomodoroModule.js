// modules/pomodoro/PomodoroModule.js
/**
 * TreTH - Pomodoro Module
 * Quản lý chu kỳ tập trung khoa học, âm thanh Web Audio API và thống kê thời gian.
 * Kết nối dữ liệu trực tiếp với LocalRepository (Single Source of Truth).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PomodoroModule = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  const MODES = {
    work: { label: 'Tập trung', defaultDuration: 25 },
    shortBreak: { label: 'Nghỉ ngắn', defaultDuration: 5 },
    longBreak: { label: 'Nghỉ dài', defaultDuration: 15 }
  };

  class PomodoroModule {
    constructor(repository, options = {}) {
      this.repo = repository || (typeof window !== 'undefined' ? window.__localRepo : null);
      this.options = options;

      this.currentMode = 'work';
      this.isRunning = false;
      this.timerInterval = null;
      this.activeTaskId = null;

      this.settings = this.repo ? this.repo.getPomoSettings() : {
        workDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        soundEnabled: true,
        autoStartBreaks: false
      };

      this.timeLeft = (this.settings.workDuration || 25) * 60;
      this.audioCtx = null;
      this.listeners = new Set();
    }

    _getDuration(mode = this.currentMode) {
      if (mode === 'work') return (this.settings.workDuration || 25) * 60;
      if (mode === 'shortBreak') return (this.settings.shortBreakDuration || 5) * 60;
      if (mode === 'longBreak') return (this.settings.longBreakDuration || 15) * 60;
      return 25 * 60;
    }

    _initAudio() {
      if (!this.audioCtx && typeof window !== 'undefined') {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
    }

    playBeep(type = 'complete') {
      if (!this.settings.soundEnabled) return;
      try {
        this._initAudio();
        if (!this.audioCtx) return;
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }

        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        if (type === 'start') {
          osc.frequency.setValueAtTime(523.25, now); // C5
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
        } else {
          // Complete chuông đôi C5 -> G5
          osc.frequency.setValueAtTime(523.25, now);
          osc.frequency.setValueAtTime(783.99, now + 0.15);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          osc.start(now);
          osc.stop(now + 0.5);
        }
      } catch (e) {
        console.warn('[PomodoroModule] Audio error:', e);
      }
    }

    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      this.playBeep('start');

      this.timerInterval = setInterval(() => {
        this._tick();
      }, 1000);

      this._notify();
    }

    pause() {
      if (!this.isRunning) return;
      this.isRunning = false;
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      this._notify();
    }

    reset() {
      this.pause();
      this.timeLeft = this._getDuration(this.currentMode);
      this._notify();
    }

    switchMode(mode) {
      if (!MODES[mode]) return;
      this.pause();
      this.currentMode = mode;
      this.timeLeft = this._getDuration(mode);
      this._notify();
    }

    bindTask(taskId) {
      this.activeTaskId = taskId;
      this._notify();
    }

    _tick() {
      if (this.timeLeft > 0) {
        this.timeLeft--;
        this._notify();
      } else {
        this._onFinish();
      }
    }

    _onFinish() {
      this.pause();
      this.playBeep('complete');

      if (this.currentMode === 'work') {
        const minutes = this.settings.workDuration || 25;
        if (this.repo) {
          this.repo.incrementPomoCycle(minutes, this.activeTaskId);
        }
        if (this.settings.autoStartBreaks) {
          this.switchMode('shortBreak');
          this.start();
          return;
        }
      }

      this.reset();
    }

    formatTime() {
      const mins = Math.floor(this.timeLeft / 60);
      const secs = this.timeLeft % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    getProgress() {
      const total = this._getDuration(this.currentMode);
      return total > 0 ? Math.round(((total - this.timeLeft) / total) * 100) : 0;
    }

    getStats() {
      return this.repo ? this.repo.getPomoStats() : { focusMinutes: 0, completedCycles: 0, dailyRecords: {} };
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
        try { fn(state); } catch (e) { console.error('[PomodoroModule] Listener error:', e); }
      });
    }

    getState() {
      return {
        mode: this.currentMode,
        modeLabel: MODES[this.currentMode].label,
        timeLeft: this.timeLeft,
        formattedTime: this.formatTime(),
        progress: this.getProgress(),
        isRunning: this.isRunning,
        activeTaskId: this.activeTaskId,
        stats: this.getStats()
      };
    }
  }

  PomodoroModule.MODES = MODES;
  return PomodoroModule;
}));
