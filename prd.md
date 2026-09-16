# Product Requirements Document: Simple Notes App

## 1. Overview

**Product name:** (placeholder — e.g. "QuickNotes")

**One-line description:** A lightweight, browser-based note-taking app that lets users create, edit, delete, and organize notes without needing an account or a backend database. All data is stored locally in the browser.

**Target user:** Beginners building their first web app, and end-users who want a fast, frictionless way to jot down notes without signing up for anything.

**Why this project is a good learning project:**
- No backend/auth complexity — you can focus on core JS/DOM or framework fundamentals
- Teaches CRUD (Create, Read, Update, Delete) patterns
- Teaches browser storage APIs (localStorage/IndexedDB)
- Teaches state management and UI rendering
- Small enough to finish, big enough to be genuinely useful

---

## 2. Goals & Non-Goals

**Goals**
- Let a user write a note and have it saved automatically or on demand
- Let a user view all their notes at a glance
- Let a user edit an existing note
- Let a user delete a note
- Let a user organize/arrange notes (reorder, categorize, or pin)
- Persist notes across browser refreshes/sessions using local storage
- Work entirely client-side — no server, no login, no database

**Non-Goals (out of scope for v1)**
- User accounts / authentication
- Cloud sync across devices
- Real-time collaboration
- Rich media embeds (video, audio) — maybe images later
- Cross-browser sync (notes are local to one browser only)

---

## 3. Core Features

### 3.1 Create Note
- A visible "+ New Note" button or an always-available empty input area
- User can type a title (optional) and body text
- Note is saved to local storage on save/blur/auto-save
- New notes appear immediately in the notes list without a page reload

### 3.2 View Notes
- A list/grid view showing all saved notes (title + short preview of content)
- Clicking a note opens it in a detail/edit view
- Show a timestamp: "created at" and/or "last edited at"
- Empty state message when there are no notes yet ("No notes yet — create your first one!")

### 3.3 Edit Note
- Clicking a note opens an editable text area pre-filled with existing content
- Changes save automatically (debounced) or via an explicit "Save" button
- Update the "last edited" timestamp when a note changes

### 3.4 Delete Note
- A delete icon/button per note (in the list and/or in the detail view)
- Confirmation prompt before deletion ("Are you sure you want to delete this note?") to prevent accidental loss
- Deleted note is removed from local storage immediately

### 3.5 Arrange / Organize Notes
Pick one or combine a few for v1:
- **Manual reordering** — drag-and-drop to reorder notes
- **Pinning** — pin important notes to the top
- **Sorting** — by date created, date edited, or alphabetically (title)
- **Search/filter** — a search bar to filter notes by title/content
- **Tags/categories** (stretch goal) — label notes and filter by label
- **Color coding** (stretch goal) — assign a color to a note for visual grouping

---

## 4. Data Model (Local Storage)

Store notes as a JSON array under a single key, e.g. `notes`:

```json
[
  {
    "id": "unique-id-string",
    "title": "Grocery List",
    "content": "Eggs, milk, bread",
    "createdAt": "2026-09-10T10:00:00.000Z",
    "updatedAt": "2026-09-10T10:15:00.000Z",
    "pinned": false,
    "order": 0,
    "color": null,
    "tags": []
  }
]
```

**Notes on storage:**
- `localStorage` only stores strings, so always `JSON.stringify()` before saving and `JSON.parse()` when reading
- `localStorage` has a size limit (~5–10MB depending on browser) — plenty for text notes
- Consider `IndexedDB` instead if you plan to support images/attachments later, since it handles larger and more complex data better
- Generate unique IDs with something simple like `crypto.randomUUID()` or a timestamp + random string

---

## 5. User Flows

**Flow 1 — First-time use**
1. User opens the app → sees empty state
2. User clicks "New Note" → types content → note saves
3. Note appears in the list

**Flow 2 — Editing**
1. User clicks an existing note from the list
2. Detail/edit view opens with content pre-filled
3. User edits → change is saved automatically or on explicit save
4. "Last edited" timestamp updates

**Flow 3 — Deleting**
1. User clicks delete icon on a note
2. Confirmation dialog appears
3. User confirms → note is removed from list and storage

**Flow 4 — Organizing**
1. User drags a note to reorder, or clicks "pin," or sorts by date/title
2. Note list re-renders in the new order
3. New order/pin state is saved to local storage

---

## 6. UI Requirements (Suggested Layout)

- **Sidebar or top list**: all notes, showing title + snippet + last-edited date
- **Main panel**: selected note's full content in an editable text area
- **Toolbar**: New Note, Delete, Sort/Filter, Search bar
- **Responsive design**: should work reasonably on mobile and desktop (stacked layout on small screens)
- Minimal, distraction-free styling — this is a notes app, not a dashboard

---

## 7. Technical Considerations

- **No backend** — everything runs client-side (HTML/CSS/JS, or a frontend framework like React/Vue if preferred)
- **Persistence**: `localStorage` (simple) or `IndexedDB` (more scalable, async API)
- **State management**: for vanilla JS, a simple in-memory array synced to storage; for React, `useState`/`useReducer` + `useEffect` to sync with storage
- **Debounce autosave** (e.g. 300–500ms after user stops typing) to avoid excessive writes
- **Data loss risk**: local storage is tied to one browser on one device — clearing browser data deletes notes. Consider adding an "Export notes as JSON/text" feature so users can back up manually
- **Accessibility**: keyboard shortcuts (e.g. Ctrl+N for new note, Ctrl+S to save) are a nice beginner-friendly stretch goal

---

## 8. Suggested Build Order (for a beginner)

1. Static UI layout (list + editor panel, no functionality yet)
2. Create note → save to local storage → render in list
3. Click note → load into editor → edit → update storage
4. Delete note with confirmation
5. Add timestamps and "last edited" display
6. Add search/filter
7. Add sort or pin/reorder
8. Polish: empty states, responsive layout, export/import notes

---

## 9. Stretch Goals (v2+)

- Markdown support in notes (bold, lists, headers)
- Dark mode toggle
- Export/import notes as JSON or .txt
- Tags/categories with color labels
- Note archiving (soft delete/trash with restore)
- Keyboard-shortcut-driven navigation