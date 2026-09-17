<p align="center">
  <img src="./assets/logo.svg" width="120" height="120" alt="QuickNotes Logo" />
</p>

<h1 align="center">QuickNotes</h1>

<p align="center">
  <strong>A modern, lightning-fast, local-first note-taking app with seamless cloud authentication and zero-friction capture.</strong>
</p>

<p align="center">
  <a href="https://my-notes-brown-six.vercel.app/"><img src="https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel" alt="Live Demo" /></a>
  <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/CSS3-Vanilla%20Tokens-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/Supabase-Auth%20%26%20DB-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License" />
</p>

---

## 🌐 Live Demo

Try the live application hosted on Vercel:  
👉 **[https://my-notes-brown-six.vercel.app/](https://my-notes-brown-six.vercel.app/)**

---

## 🛠️ Tech Stack Used

QuickNotes is purposely engineered with **Vanilla Web Standards** for maximum performance, zero bloated bundlers, instant cold starts, and dependable longevity.

| Layer | Technology | Details & Purpose |
| :--- | :--- | :--- |
| **Markup & Structure** | **HTML5** | Semantic, accessible HTML structure with full accessibility (`aria-*`, keyboard landmarks, clean hierarchy). |
| **Styling & Design System** | **Vanilla CSS3** | Custom properties (CSS variables), design tokens, responsive Flexbox and Grid layouts, glassmorphism, and micro-interactions. No Tailwind or heavy preprocessor needed. |
| **Logic & State** | **Modern JavaScript (ES6+)** | Native ES Modules (`import`/`export`), async/await, modular MVC architecture (Store, Render, Events), and reactive event handling. |
| **Local Persistence** | **Browser LocalStorage** | Instant local-first storage. Notes are saved immediately offline with zero network latency. |
| **Cloud Authentication & Database** | **Supabase** | Optional cloud synchronization, user account registration, credential hashing, and cloud database persistence via lightweight REST client. |
| **Typography & Icons** | **Google Fonts & Material Symbols** | `Inter` (UI), `JetBrains Mono` (Code/Meta), and sharp Google Material Symbols Outlined. |
| **Hosting & Deployment** | **Vercel** | Fast global static edge deployment configured via [`vercel.json`](./vercel.json) with clean URLs and optimized cache headers. |
| **Local Dev Server** | **Node.js HTTP Server** | Lightweight native Node.js static server in [`server.js`](./server.js) with zero third-party npm dependencies. |

---

## ✨ Key Features

- **⚡ Instant CRUD & Auto-Save**: Create, edit, preview, and delete notes instantly with automatic debounced saving.
- **📌 Pinning & Sorting**: Pin essential notes to the top of your library. Sort instantly by Last Updated, Creation Date, or Alphabetical title.
- **🔍 Real-Time Search (`⌘K` / `Ctrl+K`)**: Fast, instantaneous client-side search filtering across titles, note content, and metadata.
- **🎨 Dark & Light Modes**: System-aware theme engine with manual overrides, persisted to your settings.
- **🔄 Local Sync + Cloud Sync**: 
  - Works 100% offline out-of-the-box in local mode (amber badge).
  - Automatically activates cloud synchronization (green badge) when signed into a user account.
- **🔐 Secure Authentication**: Clean sign-in, account creation, and password reset flows with database integration and local fallback.
- **📊 Note Statistics**: Real-time word count, character count, and formatted timestamps for every note.
- **💾 Data Portability**: Export your notes to structured JSON or plain text anytime.
- **📱 Fully Responsive**: Fluid, split-column layout on desktop and adaptive drawer navigation on mobile devices.

---

## 📂 Project Structure

```text
QuickNotes/
├── assets/
│   ├── logo.svg              # Official QuickNotes vector logo
│   └── icons/                # UI icons (notebook, check, search, pin, trash, etc.)
├── css/
│   ├── style.css             # Core design system tokens, layout, themes, & app UI
│   └── auth.css              # Dedicated stylesheet for authentication screens
├── js/
│   ├── app.js                # App bootstrap & event wiring
│   ├── store.js              # Model: LocalStorage CRUD, state management, & cloud sync
│   ├── render.js             # View: Dynamic DOM rendering, note lists, & empty states
│   ├── events.js             # Controller: User input handling, auto-save, keyboard shortcuts
│   ├── auth.js               # Auth controller: Sign in, sign up, session management
│   ├── supabase.js           # Direct lightweight Supabase REST & Auth client
│   └── utils.js              # Helpers: debounce, date formatting, ID generator
├── stitch_screens/           # UI design screen templates and reference mockups
├── index.html                # Main application page
├── login.html                # Sign-in page
├── signup.html               # Account creation page
├── forgot-password.html      # Password recovery page
├── schema.sql                # Supabase database schema & RLS security policies
├── server.js                 # Zero-dependency local development server
├── vercel.json               # Vercel static routing & cache configuration
├── package.json              # Project scripts and metadata
└── README.md                 # Project documentation
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>⌘</kbd> + <kbd>N</kbd> / <kbd>Ctrl</kbd> + <kbd>N</kbd> | Create a new note |
| <kbd>⌘</kbd> + <kbd>K</kbd> / <kbd>Ctrl</kbd> + <kbd>K</kbd> | Focus the search input |
| <kbd>Esc</kbd> | Close search / Dismiss active modals |
| <kbd>Tab</kbd> | Move focus between note list and editor |

---

## 🚀 Getting Started Locally

No package installation or build step is required! You can run QuickNotes with any static file server or using the included Node.js server.

### Option 1: Using the Included Node Server

```bash
# 1. Clone the repository
git clone https://github.com/Mkata-dev/MyNotes.git

# 2. Navigate to project directory
cd MyNotes

# 3. Start the local development server
npm run dev
# or: node server.js
```

Then open your browser at **`http://localhost:3000`**.

### Option 2: Direct Browser Launch
You can also directly serve or open `index.html` via VS Code Live Server or any static web server.

---

## ☁️ Deployment

The project is pre-configured for one-click deployment on **Vercel**:
- Deploy static files directly by connecting your GitHub repository to Vercel.
- The included [`vercel.json`](./vercel.json) automatically enforces static output, clean URLs, and instant asset cache invalidation.

---

## 📄 License

This project is open source and available under the [MIT License](./LICENSE).
