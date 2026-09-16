/**
 * QuickNotes - View Layer (Render)
 * Pure DOM generation and template rendering functions.
 */

import { escapeHTML, formatRelativeTime, truncate } from './utils.js';

export const Render = {
  /**
   * Render the scrollable list of note cards in the sidebar
   * @param {HTMLElement} container
   * @param {Array} notes
   * @param {string|null} activeId
   * @param {string} filter
   * @param {string} searchTerm
   */
  renderNoteList(container, notes, activeId, filter = 'all', searchTerm = '') {
    if (!container) return;

    if (notes.length === 0) {
      if (searchTerm) {
        container.innerHTML = `
          <div class="empty-list-notice">
            <span class="material-symbols-outlined empty-icon">search_off</span>
            <p class="empty-title">No notes found</p>
            <p class="empty-desc">No notes match "${escapeHTML(searchTerm)}"</p>
          </div>
        `;
      } else if (filter === 'pinned') {
        container.innerHTML = `
          <div class="empty-list-notice">
            <span class="material-symbols-outlined empty-icon">keep_off</span>
            <p class="empty-title">No pinned notes</p>
            <p class="empty-desc">Click the pin icon on any note to keep it at the top.</p>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="empty-list-notice">
            <span class="material-symbols-outlined empty-icon">note_stack</span>
            <p class="empty-title">No notes yet</p>
            <p class="empty-desc">Click "+ New Note" to create your first thought.</p>
          </div>
        `;
      }
      return;
    }

    const html = notes.map(note => {
      const isActive = note.id === activeId;
      const isPinned = !!note.pinned;
      const title = note.title.trim() ? escapeHTML(note.title) : 'Untitled Note';
      const snippet = note.content.trim() ? escapeHTML(truncate(note.content, 90)) : 'No additional text';
      const timeStr = formatRelativeTime(note.updatedAt || note.createdAt);

      return `
        <div class="note-card ${isActive ? 'active' : ''} ${isPinned ? 'is-pinned' : ''}" 
             data-id="${escapeHTML(note.id)}"
             draggable="true"
             tabindex="0"
             role="button"
             aria-selected="${isActive}">
          <div class="note-card-header">
            <div class="note-card-title-row">
              <span class="drag-handle" title="Drag to reorder note" aria-hidden="true">
                <span class="material-symbols-outlined text-[16px]">drag_indicator</span>
              </span>
              ${isPinned ? `<span class="pin-indicator" title="Pinned Note"><span class="material-symbols-outlined text-[16px]">keep</span></span>` : ''}
              <h3 class="note-card-title">${title}</h3>
            </div>
            <div class="note-card-actions">
              <button class="icon-btn pin-btn ${isPinned ? 'pinned active-pin' : ''}" 
                      data-action="toggle-pin" 
                      data-id="${escapeHTML(note.id)}" 
                      title="${isPinned ? 'Unpin note' : 'Pin note to top'}" 
                      type="button"
                      aria-label="${isPinned ? 'Unpin note' : 'Pin note'}">
                <span class="material-symbols-outlined text-[16px]">keep</span>
              </button>
              <button class="icon-btn delete-btn" 
                      data-action="delete" 
                      data-id="${escapeHTML(note.id)}" 
                      title="Delete note" 
                      type="button"
                      aria-label="Delete note">
                <span class="material-symbols-outlined text-[16px]">delete</span>
              </button>
            </div>
          </div>
          <p class="note-card-snippet">${snippet}</p>
          <div class="note-card-footer">
            <span class="note-card-time">${timeStr}</span>
            ${note.tags && note.tags.length > 0 ? `
              <div class="note-card-tags">
                ${note.tags.slice(0, 2).map(t => `<span class="tag-pill">${escapeHTML(t)}</span>`).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  },

  /**
   * Update a specific note card in the list to avoid full re-renders during active typing
   * @param {HTMLElement} container
   * @param {Object} note
   */
  updateNoteCardSnippet(container, note) {
    if (!container) return;
    const card = container.querySelector(`.note-card[data-id="${note.id}"]`);
    if (!card) return;

    const titleEl = card.querySelector('.note-card-title');
    if (titleEl) {
      titleEl.textContent = note.title.trim() ? note.title : 'Untitled Note';
    }

    const snippetEl = card.querySelector('.note-card-snippet');
    if (snippetEl) {
      snippetEl.textContent = note.content.trim() ? truncate(note.content, 90) : 'No additional text';
    }

    const timeEl = card.querySelector('.note-card-time');
    if (timeEl) {
      timeEl.textContent = formatRelativeTime(note.updatedAt || note.createdAt);
    }
  },

  /**
   * Render the active note editor canvas
   * @param {HTMLElement} container
   * @param {Object} note
   */
  renderNoteEditor(container, note) {
    if (!container) return;
    const isPinned = !!note.pinned;
    const wordCount = note.content ? note.content.trim().split(/\s+/).filter(Boolean).length : 0;
    const charCount = note.content ? note.content.length : 0;

    container.innerHTML = `
      <div class="editor-wrapper" data-note-id="${escapeHTML(note.id)}">
        <!-- Top Toolbar / Context Header -->
        <header class="editor-header">
          <div class="editor-header-left">
            <button class="icon-btn mobile-back-btn" id="mobile-back-btn" title="Back to notes" type="button">
              <span class="material-symbols-outlined">arrow_back</span>
            </button>
            <div class="editor-status" id="editor-status">
              <span class="status-dot"></span>
              <span class="status-text">Saved automatically</span>
            </div>
          </div>
          <div class="editor-header-right">
            <span class="editor-metrics" id="editor-metrics">${wordCount} words · ${charCount} chars</span>
          </div>
        </header>

        <!-- Main Editing Canvas -->
        <div class="editor-canvas">
          <input type="text" 
                 id="note-title-input" 
                 class="note-title-input" 
                 placeholder="Title your note..." 
                 value="${escapeHTML(note.title || '')}" 
                 autocomplete="off" />
                 
          <div class="editor-meta-bar">
            <span class="editor-timestamp">Last edited ${formatRelativeTime(note.updatedAt || note.createdAt)}</span>
          </div>

          <textarea id="note-body-input" 
                    class="note-body-textarea" 
                    placeholder="Start typing your note here... (Markdown supported)"
                    spellcheck="true">${escapeHTML(note.content || '')}</textarea>
        </div>
      </div>
    `;
  },

  /**
   * Render empty state when zero notes exist (Screen 2)
   * @param {HTMLElement} container
   */
  renderEmptyState(container) {
    if (!container) return;
    container.innerHTML = `
      <div class="state-container empty-state">
        <div class="state-illustration-box">
          <div class="state-circle-bg">
            <span class="material-symbols-outlined state-main-icon">edit_note</span>
          </div>
        </div>
        <h2 class="state-title">Capture Your Thoughts</h2>
        <p class="state-description">
          QuickNotes is your minimal, fast, distraction-free space for ideas, meeting notes, code snippets, and daily lists.
        </p>
        <button class="btn btn-primary" id="state-create-btn" type="button">
          <span class="material-symbols-outlined text-[18px]">add</span>
          <span>Create First Note</span>
          <span class="shortcut-badge">⌘N</span>
        </button>
      </div>
    `;
  },

  /**
   * Render unselected state when notes exist but none is currently selected (Screen 3)
   * @param {HTMLElement} container
   */
  renderUnselectedState(container) {
    if (!container) return;
    container.innerHTML = `
      <div class="state-container unselected-state">
        <div class="state-illustration-box">
          <div class="state-circle-bg neutral">
            <span class="material-symbols-outlined state-main-icon">description</span>
          </div>
        </div>
        <h2 class="state-title">No Note Selected</h2>
        <p class="state-description">
          Select a note from the sidebar list to view and edit its content, or create a brand new one.
        </p>
        <button class="btn btn-primary" id="state-new-note-btn" type="button">
          <span class="material-symbols-outlined text-[18px]">add</span>
          <span>New Note</span>
        </button>
      </div>
    `;
  },

  /**
   * Render delete confirmation modal (Screen 6)
   * @param {HTMLElement} container
   * @param {Object} note
   */
  renderDeleteModal(container, note) {
    if (!container) return;
    const title = note.title.trim() ? escapeHTML(note.title) : 'Untitled Note';

    container.innerHTML = `
      <div class="modal-backdrop" id="modal-backdrop">
        <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal-header">
            <div class="modal-danger-icon">
              <span class="material-symbols-outlined">delete</span>
            </div>
            <div class="modal-title-group">
              <h3 id="modal-title" class="modal-title">Delete Note</h3>
              <p class="modal-subtitle">Are you sure you want to delete this note?</p>
            </div>
          </div>
          <div class="modal-body">
            <div class="modal-note-preview">
              <span class="preview-label">Note to be removed:</span>
              <p class="preview-title">"${title}"</p>
            </div>
            <p class="modal-warning">This action cannot be undone from local storage.</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="modal-cancel-btn" type="button">Cancel</button>
            <button class="btn btn-danger" id="modal-confirm-delete-btn" data-id="${escapeHTML(note.id)}" type="button">
              <span class="material-symbols-outlined text-[18px]">delete</span>
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Close and clear modal
   * @param {HTMLElement} container
   */
  closeModal(container) {
    if (!container) return;
    container.innerHTML = '';
  },

  /**
   * Render the Dedicated Real Settings Page (Canvas View)
   * @param {HTMLElement} container
   * @param {Object} settings
   * @param {Object} stats
   */
  renderSettingsPage(container, settings, stats) {
    if (!container) return;

    container.innerHTML = `
      <div class="settings-page-wrapper">
        <header class="settings-page-header">
          <div class="settings-header-info">
            <div class="settings-header-icon-box">
              <span class="material-symbols-outlined">settings</span>
            </div>
            <div>
              <h2 class="settings-heading">Settings &amp; Storage Vault</h2>
              <p class="settings-subheading">Personalize your workspace, monitor storage health, and manage local backups.</p>
            </div>
          </div>
          <button class="btn btn-secondary back-to-notes-btn" id="settings-back-btn" type="button">
            <span class="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Back to Notes</span>
          </button>
        </header>

        <div class="settings-page-body">
          <!-- Section 1: Appearance -->
          <section class="settings-card">
            <div class="settings-card-header">
              <div class="card-icon-pill">
                <span class="material-symbols-outlined">palette</span>
              </div>
              <div>
                <h3 class="card-title">Interface Appearance</h3>
                <p class="card-desc">Choose your preferred visual theme</p>
              </div>
            </div>
            <div class="theme-segmented-group" id="theme-segmented-controls">
              <button type="button" class="theme-option ${settings.theme === 'light' ? 'active' : ''}" data-theme="light">
                <span class="material-symbols-outlined">light_mode</span>
                <span class="theme-label">Light Minimal</span>
              </button>
              <button type="button" class="theme-option ${settings.theme === 'dark' ? 'active' : ''}" data-theme="dark">
                <span class="material-symbols-outlined">dark_mode</span>
                <span class="theme-label">Dark Slate</span>
              </button>
              <button type="button" class="theme-option ${settings.theme === 'system' ? 'active' : ''}" data-theme="system">
                <span class="material-symbols-outlined">desktop_windows</span>
                <span class="theme-label">System Default</span>
              </button>
            </div>
          </section>

          <!-- Section 2: Browser Storage & Health -->
          <section class="settings-card">
            <div class="settings-card-header">
              <div class="card-icon-pill">
                <span class="material-symbols-outlined">hard_drive</span>
              </div>
              <div>
                <h3 class="card-title">Browser Storage &amp; Health</h3>
                <p class="card-desc">Real-time local storage metrics</p>
              </div>
              <span class="health-status-badge">
                <span class="status-indicator-dot"></span>
                <span>100% Client-Only</span>
              </span>
            </div>

            <div class="storage-meter-box">
              <div class="storage-meter-header">
                <span class="text-sm font-medium">Browser Quota Usage</span>
                <span class="storage-fraction font-mono">${stats.kb} KB of ~${stats.maxKb} KB (${stats.percent}%) used</span>
              </div>
              <div class="storage-progress-track">
                <div class="storage-progress-bar" style="width: ${Math.max(stats.percent, 3)}%;"></div>
              </div>
            </div>

            <div class="vault-stats-grid">
              <div class="stat-box">
                <span class="stat-number">${stats.totalNotes}</span>
                <span class="stat-name">Total Notes</span>
              </div>
              <div class="stat-box">
                <span class="stat-number">${stats.pinnedNotes}</span>
                <span class="stat-name">Pinned Notes</span>
              </div>
              <div class="stat-box">
                <span class="stat-number">${stats.totalWords.toLocaleString()}</span>
                <span class="stat-name">Total Words</span>
              </div>
              <div class="stat-box">
                <span class="stat-number">${stats.totalChars.toLocaleString()}</span>
                <span class="stat-name">Characters</span>
              </div>
            </div>
          </section>

          <!-- Section 3: Data Backup & Portability -->
          <section class="settings-card">
            <div class="settings-card-header">
              <div class="card-icon-pill">
                <span class="material-symbols-outlined">shield</span>
              </div>
              <div>
                <h3 class="card-title">Data Backup &amp; Portability</h3>
                <p class="card-desc">Your notes live exclusively in this browser. Keep periodic backups safe.</p>
              </div>
            </div>

            <div class="backup-actions-grid">
              <div class="backup-action-card">
                <div class="backup-action-info">
                  <div class="action-icon-circle">
                    <span class="material-symbols-outlined">data_object</span>
                  </div>
                  <div>
                    <h4>Export JSON Backup</h4>
                    <p>Full structured backup format for restore</p>
                  </div>
                </div>
                <button type="button" class="btn btn-secondary" id="page-export-json-btn">
                  <span class="material-symbols-outlined text-[16px]">download</span>
                  <span>Export .json</span>
                </button>
              </div>

              <div class="backup-action-card">
                <div class="backup-action-info">
                  <div class="action-icon-circle">
                    <span class="material-symbols-outlined">description</span>
                  </div>
                  <div>
                    <h4>Export Markdown (.md)</h4>
                    <p>Clean formatted text file of all notes</p>
                  </div>
                </div>
                <button type="button" class="btn btn-secondary" id="page-export-md-btn">
                  <span class="material-symbols-outlined text-[16px]">download</span>
                  <span>Export .md</span>
                </button>
              </div>
            </div>

            <!-- Drag & Drop Restore Zone -->
            <div class="import-dropzone" id="import-dropzone">
              <input type="file" id="page-import-file-input" accept=".json" class="file-hidden-input" />
              <span class="material-symbols-outlined dropzone-icon">cloud_upload</span>
              <p class="dropzone-primary-text">Click to browse or drop a JSON backup file here</p>
              <p class="dropzone-sub-text">Supports QuickNotes .json backup vaults</p>
            </div>
          </section>

          <!-- Section 4: Danger Zone -->
          <section class="settings-card danger-card">
            <div class="settings-card-header">
              <div class="card-icon-pill danger">
                <span class="material-symbols-outlined">warning</span>
              </div>
              <div>
                <h3 class="card-title text-destructive">Danger Zone</h3>
                <p class="card-desc">Vault reset and data clearing options</p>
              </div>
            </div>

            <div class="danger-row">
              <div>
                <h4 class="font-semibold text-sm">Clear All Notes</h4>
                <p class="text-xs text-muted">Erase all notes and start fresh with an empty vault.</p>
              </div>
              <button type="button" class="btn btn-danger" id="page-clear-data-btn">
                <span class="material-symbols-outlined text-[16px]">delete</span>
                <span>Clear All Notes</span>
              </button>
            </div>

            <div class="danger-row border-top">
              <div>
                <h4 class="font-semibold text-sm">Restore Sample Notes</h4>
                <p class="text-xs text-muted">Load default starter templates and ideas.</p>
              </div>
              <button type="button" class="btn btn-secondary" id="page-restore-samples-btn">
                <span class="material-symbols-outlined text-[16px]">refresh</span>
                <span>Load Sample Notes</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    `;
  },

  /**
   * Render the Settings & Data Management Drawer (Screen 7)
   * @param {HTMLElement} container
   * @param {Object} settings
   * @param {Object} stats
   */
  renderSettingsDrawer(container, settings, stats) {
    if (!container) return;
    container.innerHTML = `
      <div class="drawer-backdrop" id="drawer-backdrop">
        <aside class="settings-drawer" role="dialog" aria-modal="true" aria-label="Settings and Data Management">
          <div class="drawer-header">
            <div class="drawer-title-group">
              <div class="drawer-header-icon-box">
                <span class="material-symbols-outlined text-[20px]">settings</span>
              </div>
              <div>
                <h3 class="text-[16px] font-semibold">Settings &amp; Storage</h3>
                <p class="text-[11px] text-muted">Local Vault Preferences</p>
              </div>
            </div>
            <button class="icon-btn" id="drawer-close-btn" title="Close Drawer" type="button">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="drawer-content">
            <!-- Appearance Section -->
            <section class="drawer-section">
              <h4 class="drawer-section-title">Appearance</h4>
              <div class="theme-segmented-group" id="drawer-theme-segmented">
                <button type="button" class="theme-option ${settings.theme === 'light' ? 'active' : ''}" data-theme="light">
                  <span class="material-symbols-outlined">light_mode</span>
                  <span class="theme-label">Light</span>
                </button>
                <button type="button" class="theme-option ${settings.theme === 'dark' ? 'active' : ''}" data-theme="dark">
                  <span class="material-symbols-outlined">dark_mode</span>
                  <span class="theme-label">Dark</span>
                </button>
                <button type="button" class="theme-option ${settings.theme === 'system' ? 'active' : ''}" data-theme="system">
                  <span class="material-symbols-outlined">desktop_windows</span>
                  <span class="theme-label">System</span>
                </button>
              </div>
            </section>

            <!-- Storage Info Section -->
            <section class="drawer-section">
              <h4 class="drawer-section-title">Browser Storage &amp; Health</h4>
              <div class="storage-meter-box">
                <div class="storage-meter-header">
                  <span class="text-xs font-medium">Usage</span>
                  <span class="storage-fraction font-mono text-xs">${stats.kb} KB of ~${stats.maxKb} KB (${stats.percent}%)</span>
                </div>
                <div class="storage-progress-track">
                  <div class="storage-progress-bar" style="width: ${Math.max(stats.percent, 3)}%;"></div>
                </div>
              </div>
              <div class="vault-stats-grid mt-3">
                <div class="stat-box">
                  <span class="stat-number">${stats.totalNotes}</span>
                  <span class="stat-name">Notes</span>
                </div>
                <div class="stat-box">
                  <span class="stat-number">${stats.pinnedNotes}</span>
                  <span class="stat-name">Pinned</span>
                </div>
                <div class="stat-box">
                  <span class="stat-number">${stats.totalWords.toLocaleString()}</span>
                  <span class="stat-name">Words</span>
                </div>
              </div>
            </section>

            <!-- Data Management Section -->
            <section class="drawer-section">
              <h4 class="drawer-section-title">Data Backup &amp; Portability</h4>
              <div class="drawer-button-group">
                <button class="btn btn-secondary w-full" id="export-json-btn" type="button">
                  <span class="material-symbols-outlined">download</span>
                  <span>Export Backup (JSON)</span>
                </button>
                <button class="btn btn-secondary w-full" id="export-md-btn" type="button">
                  <span class="material-symbols-outlined">description</span>
                  <span>Export Markdown (.md)</span>
                </button>
                <label class="btn btn-secondary w-full file-upload-label" for="import-json-file">
                  <span class="material-symbols-outlined">upload</span>
                  <span>Import Backup (JSON)</span>
                  <input type="file" id="import-json-file" accept=".json" class="hidden-file-input" />
                </label>
              </div>
            </section>

            <!-- Danger Zone -->
            <section class="drawer-section">
              <h4 class="drawer-section-title text-destructive">Danger Zone</h4>
              <div class="drawer-button-group">
                <button class="btn btn-danger w-full" id="drawer-clear-data-btn" type="button">
                  <span class="material-symbols-outlined">delete</span>
                  <span>Clear All Notes</span>
                </button>
              </div>
            </section>
          </div>
        </aside>
      </div>
    `;
  },

  /**
   * Close Settings Drawer
   * @param {HTMLElement} container
   */
  closeSettingsDrawer(container) {
    if (!container) return;
    container.innerHTML = '';
  },

  /**
   * Update autosave status feedback text and animation dot
   * @param {HTMLElement} container
   * @param {string} text
   * @param {boolean} isSaving
   */
  updateEditorStatus(container, text, isSaving = false) {
    if (!container) return;
    const dot = container.querySelector('.status-dot');
    const label = container.querySelector('.status-text');
    if (label) label.textContent = text;
    if (dot) {
      dot.className = 'status-dot ' + (isSaving ? 'saving' : 'saved');
    }
  },

  /**
   * Update word and character counts
   * @param {HTMLElement} container
   * @param {number} wordCount
   * @param {number} charCount
   */
  updateMetrics(container, wordCount, charCount) {
    if (!container) return;
    const el = container.querySelector('#editor-metrics');
    if (el) {
      el.textContent = `${wordCount} words · ${charCount} chars`;
    }
  },

  /**
   * Display floating toast feedback message
   * @param {string} message
   */
  showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-bubble';
    toast.innerHTML = `
      <span class="material-symbols-outlined text-[18px]">check_circle</span>
      <span>${escapeHTML(message)}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 2400);
  }
};
