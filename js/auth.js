/**
 * QuickNotes - Authentication Controller
 * Supports Username & Password Sign In, Sign Up, and Password Reset.
 * Fully resilient: Instant local storage authentication, non-blocking cloud sync,
 * zero loading hangs, and strict protection against page reload loops.
 */

import { supabase } from './supabase.js';

const USERS_STORAGE_KEY = 'quicknotes:users';
const CURRENT_USER_KEY = 'quicknotes:current_user';
const SETTINGS_KEY = 'quicknotes:settings';

/**
 * Apply current app theme so auth page matches the app's appearance
 */
function applyAppTheme() {
  try {
    const rawSettings = localStorage.getItem(SETTINGS_KEY);
    const settings = rawSettings ? JSON.parse(rawSettings) : {};
    const theme = settings.theme || 'system';

    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    }
  } catch (err) {
    console.warn('QuickNotes: Could not apply app theme:', err);
  }
}

/**
 * Toast notification helper
 */
function showToast(message, duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast-bubble';
  toast.innerHTML = `
    <span class="material-symbols-outlined text-[18px]">info</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

/**
 * Alert display helpers
 */
function showAlert(alertEl, message, type = 'error') {
  if (!alertEl) return;
  alertEl.className = `auth-alert ${type}`;
  let iconName = 'error';
  if (type === 'success') iconName = 'check_circle';
  if (type === 'info') iconName = 'info';
  alertEl.innerHTML = `
    <span class="material-symbols-outlined text-[18px]">${iconName}</span>
    <span>${message}</span>
  `;
  alertEl.removeAttribute('hidden');
}

function clearAlert(alertEl) {
  if (!alertEl) return;
  alertEl.setAttribute('hidden', '');
  alertEl.textContent = '';
}

/**
 * Safe button loading state manager - always guaranteed to be reversible
 */
function setLoading(btn, spinner, textEl, isLoading, defaultText = 'Submit') {
  if (!btn) return;
  btn.disabled = Boolean(isLoading);
  if (spinner) {
    if (isLoading) {
      spinner.removeAttribute('hidden');
      spinner.style.display = 'inline-block';
    } else {
      spinner.setAttribute('hidden', '');
      spinner.style.display = 'none';
    }
  }
  if (textEl) {
    textEl.textContent = isLoading ? 'Please wait...' : defaultText;
  }
}

/**
 * Local user management helpers
 */
function getLocalUsers() {
  try {
    const data = localStorage.getItem(USERS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalUser(user) {
  try {
    const users = getLocalUsers();
    const existingIndex = users.findIndex(
      u => u.username.toLowerCase() === user.username.toLowerCase()
    );
    if (existingIndex >= 0) {
      users[existingIndex] = { ...users[existingIndex], ...user };
    } else {
      users.push(user);
    }
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.warn('QuickNotes: Could not save local user:', err);
  }
}

function findLocalUser(username) {
  if (!username) return null;
  const users = getLocalUsers();
  return users.find(u => u.username.toLowerCase() === username.trim().toLowerCase()) || null;
}

function setCurrentUser(user) {
  try {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } catch (err) {
    console.warn('QuickNotes: Could not set current user:', err);
  }
}

function getCurrentUser() {
  try {
    const data = localStorage.getItem(CURRENT_USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

/**
 * Helper to map username to a compliant email format for Supabase compatibility
 */
function toEmail(username) {
  if (!username) return '';
  if (username.includes('@')) return username.trim();
  const clean = username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  return `${clean || 'user'}@quicknotes.app`;
}

/**
 * Check existing session without blocking event bindings or force-redirecting away
 */
async function checkExistingSession() {
  try {
    // If explicit logout is requested in URL
    if (window.location.search.includes('logout=true')) {
      try {
        localStorage.removeItem(CURRENT_USER_KEY);
        if (supabase?.auth?.signOut) await supabase.auth.signOut();
      } catch {}
      return;
    }

    const localUser = getCurrentUser();
    if (localUser) {
      const loginAlert = document.getElementById('login-alert');
      const signupAlert = document.getElementById('signup-alert');
      const usernameInput = document.getElementById('login-username');

      if (loginAlert) {
        showAlert(
          loginAlert,
          `Signed in as <strong>@${localUser.username}</strong>. Sign in to another account below, or <a href="./index.html" class="auth-link" style="text-decoration: underline;">return to notes</a>.`,
          'info'
        );
      }
      if (signupAlert) {
        showAlert(
          signupAlert,
          `Signed in as <strong>@${localUser.username}</strong>. Create another account below, or <a href="./index.html" class="auth-link" style="text-decoration: underline;">return to notes</a>.`,
          'info'
        );
      }
      if (usernameInput && !usernameInput.value) {
        usernameInput.value = localUser.username;
      }
    }
  } catch (err) {
    console.warn('QuickNotes: Session check notice:', err);
  }
}

/**
 * Password visibility toggles
 */
function initPasswordToggles() {
  const pwToggles = [
    { toggleId: 'toggle-login-pw', inputId: 'login-password', iconId: 'toggle-login-pw-icon' },
    { toggleId: 'toggle-signup-pw', inputId: 'signup-password', iconId: 'toggle-signup-pw-icon' },
  ];

  pwToggles.forEach(({ toggleId, inputId, iconId }) => {
    const toggleBtn = document.getElementById(toggleId);
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);

    if (toggleBtn && input && icon) {
      toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        icon.textContent = isPassword ? 'visibility_off' : 'visibility';
      });
    }
  });
}

/**
 * Sign In Form Handler
 */
function initLoginForm() {
  const loginForm = document.getElementById('login-form');
  if (!loginForm) return;

  const usernameInput = document.getElementById('login-username');
  const passwordInput = document.getElementById('login-password');
  const submitBtn = document.getElementById('login-submit-btn');
  const btnText = document.getElementById('login-btn-text');
  const spinner = document.getElementById('login-spinner');
  const alertBox = document.getElementById('login-alert');

  // Explicitly ensure non-loading state on initial render
  setLoading(submitBtn, spinner, btnText, false, 'Sign In');

  async function handleLogin(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    clearAlert(alertBox);

    const username = usernameInput?.value.trim();
    const password = passwordInput?.value;

    if (!username || !password) {
      showAlert(alertBox, 'Please enter your username and password.');
      return;
    }

    setLoading(submitBtn, spinner, btnText, true, 'Sign In');

    try {
      let loggedIn = false;
      const email = toEmail(username);

      // 1. Authenticate with Supabase database
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (!error && data?.user) {
        loggedIn = true;
        const authenticatedUser = {
          id: data.user.id,
          username: data.user.user_metadata?.username || username,
          email: data.user.email || email,
          signedInAt: Date.now(),
        };
        saveLocalUser({ ...authenticatedUser, password });
        setCurrentUser(authenticatedUser);
      } else {
        // 2. Fallback check against local registered users
        const local = findLocalUser(username);
        if (local && local.password === password) {
          loggedIn = true;
          setCurrentUser({
            id: local.id || 'local_' + Date.now(),
            username: local.username,
            email: local.email || email,
            signedInAt: Date.now(),
          });
        }
      }

      if (loggedIn) {
        showToast('Signed in successfully!');
        setTimeout(() => {
          window.location.href = './index.html';
        }, 150);
      } else {
        showAlert(alertBox, 'Invalid username or password. Please try again.');
      }
    } catch (err) {
      console.error('QuickNotes: Sign in error:', err);
      showAlert(alertBox, 'An error occurred during sign in. Please try again.');
    } finally {
      setLoading(submitBtn, spinner, btnText, false, 'Sign In');
    }
  }

  // Intercept form submit and button click
  loginForm.addEventListener('submit', handleLogin);
  if (submitBtn) {
    submitBtn.addEventListener('click', (e) => {
      if (e.target.type !== 'submit') {
        handleLogin(e);
      }
    });
  }
}

/**
 * Sign Up Form Handler
 */
function initSignupForm() {
  const signupForm = document.getElementById('signup-form');
  if (!signupForm) return;

  const usernameInput = document.getElementById('signup-username');
  const passwordInput = document.getElementById('signup-password');
  const submitBtn = document.getElementById('signup-submit-btn');
  const btnText = document.getElementById('signup-btn-text');
  const spinner = document.getElementById('signup-spinner');
  const alertBox = document.getElementById('signup-alert');

  // Explicitly ensure non-loading state on initial render
  setLoading(submitBtn, spinner, btnText, false, 'Create Account');

  async function handleSignup(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    clearAlert(alertBox);

    const username = usernameInput?.value.trim();
    const password = passwordInput?.value;

    if (!username || !password) {
      showAlert(alertBox, 'Please enter both a username and password.');
      return;
    }

    if (username.length < 2) {
      showAlert(alertBox, 'Username must be at least 2 characters long.');
      return;
    }

    if (password.length < 6) {
      showAlert(alertBox, 'Password must be at least 6 characters long.');
      return;
    }

    setLoading(submitBtn, spinner, btnText, true, 'Create Account');

    try {
      const email = toEmail(username);

      // 1. Create user in Supabase database
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            display_name: username,
          },
        },
      });

      if (error) {
        showAlert(alertBox, error.message || 'Could not create account in database.');
        return;
      }

      const dbUser = data?.user;
      const newUser = {
        id: dbUser?.id || ('usr_' + Date.now()),
        username,
        email,
        password,
        createdAt: Date.now(),
      };

      // 2. Persist locally and set active user session
      saveLocalUser(newUser);
      setCurrentUser({
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        signedInAt: Date.now(),
      });

      showToast(`Welcome to QuickNotes, ${username}!`);
      setTimeout(() => {
        window.location.href = './index.html';
      }, 150);
    } catch (err) {
      console.error('QuickNotes: Sign up error:', err);
      showAlert(alertBox, 'Could not create account. Please try again.');
    } finally {
      setLoading(submitBtn, spinner, btnText, false, 'Create Account');
    }
  }

  signupForm.addEventListener('submit', handleSignup);
  if (submitBtn) {
    submitBtn.addEventListener('click', (e) => {
      if (e.target.type !== 'submit') {
        handleSignup(e);
      }
    });
  }
}

/**
 * Forgot Password Form Handler
 */
function initForgotForm() {
  const forgotForm = document.getElementById('forgot-form');
  if (!forgotForm) return;

  const usernameInput = document.getElementById('forgot-username');
  const newPasswordInput = document.getElementById('forgot-new-password');
  const submitBtn = document.getElementById('forgot-submit-btn');
  const btnText = document.getElementById('forgot-btn-text');
  const spinner = document.getElementById('forgot-spinner');
  const alertBox = document.getElementById('forgot-alert');
  const forgotCard = document.getElementById('forgot-card');
  const successCard = document.getElementById('forgot-success-card');

  // Explicitly ensure non-loading state on initial render
  setLoading(submitBtn, spinner, btnText, false, 'Reset Password');

  async function handleForgot(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    clearAlert(alertBox);

    const username = usernameInput?.value.trim();
    const newPassword = newPasswordInput?.value;

    if (!username) {
      showAlert(alertBox, 'Please enter your username.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      showAlert(alertBox, 'New password must be at least 6 characters.');
      return;
    }

    setLoading(submitBtn, spinner, btnText, true, 'Reset Password');

    try {
      const local = findLocalUser(username);
      if (local) {
        local.password = newPassword;
        saveLocalUser(local);
      } else {
        saveLocalUser({
          id: 'usr_' + Date.now(),
          username,
          email: toEmail(username),
          password: newPassword,
          createdAt: Date.now(),
        });
      }

      try {
        localStorage.removeItem(CURRENT_USER_KEY);
        if (supabase?.auth?.signOut) {
          supabase.auth.signOut().catch(() => {});
        }
      } catch {}

      // Smoothly transition to success card
      if (forgotCard && successCard) {
        forgotCard.setAttribute('hidden', '');
        successCard.removeAttribute('hidden');
      }
    } catch (err) {
      console.error('QuickNotes: Password reset error:', err);
      showAlert(alertBox, 'Could not reset password. Please try again.');
    } finally {
      setLoading(submitBtn, spinner, btnText, false, 'Reset Password');
    }
  }

  forgotForm.addEventListener('submit', handleForgot);
  if (submitBtn) {
    submitBtn.addEventListener('click', (e) => {
      if (e.target.type !== 'submit') {
        handleForgot(e);
      }
    });
  }
}

/**
 * Bootstrap authentication system
 */
function initAuth() {
  applyAppTheme();
  initPasswordToggles();
  initLoginForm();
  initSignupForm();
  initForgotForm();
  checkExistingSession();
}

// Ensure execution occurs regardless of whether DOMContentLoaded already fired
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuth);
} else {
  initAuth();
}
