# Pages & UI Specifications: Simple Notes App (QuickNotes)

This document specifies all the pages, screens, and states required for the **QuickNotes** web application, based on [prd.md](file:///d:/Mkata.dev2026/MyProject/prd.md) and [architecture.md](file:///d:/Mkata.dev2026/MyProject/architecture.md).

For every screen, a ready-to-use, comprehensive **Google Stitch UI Prompt** is provided. You can copy and paste each prompt directly into Google Stitch (or similar AI UI generation tools) to generate pixel-perfect, production-ready interfaces.

---

## Table of Contents
1. [Design System & UI Guidelines](#design-system--ui-guidelines)
2. [Screen 1: Desktop Main Workspace (Active Editor View)](#screen-1-desktop-main-workspace-active-editor-view)
3. [Screen 2: Desktop Empty State (First-Time User / Zero Notes)](#screen-2-desktop-empty-state-first-time-user--zero-notes)
4. [Screen 3: Desktop Unselected State (Notes Exist, None Selected)](#screen-3-desktop-unselected-state-notes-exist-none-selected)
5. [Screen 4: Mobile Master View (Notes List Screen)](#screen-4-mobile-master-view-notes-list-screen)
6. [Screen 5: Mobile Detail View (Note Editor Screen)](#screen-5-mobile-detail-view-note-editor-screen)
7. [Screen 6: Delete Confirmation Modal & Dialogs](#screen-6-delete-confirmation-modal--dialogs)
8. [Screen 7: Settings & Data Management Drawer (Export/Import/Theme)](#screen-7-settings--data-management-drawer-exportimporttheme)

---

## Design System & UI Guidelines

When generating or implementing these UI designs, keep the following aesthetic rules consistent:
* **Style:** Modern, minimal, distraction-free productivity app (inspired by Apple Notes, Bear, Notion, and Linear).
* **Color Palette:**
  * Backgrounds: Clean neutral whites (`#FFFFFF`), subtle canvas gray (`#F8FAFC`), and sidebar light gray (`#F1F5F9`).
  * Text: Deep slate dark (`#0F172A`), muted secondary (`#64748B`), placeholder (`#94A3B8`).
  * Borders & Dividers: Subtle slate borders (`#E2E8F0`).
  * Primary Accent: Indigo/Violet (`#6366F1`) or Amber (`#F59E0B`) for pinned badges.
  * Destructive: Soft Crimson/Rose (`#EF4444`).
* **Typography:** Clean sans-serif system stack (Inter, SF Pro, or system-ui), with clear hierarchy between note titles (Semi-bold 18-24px) and note body text (Regular 15-16px, 1.6 line-height).
* **Corner Radius:** Subtle rounded corners (`rounded-lg` / 8–12px) for cards, inputs, and modals.

---

## Screen 1: Desktop Main Workspace (Active Editor View)

### Screen Overview
* **Purpose:** The primary day-to-day workspace where users browse their notes in the sidebar and actively write or edit a note in the main editor.
* **Layout:** Two-column split layout (fixed sidebar ~320px–360px on the left, fluid editor pane on the right).

### Google Stitch Prompt
```text
A modern, minimalist desktop web application UI for a lightweight browser-based notes app called "QuickNotes".

Layout:
- Two-column split-screen layout with a fixed-width left sidebar (320px) and an expansive, distraction-free main editing canvas on the right.
- High-resolution desktop viewport (1440x900), subtle border divider between panels (#E2E8F0).

Left Sidebar:
- Header: App logo with a clean notebook icon, title "QuickNotes", and an avatar-less clean header. A primary action button "+ New Note" with high-contrast styling (indigo background, white text, rounded corners).
- Search & Filter bar: Search input box with a magnifying glass icon, placeholder text "Search notes (Ctrl+K)", and a small sort icon button (Sort by: "Last Edited", "Date Created", "Alphabetical").
- Filter Pills: Horizontal toggle pills: "All Notes (12)", "Pinned (3)".
- Notes List: Scrollable list of note cards.
  - Pinned Note Card (Active): Highlighted with a subtle active background tint (#EEF2FF) and left accent border (#6366F1). Displays a small amber pin icon, bold title "Sprint Goals & Milestones", 2-line preview snippet "1. Finalize the database schema 2. Set up local storage persistence...", relative timestamp "Edited 2m ago", and a subtle trash can icon visible on hover.
  - Normal Note Cards (Inactive): White card with soft border. Examples: "Grocery List" ("Eggs, organic milk, sourdough bread... Edited 2h ago"), "Book Recommendations" ("Atomic Habits, Designing Data-Intensive Apps... Edited Yesterday").

Right Main Panel (Note Editor):
- Top Context Bar:
  - Left side: Auto-save status text "Saved automatically" with a subtle green checkmark dot.
  - Right side: Action toolbar with an amber "Pinned" toggle button (active filled pin), a copy/share icon, and a red-accented "Delete Note" trash icon button.
- Note Content Area:
  - Large borderless title input field: "Sprint Goals & Milestones" (28px font, bold, transparent background, placeholder "Note title...").
  - Metadata row: "Created Sep 10, 2026 • Last updated 2 minutes ago • 148 words".
  - Distraction-free body textarea: Clean, comfortable typography with ample line-height. Contains realistic formatted text with bullet points, numbered lists, and short paragraphs.
  - Bottom subtle status bar: Character count "842 characters" and local storage health indicator "Saved to Browser Storage".

Style & Atmosphere:
- Clean, Apple Notes / Linear-inspired aesthetic. Light mode, soft shadows, neutral slate colors (#0F172A text, #F8FAFC page background), crisp typography, clean micro-interactions.
```

---

## Screen 2: Desktop Empty State (First-Time User / Zero Notes)

### Screen Overview
* **Purpose:** The onboarding interface displayed when a user visits the app for the very first time or when all notes have been deleted. Welcoming, clear, and action-oriented.
* **Layout:** Two-column split layout with empty state visual communication.

### Google Stitch Prompt
```text
A modern, minimalist desktop web application UI showing the Empty State / First-Time User Experience for "QuickNotes".

Layout:
- Two-column split layout (1440x900 viewport).

Left Sidebar:
- App header with "QuickNotes" logo and disabled or neutral search bar with placeholder "Search notes...".
- Notes List Area: Centered empty placeholder state. Subtle vector illustration of a blank document or pencil, accompanied by friendly text: "No notes yet" and helper subtitle "Your notes will appear here once you create one".
- Large "+ New Note" button prominent at the top of the sidebar.

Right Main Panel:
- Clean canvas with an inspiring, centered onboarding card.
- Visual: A tasteful, minimal geometric vector illustration of writing, notebooks, or lightbulbs in soft pastel indigo and slate tones.
- Headline: "Capture your thoughts instantly" (26px, bold, #0F172A).
- Subtitle: "QuickNotes saves everything directly in your browser. No accounts, no servers, zero friction." (16px, #64748B).
- Primary Call to Action: A large, rounded button with an icon "+ Create Your First Note" (#6366F1 primary button with subtle hover glow).
- Feature highlights below the button in a 3-column mini feature badge row:
  1. "⚡ Instant Auto-Save: Never lose a single keystroke."
  2. "🔒 100% Private: All data stays in your local browser."
  3. "📌 Organize & Pin: Keep critical notes easily accessible."
- Keyboard hint badge: "Tip: Press Ctrl + N to start a new note anywhere".

Style & Atmosphere:
- Friendly, modern productivity tool onboarding, spacious whitespace, elegant typography, crisp SVG illustrations.
```

---

## Screen 3: Desktop Unselected State (Notes Exist, None Selected)

### Screen Overview
* **Purpose:** Displayed when the user has several notes saved in the sidebar, but has not clicked on any note yet (e.g. immediately upon loading the application or right after deleting the previously active note).
* **Layout:** Fully populated left sidebar + clean placeholder workspace on the right.

### Google Stitch Prompt
```text
A modern desktop web application UI for "QuickNotes" in an "Unselected Note" state.

Layout:
- Two-column layout (1440x900 desktop viewport).

Left Sidebar:
- Fully populated with realistic note cards:
  - Card 1: "Project Architecture Notes" (Pinned badge, edited 10 mins ago).
  - Card 2: "Weekly Grocery Run" (Edited 1 hour ago).
  - Card 3: "Ideas for Weekend Hike" (Edited Sep 8).
  - Card 4: "Meeting Action Items" (Edited Sep 6).
- Search bar has active focus or query placeholder.
- Top "+ New Note" button clearly accessible.

Right Main Panel:
- Calm, distraction-free neutral canvas.
- Centered state container with soft visual cues:
  - Icon: A minimal outlined document icon or dual cursor icon (#94A3B8).
  - Heading: "Select a note to read or edit" (20px, semi-bold, #334155).
  - Body copy: "Choose a note from the sidebar on the left, or press the button below to create a blank note." (#64748B).
  - Action button: "+ Create New Note" (secondary outlined button style with subtle icon).
  - Keyboard shortcut hints: "Ctrl + N for new note • ↑ / ↓ to navigate list".

Style & Atmosphere:
- Calm, clutter-free, balanced composition, soft slate colors with clean borders (#E2E8F0).
```

---

## Screen 4: Mobile Master View (Notes List Screen)

### Screen Overview
* **Purpose:** Mobile portrait viewport (390px width, e.g. iPhone 15 / modern Android) providing the master list of all notes. Optimized for one-handed navigation and quick search.
* **Layout:** Single-column mobile view with sticky app bar, search input, filter chips, scrollable cards, and a Floating Action Button (FAB).

### Google Stitch Prompt
```text
A sleek, modern mobile web app UI (iPhone/Android portrait viewport, 390x844) for "QuickNotes" — Notes List Master Screen.

Top Navigation Bar:
- Clean header with "QuickNotes" title in bold typography (22px), alongside a small search/filter icon and a kebab/settings menu icon (three dots).
- Prominent search input bar below header with rounded corners (#F1F5F9 background), magnifying glass icon, clear 'X' button, and placeholder "Search 14 notes...".
- Horizontal scrolling filter chips: "All (14)" [Selected, dark badge], "Pinned (3)" [Outline badge with pin icon], "Recent" [Outline badge].

Notes Feed / List:
- Vertical list of mobile-optimized note cards with comfortable touch targets (minimum 64px height) and subtle dividers.
- Note Card 1 (Pinned): Pinned pill indicator on top right. Title "Weekly Team Sync Notes" (bold 16px), preview snippet "Discussed Q4 roadmap, hiring plans for frontend engineer...", timestamp "10:45 AM".
- Note Card 2 (Pinned): Title "Shopping & Pantry Essentials", snippet "Almond milk, coffee beans, olive oil...", timestamp "Yesterday".
- Note Card 3: Title "Book Highlights: Deep Work", snippet "The ability to perform deep work is becoming increasingly rare...", timestamp "Sep 9".
- Note Card 4: Title "CSS Grid Tricks", snippet "Using minmax(0, 1fr) to prevent flexbox and grid blowout...", timestamp "Sep 4".
- Swipe action preview (optional visual): One note card slightly swiped left revealing a red "Delete" action button behind it.

Bottom Area:
- Floating Action Button (FAB): In the bottom-right corner, a floating circular button (+ icon) with strong drop shadow (#6366F1 background, white plus icon, 56x56px).
- Bottom Safe Area bar with subtle storage status: "14 notes • 42 KB used".

Style & Atmosphere:
- iOS/Material 3 hybrid mobile design, responsive, touch-friendly, high contrast readability, clean white and neutral slate theme.
```

---

## Screen 5: Mobile Detail View (Note Editor Screen)

### Screen Overview
* **Purpose:** Mobile portrait viewport screen when a user taps a note to view/edit it, or taps the "+" FAB to compose a new note. Fullscreen writing canvas.
* **Layout:** Single-column mobile detail view with top navigation bar (back navigation, action buttons) and expansive editing area.

### Google Stitch Prompt
```text
A distraction-free mobile web app UI (iPhone/Android portrait viewport, 390x844) for "QuickNotes" — Note Detail & Edit Screen.

Top Mobile App Bar:
- Left: Back button with chevron icon "‹ Notes" allowing return to the master list.
- Center: Autosave status indicator with animated or static subtle green pulse dot: "Saved".
- Right: Action icons:
  - Pin icon toggle (filled amber if pinned, outline if unpinned).
  - More options / Delete trash icon (soft red or neutral slate).

Main Note Body:
- Title Input: Large, single-line borderless text input: "Weekly Team Sync Notes" (22px font, bold, placeholder "Title...").
- Timestamp & Meta info: "Edited today at 10:45 AM • 182 words" (13px, muted gray #94A3B8).
- Divider: Very faint 1px hairline horizontal divider.
- Fullscreen Note Editor: Multi-line text editing area filled with realistic text:
  - "Key Discussion Points:"
  - "• Finalized the Q4 product roadmap priority list."
  - "• Discussed transitioning from localStorage to IndexedDB if rich attachments are needed."
  - "• Action item: Mkata to review UI specifications by Friday."
  - Native mobile cursor placed at the end of the text.

Bottom Keyboard Accessory Toolbar:
- Sticky toolbar above mobile keyboard:
  - Quick action buttons: Checklist item icon (`[ ]`), bullet point icon (`•`), bold icon (`B`), undo/redo arrows.
  - Character counter: "1,120 chars".

Style & Atmosphere:
- Focused, clean writing environment, fluid mobile typography, high contrast, zero unnecessary visual clutter.
```

---

## Screen 6: Delete Confirmation Modal & Dialogs

### Screen Overview
* **Purpose:** Critical safety confirmation dialog triggered when a user clicks/taps the delete button, preventing accidental data loss in browser local storage.
* **Layout:** Centered modal popup overlay with backdrop dim/blur over the active workspace.

### Google Stitch Prompt
```text
A UI screen for "QuickNotes" showing an accessible, modern Delete Confirmation Modal Dialog overlaying the desktop note editor workspace.

Backdrop:
- The desktop note workspace is visible in the background but softened with a 40% dark overlay and background blur (backdrop-filter: blur(4px)).

Centered Modal Card:
- Width: 420px, rounded corners (16px radius), white background (#FFFFFF), crisp elevated drop shadow.
- Header / Icon: Soft red circular badge (#FEE2E2 background) with a red warning trash can or alert triangle icon (#EF4444).
- Title: "Delete Note?" (20px, bold, #0F172A).
- Description: "Are you sure you want to delete \"Weekly Team Sync Notes\"? This action cannot be undone and will permanently remove the note from your browser storage." (14px, #64748B, line-height 1.5).
- Note summary pill inside modal: A compact preview box showing the note's title and first line snippet with timestamp to ensure the user knows exactly what is being deleted.
- Action Buttons (Horizontal layout at the bottom):
  - Cancel Button: Left side, neutral gray outline/ghost button "Cancel" (#F1F5F9 hover state, #334155 text).
  - Confirm Delete Button: Right side, solid high-contrast destructive button "Delete Note" (#EF4444 red background, white text, bold, rounded-lg).

Style & Atmosphere:
- High attention to accessibility, clear visual hierarchy, crisp safety cues, premium modern design system standards.
```

---

## Screen 7: Settings & Data Management Drawer (Export/Import/Theme)

### Screen Overview
* **Purpose:** Slide-over panel or modal enabling manual backups (Export to JSON/TXT), importing backup files, viewing browser storage usage, and toggling dark mode (covering Section 7 & 9 in `prd.md`).
* **Layout:** Slide-over right drawer (400px width) or modal dialog.

### Google Stitch Prompt
```text
A modern slide-over Settings and Data Management panel UI for "QuickNotes".

Layout:
- Slide-over drawer on the right side of the screen (420px width), with dark translucent backdrop over the main application.

Drawer Content:
- Header: Title "Settings & Storage" (20px bold), accompanied by an 'X' close icon button on the top right.

Section 1: Appearance:
- Theme Toggle: "Theme Mode" row with segmented control: "Light", "Dark", "System Default". Clean icons for sun and moon.

Section 2: Browser Storage & Health:
- Storage Progress Bar: Visual meter showing "Browser Storage: 148 KB of ~5,000 KB (3%) used".
- Total Stats row: "Total Notes: 18 • Total Words: 4,320 • Pinned Notes: 3".

Section 3: Data Backup & Portability (Local Storage Safety):
- Description: "Your notes live exclusively in this browser. Create backups to keep your notes safe or move them to another computer."
- Action Cards:
  - "Export Notes (JSON)": Button with download icon, subtitle "Download all notes in machine-readable JSON format".
  - "Export Notes (Plain Text)": Button with text file icon, subtitle "Download as a single zip of readable .txt files".
  - "Import Notes": Drag-and-drop dashed file upload zone with cloud upload icon: "Drop notes JSON backup file here or click to browse".

Section 4: Danger Zone:
- Outlined red box: "Clear All Data" button with warning text "Deletes all notes permanently from local storage".

Style & Atmosphere:
- Clean SaaS slide-out drawer, organized section dividers, polished toggle controls, clear data safety indicators.
```

---

## Summary of Pages & Stitch Prompts Map

| # | Screen Name | Viewport | Key Functionality |
|---|---|---|---|
| **1** | [Desktop Main Workspace](#screen-1-desktop-main-workspace-active-editor-view) | 1440 × 900 | Master-detail split view, note list, active editor, debounced autosave |
| **2** | [Desktop Empty State](#screen-2-desktop-empty-state-first-time-user--zero-notes) | 1440 × 900 | Onboarding screen, first-note CTA, shortcut tips |
| **3** | [Desktop Unselected State](#screen-3-desktop-unselected-state-notes-exist-none-selected) | 1440 × 900 | Populated sidebar with empty editor canvas guidance |
| **4** | [Mobile Master View](#screen-4-mobile-master-view-notes-list-screen) | 390 × 844 | Mobile note card feed, search, filter chips, FAB for new note |
| **5** | [Mobile Detail View](#screen-5-mobile-detail-view-note-editor-screen) | 390 × 844 | Full-screen mobile editor, back navigation, autosave indicator |
| **6** | [Delete Confirmation Modal](#screen-6-delete-confirmation-modal--dialogs) | Overlay | Destructive confirmation dialog to prevent accidental data loss |
| **7** | [Settings & Data Drawer](#screen-7-settings--data-management-drawer-exportimporttheme) | 420px Drawer | Export/Import backups, storage health meter, theme toggle |
