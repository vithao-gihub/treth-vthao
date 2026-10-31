# Single-Viewport Eisenhower Matrix with Independent Internal Scroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock the Eisenhower Matrix view strictly to 100% of the viewport height with all 4 quadrants always visible simultaneously, slim down task items to compact rows, and provide smooth, independent internal scrolling per quadrant when tasks exceed capacity.

**Architecture:** CSS grid row constraints with `repeat(2, 1fr)`, correcting invalid nested selectors to `body.module-active-tasks.view-mode-matrix #matrix-view-container`, setting `.quadrant-task-list` to `flex: 1 1 0%` with independent `overflow-y: auto`, slimming task cards in matrix to ~32px height, and syncing 1:1 to `www/`.

**Tech Stack:** Vanilla CSS3, Vanilla JavaScript (ES6+), Headless Chrome (Python testing harness).

**Spec:** [docs/superpowers/specs/2026-10-31-matrix-viewport-lock-design.md](file:///k:/DU AN AI/Flle dự án 2/TreTH/docs/superpowers/specs/2026-10-31-matrix-viewport-lock-design.md)

## Global Constraints

- Never allow whole-page vertical scrollbars in matrix view (`body.view-mode-matrix` and `.treth-main` have `overflow-y: hidden !important`).
- All 4 quadrants (Q1, Q2, Q3, Q4) must be visible on the screen simultaneously without scrolling the page.
- Drag-and-drop between quadrants must remain fully functional.
- Root files (`style.css`, `styles/treth-ui.css`, `script.js`) must be synchronized 1:1 with `www/`.
- Automated test `verify_matrix_viewport_lock.py` must achieve 100% pass rate.

## Review Focus

1. Viewport boundary: `window.innerHeight` constraint on `#matrix-view-container` when topbar is present.
2. Quadrant task list scrollability: `scrollHeight > clientHeight` when 5+ tasks are present in a quadrant.
3. Bottom quadrants visibility: Q3 and Q4 `getBoundingClientRect().bottom <= window.innerHeight`.
4. Drag-and-drop target detection: dragging over scrollable `.quadrant-task-list` must maintain `.drag-over` highlights.
5. Dark mode / Light mode contrast and scrollbar styling: thin 5px thumb with appropriate opacity.

---

## Tasks

### Task 1: Enforce Strict Single-Viewport Matrix Layout & Fix CSS Typo

**Files:**
- Modify: `style.css`
- Modify: `styles/treth-ui.css`
- Test: `verify_matrix_viewport_lock.py`

**Interfaces:**
- Consumes: `body.module-active-tasks.view-mode-matrix`
- Produces: Locked 2x2 grid where all 4 quadrants fit in viewport.

- [ ] **Step 1: Write test for viewport matrix locking and Q1-Q4 visibility with multiple tasks**
- [ ] **Step 2: Run test to verify failure (Verify RED)**
- [ ] **Step 3: Fix CSS selectors and enforce 2x2 grid layout**
- [ ] **Step 4: Run test to verify pass (Verify GREEN)**
- [ ] **Step 5: Synchronize to `www/` and commit**

---

### Task 2: Ultra-Compact Task Cards in Matrix & Smooth Internal Scrolling

**Files:**
- Modify: `style.css`
- Modify: `styles/treth-ui.css`
- Modify: `script.js`
- Test: `verify_matrix_viewport_lock.py`

**Interfaces:**
- Consumes: `.quadrant-task-list .task-item`
- Produces: Compact ~32px task cards, reduced padding, 12.5px font, internal scrolling in overflowing quadrant.

- [ ] **Step 1: Write test for compact card height (<= 38px) and internal overflow-y scroll**
- [ ] **Step 2: Run test to verify failure (Verify RED)**
- [ ] **Step 3: Implement compact styles and internal scrollbar styling**
- [ ] **Step 4: Run test to verify pass (Verify GREEN)**
- [ ] **Step 5: Synchronize to `www/` and commit**

---

### Task 3: Full Verification Suite, Drag-and-Drop Check & Zero Regressions

**Files:**
- Run: `verify_matrix_viewport_lock.py`
- Run: `verify_user_issues_fix.py`
- Run: `verify_badge_inline_edit.py`
- Run: `verify_ui_polish_acceptance.py`
- Run: `verify_5_issues_acceptance.py`
- Run: `test_modular_architecture.py`
- Run: `verify_treth_v40_acceptance.py`
- Sync: All modified files to `www/`

- [ ] **Step 1: Run matrix viewport lock acceptance test**
- [ ] **Step 2: Run all existing acceptance suites to guarantee zero regression**
- [ ] **Step 3: Verify 1:1 synchronization with `www/`**
- [ ] **Step 4: Final commit of verified state**

