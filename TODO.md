# TODO & Migration Progress

## UI/UX Migration from `frontend` to `newfrontend`

### Completed Tasks
- [x] **Design & Assets**
  - [x] Copied `logo.svg` vector asset to `newfrontend/src/assets/logo.svg`
  - [x] Merged `index.css`: dark/light CSS variables, Inter font configuration, thin custom scrollbars, card glass hover effects (`.app-card`), and entrance page animations (`.app-page-transition`).
- [x] **Toast & Modal Notification System**
  - [x] Implemented `toastStore.ts` for managing global toast notifications.
  - [x] Created `ToastProvider.tsx` for displaying toast messages across the app.
  - [x] Created `ConfirmModal.tsx` for confirmation dialogs (e.g. playlist deletion).
- [x] **Component Restyling**
  - [x] `Card.tsx`: Glass hover lift, glowing borders, floating play button, placeholder fallback.
  - [x] `TrackRow.tsx`: Polished 6-column grid layout, like button with library integration & toast feedback, hover controls.
  - [x] `AddToPlaylistMenu.tsx`: Upgraded dropdown menu with instant playlist creation & toast alerts.
  - [x] `TrackList.tsx`: Added `onRemoveTrack` callback support.
  - [x] `Sidebar.tsx`: SVG branding logo, active nav indicator pill, and glass footer card.
  - [x] `Layout.tsx`: Mounted global `ToastProvider` for application-wide notifications.
- [x] **Page Restyling**
  - [x] `HomePage.tsx`: Shimmer skeleton loading state, greeting header, recently played cards grid, and section cards.
  - [x] `LoginPage.tsx`: Full background ambient orbs, form entrance animations, shimmer buttons, exit transition.
  - [x] `SearchPage.tsx`: Sticky search header, category color cards, suggestions dropdown, and recent searches.
  - [x] `LibraryPage.tsx`: Emerald collection banner with play button, styled track table with event listener sync.
  - [x] `PlaylistPage.tsx`: Dynamic gradient header, editable playlist name/description, action buttons (Play, Shuffle, Edit, Delete) with ConfirmModal.
  - [x] `ArtistPage.tsx`: Concert hero banner, verified badge, listener count, popular tracks grid with play count, discography grid, and about card.
  - [x] `ProfilePage.tsx`: Avatar glow ring, user details, crown badge, glass sections for top tracks & artists.
  - [x] `NotFound.tsx`: Styled 404 page with logo and home navigation button.

### Preserved Core Features (`newfrontend`)
- [x] **Audio Engine**: HLS audio streaming, playerStore, audio looper thread safety.
- [x] **Advanced Audio Tools**: 3D Spatial Audio modal & Equalizer modal.
- [x] **Theming**: Dark/Light mode + RGBA accent color picker (`themeStore.ts`).
- [x] **PWA Support**: Service worker, manifest, workbox integration.
- [x] **Studio & Admin**: Artist Studio and Admin panel routing and permissions.

### Verification
- [x] TypeScript compiler build (`tsc -b && vite build`) passed with zero errors.
