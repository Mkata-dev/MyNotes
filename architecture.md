# Technical Architecture: Simple Notes App (HTML/CSS/JavaScript + LocalStorage)

## 1. Architecture Overview

This is a **client-only, single-page application (SPA)**. There is no server, no build step required (though one can be added later), and no database — `localStorage` acts as the persistence layer.

**Architectural pattern:** A lightweight **MVC-inspired separation**:

- **Model** — the `NotesStore` module, responsible for all reads/writes to `localStorage` and the in-memory notes array
- **View** — DOM rendering functions, responsible for turning note data into HTML
- **Controller** — event handlers that respond to user actions (click, input, drag) and coordinate Model + View

This keeps concerns separated even without a framework, and makes the codebase easy to migrate to React/Vue later if desired.

```
┌─────────────────────────────────────────────┐
│                   index.html                 │
│           (structure / entry point)          │
└───────────────────┬───────────────────────────┘
                     │
        ┌────────────┼─────────────┐
        ▼            ▼             ▼
   ┌─────────┐  ┌──────────┐  ┌──────────┐
   │ style.css│  │  app.js  │  │ (modules)│
   └─────────┘  └────┬─────┘  └──────────┘
                     │
      ┌──────────────┼───────────────┐
      ▼              ▼               ▼
 ┌──────────┐  ┌────────────┐  ┌────────────┐
 │  Store.js │  │  Render.js │  │ Events.js  │
 │ (Model)   │  │  (View)    │  │(Controller)│
 └────┬──────┘  └────────────┘  └────────────┘
      │
      ▼
 ┌──────────────┐
 │ localStorage │
 └──────────────┘
```

---

## 2. File / Folder Structure

```
notes-app/
├── index.html
├── /css
│   └── style.css
├── /js
│   ├── app.js            # entry point, wires everything together
│   ├── store.js           # Model: localStorage CRUD + in-memory state
│   ├── render.js           # View: DOM rendering functions
│   ├── events.js           # Controller: event listeners & handlers
│   ├── utils.js            # helper functions (id generation, debounce, formatting dates)
│   └── constants.js        # storage keys, config values
└── /assets
    └── icons/ (svg icons for delete, pin, search, etc.)
```

Using plain `<script type="module">` tags lets you split code into files without a bundler:

```html
<script type="module" src="./js/app.js"></script>
```

---

## 3. Data Layer (Model) — `store.js`

### 3.1 Responsibilities
- Single source of truth for notes data
- Reads/writes the `notes` array to `localStorage`
- Exposes a clean API so the rest of the app never touches `localStorage` directly

### 3.2 Suggested API

```js
// store.js
const STORAGE_KEY = "notes-app:notes";

const Store = {
  getAll() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  saveAll(notes) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  },

  create(note) {
    const notes = this.getAll();
    notes.unshift(note);
    this.saveAll(notes);
    return note;
  },

  update(id, changes) {
    const notes = this.getAll();
    const index = notes.findIndex(n => n.id === id);
    if (index === -1) return null;
    notes[index] = { ...notes[index], ...changes, updatedAt: new Date().toISOString() };
    this.saveAll(notes);
    return notes[index];
  },

  delete(id) {
    const notes = this.getAll().filter(n => n.id !== id);
    this.saveAll(notes);
  },

  reorder(orderedIds) {
    const notes = this.getAll();
    const reordered = orderedIds
      .map(id => notes.find(n => n.id === id))
      .filter(Boolean);
    this.saveAll(reordered);
  }
};

export default Store;
```

### 3.3 Design decisions worth noting
- **Single storage key** holding a JSON array (rather than one key per note) keeps reads/writes atomic and avoids key-management overhead. Fine for hundreds of notes; if you expect thousands, revisit.
- **Read-modify-write pattern**: every mutation reads the full array, changes it, writes it back. Simple and safe for a single-tab app; see Section 8 for multi-tab caveats.
- **Wrap all `localStorage` calls in try/catch** in the real implementation — it can throw (e.g. quota exceeded, private browsing mode in some browsers).

---

## 4. Data Model / Schema

```ts
Note {
  id: string,          // crypto.randomUUID()
  title: string,
  content: string,
  createdAt: string,   // ISO timestamp
  updatedAt: string,   // ISO timestamp
  pinned: boolean,
  color: string | null,
  tags: string[]
}
```

Order is implicit in array position (index 0 = top), which also naturally supports drag-and-drop reordering by re-writing the array order.

---

## 5. View Layer — `render.js`

### 5.1 Responsibilities
- Pure(ish) functions that take note data and produce/update DOM
- No direct localStorage access — only reads from what's passed in
- Re-renders the list whenever the underlying data changes

### 5.2 Key functions

```js
renderNoteList(notes, activeId)   // renders the sidebar/list of note previews
renderNoteEditor(note)             // renders the detail/edit panel for one note
renderEmptyState()                 // shown when notes.length === 0
```

### 5.3 Rendering strategy
For a project this size, **re-rendering the whole list on every state change** is simplest and performant enough (dozens–low hundreds of notes). Use:
- `element.innerHTML = templateString` for simplicity, or
- `document.createElement` + `DocumentFragment` for slightly better performance and easier event delegation

**Recommendation for a beginner project:** template strings + `innerHTML` for the list, since it's easiest to reason about. Use event delegation (one listener on the list container) rather than attaching listeners to every note item — this avoids memory leaks and re-binding on every render.

---

## 6. Controller Layer — `events.js`

### 6.1 Responsibilities
- Listens for user interactions (clicks, input, keydown, drag events)
- Calls `Store` methods to mutate data
- Calls `Render` functions to reflect changes in the UI

### 6.2 Core event bindings

| Event | Trigger | Action |
|---|---|---|
| Click "New Note" | Button click | `Store.create()` → `Render.renderNoteList()` → open new note in editor |
| Click a note in list | Click (delegated) | Set `activeId` → `Render.renderNoteEditor()` |
| Typing in editor | `input` (debounced) | `Store.update(id, { content })` |
| Click delete icon | Click (delegated) | Confirm → `Store.delete(id)` → re-render list, clear editor if active |
| Click pin icon | Click (delegated) | `Store.update(id, { pinned: !pinned })` → re-render |
| Typing in search bar | `input` (debounced) | Filter in-memory notes → `Render.renderNoteList(filtered)` |
| Drag note / drop | `dragstart`/`dragover`/`drop` | Compute new order → `Store.reorder()` → re-render |

### 6.3 Debouncing pattern (important for autosave & search)

```js
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

const debouncedSave = debounce((id, content) => {
  Store.update(id, { content });
}, 400);
```

---

## 7. Application Flow (Sequence)

**On page load:**
1. `app.js` runs → calls `Store.getAll()`
2. If notes exist, render list + open most recent/pinned note
3. If empty, render empty state
4. Bind all event listeners once (`events.js`)

**On "create note":**
1. Controller builds a new note object (`id`, empty title/content, timestamps)
2. `Store.create(note)` → writes to `localStorage`
3. `Render.renderNoteList()` + `Render.renderNoteEditor(note)`

**On edit:**
1. `input` event fires on textarea → debounced handler runs
2. `Store.update(id, { content })` updates storage + in-memory copy
3. Re-render just the list item's preview/timestamp (not the whole editor, to avoid cursor jump)

**On delete:**
1. Confirm dialog (native `confirm()` is fine for a beginner project; a custom modal is a nice upgrade)
2. `Store.delete(id)` → re-render list → if deleted note was active, clear/close editor

---

## 8. Known Constraints & Edge Cases to Handle

- **Cursor position on autosave re-render:** don't re-render the textarea itself while the user is actively typing in it — only re-render the list preview/timestamp.
- **Storage quota:** `localStorage` is typically 5–10MB per origin. Handle `QuotaExceededError` gracefully (e.g. show a message suggesting the user delete old notes or export them).
- **Multi-tab editing:** if the app is open in two tabs, each tab has its own in-memory copy. Listen for the `storage` event to detect changes made in other tabs and refresh:
  ```js
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) { /* reload notes and re-render */ }
  });
  ```
- **Private/incognito mode:** some browsers restrict or clear `localStorage` in private mode — wrap access in try/catch and degrade gracefully (e.g. warn the user notes won't persist).
- **XSS via `innerHTML`:** if you render user-typed note content into `innerHTML` directly, escape it first (or use `textContent` for content, only using `innerHTML` for your own static templates) to avoid injecting HTML/script from note content.
- **Empty note cleanup:** decide whether to auto-delete notes that are created but left completely empty when the user navigates away.

---

## 9. CSS Architecture

- Use **CSS custom properties** (`:root { --color-bg: ...; }`) for colors/spacing so theming (e.g. dark mode) is a single variable swap
- Layout: CSS Grid or Flexbox for the two-panel (list + editor) layout; `grid-template-columns` collapsing to a single column via media query on mobile
- Keep component-like sections in the CSS file with clear comments (`/* --- Note List --- */`, `/* --- Editor --- */`) even without a CSS framework, to keep it navigable as it grows
- Consider a naming convention like BEM (`.note-item`, `.note-item__title`, `.note-item--pinned`) to avoid selector collisions as the file grows

---

## 10. Suggested Build Order (Architecture-First)

1. Build `store.js` in isolation — test create/update/delete/reorder in the browser console before touching the DOM at all
2. Build static `index.html` + `style.css` layout with hardcoded sample data
3. Build `render.js` to turn `Store.getAll()` output into the DOM
4. Wire up `events.js` for create/edit/delete
5. Add debounced autosave
6. Add search/filter and pin/sort
7. Add drag-and-drop reordering
8. Polish: empty states, dark mode, export/import, storage-event syncing across tabs

---

## 11. Future Migration Path (Optional, Not v1)

If this project grows, the architecture above translates cleanly:
- `store.js` → becomes a custom hook (`useNotes`) or a state slice in React/Zustand/Redux
- `render.js` → becomes JSX components (`<NoteList />`, `<NoteEditor />`)
- `events.js` → becomes event handlers inside components
- `localStorage` → could later be swapped for `IndexedDB` (via a library like `idb`) or a real backend, without changing the rest of the app, since everything only talks to the `Store` interface