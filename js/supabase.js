/**
 * QuickNotes - Direct Supabase Client
 * High-performance, zero-dependency client communicating directly with Supabase Auth & REST APIs.
 * Eliminates external CDN dependencies, network hangs, and provides reliable authentication and data sync.
 */

const SUPABASE_URL = 'https://acdvbouhyrlixtzwnkkm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjZHZib3VoeXJsaXh0endua2ttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNzg1MDcsImV4cCI6MjEwNDk1NDUwN30.ErXVqLgBjb4XILYCCtdZ_up4gxRHj16qMQYjdU9PraA';
const SESSION_STORAGE_KEY = 'quicknotes:supabase_session';

const authListeners = new Set();

function getStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStoredSession(session) {
  try {
    if (session) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch (err) {
    console.warn('QuickNotes: Could not save Supabase session:', err);
  }
}

function notifyAuthChange(event, session) {
  for (const listener of authListeners) {
    try {
      listener(event, session);
    } catch (err) {
      console.warn('QuickNotes: Auth listener error:', err);
    }
  }
}

function getHeaders(extraHeaders = {}) {
  const session = getStoredSession();
  const token = session?.access_token || SUPABASE_ANON_KEY;
  return {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
}

export const supabase = {
  auth: {
    async getSession() {
      const session = getStoredSession();
      return { data: { session }, error: null };
    },

    async signInWithPassword({ email, password }) {
      try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          const errMsg = data.error_description || data.msg || data.message || 'Invalid login credentials';
          return { data: { user: null, session: null }, error: new Error(errMsg) };
        }

        const session = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: data.expires_at,
          user: data.user,
        };

        saveStoredSession(session);
        notifyAuthChange('SIGNED_IN', session);

        return { data: { user: data.user, session }, error: null };
      } catch (err) {
        return { data: { user: null, session: null }, error: err };
      }
    },

    async signUp({ email, password, options = {} }) {
      try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            data: options.data || {},
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          const errMsg = data.error_description || data.msg || data.message || 'Could not create account';
          return { data: { user: null, session: null }, error: new Error(errMsg) };
        }

        const user = data.user || data;
        let session = null;

        if (data.access_token) {
          session = {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: data.expires_at,
            user,
          };
          saveStoredSession(session);
          notifyAuthChange('SIGNED_IN', session);
        } else {
          // Attempt immediate sign in since database auto-confirms users
          const loginResult = await this.signInWithPassword({ email, password });
          if (!loginResult.error && loginResult.data?.session) {
            session = loginResult.data.session;
          }
        }

        return { data: { user, session }, error: null };
      } catch (err) {
        return { data: { user: null, session: null }, error: err };
      }
    },

    async signOut() {
      saveStoredSession(null);
      notifyAuthChange('SIGNED_OUT', null);
      try {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: 'POST',
          headers: getHeaders(),
        });
      } catch {}
      return { error: null };
    },

    onAuthStateChange(callback) {
      authListeners.add(callback);
      const session = getStoredSession();
      if (session?.user) {
        setTimeout(() => callback('INITIAL_SESSION', session), 0);
      }
      return {
        data: {
          subscription: {
            unsubscribe: () => authListeners.delete(callback),
          },
        },
      };
    },
  },

  from(tableName) {
    const url = `${SUPABASE_URL}/rest/v1/${tableName}`;

    return {
      select(columns = '*') {
        const filters = [];
        let orderClause = '';

        const queryObj = {
          eq(column, value) {
            filters.push(`${encodeURIComponent(column)}=eq.${encodeURIComponent(value)}`);
            return queryObj;
          },
          order(column, { ascending = true } = {}) {
            orderClause = `&order=${encodeURIComponent(column)}.${ascending ? 'asc' : 'desc'}`;
            return queryObj;
          },
          then(resolve, reject) {
            const filterStr = filters.length ? `&${filters.join('&')}` : '';
            const finalUrl = `${url}?select=${encodeURIComponent(columns)}${filterStr}${orderClause}`;

            return fetch(finalUrl, {
              headers: getHeaders(),
            })
              .then(async res => {
                if (!res.ok) {
                  const text = await res.text();
                  return { data: [], error: new Error(text) };
                }
                const data = await res.json();
                return { data, error: null };
              })
              .catch(err => ({ data: [], error: err }))
              .then(resolve, reject);
          },
        };

        return queryObj;
      },

      insert(payload) {
        const records = Array.isArray(payload) ? payload : [payload];
        return fetch(url, {
          method: 'POST',
          headers: getHeaders({ 'Prefer': 'return=representation' }),
          body: JSON.stringify(records),
        })
          .then(async res => {
            if (!res.ok) {
              const text = await res.text();
              return { data: null, error: new Error(text) };
            }
            const data = await res.json();
            return { data, error: null };
          })
          .catch(err => ({ data: null, error: err }));
      },

      update(payload) {
        const filters = [];
        const queryObj = {
          eq(column, value) {
            filters.push(`${encodeURIComponent(column)}=eq.${encodeURIComponent(value)}`);
            return queryObj;
          },
          then(resolve, reject) {
            const filterStr = filters.length ? `?${filters.join('&')}` : '';
            return fetch(`${url}${filterStr}`, {
              method: 'PATCH',
              headers: getHeaders({ 'Prefer': 'return=representation' }),
              body: JSON.stringify(payload),
            })
              .then(async res => {
                if (!res.ok) {
                  const text = await res.text();
                  return { data: null, error: new Error(text) };
                }
                const data = await res.json();
                return { data, error: null };
              })
              .catch(err => ({ data: null, error: err }))
              .then(resolve, reject);
          },
        };
        return queryObj;
      },

      delete() {
        const filters = [];
        const queryObj = {
          eq(column, value) {
            filters.push(`${encodeURIComponent(column)}=eq.${encodeURIComponent(value)}`);
            return queryObj;
          },
          then(resolve, reject) {
            const filterStr = filters.length ? `?${filters.join('&')}` : '';
            return fetch(`${url}${filterStr}`, {
              method: 'DELETE',
              headers: getHeaders(),
            })
              .then(res => ({ data: null, error: res.ok ? null : new Error('Delete failed') }))
              .catch(err => ({ data: null, error: err }))
              .then(resolve, reject);
          },
        };
        return queryObj;
      },
    };
  },
};

export default supabase;
