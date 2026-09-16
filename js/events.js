/**
 * QuickNotes - Controller Layer (Events)
 * Coordinates user actions, Store updates, drag-and-drop reordering, and View rendering.
 */

import Store from './store.js';
import { Render } from './render.js';
import { generateId, debounce } from './utils.js';
import { FILTER_MODES, SORT_MODES, STORAGE_KEY } from './constants.js';

export class EventController {
  constructor(appState, domElements) {
    this.state = appState;
    this.state.view = this.state.view || 'notes'; // 'notes' | 'settings'
    this.dom = domElements;
    this._draggedId = null;
    this._initDebouncedSave();
  }

  /**
   * Set up debounced auto-save handler
   */
  _initDebouncedSave() {
    this.debouncedSave = debounce((noteId, changes) => {
      Store.update(noteId, changes);
      const updatedNote = Store.getById(noteId);
      if (updatedNote) {
        Render.updateNoteCardSnippet(this.dom.notesList, updatedNote);
      }
      Render.updateEditorStatus(this.dom.editorContainer, 'Saved automatically', false);
    }, 400);
  }

  /**
   * Bind all DOM event listeners
   */
  bindAll() {
    this.bindSidebarEvents();
    this.bindEditorEvents();
    this.bindSearchAndFilterEvents();
    this.bindKeyboardShortcuts();
    this.bindStorageSync();
    this.bindDrawerAndModalEvents();
    this.bindHeaderToolEvents();
    this.bindDragAndDropEvents();
  }

  /**
   * Switch to Settings Page View
   */
  openSettingsPage() {
    this.state.view = 'settings';
    this.refreshUI();
    if (window.innerWidth <= 768) {
      document.body.classList.add('mobile-show-editor');
    }
  }

  /**
   * Bind events for creating notes, selecting notes, and list actions
   */
  bindSidebarEvents() {
    // New Note handler
    const handleNewNote = () => {
      this.state.view = 'notes';
      const newNote = Store.create({
        id: generateId(),
        title: '',
        content: '',
        pinned: false,
        tags: [],
      });
      this.state.activeId = newNote.id;
      this.state.searchQuery = '';
      if (this.dom.searchInput) this.dom.searchInput.value = '';
      this.refreshUI();

      // Focus editor title
      setTimeout(() => {
        const titleInput = document.getElementById('note-title-input');
        if (titleInput) titleInput.focus();
      }, 50);

      // On mobile, show editor pane
      if (document.body.classList.contains('mobile-view') || window.innerWidth <= 768) {
        document.body.classList.add('mobile-show-editor');
      }
    };

    if (this.dom.newNoteBtn) {
      this.dom.newNoteBtn.addEventListener('click', handleNewNote);
    }
    if (this.dom.headerNewNoteBtn) {
      this.dom.headerNewNoteBtn.addEventListener('click', handleNewNote);
    }

    // Sidebar settings button (Left bottom of notes)
    if (this.dom.sidebarSettingsBtn) {
      this.dom.sidebarSettingsBtn.addEventListener('click', () => {
        if (this.state.view === 'settings') {
          this.state.view = 'notes';
          this.refreshUI();
        } else {
          this.openSettingsPage();
        }
      });
    }

    // Delegated clicks on notes list
    if (this.dom.notesList) {
      this.dom.notesList.addEventListener('click', (e) => {
        const card = e.target.closest('.note-card');
        const actionBtn = e.target.closest('button[data-action]');

        if (actionBtn) {
          const action = actionBtn.dataset.action;
          const noteId = actionBtn.dataset.id;
          if (action === 'toggle-pin') {
            e.stopPropagation();
            const note = Store.getById(noteId);
            if (note) {
              Store.update(noteId, { pinned: !note.pinned });
              this.refreshUI();
              Render.showToast(note.pinned ? 'Note unpinned' : 'Note pinned to top');
            }
            return;
          }
          if (action === 'delete') {
            e.stopPropagation();
            const note = Store.getById(noteId);
            if (note) {
              Render.renderDeleteModal(this.dom.modalContainer, note);
            }
            return;
          }
        }

        if (card) {
          const noteId = card.dataset.id;
          this.state.view = 'notes';
          if (noteId) {
            this.state.activeId = noteId;
            this.refreshUI();
          }
          if (window.innerWidth <= 768) {
            document.body.classList.add('mobile-show-editor');
          }
        }
      });
    }
  }

  /**
   * Top Right Header Note Tools: Pin, Share, Delete, Three Dots (More)
   */
  bindHeaderToolEvents() {
    // Header Pin Button
    if (this.dom.headerPinBtn) {
      this.dom.headerPinBtn.addEventListener('click', () => {
        if (!this.state.activeId) return;
        const note = Store.getById(this.state.activeId);
        if (note) {
          Store.update(note.id, { pinned: !note.pinned });
          this.refreshUI();
          Render.showToast(note.pinned ? 'Note unpinned' : 'Note pinned to top');
        }
      });
    }

    // Header Share Button
    if (this.dom.headerShareBtn) {
      this.dom.headerShareBtn.addEventListener('click', async () => {
        if (!this.state.activeId) return;
        const note = Store.getById(this.state.activeId);
        if (!note) return;

        const shareTitle = note.title.trim() || 'Untitled Note';
        const shareText = `${shareTitle}\n\n${note.content || ''}`;

        if (navigator.share) {
          try {
            await navigator.share({
              title: shareTitle,
              text: shareText,
            });
            return;
          } catch (err) {
            if (err.name === 'AbortError') return;
          }
        }

        // Fallback to clipboard
        try {
          await navigator.clipboard.writeText(shareText);
          Render.showToast('Note copied to clipboard!');
        } catch {
          prompt('Copy note content:', shareText);
        }
      });
    }

    // Header Delete Button
    if (this.dom.headerDeleteBtn) {
      this.dom.headerDeleteBtn.addEventListener('click', () => {
        if (!this.state.activeId) return;
        const note = Store.getById(this.state.activeId);
        if (note) {
          Render.renderDeleteModal(this.dom.modalContainer, note);
        }
      });
    }

    // Header Three Dots (More Options dropdown)
    if (this.dom.headerMoreBtn && this.dom.headerMoreDropdown) {
      this.dom.headerMoreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = this.dom.headerMoreDropdown.hasAttribute('hidden');
        if (isHidden) {
          this.dom.headerMoreDropdown.removeAttribute('hidden');
        } else {
          this.dom.headerMoreDropdown.setAttribute('hidden', '');
        }
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.header-more-menu-wrapper')) {
          if (this.dom.headerMoreDropdown) {
            this.dom.headerMoreDropdown.setAttribute('hidden', '');
          }
        }
      });
    }

    // Dropdown Action: Duplicate Note
    if (this.dom.moreDuplicateBtn) {
      this.dom.moreDuplicateBtn.addEventListener('click', () => {
        if (!this.state.activeId) return;
        const copy = Store.duplicate(this.state.activeId);
        if (copy) {
          this.state.activeId = copy.id;
          this.state.view = 'notes';
          this.refreshUI();
          if (this.dom.headerMoreDropdown) this.dom.headerMoreDropdown.setAttribute('hidden', '');
          Render.showToast('Note duplicated');
        }
      });
    }

    // Dropdown Action: Copy Plain Text
    if (this.dom.moreCopyTextBtn) {
      this.dom.moreCopyTextBtn.addEventListener('click', async () => {
        if (!this.state.activeId) return;
        const note = Store.getById(this.state.activeId);
        if (!note) return;
        const text = `${note.title || 'Untitled Note'}\n\n${note.content || ''}`;
        try {
          await navigator.clipboard.writeText(text);
          Render.showToast('Plain text copied to clipboard!');
        } catch {
          prompt('Copy note text:', text);
        }
        if (this.dom.headerMoreDropdown) this.dom.headerMoreDropdown.setAttribute('hidden', '');
      });
    }

    // Dropdown Action: Export as .txt
    if (this.dom.moreExportTxtBtn) {
      this.dom.moreExportTxtBtn.addEventListener('click', () => {
        if (!this.state.activeId) return;
        const note = Store.getById(this.state.activeId);
        if (!note) return;
        const text = `${note.title || 'Untitled Note'}\n\n${note.content || ''}`;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const filename = (note.title || 'untitled-note').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        a.href = url;
        a.download = `${filename}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        if (this.dom.headerMoreDropdown) this.dom.headerMoreDropdown.setAttribute('hidden', '');
        Render.showToast('Downloaded .txt note file');
      });
    }
  }

  /**
   * HTML5 Drag-and-Drop Reordering (Up and Down)
   */
  bindDragAndDropEvents() {
    if (!this.dom.notesList) return;

    this.dom.notesList.addEventListener('dragstart', (e) => {
      const card = e.target.closest('.note-card');
      if (!card) return;
      this._draggedId = card.dataset.id;
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', this._draggedId);
      e.dataTransfer.effectAllowed = 'move';
    });

    this.dom.notesList.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      const card = e.target.closest('.note-card');
      if (!card || card.dataset.id === this._draggedId) return;

      // Clean indicators on other cards
      this.dom.notesList.querySelectorAll('.note-card').forEach(c => {
        if (c !== card) {
          c.classList.remove('drag-over-top', 'drag-over-bottom');
        }
      });

      const rect = card.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;

      if (e.clientY < midY) {
        card.classList.add('drag-over-top');
        card.classList.remove('drag-over-bottom');
      } else {
        card.classList.add('drag-over-bottom');
        card.classList.remove('drag-over-top');
      }
    });

    this.dom.notesList.addEventListener('dragleave', (e) => {
      const card = e.target.closest('.note-card');
      if (card && !card.contains(e.relatedTarget)) {
        card.classList.remove('drag-over-top', 'drag-over-bottom');
      }
    });

    this.dom.notesList.addEventListener('drop', (e) => {
      e.preventDefault();
      const targetCard = e.target.closest('.note-card');
      if (!targetCard || !this._draggedId) {
        this._cleanupDragStyles();
        return;
      }

      const targetId = targetCard.dataset.id;
      if (targetId === this._draggedId) {
        this._cleanupDragStyles();
        return;
      }

      const isTop = targetCard.classList.contains('drag-over-top');
      const allNotes = Store.getAll();
      const currentIds = allNotes.map(n => n.id);

      const draggedIndex = currentIds.indexOf(this._draggedId);
      if (draggedIndex === -1) {
        this._cleanupDragStyles();
        return;
      }

      // Remove dragged item
      currentIds.splice(draggedIndex, 1);

      // Find target index in remaining items
      let targetIndex = currentIds.indexOf(targetId);
      if (targetIndex === -1) {
        this._cleanupDragStyles();
        return;
      }

      if (!isTop) {
        targetIndex += 1;
      }

      // Insert at computed index
      currentIds.splice(targetIndex, 0, this._draggedId);

      // Save reordered sequence to store
      Store.reorder(currentIds);
      this._cleanupDragStyles();
      this.refreshUI();
      Render.showToast('Notes reordered');
    });

    this.dom.notesList.addEventListener('dragend', () => {
      this._cleanupDragStyles();
    });
  }

  _cleanupDragStyles() {
    this._draggedId = null;
    if (this.dom.notesList) {
      this.dom.notesList.querySelectorAll('.note-card').forEach(c => {
        c.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom');
      });
    }
  }

  /**
   * Bind active editor and settings canvas input events
   */
  bindEditorEvents() {
    if (!this.dom.editorContainer) return;

    this.dom.editorContainer.addEventListener('input', (e) => {
      // If in notes view, autosave note
      if (this.state.view === 'notes') {
        const activeNote = Store.getById(this.state.activeId);
        if (!activeNote) return;

        if (e.target.id === 'note-title-input') {
          const newTitle = e.target.value;
          Render.updateEditorStatus(this.dom.editorContainer, 'Saving...', true);
          this.debouncedSave(activeNote.id, { title: newTitle });
        }

        if (e.target.id === 'note-body-input') {
          const newContent = e.target.value;
          const wordCount = newContent.trim().split(/\s+/).filter(Boolean).length;
          const charCount = newContent.length;
          Render.updateMetrics(this.dom.editorContainer, wordCount, charCount);
          Render.updateEditorStatus(this.dom.editorContainer, 'Saving...', true);
          this.debouncedSave(activeNote.id, { content: newContent });
        }
      }
    });

    this.dom.editorContainer.addEventListener('change', (e) => {
      // File Import on Settings Page
      if (e.target.id === 'page-import-file-input') {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = Store.importData(event.target.result);
          if (result.success) {
            Render.showToast(`Imported ${result.count} note(s)!`);
            this.refreshUI();
          } else {
            alert(`Import failed: ${result.error || 'Unknown error'}`);
          }
        };
        reader.readAsText(file);
      }
    });

    this.dom.editorContainer.addEventListener('click', (e) => {
      // Settings Page: Back to Notes button
      if (e.target.closest('#settings-back-btn')) {
        this.state.view = 'notes';
        this.refreshUI();
        document.body.classList.remove('mobile-show-editor');
        return;
      }

      // Settings Page: Theme option pills
      const themeBtn = e.target.closest('.theme-option');
      if (themeBtn && e.target.closest('#theme-segmented-controls')) {
        const newTheme = themeBtn.dataset.theme;
        if (newTheme) {
          Store.saveSettings({ theme: newTheme });
          this.applyTheme(newTheme);
          const parent = themeBtn.parentElement;
          if (parent) {
            parent.querySelectorAll('.theme-option').forEach(btn => {
              btn.classList.toggle('active', btn === themeBtn);
            });
          }
          Render.showToast(`Theme changed to ${newTheme}`);
        }
        return;
      }

      // Settings Page: Export JSON
      if (e.target.closest('#page-export-json-btn')) {
        const data = Store.exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quicknotes-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        Render.showToast('Exported JSON backup');
        return;
      }

      // Settings Page: Export Markdown
      if (e.target.closest('#page-export-md-btn')) {
        const md = Store.exportMarkdown();
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quicknotes-vault-${new Date().toISOString().slice(0, 10)}.md`;
        a.click();
        URL.revokeObjectURL(url);
        Render.showToast('Exported Markdown vault');
        return;
      }

      // Settings Page: Clear All Notes
      if (e.target.closest('#page-clear-data-btn')) {
        if (confirm('Are you sure you want to clear all notes from this browser? This action cannot be undone.')) {
          Store.clearAllNotes();
          this.state.activeId = null;
          this.refreshUI();
          Render.showToast('All notes cleared');
        }
        return;
      }

      // Settings Page: Restore Sample Notes
      if (e.target.closest('#page-restore-samples-btn')) {
        if (confirm('Restore the default starter sample notes to your vault?')) {
          Store.resetToSampleNotes();
          const all = Store.getAll();
          this.state.activeId = all.length > 0 ? all[0].id : null;
          this.refreshUI();
          Render.showToast('Sample notes restored');
        }
        return;
      }

      // Mobile Back Button in Note Editor
      if (e.target.closest('#mobile-back-btn')) {
        document.body.classList.remove('mobile-show-editor');
        return;
      }

      // Pin button inside editor header
      if (e.target.closest('#editor-pin-btn')) {
        const activeNote = Store.getById(this.state.activeId);
        if (activeNote) {
          Store.update(activeNote.id, { pinned: !activeNote.pinned });
          this.refreshUI();
          Render.showToast(activeNote.pinned ? 'Note unpinned' : 'Note pinned');
        }
        return;
      }

      // Delete button inside editor header
      if (e.target.closest('#editor-delete-btn')) {
        const activeNote = Store.getById(this.state.activeId);
        if (activeNote) {
          Render.renderDeleteModal(this.dom.modalContainer, activeNote);
        }
        return;
      }

      // Empty / Unselected state action buttons
      if (e.target.closest('#state-create-btn') || e.target.closest('#state-new-note-btn')) {
        if (this.dom.newNoteBtn) this.dom.newNoteBtn.click();
      }
    });
  }

  /**
   * Bind drag and drop listener on the settings page restore zone
   */
  _bindDropzone() {
    const dropzone = this.dom.editorContainer.querySelector('#import-dropzone');
    const fileInput = this.dom.editorContainer.querySelector('#page-import-file-input');
    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', () => {
      fileInput.click();
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = Store.importData(event.target.result);
          if (result.success) {
            Render.showToast(`Imported ${result.count} note(s)!`);
            this.refreshUI();
          } else {
            alert(`Import failed: ${result.error || 'Invalid file format'}`);
          }
        };
        reader.readAsText(file);
      }
    });
  }

  /**
   * Search input and filter pill events
   */
  bindSearchAndFilterEvents() {
    if (this.dom.searchInput) {
      this.dom.searchInput.addEventListener('input', (e) => {
        this.state.searchQuery = e.target.value.trim().toLowerCase();
        this.renderNotesListOnly();
      });
    }

    if (this.dom.filterPillsContainer) {
      this.dom.filterPillsContainer.addEventListener('click', (e) => {
        const pill = e.target.closest('[data-filter]');
        if (pill) {
          this.state.filter = pill.dataset.filter;
          this.dom.filterPillsContainer.querySelectorAll('[data-filter]').forEach(p => {
            p.classList.toggle('active', p === pill);
          });
          this.renderNotesListOnly();
        }
      });
    }

    if (this.dom.sortBtn) {
      this.dom.sortBtn.addEventListener('click', () => {
        const modes = [SORT_MODES.UPDATED, SORT_MODES.CREATED, SORT_MODES.TITLE];
        const nextIdx = (modes.indexOf(this.state.sortBy) + 1) % modes.length;
        this.state.sortBy = modes[nextIdx];
        this.dom.sortBtn.title = `Sort: ${this.state.sortBy.toUpperCase()}`;
        const sortLabels = {
          [SORT_MODES.UPDATED]: 'Sorted by Last Edited',
          [SORT_MODES.CREATED]: 'Sorted by Date Created',
          [SORT_MODES.TITLE]: 'Sorted Alphabetically (Title)',
        };
        Render.showToast(sortLabels[this.state.sortBy] || 'Notes sorted');
        this.renderNotesListOnly();
      });
    }
  }

  /**
   * Modal dialog & drawer events
   */
  bindDrawerAndModalEvents() {
    // Modal delegated actions (Cancel and Delete)
    if (this.dom.modalContainer) {
      this.dom.modalContainer.addEventListener('click', (e) => {
        if (e.target.closest('#modal-cancel-btn') || e.target.id === 'modal-backdrop') {
          Render.closeModal(this.dom.modalContainer);
        }

        const confirmBtn = e.target.closest('#modal-confirm-delete-btn');
        if (confirmBtn) {
          const noteId = confirmBtn.dataset.id;
          Store.delete(noteId);
          Render.closeModal(this.dom.modalContainer);
          if (this.state.activeId === noteId) {
            const remaining = Store.getAll();
            this.state.activeId = remaining.length > 0 ? remaining[0].id : null;
          }
          this.refreshUI();
          document.body.classList.remove('mobile-show-editor');
          Render.showToast('Note deleted');
        }
      });
    }

    // Drawer delegated actions (if drawer is open)
    if (this.dom.drawerContainer) {
      this.dom.drawerContainer.addEventListener('click', (e) => {
        if (e.target.closest('#drawer-close-btn') || e.target.id === 'drawer-backdrop') {
          Render.closeSettingsDrawer(this.dom.drawerContainer);
          return;
        }

        // Drawer theme option click
        const drawerThemeBtn = e.target.closest('.theme-option');
        if (drawerThemeBtn && e.target.closest('#drawer-theme-segmented')) {
          const newTheme = drawerThemeBtn.dataset.theme;
          if (newTheme) {
            Store.saveSettings({ theme: newTheme });
            this.applyTheme(newTheme);
            drawerThemeBtn.parentElement.querySelectorAll('.theme-option').forEach(btn => {
              btn.classList.toggle('active', btn === drawerThemeBtn);
            });
            Render.showToast(`Theme changed to ${newTheme}`);
          }
          return;
        }

        // Export JSON
        if (e.target.closest('#export-json-btn')) {
          const data = Store.exportData();
          const blob = new Blob([data], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `quicknotes-backup-${new Date().toISOString().slice(0, 10)}.json`;
          a.click();
          URL.revokeObjectURL(url);
          Render.showToast('Exported JSON backup');
          return;
        }

        // Export Markdown
        if (e.target.closest('#export-md-btn')) {
          const md = Store.exportMarkdown();
          const blob = new Blob([md], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `quicknotes-vault-${new Date().toISOString().slice(0, 10)}.md`;
          a.click();
          URL.revokeObjectURL(url);
          Render.showToast('Exported Markdown vault');
          return;
        }

        // Clear All Notes in Drawer
        if (e.target.closest('#drawer-clear-data-btn')) {
          if (confirm('Are you sure you want to clear all notes from this browser? This action cannot be undone.')) {
            Store.clearAllNotes();
            this.state.activeId = null;
            this.refreshUI();
            Render.closeSettingsDrawer(this.dom.drawerContainer);
            Render.showToast('All notes cleared');
          }
          return;
        }
      });

      this.dom.drawerContainer.addEventListener('change', (e) => {
        // Import JSON file in Drawer
        if (e.target.id === 'import-json-file') {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (event) => {
            const result = Store.importData(event.target.result);
            if (result.success) {
              Render.showToast(`Imported ${result.count} note(s)!`);
              this.refreshUI();
              Render.closeSettingsDrawer(this.dom.drawerContainer);
            } else {
              alert(`Import failed: ${result.error || 'Unknown error'}`);
            }
          };
          reader.readAsText(file);
        }
      });
    }
  }

  /**
   * Apply selected theme class to root
   * @param {string} theme
   */
  applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System default
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }

  /**
   * Global keyboard shortcuts
   */
  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ctrl+N / Cmd+N -> New Note
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (this.dom.newNoteBtn) this.dom.newNoteBtn.click();
      }

      // Ctrl+K / Cmd+K -> Focus Search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (this.dom.searchInput) {
          this.dom.searchInput.focus();
          this.dom.searchInput.select();
        }
      }

      // Ctrl+S / Cmd+S -> Immediate Save on Demand
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (this.state.activeId && this.state.view === 'notes') {
          const titleInput = document.getElementById('note-title-input');
          const bodyInput = document.getElementById('note-body-input');
          if (titleInput || bodyInput) {
            Store.update(this.state.activeId, {
              title: titleInput ? titleInput.value : '',
              content: bodyInput ? bodyInput.value : '',
            });
            Render.updateEditorStatus(this.dom.editorContainer, 'Saved automatically', false);
            Render.showToast('Note saved to browser storage');
            const updatedNote = Store.getById(this.state.activeId);
            if (updatedNote) {
              Render.updateNoteCardSnippet(this.dom.notesList, updatedNote);
            }
          }
        }
      }

      // Escape -> close modal, dropdown, drawer, or return to notes from settings
      if (e.key === 'Escape') {
        Render.closeModal(this.dom.modalContainer);
        Render.closeSettingsDrawer(this.dom.drawerContainer);
        if (this.dom.headerMoreDropdown) {
          this.dom.headerMoreDropdown.setAttribute('hidden', '');
        }
        if (this.state.view === 'settings') {
          this.state.view = 'notes';
          this.refreshUI();
        }
      }
    });
  }

  /**
   * Sync across multiple browser tabs via 'storage' window event
   */
  bindStorageSync() {
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        const notes = Store.getAll();
        if (!notes.find(n => n.id === this.state.activeId)) {
          this.state.activeId = notes.length > 0 ? notes[0].id : null;
        }
        this.refreshUI();
      }
    });
  }

  /**
   * Compute filtered & sorted notes
   * @returns {Array}
   */
  getVisibleNotes() {
    let notes = Store.getAll();

    // Filter
    if (this.state.filter === FILTER_MODES.PINNED) {
      notes = notes.filter(n => n.pinned);
    }

    // Search query
    if (this.state.searchQuery) {
      const q = this.state.searchQuery;
      notes = notes.filter(n =>
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.content && n.content.toLowerCase().includes(q))
      );
    }

    // Sort: Pinned notes always top in list
    notes.sort((a, b) => {
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }
      if (this.state.sortBy === SORT_MODES.TITLE) {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (this.state.sortBy === SORT_MODES.CREATED) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
    });

    return notes;
  }

  /**
   * Re-render notes list only
   */
  renderNotesListOnly() {
    const visibleNotes = this.getVisibleNotes();
    Render.renderNoteList(
      this.dom.notesList,
      visibleNotes,
      this.state.view === 'notes' ? this.state.activeId : null,
      this.state.filter,
      this.state.searchQuery
    );
    this.updateCountsBadge();
  }

  /**
   * Update badges in sidebar
   */
  updateCountsBadge() {
    const all = Store.getAll();
    const pinnedCount = all.filter(n => n.pinned).length;
    if (this.dom.allCountBadge) this.dom.allCountBadge.textContent = all.length;
    if (this.dom.pinnedCountBadge) this.dom.pinnedCountBadge.textContent = pinnedCount;
  }

  /**
   * Sync active note tools on top right header
   * @param {Object|null} activeNote
   */
  updateHeaderTools(activeNote) {
    if (!this.dom.headerNoteActions) return;

    if (!activeNote || this.state.view === 'settings') {
      this.dom.headerNoteActions.classList.add('disabled-actions');
      if (this.dom.headerPinBtn) this.dom.headerPinBtn.classList.remove('active-pin');
      return;
    }

    this.dom.headerNoteActions.classList.remove('disabled-actions');

    if (this.dom.headerPinBtn) {
      this.dom.headerPinBtn.classList.toggle('active-pin', !!activeNote.pinned);
      this.dom.headerPinBtn.title = activeNote.pinned ? 'Unpin note' : 'Pin note to top';
    }

    if (this.dom.headerMoreStats) {
      const words = activeNote.content ? activeNote.content.trim().split(/\s+/).filter(Boolean).length : 0;
      const chars = activeNote.content ? activeNote.content.length : 0;
      this.dom.headerMoreStats.textContent = `${words} words · ${chars} chars`;
    }
  }

  /**
   * Full UI refresh (sidebar list + main editor/settings/empty state)
   */
  refreshUI() {
    const allNotes = Store.getAll();
    this.renderNotesListOnly();

    // Toggle active state on left bottom sidebar settings trigger
    if (this.dom.sidebarSettingsBtn) {
      this.dom.sidebarSettingsBtn.classList.toggle('active', this.state.view === 'settings');
    }

    // If Settings View is active, render Settings Page
    if (this.state.view === 'settings') {
      const settings = Store.getSettings();
      const stats = Store.calculateStorageUsage();
      Render.renderSettingsPage(this.dom.editorContainer, settings, stats);
      this._bindDropzone();
      this.updateHeaderTools(null);
      return;
    }

    // Otherwise render note canvas
    if (allNotes.length === 0) {
      this.state.activeId = null;
      Render.renderEmptyState(this.dom.editorContainer);
      this.updateHeaderTools(null);
      return;
    }

    if (!this.state.activeId) {
      this.state.activeId = allNotes[0].id;
    }

    const activeNote = Store.getById(this.state.activeId) || allNotes[0];
    this.state.activeId = activeNote.id;
    Render.renderNoteEditor(this.dom.editorContainer, activeNote);
    this.updateHeaderTools(activeNote);
  }
}
