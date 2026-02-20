# acad-webview-app

Academy management B2B webview app. Built with SvelteKit, statically built and embedded in a native app webview.

## Tech Stack

- SvelteKit 2 + Svelte 5 (runes) + TypeScript 5.9
- Vite 7.3, @sveltejs/adapter-static (no SSR)
- Pure SCSS styling (no Tailwind)
- Zod for input validation
- Vitest (unit/component tests) + Playwright (E2E tests)
- ESLint + Prettier

## Commands

```bash
yarn dev                                  # Dev server (proxies /academic → localhost:3001)
yarn build                                # Production static build
yarn preview                              # Preview built output
yarn check                                # TypeScript type check (svelte-check)
yarn lint                                 # ESLint + Prettier check
yarn format                               # Auto-format with Prettier
yarn test:unit                            # Vitest unit tests
yarn test:unit --run --reporter=verbose   # CI-style verbose output
yarn test:e2e                             # Playwright E2E tests
yarn test                                 # Both unit + E2E
```

## Project Structure

```
src/
  lib/
    api/                    # API client (fetch wrapper + auto JWT)
      client.ts             # Shared fetch, 401 auto-refresh, error handling, toast
      auth.ts               # Auth API (login, signup, verify, me)
      academy.ts            # Academy info, app config, notices, calendar
      member.ts             # Membership, passes, drink tickets
      ensemble.ts           # Ensemble groups
      feedback.ts           # Feedback records (monthly/weekly)
      holding.ts            # Holding/suspension management
      notification.ts       # Push notifications
      reservation.ts        # Lesson reservations
    stores/                 # Svelte 5 rune-based state management
      auth.svelte.ts        # User, tokens, login/logout
      academy.svelte.ts     # Current academy, app config, nav, member role
      toast.svelte.ts       # Toast notifications (success/error/info)
    components/
      ui/                   # Shared UI components
        Button.svelte       # variant: primary|secondary|ghost|danger, size: sm|md|lg
        Input.svelte        # Two-way binding with $bindable(), error state
        Modal.svelte        # Bottom-sheet style modal with backdrop
        BottomSheet.svelte  # Draggable bottom sheet
        Card.svelte         # Clickable card with keyboard support
        Badge.svelte        # Status badge
        Spinner.svelte      # Loading spinner
        Skeleton.svelte     # Skeleton loading placeholder
        CalendarSection.svelte # Monthly calendar grid
        Toast.svelte        # Single toast item
        ToastContainer.svelte  # Toast list renderer
      layout/               # Layout components
        Header.svelte       # Fixed top header with academy name
        BottomNav.svelte    # Dynamic bottom nav (driven by app config)
        BackHeader.svelte   # Back button header for detail pages
        AdminSidebar.svelte # Slide-out sidebar with role-based menu
      ensemble/             # Ensemble domain components
        EnsembleCreateForm.svelte
        EnsembleDetailModal.svelte
      feedback/             # Feedback domain components
        FeedbackTypeFilter.svelte
        ScoreDisplay.svelte
        ScoreInput.svelte
    types/                  # TypeScript type definitions
      api.ts                # ApiResponse<T>, PaginatedList<T>, CursorPaginatedList<T>, ApiError
      auth.ts               # User, AuthTokens, LoginRequest/Response, MemberRole
      academy.ts            # Academy, AppConfig, NavItem, Notice, CalendarEvent
      member.ts             # Member, MemberPass, DrinkTicket, Instructor
      ensemble.ts           # Ensemble types
      feedback.ts           # Feedback types
      holding.ts            # Holding types
      notification.ts       # Notification types
      reservation.ts        # Reservation types
    config/
      admin-permissions.ts  # Route-role mapping (ROUTE_ROLES) + isRouteAllowed()
    utils/
      format.ts             # Date/time/phone/number formatters
      storage.ts            # localStorage wrapper with 'acad_' prefix
      feedback.ts           # Score level classification (Beginner→Master)
    styles/
      _variables.scss       # Design tokens (colors, spacing, radius, shadows, z-index)
      _reset.scss           # CSS reset + base styles
      _mixins.scss          # Reusable SCSS mixins
      global.scss           # Imports + keyframe animations
    assets/                 # Icons, images
  routes/
    auth/                   # Auth pages (no header/nav)
    app/                    # Member app (Header + BottomNav layout)
    admin/                  # Admin/Instructor app (Header + Sidebar layout)
  app.html                  # HTML template
  app.d.ts                  # Global types
e2e/                        # Playwright E2E tests
static/                     # Static files
```

## Route Map

### Auth (no layout chrome)
- `/auth/login` — Phone + password login
- `/auth/signup` — SMS verification + registration
- `/auth/select-academy` — Academy selection (post-login)

### App — Member (Header + BottomNav)
- `/app` — Main page (drink tickets, passes, notices, calendar)
- `/app/notice` — Notice list
- `/app/notice/[id]` — Notice detail
- `/app/feedback` — My feedback list
- `/app/feedback/[id]` — Feedback detail
- `/app/ensemble` — Ensemble groups
- `/app/reservation` — Lesson reservation
- `/app/profile` — My profile

### Admin (Header + Sidebar)
- `/admin` — Dashboard (role-filtered cards)
- `/admin/notices` — Notice management (CRUD) `[ADMIN only]`
- `/admin/instructors` — Instructor management `[ADMIN only]`
- `/admin/students` — Student list (infinite scroll) `[ADMIN, INSTRUCTOR]`
- `/admin/students/[id]` — Student detail
- `/admin/students/[id]/passes` — Student pass management
- `/admin/students/[id]/drinks` — Student drink ticket management
- `/admin/students/[id]/feedback` — Student feedback list
- `/admin/students/[id]/feedback/new-monthly` — Create monthly feedback
- `/admin/feedback` — All feedback `[ADMIN, INSTRUCTOR]`
- `/admin/feedback/[id]` — Feedback detail
- `/admin/feedback/categories` — Feedback categories
- `/admin/feedback/new-monthly` — Create monthly feedback
- `/admin/feedback/new-weekly` — Create weekly feedback

## Architecture

### Data Flow

```
types/ → api/ → stores/ (optional) → routes/ (pages) → components/
```

1. **Types** define request/response shapes
2. **API functions** call backend via shared client (auto JWT, auto-refresh)
3. **Stores** hold global state (auth, academy); most page data is local `$state`
4. **Pages** fetch data in `onMount()`, manage local state with `$state`/`$derived`
5. **Components** receive data via `$props()`, render UI

### Layout Nesting

```
Root (+layout.svelte)          → Global styles, stores init, ToastContainer
├── Auth (+layout.svelte)      → Minimal (no header/nav)
├── App  (+layout.svelte)      → Header + BottomNav + auth guard
└── Admin (+layout.svelte)     → Header + Sidebar + auth + role guard
```

### Auth Flow

```
Login → fetchMyAcademies() → Select Academy (+ role) → App or Admin
```

- Tokens stored in localStorage (access + refresh)
- 401 response → auto-refresh → retry request (race-condition safe)
- Refresh failure → clear tokens → redirect to `/auth/login`

### Multi-tenancy

All API calls (except auth) require `academyId` from `academyStore.academyId`.

## Code Patterns

### API Function

```typescript
// src/lib/api/{domain}.ts
import { get, post, patch, del } from './client';
import type { ApiResponse, PaginatedList, CursorPaginatedList } from '$lib/types/api';

// Standard pagination (offset-based)
export function getItems(academyId: number, page = 1, limit = 20) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  return get<ApiResponse<PaginatedList<Item>>>(
    `/academic/academies/${academyId}/items?${params}`
  );
}

// Infinite scroll (cursor-based)
export function getMembers(academyId: number, cursor?: number, limit = 20) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', String(cursor));
  return get<ApiResponse<CursorPaginatedList<Member>>>(
    `/academic/academies/${academyId}/members?${params}`
  );
}

// Auth endpoints: pass skipAuth = true (3rd param)
export function login(data: LoginRequest) {
  return post<ApiResponse<LoginResponse>>('/academic/auth/login', data, true);
}
```

**Backend response envelope** (unwrapped automatically by `client.ts`):
```
Backend: { response: { data: { result_status, result_data, result_message } } }
Client:  ApiResponse<T> = { status: boolean, message: string, data: T }
```

### Rune Store

```typescript
// src/lib/stores/{domain}.svelte.ts
let items = $state<Item[]>([]);
let loading = $state(false);

export function getItemStore() {
  async function load(academyId: number) {
    loading = true;
    try {
      const res = await getItems(academyId);
      if (res.status) items = res.data.list;
    } finally {
      loading = false;
    }
  }

  function clear() {
    items = [];
  }

  return {
    get items() { return items; },       // Getter, not direct state access
    get loading() { return loading; },
    load,
    clear
  };
}

export const itemStore = getItemStore();
```

### Page Component

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { academyStore } from '$lib/stores/academy.svelte';
  import Spinner from '$lib/components/ui/Spinner.svelte';

  let items = $state<Item[]>([]);
  let loading = $state(true);

  onMount(async () => {
    const academyId = academyStore.academyId;
    if (!academyId) return;
    try {
      const [res1, res2] = await Promise.allSettled([
        getItems(academyId),
        getOtherData(academyId)
      ]);
      if (res1.status === 'fulfilled' && res1.value.status) {
        items = res1.value.data.list;
      }
    } finally {
      loading = false;
    }
  });

  let activeItems = $derived(items.filter((item) => item.is_active));
</script>

<div class="page-name">
  {#if loading}
    <div class="page-name__loading"><Spinner /></div>
  {:else}
    <!-- Content -->
  {/if}
</div>

<style lang="scss">
  @use '$lib/styles/variables' as *;

  .page-name {
    padding: $space-md;

    &__loading {
      @include flex-center;
      min-height: 200px;
    }
  }
</style>
```

### UI Component

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'primary' | 'secondary';
    disabled?: boolean;
    children: Snippet;          // Slot content
    onclick?: () => void;
  }

  let {
    variant = 'primary',
    disabled = false,
    children,
    onclick
  }: Props = $props();
</script>

<div
  class="comp comp--{variant}"
  class:comp--disabled={disabled}
  {onclick}
>
  {@render children()}
</div>

<style lang="scss">
  @use '$lib/styles/variables' as *;

  .comp {
    border-radius: $radius-md;
    padding: $space-sm $space-md;

    &--primary { background: $color-primary; color: white; }
    &--secondary { background: $color-bg; }
    &--disabled { opacity: 0.5; pointer-events: none; }
  }
</style>
```

Key Svelte 5 patterns:
- `$bindable()` for two-way binding (e.g., `value = $bindable('')` in Input)
- `children: Snippet` + `{@render children()}` for slot content
- Event handlers as function props: `onclick`, `onclose`, `oninput`

### Auth Guard (in layout)

```svelte
$effect(() => {
  if (!authStore.isInitialized || !academyStore.isInitialized) return;
  if (!authStore.isAuthenticated) {
    goto('/auth/login', { replaceState: true });
    return;
  }
  if (!academyStore.academyId) {
    goto('/auth/select-academy', { replaceState: true });
  }
});
```

Admin layout adds role guard:
```svelte
if (!academyStore.memberRole || academyStore.memberRole === 'STUDENT') {
  goto('/auth/select-academy', { replaceState: true });
}
```

## File Modification Guide

| Task | Files to check/modify |
|------|----------------------|
| New domain feature | `types/{domain}.ts` → `api/{domain}.ts` → `routes/{area}/+page.svelte` |
| New admin page | Above + `config/admin-permissions.ts` (ROUTE_ROLES) + `AdminSidebar.svelte` (MENU_ROUTE_MAP) |
| New app page | Above + `BottomNav.svelte` (NAV_ROUTE_MAP) |
| New UI component | `components/ui/{Name}.svelte` (follow Props interface + $props() pattern) |
| New domain component | `components/{domain}/{Name}.svelte` |
| New store | `stores/{domain}.svelte.ts` (factory function + getter pattern) |
| Modify navigation | `BottomNav.svelte` (app) or `AdminSidebar.svelte` (admin) |
| Change permissions | `config/admin-permissions.ts` ROUTE_ROLES map |
| Add formatting util | `utils/format.ts` (pure functions, no side effects) |

## Design System

### CSS Variables (defined in `_variables.scss`)

```
Colors:    --color-primary, --color-primary-light, --color-bg, --color-surface
           --color-text, --color-text-secondary, --color-text-muted
           --color-border, --color-divider
           --color-success, --color-warning, --color-danger, --color-info

Spacing:   --space-2xs (2px) → --space-xs (4px) → --space-sm (8px) → --space-md (16px)
           → --space-lg (20px) → --space-xl (24px) → --space-2xl (32px) → --space-3xl (40px)

Radius:    --radius-sm (8px), --radius-md (12px), --radius-lg (16px)
           --radius-xl (20px), --radius-2xl (24px), --radius-full (9999px)

Shadows:   --shadow-sm, --shadow-md, --shadow-lg, --shadow-xl, --shadow-card

Layout:    --header-height (56px), --bottom-nav-height (56px), --sidebar-width (280px)
           --max-content-width (480px)

Z-index:   header/bottom-nav (100), sidebar (200), modal-backdrop (300)
           bottomsheet (350), modal (400), toast (500)

Transition: --transition-fast (150ms), --transition-base (250ms), --transition-slow (400ms)
```

### SCSS Mixins (defined in `_mixins.scss`)

```scss
@include flex-center;          // display: flex; align-items: center; justify-content: center
@include flex-between;         // display: flex; align-items: center; justify-content: space-between
@include text-truncate;        // Single line ellipsis
@include line-clamp(2);        // Multi-line clamp
@include scroll-y;             // overflow-y: auto with touch scrolling
@include safe-area-bottom;     // iOS safe area padding
@include safe-area-top;        // iOS safe area padding
@include press-scale;          // Scale 0.97 on :active (Toss-style)
@include toss-card;            // Card with shadow + border-radius
@include skeleton-shimmer;     // Loading shimmer animation
@include touch-target(48px);   // Minimum touch area
@include mobile-only { ... }   // max-width: 479px
@include tablet-up { ... }     // min-width: 480px
@include desktop-up { ... }    // min-width: 768px
```

### Styling Rules

- BEM naming: `.block`, `.block--modifier`, `.block__element`
- Scoped `<style lang="scss">` in every component
- Import variables: `@use '$lib/styles/variables' as *;`
- No Tailwind classes, no inline styles

## Backend API

- Auth: Separate ACADEMIC_USER JWT (not shared with main platform auth)
- Multi-tenancy: All non-auth endpoints require `academy_id` path param
- Base paths: `/academic/auth/*`, `/academic/academies/:academy_id/*`
- App config: `GET /academic/academies/:id/app-config?app_type=USER|ADMIN`
  - Returns nav items list → drives BottomNav and AdminSidebar rendering dynamically
- Pagination: Offset-based (`PaginatedList<T>` with `meta.total, meta.page`) for standard lists,
  cursor-based (`CursorPaginatedList<T>` with `next_cursor, has_more`) for infinite scroll

## Environment Variables

- `PUBLIC_API_BASE_URL` — Backend API URL (SvelteKit `PUBLIC_` prefix = client-accessible)
- `PUBLIC_WS_URL` — WebSocket URL (for ensemble chat, low priority)

## Code Style

- Tab indentation, single quotes, 100-char line width, no trailing commas
- Svelte files formatted with prettier-plugin-svelte
- Immutable patterns: never mutate objects, use spread to create new copies
- Functions under 50 lines, files under 800 lines
- Svelte 5 runes: `$state`, `$derived`, `$effect`, `$props`, `$bindable`

## Testing

- Component tests: `*.svelte.spec.ts` → Vitest + Playwright browser environment (vitest-browser-svelte)
- Server/utility tests: `*.spec.ts` → Vitest Node environment
- E2E tests: `e2e/` → Playwright
- All tests must have assertions (`requireAssertions: true`)
- Minimum coverage target: 80%

### Component Test Example

```typescript
// src/routes/page.svelte.spec.ts
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
  it('should render heading', async () => {
    render(Page);
    const heading = page.getByRole('heading', { level: 1 });
    await expect.element(heading).toBeInTheDocument();
  });
});
```

## Constraints

- Package manager: **yarn** (engine-strict mode, no npm/pnpm)
- Path alias: `$lib` → `src/lib/` (SvelteKit built-in)
- Static adapter: No server-side rendering, no server routes, no form actions
- Auth tokens stored in localStorage (not cookies)
- All user input validated with Zod schemas
- Immutable state updates only (spread, not mutation)
