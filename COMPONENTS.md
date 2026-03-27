# SocialFlow Pro – Component Reference

All components are defined in `src/App.jsx`. This file lists every component and hook with its purpose, props, and key dependencies.

---

## UI Primitives

### `Sp`
Spacer element.

| Prop | Type | Description |
|---|---|---|
| `n` | number | Width and height in px |

### `Badge`
Small pill label.

| Prop | Type | Description |
|---|---|---|
| `color` | string | Background color |
| `children` | node | Label text |

### `Avatar`
Round user avatar with initials fallback.

| Prop | Type | Description |
|---|---|---|
| `user` | object | `{name, avatar}` |
| `size` | number | Diameter in px (default 28) |

### `Btn`
Styled button with variants.

| Prop | Type | Description |
|---|---|---|
| `variant` | string | `"primary"` (default), `"secondary"`, `"ghost"`, `"danger"` |
| `style` | object | Additional inline styles |
| `children` | node | Button content |
| `...rest` | — | All native button props |

### `Card`
Surface container with border and shadow.

| Prop | Type | Description |
|---|---|---|
| `style` | object | Additional inline styles |
| `children` | node | Card content |

### `FL`
Flex row wrapper (`display:flex, alignItems:center`).

| Prop | Type | Description |
|---|---|---|
| `g` | number | `gap` in px |
| `style` | object | Additional inline styles |
| `children` | node | Content |

### `TIn`
Text input or textarea with optional left icon.

| Prop | Type | Description |
|---|---|---|
| `icon` | component | Lucide icon component |
| `textarea` | boolean | Render as `<textarea>` if true |
| `style` | object | Additional styles |
| `...rest` | — | All native input/textarea props |

### `SBadge`
Stat badge with icon, label, value, and delta arrow.

| Prop | Type | Description |
|---|---|---|
| `icon` | component | Lucide icon |
| `label` | string | Stat label |
| `value` | string | Primary value |
| `delta` | number | Percent change (positive = green up arrow, negative = red down) |
| `color` | string | Icon color |

### `SCrd`
Stat card — larger version of `SBadge` for grid layouts.

Same props as `SBadge`.

---

## Channel Icons & Previews

### `ChIco`
Renders the SVG icon for a social channel.

| Prop | Type | Description |
|---|---|---|
| `id` | string | Channel id: `instagram`, `twitter`, `linkedin`, `facebook`, `tiktok`, `whatsapp` |
| `size` | number | Icon size in px |
| `col` | string | Fill color |

### `IGPrev`, `TWPrev`, `LIPrev`, `FBPrev`, `TKPrev`, `WAPrev`
Channel-specific post preview components. Each renders a mock social media post card.

| Prop | Type | Description |
|---|---|---|
| `post` | object | Post object (`content`, `mediaUrl`, `channelTexts`) |
| `user` | object | User object for avatar/name display |

### `PREV`
Module-level lookup: `{instagram: IGPrev, twitter: TWPrev, linkedin: LIPrev, facebook: FBPrev, whatsapp: WAPrev}`.

---

## Auth

### `Login`
Full-screen login page. Uses `DEMO_USERS` — any email/password combination from the list is accepted.

| Prop | Type | Description |
|---|---|---|
| `onLogin` | function | Called with user object on successful login |

---

## Navigation

### `Sidebar`
Left navigation sidebar with channel quick-filters and user info.

| Prop | Type | Description |
|---|---|---|
| `active` | string | Current nav key |
| `onNav` | function | Navigate to page |
| `user` | object | Logged-in user |
| `onLogout` | function | Logout handler |
| `pend` | number | Count of pending posts (shown as badge) |
| `posts` | Post[] | All posts (for per-channel counts) |
| `onChNav` | function | Navigate to publisher with channel filter |
| `activeCh` | string | Currently active channel filter |

### `TopBar`
Top navigation bar with page title, new-post button, and user avatar.

| Prop | Type | Description |
|---|---|---|
| `title` | string | Current page title |
| `user` | object | Logged-in user |
| `onNew` | function | Opens new post editor |

---

## AI Panel

### `AIPanel`
Right panel with AI assistant tabs: score, optimize, rewrite, hook, hashtags, variants, ideas.

| Prop | Type | Description |
|---|---|---|
| `form` | object | Current post form state |
| `onChange` | function | Apply AI suggestion back to form |
| `onClose` | function | Close the panel |

---

## Stock Image Search

### `StockKeyPanel`
Settings panel for entering Unsplash/Pexels/Pixabay API keys. Keys stored in localStorage.

No props (reads/writes localStorage directly).

### `MediaPicker`
Full media picker modal: library tab + stock search tab.

| Prop | Type | Description |
|---|---|---|
| `items` | MediaItem[] | Library media items |
| `onPick` | function | Called with selected item |
| `onClose` | function | Close modal |
| `onUpload` | function | Handle file upload |

---

## Media

### `MediaDetail`
Full-screen media detail modal with metadata, AI image analysis, and post associations.

| Prop | Type | Description |
|---|---|---|
| `item` | MediaItem | Media item to display |
| `posts` | Post[] | All posts (to show associations) |
| `onClose` | function | Close modal |
| `onUpdate` | function | Save metadata updates |
| `onDelete` | function | Delete the item |

### `LibTile`
Grid tile for library media item.

| Prop | Type | Description |
|---|---|---|
| `item` | MediaItem | Media item |
| `selected` | boolean | Is item in selection set |
| `onSelect` | function | Toggle selection |
| `onClick` | function | Open detail view |

### `ExtTile`
Grid tile for external/stock media item (from Unsplash/Pexels/Pixabay).

| Prop | Type | Description |
|---|---|---|
| `item` | object | Stock item with `url`, `thumb`, `author`, `source` |
| `onAdd` | function | Import item to library |

---

## Post Editor

### `Editor`
Full post editor modal with multi-channel support, AI panel, stock image search, and scheduling.

| Prop | Type | Description |
|---|---|---|
| `post` | Post | Post to edit (or `{id:null,...}` for new) |
| `items` | MediaItem[] | Media library |
| `campaigns` | Campaign[] | All campaigns |
| `user` | object | Current user |
| `onSave` | function | Save post |
| `onClose` | function | Close without saving |
| `onUpload` | function | Add media item to library |

Key internal state: `form` (post fields), `pch` (preview channel), `rightPane` (preview/research/ai), `rQ`/`rRes`/`rLdg` (stock search).

Auto-saves draft every 30 seconds using a ref pattern to avoid stale closures.

### `SchedModal`
Date/time picker modal for scheduling a post.

| Prop | Type | Description |
|---|---|---|
| `post` | Post | Post to schedule |
| `onSave` | function | Save updated schedule |
| `onClose` | function | Close modal |

### `PostCard`
Post list item card with status badge, channel icons, action buttons.

| Prop | Type | Description |
|---|---|---|
| `post` | Post | Post data |
| `campaigns` | Campaign[] | For campaign badge |
| `onEdit` | function | Open in Editor |
| `onSched` | function | Open SchedModal |
| `onDel` | function | Soft-delete |
| `onApprove` | function | Approve/reject (admin only) |
| `onStatus` | function | Change status |
| `role` | string | User role |

---

## Kanban

### `KCard`
Draggable Kanban card.

| Prop | Type | Description |
|---|---|---|
| `post` | Post | Post data |
| `onEdit` | function | Open editor |
| ...drag event handlers | functions | Native HTML5 drag handlers |

### `Board`
Kanban board with columns per status (draft, pending, scheduled, published).

| Prop | Type | Description |
|---|---|---|
| `posts` | Post[] | All (non-deleted) posts |
| `onEdit` | function | Open editor |
| `onStatus` | function | Move post to new status |

---

## Pages

### `Dashboard`
Main dashboard with draggable widgets: hero (greeting/clock), stats, quick actions, MiniGantt, WeekStrip, recent posts.

| Prop | Type | Description |
|---|---|---|
| `posts` | Post[] | Non-deleted posts |
| `items` | MediaItem[] | Media library |
| `campaigns` | Campaign[] | All campaigns |
| `user` | object | Current user |
| `onNav` | function | Navigate to page |
| `onFilterNav` | function | Navigate with filter |

Widget order persisted in localStorage via `useSections("dashboard", user.id, [...])`.

Derived arrays (`sched`, `drafts`, `pend`, `pub`, `recent`) are memoized with `useMemo`.

### `PublisherPage`
Post list with Kanban/list view toggle, status and channel filters.

| Prop | Type | Description |
|---|---|---|
| `posts` | Post[] | All posts |
| `items` | MediaItem[] | Media library |
| `campaigns` | Campaign[] | All campaigns |
| `onEdit` | function | Open editor |
| `onSched` | function | Open scheduler |
| `onDel` | function | Soft-delete |
| `onApprove` | function | Approve/reject |
| `onStatus` | function | Change status |
| `onCampaign` | function | Assign campaign |
| `onNew` | function | New post |
| `role` | string | User role |
| `filt` | string | Active status filter |
| `setFilt` | function | Update status filter |
| `chFilt` | string | Active channel filter |
| `setChFilt` | function | Update channel filter |

### `CampaignsPage`
Campaign manager with create/edit/delete and per-campaign post list.

| Prop | Type | Description |
|---|---|---|
| `campaigns` | Campaign[] | All campaigns |
| `setCampaigns` | function | Update campaigns |
| `posts` | Post[] | Non-deleted posts |
| `onEditPost` | function | Open post editor |

### `MediaPage`
Media library with upload, external stock search, multi-select delete, and detail view.

| Prop | Type | Description |
|---|---|---|
| `items` | MediaItem[] | Library items |
| `posts` | Post[] | All posts (for associations) |
| `onUpload` | function | Add item to library |
| `onUpdate` | function | Update item metadata |
| `onDelete` | function | Delete items by id array |

### `CalendarPage`
Calendar with month and agenda views. Shows scheduled posts per day.

| Prop | Type | Description |
|---|---|---|
| `posts` | Post[] | All posts |
| `onEdit` | function | Open post editor |

Uses local design tokens `K` for Kordiam-style calendar colors.

### `PlannerPage`
Horizontal Gantt timeline for posts and campaigns, with day/week/month zoom levels.

| Prop | Type | Description |
|---|---|---|
| `posts` | Post[] | All posts |
| `campaigns` | Campaign[] | All campaigns |
| `items` | MediaItem[] | Media library (for thumbnails) |
| `onEdit` | function | Open post editor |

### `PerformancePage`
Performance analytics page with mock stats, per-channel metrics, and top posts list.

| Prop | Type | Description |
|---|---|---|
| `posts` | Post[] | All posts |

Mock data in `MOCK` constant. `top` array (with randomized reach) is memoized with `useMemo([posts])`.

### `TrashPage`
Soft-deleted post list with restore and permanent delete.

| Prop | Type | Description |
|---|---|---|
| `posts` | Post[] | All posts (filters for `deleted:true` internally) |
| `onRestore` | function | Restore post |
| `onPurge` | function | Permanently delete one post |
| `onPurgeAll` | function | Permanently delete all deleted posts |

### `AdminPage`
Admin settings: profile, channel connections, API keys, team management.

| Prop | Type | Description |
|---|---|---|
| `me` | object | Current user |
| `onUpdateMe` | function | Save profile changes |

Only visible when `user.role === "admin"`.

### `StoriesPage`
Story article list with create/edit/delete.

| Prop | Type | Description |
|---|---|---|
| `stories` | Story[] | All stories |
| `items` | MediaItem[] | Media library (for cover images) |
| `onEdit` | function | Open StoryEditorModal |
| `onNew` | function | Create new story |
| `onDelete` | function | Delete story |

---

## Story Editor

### `StoryEditorModal`
Full story editor with sections (heading + content blocks), cover image, category, tags, and scheduling.

| Prop | Type | Description |
|---|---|---|
| `story` | Story | Story to edit |
| `items` | MediaItem[] | Media library |
| `onSave` | function | Save story |
| `onClose` | function | Close modal |
| `onUpload` | function | Upload media |
| `onConvertSection` | function | Convert a section to a post |

Auto-saves every 30 seconds using a ref pattern. Timer only resets when `form.title` changes, not on every section edit.

---

## Sidebar Widgets

### `GlobalRightSidebar`
Persistent right sidebar with draggable widgets: mini-calendar, activity feed, channel stats, campaigns list.

| Prop | Type | Description |
|---|---|---|
| `posts` | Post[] | Non-deleted posts |
| `campaigns` | Campaign[] | All campaigns |
| `onNav` | function | Navigate to page |

Widget order persisted in localStorage (`sb_widget_order`). Sidebar collapsed state in localStorage (`sb_right`).

`recent`, `actMap`, `schedDays`, and `calLabel` are all memoized with `useMemo`.

### `MiniGantt`
Compact Gantt bar chart for the next 14 days, used as a Dashboard widget.

| Prop | Type | Description |
|---|---|---|
| `posts` | Post[] | Scheduled posts |

### `WeekStrip`
7-day horizontal strip showing scheduled posts per day, used as a Dashboard widget.

| Prop | Type | Description |
|---|---|---|
| `posts` | Post[] | Scheduled posts |

---

## Shared Drag System

### `useSections(key, userId, defaultOrder)`
Custom hook for draggable widget section ordering.

| Parameter | Type | Description |
|---|---|---|
| `key` | string | Page/context name (e.g. `"dashboard"`) |
| `userId` | string | User id (for per-user localStorage key) |
| `defaultOrder` | string[] | Default widget order |

Returns: `{ order, dragId, setDragId, overId, setOverId, drop }`.

LocalStorage key: `sections_v2_{key}_{userId}`.

Merge logic: reads saved order from localStorage, filters out unknown IDs, appends any new defaults not in saved order. Handles missing/corrupt localStorage gracefully.

### `SecCard`
Draggable section container used by all pages that use `useSections`.

| Prop | Type | Description |
|---|---|---|
| `id` | string | Widget id |
| `title` | string | Widget header title |
| `right` | node | Right slot in widget header |
| `dragId` | string\|null | Currently dragged widget id |
| `overId` | string\|null | Widget currently being dragged over |
| `setDragId` | function | Set dragging widget |
| `setOverId` | function | Set drag-over widget |
| `drop` | function | Handle drop |
| `children` | node | Widget content |

---

## App Root

### `App` (default export)
Root component. Owns all global state and renders the full layout.

**Post mutation handlers:**

| Handler | Description |
|---|---|
| `save(post)` | Upsert post, close editor |
| `saveSch(post)` | Update scheduled post, close scheduler |
| `del(id)` | Soft-delete (sets `deleted:true`) |
| `restore(id)` | Un-delete |
| `purge(id)` | Permanently delete (removes from array) |
| `purgeAll()` | Permanently delete all soft-deleted posts |
| `approve(id, status)` | Change post status (admin approval flow) |
| `chSt(id, status)` | Change post status |
| `chCamp(id, campaignId)` | Assign post to campaign |
| `newPost()` | Open editor with blank post |

**Story mutation handlers:** `saveStory`, `delStory`, `newStory`, `convertSection`

**Navigation handlers:** `goNav(n)`, `goFilter(pg, f)`, `goChNav(chId)`
