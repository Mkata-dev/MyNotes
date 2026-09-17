/**
 * QuickNotes - Application Entry Point
 * Bootstraps the application, wires Model, View, and Controller together.
 */

import Store from './store.js';
import { EventController } from './events.js';
import { FILTER_MODES, SORT_MODES } from './constants.js';
import { supabase } from './supabase.js';

/**
 * Initialize Supabase Auth Session and sync Header Profile controls
 */
async function initAuthSession(controller) {
  const authBtn = document.getElementById('header-auth-btn');
  const authLabel = document.getElementById('header-auth-label');
  const authIcon = document.getElementById('header-auth-icon');
  const authDropdown = document.getElementById('header-auth-dropdown');
  const authAvatar = document.getElementById('auth-avatar-initial');
  const authUserName = document.getElementById('auth-user-name');
  const authUserEmail = document.getElementById('auth-user-email');
  const authSignoutBtn = document.getElementById('auth-signout-btn');

  if (!authBtn) return;

  let currentUser = null;

  function getLocalUser() {
    try {
      const data = localStorage.getItem('quicknotes:current_user');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  function renderUserSession(user) {
    currentUser = user;
    Store.switchUser(user);
    if (controller) {
      const allNotes = Store.getAll();
      controller.state.activeId = allNotes.length > 0 ? allNotes[0].id : null;
      controller.refreshUI();
    }
    if (user) {
      const displayName = user.username || user.user_metadata?.username || user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';
      const initial = displayName.charAt(0).toUpperCase();

      if (authLabel) authLabel.textContent = displayName.length > 14 ? displayName.slice(0, 12) + '…' : displayName;
      if (authIcon) authIcon.textContent = 'person';
      if (authBtn) {
        authBtn.href = '#';
        authBtn.title = `Signed in as @${displayName}`;
        authBtn.classList.add('is-authenticated');
      }
      if (authAvatar) authAvatar.textContent = initial;
      if (authUserName) authUserName.textContent = displayName;
      if (authUserEmail) authUserEmail.textContent = user.email || `@${displayName}`;
    } else {
      if (authLabel) authLabel.textContent = 'Sign In';
      if (authIcon) authIcon.textContent = 'account_circle';
      if (authBtn) {
        authBtn.href = '/login.html';
        authBtn.title = 'Sign In / Account';
        authBtn.classList.remove('is-authenticated');
      }
      if (authDropdown) authDropdown.setAttribute('hidden', '');
    }
  }

  // Handle clicking the auth button
  authBtn.addEventListener('click', (e) => {
    if (currentUser) {
      e.preventDefault();
      e.stopPropagation();
      const isHidden = authDropdown.hasAttribute('hidden');
      if (isHidden) {
        authDropdown.removeAttribute('hidden');
      } else {
        authDropdown.setAttribute('hidden', '');
      }
    }
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#header-auth-wrapper')) {
      if (authDropdown) authDropdown.setAttribute('hidden', '');
    }
  });

  // Sign out handler
  if (authSignoutBtn) {
    authSignoutBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (authDropdown) authDropdown.setAttribute('hidden', '');
      try {
        localStorage.removeItem('quicknotes:current_user');
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Sign out notice:', err);
      }

      renderUserSession(null);

      // Show notification toast
      const toastContainer = document.getElementById('toast-container');
      if (toastContainer) {
        const toast = document.createElement('div');
        toast.className = 'toast-bubble';
        toast.innerHTML = `
          <span class="material-symbols-outlined text-[18px]">logout</span>
          <span>Signed out successfully</span>
        `;
        toastContainer.appendChild(toast);
        setTimeout(() => {
          toast.classList.add('fade-out');
          toast.addEventListener('animationend', () => toast.remove());
        }, 3000);
      }
    });
  }

  // Check current session: first local storage, then Supabase
  const localUser = getLocalUser();
  if (localUser) {
    renderUserSession(localUser);
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      renderUserSession(session.user);
    }

    // Subscribe to session transitions
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        renderUserSession(session.user);
      } else if (!getLocalUser()) {
        renderUserSession(null);
      }
    });
  } catch (err) {
    console.warn('QuickNotes: Supabase session sync notice:', err);
  }
}

function initApp() {
  // Grab key DOM element references
  const domElements = {
    newNoteBtn: document.getElementById('new-note-btn'),
    headerNewNoteBtn: document.getElementById('header-new-note-btn'),
    searchInput: document.getElementById('search-input'),
    sortBtn: document.getElementById('sort-btn'),
    filterPillsContainer: document.getElementById('filter-pills'),
    notesList: document.getElementById('notes-list-container'),
    editorContainer: document.getElementById('editor-panel'),
    modalContainer: document.getElementById('modal-container'),
    drawerContainer: document.getElementById('drawer-container'),
    sidebarSettingsBtn: document.getElementById('sidebar-settings-btn'),
    allCountBadge: document.getElementById('all-count-badge'),
    pinnedCountBadge: document.getElementById('pinned-count-badge'),
    headerNoteActions: document.getElementById('header-note-actions'),
    headerPinBtn: document.getElementById('header-pin-btn'),
    headerShareBtn: document.getElementById('header-share-btn'),
    headerDeleteBtn: document.getElementById('header-delete-btn'),
    headerMoreBtn: document.getElementById('header-more-btn'),
    headerMoreDropdown: document.getElementById('header-more-dropdown'),
    headerMoreStats: document.getElementById('header-more-stats'),
    moreDuplicateBtn: document.getElementById('more-duplicate-btn'),
    moreCopyTextBtn: document.getElementById('more-copy-text-btn'),
    moreExportTxtBtn: document.getElementById('more-export-txt-btn'),
  };

  // Initial runtime state
  const settings = Store.getSettings();
  const allNotes = Store.getAll();

  const appState = {
    activeId: allNotes.length > 0 ? allNotes[0].id : null,
    filter: FILTER_MODES.ALL,
    sortBy: settings.sortBy || SORT_MODES.UPDATED,
    searchQuery: '',
  };

  // Instantiate Controller
  const controller = new EventController(appState, domElements);

  // Apply saved theme
  controller.applyTheme(settings.theme);

  // Bind all user events & shortcuts
  controller.bindAll();

  // Initial render
  controller.refreshUI();

  // Initialize Supabase Auth Session
  initAuthSession(controller);

  console.log('QuickNotes initialized successfully with', allNotes.length, 'notes.');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
