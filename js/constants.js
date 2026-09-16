/**
 * QuickNotes - Application Constants & Default Configuration
 */

export const STORAGE_KEY = 'quicknotes:notes';
export const SETTINGS_KEY = 'quicknotes:settings';

export const FILTER_MODES = {
  ALL: 'all',
  PINNED: 'pinned',
};

export const SORT_MODES = {
  UPDATED: 'updated',
  CREATED: 'created',
  TITLE: 'title',
};

export const DEFAULT_SETTINGS = {
  theme: 'system', // 'light' | 'dark' | 'system'
  fontSize: 'medium', // 'small' | 'medium' | 'large'
  autoSaveDelay: 400,
  sortBy: SORT_MODES.UPDATED,
};

export const INITIAL_SAMPLE_NOTES = [
  {
    id: 'e0000000-0000-4000-8000-000000000001',
    title: 'Sprint Goals & Milestones',
    content: `1. Finalize the database schema and localStorage persistence layer.
2. Build two-column responsive split layout inspired by modern minimalist design.
3. Implement debounced auto-save with real-time visual feedback.
4. Add search filtering (Ctrl+K) and pinned note organization.
5. Verify multi-tab synchronization and offline data safety.`,
    pinned: true,
    order: 0,
    color: null,
    tags: ['Work', 'Sprint'],
    createdAt: new Date(Date.now() - 3600 * 1000 * 24 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 120 * 1000).toISOString(),
  },
  {
    id: 'e0000000-0000-4000-8000-000000000002',
    title: 'Book Recommendations 2026',
    content: `Essential reading for this quarter:
• Atomic Habits — James Clear
• Designing Data-Intensive Applications — Martin Kleppmann
• The Pragmatic Programmer — David Thomas & Andrew Hunt
• A Philosophy of Software Design — John Ousterhout`,
    pinned: false,
    order: 1,
    color: null,
    tags: ['Reading', 'Personal'],
    createdAt: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
  },
  {
    id: 'e0000000-0000-4000-8000-000000000003',
    title: 'Weekly Grocery List',
    content: `- Sourdough bread
- Organic whole milk
- Cage-free eggs
- Greek yogurt & blueberries
- Fresh rosemary & olive oil
- Cold brew roast beans`,
    pinned: false,
    order: 2,
    color: null,
    tags: ['Personal'],
    createdAt: new Date(Date.now() - 3600 * 1000 * 72).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000 * 18).toISOString(),
  }
];
