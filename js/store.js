/**
 * QuickNotes - Data Layer (Model)
 * Encapsulates per-user localStorage isolation and Supabase database cloud sync.
 * Guarantees that every user sees ONLY their own notes, and never others' data.
 */

import { SETTINGS_KEY, DEFAULT_SETTINGS, INITIAL_SAMPLE_NOTES } from './constants.js';
import { generateId } from './utils.js';
import { supabase } from './supabase.js';

function getCurrentUserFromStorage() {
  try {
    const raw = localStorage.getItem('quicknotes:current_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getStorageKeyForUser(user) {
  if (user && (user.id || user.username)) {
    return `quicknotes:notes:${user.id || user.username}`;
  }
  return 'quicknotes:notes:guest';
}

class NotesStore {
  constructor() {
    this._listeners = new Set();
    this._currentUser = getCurrentUserFromStorage();
    this._initStorage();
    this.syncFromCloud();
  }

  getStorageKey() {
    return getStorageKeyForUser(this._currentUser);
  }

  /**
   * Switch active user context, isolate notes to this user, and sync with database
   * @param {Object|null} user
   */
  switchUser(user) {
    this._currentUser = user;
    this._initStorage();
    this.syncFromCloud();
    this._notify('switch-user', this.getAll());
  }

  /**
   * Sync user notes from Supabase database (protected by RLS)
   */
  async syncFromCloud() {
    if (!this._currentUser || !supabase?.from) return;
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        if (data.length > 0) {
          const cloudNotes = data.map(row => ({
            id: row.id,
            title: row.title || '',
            content: row.content || '',
            pinned: Boolean(row.pinned),
            order: typeof row.order_index === 'number' ? row.order_index : 0,
            color: row.color || null,
            tags: Array.isArray(row.tags) ? row.tags : [],
            createdAt: row.created_at || new Date().toISOString(),
            updatedAt: row.updated_at || new Date().toISOString(),
          }));
          this.saveAll(cloudNotes, false);
        } else {
          // If user exists in cloud but has 0 notes in database, sync local to cloud
          const local = this.getAll();
          for (const note of local) {
            this._syncInsertToCloud(note);
          }
        }
      }
    } catch (err) {
      console.warn('QuickNotes: Cloud sync notice:', err);
    }
  }

  _syncInsertToCloud(note) {
    if (!this._currentUser || !supabase?.from) return;
    supabase
      .from('notes')
      .insert({
        id: note.id,
        user_id: this._currentUser.id,
        title: note.title || '',
        content: note.content || '',
        pinned: Boolean(note.pinned),
        order_index: typeof note.order === 'number' ? note.order : 0,
        color: note.color || null,
        is_archived: false,
        is_trashed: false,
      })
      .catch(err => console.warn('QuickNotes: Insert to cloud note:', err));
  }

  _syncUpdateToCloud(note) {
    if (!this._currentUser || !supabase?.from) return;
    supabase
      .from('notes')
      .update({
        title: note.title || '',
        content: note.content || '',
        pinned: Boolean(note.pinned),
        order_index: typeof note.order === 'number' ? note.order : 0,
        color: note.color || null,
        updated_at: note.updatedAt || new Date().toISOString(),
      })
      .eq('id', note.id)
      .catch(err => console.warn('QuickNotes: Update to cloud note:', err));
  }

  _syncDeleteToCloud(id) {
    if (!this._currentUser || !supabase?.from) return;
    supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .catch(err => console.warn('QuickNotes: Delete from cloud note:', err));
  }

  /**
   * Seed initial notes if storage key does not exist
   */
  _initStorage() {
    try {
      const key = this.getStorageKey();
      const existing = localStorage.getItem(key);
      if (existing === null) {
        if (!this._currentUser) {
          // Guest starts with default starter sample notes
          this.saveAll(INITIAL_SAMPLE_NOTES, false);
        } else {
          // New authenticated user starts with their own private welcome note
          const welcomeNote = [
            {
              id: generateId(),
              title: `Welcome to QuickNotes, ${this._currentUser.username || 'User'}!`,
              content: `This is your private workspace.\n\nAll notes you create here are saved to your account in the database and are completely private to you. Other users cannot see your notes.`,
              pinned: true,
              order: 0,
              color: null,
              tags: ['Personal'],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ];
          this.saveAll(welcomeNote, true);
        }
      }
    } catch (err) {
      console.warn('QuickNotes: Storage access failed during initialization.', err);
    }
  }

  /**
   * Subscribe to internal data changes
   * @param {Function} callback
   * @returns {Function} unsubscribe function
   */
  subscribe(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  /**
   * Notify subscribers of state changes
   * @param {string} action
   * @param {*} payload
   */
  _notify(action, payload) {
    for (const listener of this._listeners) {
      try {
        listener(action, payload);
      } catch (err) {
        console.error('QuickNotes: Subscriber error:', err);
      }
    }
  }

  /**
   * Retrieve all notes for currently active user
   * @returns {Array}
   */
  getAll() {
    try {
      const raw = localStorage.getItem(this.getStorageKey());
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('QuickNotes: Failed to parse notes from storage.', err);
      return [];
    }
  }

  /**
   * Retrieve single note by ID
   * @param {string} id
   * @returns {Object|null}
   */
  getById(id) {
    const notes = this.getAll();
    return notes.find(n => n.id === id) || null;
  }

  /**
   * Save notes array to storage and optionally sync
   * @param {Array} notes
   * @param {boolean} syncToCloud
   * @returns {boolean} true on success
   */
  saveAll(notes, syncToCloud = true) {
    try {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(notes));
      this._notify('save', notes);
      return true;
    } catch (err) {
      if (err.name === 'QuotaExceededError') {
        alert('Storage quota exceeded! Please delete old notes or export backup data.');
      } else {
        console.error('QuickNotes: Could not write notes to localStorage.', err);
      }
      return false;
    }
  }

  /**
   * Create and prepend a new note
   * @param {Object} note
   * @returns {Object}
   */
  create(note) {
    const notes = this.getAll();
    const newNote = {
      id: note.id || generateId(),
      title: note.title || '',
      content: note.content || '',
      pinned: Boolean(note.pinned),
      order: typeof note.order === 'number' ? note.order : 0,
      color: note.color || null,
      tags: Array.isArray(note.tags) ? note.tags : [],
      createdAt: note.createdAt || new Date().toISOString(),
      updatedAt: note.updatedAt || new Date().toISOString(),
    };

    notes.unshift(newNote);
    this.saveAll(notes, false);
    this._syncInsertToCloud(newNote);
    this._notify('create', newNote);
    return newNote;
  }

  /**
   * Update an existing note by ID
   * @param {string} id
   * @param {Object} changes
   * @returns {Object|null}
   */
  update(id, changes) {
    const notes = this.getAll();
    const index = notes.findIndex(n => n.id === id);
    if (index === -1) return null;

    notes[index] = {
      ...notes[index],
      ...changes,
      updatedAt: new Date().toISOString(),
    };

    this.saveAll(notes, false);
    this._syncUpdateToCloud(notes[index]);
    this._notify('update', notes[index]);
    return notes[index];
  }

  /**
   * Duplicate a note by ID
   * @param {string} id
   * @returns {Object|null}
   */
  duplicate(id) {
    const note = this.getById(id);
    if (!note) return null;
    const copy = {
      ...note,
      id: generateId(),
      title: note.title ? `${note.title} (Copy)` : 'Untitled Note (Copy)',
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return this.create(copy);
  }

  /**
   * Delete a note by ID
   * @param {string} id
   * @returns {boolean}
   */
  delete(id) {
    const notes = this.getAll();
    const filtered = notes.filter(n => n.id !== id);
    if (filtered.length === notes.length) return false;

    this.saveAll(filtered, false);
    this._syncDeleteToCloud(id);
    this._notify('delete', id);
    return true;
  }

  /**
   * Reorder notes array based on given ordered ID list
   * @param {Array<string>} orderedIds
   */
  reorder(orderedIds) {
    const notes = this.getAll();
    const reordered = orderedIds
      .map(id => notes.find(n => n.id === id))
      .filter(Boolean);

    const reorderedSet = new Set(orderedIds);
    for (const note of notes) {
      if (!reorderedSet.has(note.id)) {
        reordered.push(note);
      }
    }

    this.saveAll(reordered, false);
    this._notify('reorder', reordered);
  }

  /**
   * Export all notes as a JSON formatted string
   * @returns {string}
   */
  exportData() {
    return JSON.stringify(
      {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        notes: this.getAll(),
        settings: this.getSettings(),
      },
      null,
      2
    );
  }

  /**
   * Import notes from a JSON payload
   * @param {string} jsonString
   * @returns {{ success: boolean, count: number, error?: string }}
   */
  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      const notesToImport = Array.isArray(data) ? data : data.notes;
      if (!Array.isArray(notesToImport)) {
        return { success: false, count: 0, error: 'Invalid JSON format: no notes array found.' };
      }

      const existing = this.getAll();
      const existingIds = new Set(existing.map(n => n.id));
      let addedCount = 0;

      for (const n of notesToImport) {
        if (n && n.id && !existingIds.has(n.id)) {
          existing.unshift(n);
          this._syncInsertToCloud(n);
          addedCount++;
        }
      }

      this.saveAll(existing, false);
      return { success: true, count: addedCount };
    } catch (err) {
      return { success: false, count: 0, error: err.message };
    }
  }

  /**
   * Retrieve saved user settings
   * @returns {Object}
   */
  getSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * Update and persist user settings
   * @param {Object} changes
   */
  saveSettings(changes) {
    try {
      const current = this.getSettings();
      const updated = { ...current, ...changes };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      this._notify('settings', updated);
      return updated;
    } catch (err) {
      console.error('QuickNotes: Could not save settings.', err);
      return null;
    }
  }

  /**
   * Calculate live storage usage and vault statistics
   * @returns {Object}
   */
  calculateStorageUsage() {
    const notes = this.getAll();
    const rawNotes = localStorage.getItem(this.getStorageKey()) || '';
    const rawSettings = localStorage.getItem(SETTINGS_KEY) || '';
    const bytes = (rawNotes.length + rawSettings.length) * 2;
    const kb = (bytes / 1024).toFixed(1);
    const maxKb = 5120;
    const percent = Math.max(1, Math.min(100, ((bytes / (maxKb * 1024)) * 100).toFixed(1)));

    let totalWords = 0;
    let totalChars = 0;
    let pinnedNotes = 0;

    for (const note of notes) {
      if (note.pinned) pinnedNotes++;
      if (note.content) {
        totalChars += note.content.length;
        totalWords += note.content.trim().split(/\s+/).filter(Boolean).length;
      }
      if (note.title) {
        totalChars += note.title.length;
        totalWords += note.title.trim().split(/\s+/).filter(Boolean).length;
      }
    }

    return {
      bytes,
      kb,
      maxKb,
      percent,
      totalNotes: notes.length,
      totalWords,
      totalChars,
      pinnedNotes,
    };
  }

  /**
   * Erase all notes from current user's storage
   */
  clearAllNotes() {
    const notes = this.getAll();
    for (const n of notes) {
      this._syncDeleteToCloud(n.id);
    }
    this.saveAll([], false);
    this._notify('clear', []);
    return true;
  }

  /**
   * Reset notes to starter sample notes
   */
  resetToSampleNotes() {
    this.saveAll(INITIAL_SAMPLE_NOTES, false);
    this._notify('reset', INITIAL_SAMPLE_NOTES);
    return INITIAL_SAMPLE_NOTES;
  }

  /**
   * Export notes as a combined Markdown document
   * @returns {string}
   */
  exportMarkdown() {
    const notes = this.getAll();
    const dateStr = new Date().toLocaleDateString();
    let md = `# QuickNotes Vault Export\nExported on: ${dateStr}\nTotal Notes: ${notes.length}\n\n---\n\n`;

    for (const note of notes) {
      const title = note.title || 'Untitled Note';
      const created = note.createdAt ? new Date(note.createdAt).toLocaleString() : '';
      const tags = note.tags && note.tags.length ? `Tags: ${note.tags.join(', ')}\n` : '';
      md += `## ${title}\n*Created: ${created}* ${note.pinned ? '• 📌 Pinned' : ''}\n${tags}\n${note.content || ''}\n\n---\n\n`;
    }

    return md;
  }
}

const Store = new NotesStore();
export default Store;
