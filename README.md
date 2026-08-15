<div align="center">

# 🎵 Fermata

**A premium music streaming web application**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

</div>

---

## ✨ Features

- **HLS Audio Streaming** — Adaptive bitrate streaming via `hls.js` for seamless playback
- **3D Spatial Audio** — Immersive audio experience with spatial audio controls
- **10-Band Equalizer** — Fine-tune your listening experience with a built-in graphic EQ
- **Sound Capsule** — AI-driven listening insights and music analytics
- **Dark & Light Themes** — Full theming system with RGBA accent color picker
- **PWA Support** — Installable as a native-feeling app with offline capabilities
- **Artist Studio** — Dedicated dashboard for artists to manage and upload tracks
- **Admin Panel** — Full admin dashboard for platform management
- **Cloudflare Turnstile** — Bot protection on authentication flows
- **Responsive Design** — Optimized for desktop, tablet, and mobile

## 🏗️ Tech Stack

| Layer         | Technology                              |
| ------------- | --------------------------------------- |
| **Framework** | React 19 + TypeScript 6                 |
| **Bundler**   | Vite 8                                  |
| **Styling**   | Tailwind CSS 4                          |
| **State**     | Zustand                                 |
| **Routing**   | React Router 7 (HashRouter)             |
| **HTTP**      | Axios + custom fetch client w/ JWT refresh |
| **Audio**     | hls.js (HLS adaptive streaming)         |
| **Icons**     | Lucide React                            |
| **PWA**       | vite-plugin-pwa + Workbox               |
| **Lint**      | oxlint                                  |

## 📂 Project Structure

```
src/
├── api/              # API client modules (auth, tracks, albums, playlists, etc.)
├── assets/           # Static assets (SVG logo)
├── components/       # Reusable UI components
│   ├── Layout.tsx          # App shell with sidebar, now-playing bar
│   ├── NowPlayingBar.tsx   # Persistent audio player
│   ├── ExpandedPlayer.tsx  # Full-screen player view
│   ├── SearchInput.tsx     # Global search with suggestions
│   ├── Sidebar.tsx         # Navigation sidebar
│   └── ...
├── modules/          # Feature modules (weather sync, etc.)
├── pages/            # Route-level page components
│   ├── HomePage.tsx        # Landing dashboard
│   ├── SearchPage.tsx      # Search with categories
│   ├── ArtistPage.tsx      # Artist profile with discography
│   ├── ArtistPanelPage.tsx # Artist studio dashboard
│   ├── AdminPanelPage.tsx  # Admin control panel
│   └── ...
├── store/            # Zustand state stores
│   ├── playerStore.ts      # Audio playback state & queue
│   ├── authStore.ts        # JWT authentication state
│   ├── themeStore.ts       # Theme & accent color
│   └── toastStore.ts       # Toast notification state
├── types/            # TypeScript type definitions
├── utils/            # Utility functions (offline cache, time helpers)
├── App.tsx           # Root component with routing
├── main.tsx          # Entry point
└── index.css         # Global styles & CSS variables
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

### Installation

```bash
# Clone the repository
git clone https://github.com/sahed-hossen/fermata.git
cd fermata

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your actual values
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the app.

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and fill in your values:

| Variable                  | Description                                  |
| ------------------------- | -------------------------------------------- |
| `VITE_API_BASE`           | Local backend API URL                        |
| `VITE_API_HOSTED_BASE`    | Production backend API URL                   |
| `VITE_HEALTH_CHECK_TOKEN` | Backend health-check authorization token     |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key for captcha    |

> **⚠️ Never commit your `.env` file.** It is already listed in `.gitignore`.

## 📜 License

This project is licensed under the [MIT License](./LICENSE).
