# TÀI LIỆU KHẮC PHỤC LỖI BÀN PHÍM ẢO & BỘ GÕ TIẾNG VIỆT TRÊN DI ĐỘNG (DỰ ÁN TRETH)

Tài liệu này tổng hợp nguyên nhân cốt lõi gây ra lỗi bàn phím trên thiết bị di động (không nhận ký tự ngay mà phải bấm phím Cách/Space mới hiện chữ, hoặc khó mở bàn phím ở các ô input con) và cung cấp **Prompt chỉ thị hoàn chỉnh** để giao cho AI Agent (Antigravity) tự động sửa code.

---

## PHẦN 1: TÓM TẮT NGUYÊN NHÂN KỸ THUẬT

1. **Xung đột bộ đệm gõ Tiếng Việt (IME Buffer) do thuộc tính HTML:**
   - Các ô `<input>` và `<textarea>` đang bị gán cứng `autocorrect="off" autocapitalize="off" spellcheck="false"`.
   - Trên iOS Safari và Android (Gboard / Laban Key), khi tắt các thuộc tính này, bàn phím ảo giữ các ký tự đang ghép dấu Telex/VNI trong bộ nhớ đệm (Composition Buffer) và chỉ đẩy chuỗi ký tự vào DOM sau khi người dùng ấn phím Cách (`Space`).

2. **Chặn cứng sự kiện `input` bằng cờ `isInputComposing` và xử lý Regex đồng bộ:**
   - Trong `script.js`, biến `isInputComposing` kết hợp với việc chạy hàm phân tích ngôn ngữ tự nhiên (`parseSmartTaskInput`) và lọc danh sách ngay trên từng phím bấm làm gián đoạn luồng ghép chữ của bàn phím di động.

3. **Ngắt chuỗi nổi bọt sự kiện chạm (`e.stopPropagation()`) & xung đột `draggable="true"`:**
   - Lệnh `e.stopPropagation()` trong sự kiện `click` và `touchstart` tại `tasksWorkspace` ngăn trình duyệt di động kích hoạt hành vi focus mặc định để bật bàn phím ảo.
   - Thuộc tính `draggable="true"` trên thẻ `.task-item` khiến trình duyệt ưu tiên nhận diện thao tác chạm là cử chỉ kéo thả (Drag) thay vì gõ văn bản.

4. **Khóa tỷ lệ khung nhìn trong thẻ Meta Viewport:**
   - `maximum-scale=1.0, user-scalable=no` gây lỗi không tự động cuộn vùng nhập liệu lên trên bàn phím ảo ở một số phiên bản iOS.

---

## PHẦN 2: PROMPT GIAO NHIỆM VỤ CHO ANTIGRAVITY (SAO CHÉP PHẦN DƯỚI ĐÂY)

Bạn có thể copy toàn bộ nội dung bên dưới và gửi trực tiếp cho **Antigravity**:

---

### [BẮT ĐẦU PROMPT CHO ANTIGRAVITY]

**NHIỆM VỤ:** Khắc phục triệt để lỗi bàn phím ảo và bộ gõ Tiếng Việt (IME) trên thiết bị di động cho dự án **TreTH** (chỉ hiển thị chữ sau khi ấn phím Space, hoặc khó focus vào các ô nhập liệu).

Hãy thực hiện chính xác các thay đổi sau trên 3 file `index.html`, `script.js` và `sw.js`, đảm bảo giữ nguyên 100% các tính năng nghiệp vụ và giao diện hiện có:

#### 1. Cập nhật file `index.html`

##### 1.1. Chuẩn hóa thẻ Meta Viewport
- Tìm thẻ `<meta name="viewport" ...>` trong phần `<head>`:
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  ```
- Thay thế bằng:
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  ```

##### 1.2. Gỡ bỏ các thuộc tính chặn bộ đệm IME Tiếng Việt trên các ô nhập liệu
- Tìm tất cả các thẻ `<input>` và `<textarea>` trong `index.html` đang chứa các thuộc tính `autocorrect="off"`, `autocapitalize="off"`, `spellcheck="false"` tại các vị trí:
  1. `#filterKeywordInput` (Ô tìm kiếm nhanh trên Topbar)
  2. `#task-title` (Ô thêm công việc nhanh)
  3. `.quadrant-input` (4 ô thêm việc nhanh trong 4 góc Ma trận Eisenhower Q1, Q2, Q3, Q4)
  4. `#habit-search-input` (Ô tìm kiếm thói quen)
  5. `#notes-search-input` (Ô tìm kiếm ghi chú)
  6. `#cat-icon-input` và `#cat-name-input` (Trong Modal Quản lý loại việc)
  7. `#habit-title-input` và `#habit-target-note` (Trong Modal Thói quen)
  8. `#note-title-input`, `#note-tags-input`, và `#note-content-input` (Trong Modal Ghi chú)
  9. `#command-palette-input` (Trong Command Palette)
- **Thao tác bắt buộc:** Xóa bỏ hoàn toàn `autocorrect="off"`, `autocapitalize="off"` và `spellcheck="false"` khỏi tất cả các thẻ nêu trên (chỉ giữ lại `autocomplete="off"` trên các thẻ `<input>`, và xóa cả `autocomplete="off"` trên `<textarea id="note-content-input">`).

---

#### 2. Cập nhật file `script.js`

##### 2.1. Xóa các thuộc tính chặn IME ở các ô input được tạo động bằng JS
- Trong hàm `createTaskElement(task)`:
  - Tìm thẻ `<input type="text" class="subtask-input" ...>` và xóa `autocorrect="off" autocapitalize="off" spellcheck="false"`.
- Trong hàm `enableInlineTitleEdit(taskItem)`:
  - Xóa 3 dòng gán thuộc tính sau trên `inputEl`:
    ```javascript
    inputEl.setAttribute('autocorrect', 'off');
    inputEl.setAttribute('autocapitalize', 'off');
    inputEl.setAttribute('spellcheck', 'false');
    ```

##### 2.2. Thay thế cơ chế chặn `isInputComposing` bằng kỹ thuật Debounce mượt mà
- Ở đầu file `script.js`, xóa hoặc vô hiệu hóa việc chặn cứng `if (isInputComposing) return;` trong các sự kiện `input`, vì trên trình duyệt di động (iOS/Android), sự kiện `compositionstart` / `compositionend` hoạt động khác với máy tính và làm kẹt ký tự cho tới khi bấm phím Space.
- Khởi tạo hàm tiện ích `debounce`:
  ```javascript
  function debounce(fn, delay = 150) {
      let timer = null;
      return function(...args) {
          clearTimeout(timer);
          timer = setTimeout(() => fn.apply(this, args), delay);
      };
  }
  ```
- Áp dụng `debounce` cho các trình lắng nghe sự kiện `input` sau:
  1. **Ô thêm việc nhanh (`titleInput` - `#task-title`)**:
     ```javascript
     if (titleInput && nlpPreviewEl) {
         const updateNlpPreview = debounce(() => {
             const val = titleInput.value.trim();
             if (!val || val.length < 3) {
                 nlpPreviewEl.style.display = 'none';
                 nlpPreviewEl.innerHTML = '';
                 return;
             }
             const parsed = parseSmartTaskInput(val);
             const chips = [];
             if (parsed.dueDate) {
                 chips.push(`<span class="task-nlp-chip"><i class="ri-calendar-line"></i> ${parsed.dueDate}</span>`);
             }
             if (parsed.startTime) {
                 chips.push(`<span class="task-nlp-chip"><i class="ri-time-line"></i> ${parsed.startTime}${parsed.endTime ? ' - ' + parsed.endTime : ''}</span>`);
             }
             if (parsed.priority) {
                 const prioText = parsed.priority === 'high' ? 'Cao 🔥' : (parsed.priority === 'low' ? 'Thấp 🌱' : 'Vừa ⚡');
                 chips.push(`<span class="task-nlp-chip"><i class="ri-flag-line"></i> ${prioText}</span>`);
             }
             if (parsed.categoryId) {
                 const c = getCategoryById(parsed.categoryId);
                 chips.push(`<span class="task-nlp-chip"><i class="ri-price-tag-3-line"></i> #${c ? c.name : 'Loại việc'}</span>`);
             }
             if (chips.length > 0) {
                 nlpPreviewEl.style.display = 'flex';
                 nlpPreviewEl.innerHTML = `<span style="color: var(--text-muted); font-size: 11px;">Nhận diện:</span> ${chips.join('')}`;
             } else {
                 nlpPreviewEl.style.display = 'none';
                 nlpPreviewEl.innerHTML = '';
             }
         }, 150);

         titleInput.addEventListener('input', updateNlpPreview);
     }
     ```
  2. **Ô tìm kiếm công việc (`searchTaskInput` - `#filterKeywordInput`)**:
     - Bỏ `if (isInputComposing) return;` trong `handleSearch`, bọc `input` listener bằng `debounce(handleSearch, 150)`.
  3. **Ô tìm kiếm thói quen (`habitSearchInput`) và tìm kiếm ghi chú (`notesSearchInput`)**:
     - Bỏ `if (isInputComposing) return;` và bọc hàm xử lý trong `debounce(..., 150)`.
  4. **Ô tìm kiếm Command Palette (`#command-palette-input`)**:
     - Bỏ `if (isInputComposing) return;` và bọc `renderCommandPaletteResults(input.value)` trong `debounce(..., 120)`.
  5. **Ô tạo/sửa loại việc (`catIconInput`, `catNameInput`)**:
     - Bỏ `if (isInputComposing) return;` và gọi trực tiếp `updateCategoryLivePreview()`.

##### 2.3. Gỡ bỏ xung đột sự kiện `click`, `touchstart` và `draggable` trên thiết bị cảm ứng
- Trong hàm `enableInlineTitleEdit(taskItem)`:
  - Xóa dòng: `inputEl.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });`
- Trong vòng lặp `quickAddForms.forEach(...)`:
  - Xóa dòng: `qInput.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });`
- Trong sự kiện `tasksWorkspace.addEventListener('click', (e) => { ... })`:
  - Tìm đoạn:
    ```javascript
    if (e.target && e.target.matches && e.target.matches('.subtask-input, .inline-edit-input, .quadrant-input')) {
        e.stopPropagation();
    }
    ```
  - Sửa thành `return;` (không gọi `e.stopPropagation()` để trình duyệt di động kích hoạt focus và bàn phím ảo tự nhiên):
    ```javascript
    if (e.target && e.target.matches && e.target.matches('.subtask-input, .inline-edit-input, .quadrant-input')) {
        return;
    }
    ```
- Xóa bỏ khối lắng nghe `touchstart` trên `tasksWorkspace`:
  ```javascript
  if (tasksWorkspace) {
      tasksWorkspace.addEventListener('touchstart', (e) => {
          if (e.target && e.target.matches && e.target.matches('.subtask-input, .inline-edit-input, .quadrant-input')) {
              e.stopPropagation();
          }
      }, { passive: true });
  }
  ```
- Trong hàm `createTaskElement(task)`:
  - Chỉ bật thuộc tính `draggable="true"` khi người dùng sử dụng thiết bị con trỏ chuột (Desktop), tắt trên màn hình cảm ứng để không chiếm quyền chạm của các ô input:
    ```javascript
    const isTouchDevice = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window);
    if (currentViewMode === 'matrix' && !isSubtaskExpanded && !isTouchDevice) {
        li.setAttribute('draggable', 'true');
    } else {
        li.setAttribute('draggable', 'false');
    }
    ```

---

#### 3. Cập nhật file `sw.js`

- Đổi hằng số `CACHE_NAME` ở dòng đầu tiên từ `'treth-v4.0.0'` sang `'treth-v4.0.1'` để trình duyệt trên điện thoại tự động xóa bộ nhớ đệm cũ và tải bản sửa lỗi mới nhất.

---

#### 4. Tiêu chí kiểm tra nghiệm thu (Acceptance Criteria)
1. Khi mở trên điện thoại (iOS/Android) và chạm vào bất kỳ ô nhập liệu nào (`#task-title`, `#filterKeywordInput`, `.quadrant-input`, `.subtask-input`, `.inline-edit-input`, modal inputs), bàn phím ảo bật lên ngay và mỗi phím gõ hiển thị ký tự tức thì trên màn hình, không phải đợi ấn phím Cách (Space).
2. Gõ tiếng Việt có dấu (Telex/VNI) mượt mà, không bị mất dấu hoặc nhân đôi từ.
3. Gợi ý NLP (`#task-nlp-preview`) và bộ lọc tìm kiếm vẫn cập nhật chính xác sau 150ms kể từ khi gõ.

### [KẾT THÚC PROMPT CHO ANTIGRAVITY]