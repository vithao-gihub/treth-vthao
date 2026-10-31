# Short Design: Single-Viewport Eisenhower Matrix with Independent Internal Scroll (Phương án 1)

**Date:** 2026-10-31  
**Topic:** Eisenhower Matrix Viewport Fit & Compact Task Rendering  
**Status:** Pending Approval  

---

## 1. Intent & Context
In TreTH's Eisenhower Matrix view, having multiple tasks in a quadrant currently expands the card height dynamically, pushing lower quadrants (Q3, Q4) off the screen and forcing full-page vertical scrolling. The goal is to enforce a strict single-screen viewport layout where all 4 quadrants fit 100% within the visible screen without full-page scrolling, and any quadrant with overflow scrolls independently and smoothly via an internal thin scrollbar.

---

## 2. Approach: Strict Single-Viewport Matrix & Independent Internal Scroll (Phương án 1)

- **Grid Container:**
  - `#matrix-view-container`: Lock to `height: calc(100vh - var(--topbar-height, 60px) - 24px)`, `grid-template-columns: repeat(2, 1fr)`, `grid-template-rows: repeat(2, 1fr)`, `overflow: hidden`.
  - Body in matrix view has `overflow-y: hidden !important` so no page-level scrollbar appears.
- **Quadrant Cards:**
  - `.quadrant-card`: `display: flex`, `flex-direction: column`, `height: 100%`, `min-height: 0`, `max-height: 100%`, `overflow: hidden`, padding `8px 12px`.
  - Header & quick-add input inside each quadrant stay pinned at top and bottom.
- **Internal Task List:**
  - `.quadrant-task-list`: `flex: 1 1 0%`, `min-height: 0`, `overflow-y: auto`, thin 5px custom scrollbar.
- **Compact Task Cards in Matrix:**
  - `.quadrant-task-list .task-item`: Compact height (~32-34px), reduced padding `5px 8px`, 1-line clean layout, font size 12.5px.
  - Subtasks quick-preview trimmed to single-line or compact tags to conserve vertical space.
  - Secondary action buttons remain hidden until hover.

---

## 3. Scope & File Touchpoints
- `style.css`: Fix the CSS selector typo (`body.view-mode-matrix body.view-mode-matrix`) to `body.module-active-tasks.view-mode-matrix #matrix-view-container`, enforce `grid-template-rows: repeat(2, 1fr)`, compact matrix `.task-item`.
- `styles/treth-ui.css`: Mirror the same layout and compact rules.
- `script.js`: Ensure matrix render logic applies compact sizing and drag-and-drop works seamlessly within the scrollable containers.
- `www/`: 1:1 synchronization for Capacitor / Android release.
- Test: `verify_matrix_viewport_lock.py` verifying DOM heights, computed styles, 0 page scrollbar, and 4 quadrants visible on 1 screen.

