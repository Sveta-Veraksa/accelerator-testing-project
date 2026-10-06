# training-sessions: Implementation Plan

Source of truth: [`requirements.md`](requirements.md) rev. 2 (AC-*, D-1…D-6, G-1…G-4) and `frontend-accelerator-onboarding/TASK.md` ("Constraints", "Explicitly Optional").
Application Root: the Repository Root (single React 19 + TypeScript + Vite app, npm; requirements F-1, F-2).
Plan date: 2026-10-06. Author role: `writing-plans`.

## Current Behavior

- `src/App.tsx` renders a single `<h1>Accelerator Testing Project</h1>`. `src/main.tsx` mounts `<App />` inside `<StrictMode>`. `src/index.css` sets only the root font, `color-scheme`, and `body { margin: 0 }`.
- No session domain code, HTTP client, routing, state library, or styling system exists (F-5).
- `package.json` scripts: `dev`, `build` (`tsc -b && vite build`), `lint` (`eslint .`), `preview`. There is no `test` script, no test runner, no DOM testing library, and no HTTP mock (F-3, F-4).
- `vite.config.ts` contains only `plugins: [react()]`. `tsconfig.app.json` includes `src` with `types: ["vite/client"]`. `tsconfig.node.json` includes only `vite.config.ts` with `types: ["node"]`. `eslint.config.js` lints `**/*.{ts,tsx}` with browser globals and ignores `dist`.
- `rulesets/project/` is a placeholder, so Common and Framework (React) rules apply: coder `typescript-and-project-fit`, `essential-behavior-tests`, the pinned web interface guidelines, and framework `react-behavior-testing`.

## Intended Behavior

A single-page Training Sessions Workspace, rendered by `App`:

1. On open, the workspace requests `GET /api/sessions` through the request boundary and shows a loading indicator until the request settles (AC-LIST-1, AC-LIST-3).
2. On success it shows a list. Each entry shows the title, the status (`scheduled` / `completed` / `cancelled`), and the start date/time (AC-LIST-2). It also shows a status filter (`All` selected by default, plus `Scheduled`) and a "New session" button (AC-FILTER-1, AC-FILTER-2).
3. On failure it shows one plain-language error with a "Try again" button that repeats the request without a page reload (AC-LIST-4, AC-LIST-5).
4. Selecting `Scheduled` shows only `scheduled` sessions. Selecting `All` shows every loaded session again. If nothing matches, an explicit "no matches" message appears (AC-FILTER-3…5).
5. "New session" opens an inline form with exactly two fields, title and start date/time. Submission validates the trimmed title (3–80 characters) and checks that the date/time is strictly in the future in local time. Messages appear per field, and no request is sent while the form is invalid (AC-CREATE-1…4).
6. A valid submission sends exactly one `POST /api/sessions`. The submit control is disabled and labelled as busy while pending (AC-CREATE-5, AC-CREATE-6). On success the API-returned session (status `scheduled`) is appended to the list and the form closes (AC-CREATE-7, AC-CREATE-8). On failure nothing is added, the values are kept, a form-level error appears, and the form can be submitted again (AC-CREATE-9).
7. All responses come from MSW: a Service Worker in `npm run dev` and `msw/node` in Vitest. No backend exists (AC-MOCK-1…3). A list failure can be forced on purpose in tests and in the browser (AC-MOCK-4).

## Preconditions And Confirmed Decisions

### Confirmed by the developer (from requirements.md)

D-1 status set; D-2 filter = `All` + `scheduled`; D-3 no status field, the API assigns `scheduled`; D-4 local timezone, strictly later than the client clock at submission, absolute timestamp on the wire; D-5 a test runner, an HTTP mock, and a `test` script are approved; D-6 mock data has ≥2 statuses including `scheduled`.

### Decisions taken by this plan (no separate architect / api-integration / ui-designer for onboarding)

These are **planning decisions**, not confirmed product or backend truth. They must not be promoted to living specs without developer confirmation (api-integration rule "Contract Evidence").

#### G-1 Architecture: request boundary and state ownership

- **Feature folder:** `src/features/training-sessions/` holds the domain types, API client, validation, and components. Mock infrastructure lives in `src/mocks/` and test infrastructure in `src/test/`. The feature has no shared or global abstraction because it has a single caller (architect rule "Frontend Boundaries").
- **Request boundary:** `src/features/training-sessions/sessionsApi.ts` is the only module that calls `fetch`. It exposes two functions, `fetchSessions` and `createSession` (signatures under Contracts). Responsibilities:
  - Build **absolute** URLs as `new URL('/api/sessions', window.location.origin)` (see Risk R-3). Changing the origin or base path for a real backend touches only this module (AC-MOCK-1).
  - Treat a non-2xx response, a network failure, or a malformed body as a thrown `SessionsApiError`. Narrow the `unknown` JSON into `TrainingSession` with an explicit runtime check (id/title/startsAt are strings, startsAt parses as a date, status is in the D-1 set). Do not use `any` or unchecked `as` casts (coder rule "TypeScript And Project Fit").
  - Never import mock data. UI components never import `src/mocks/**`.
- **State ownership:** no state library and no context are added.
  - `TrainingSessionsWorkspace` owns the remote list state as one discriminated union: `{ kind: 'loading' } | { kind: 'error' } | { kind: 'success'; sessions: TrainingSession[] }`. This guarantees that loading, error, and list are mutually exclusive (AC-LIST-3).
  - `TrainingSessionsWorkspace` also owns `filter: 'all' | 'scheduled'` (default `'all'`) and `isCreateOpen: boolean`.
  - **Filtering is client-side and derived during render** (`sessions.filter(...)` when `filter === 'scheduled'`). It is never stored as a second state and never sent as a query parameter (rule "Derived State"; AC-FILTER-2…4).
  - `CreateSessionForm` owns its field values, field errors, form-level error, and pending flag. It does **not** call the API. It receives `onCreate(input): Promise<void>` from the workspace. The workspace's `onCreate` calls `createSession` and, on success, appends the returned session with a functional state update. A rejected promise tells the form to show its create-failure message.
- **Loading lifecycle:** the list request runs in a `useEffect` keyed on a `reloadToken` counter. Each run creates an `AbortController` and aborts on cleanup, so StrictMode's double effect in dev and unmount never apply a stale result. "Try again" sets the state to `loading` and increments `reloadToken` (AC-LIST-5).
- **Duplicate-submission guard (AC-CREATE-5):** the form keeps a synchronous `useRef` "in flight" flag that is checked and set before calling `onCreate`, plus a `pending` state for the UI (disabled submit). The ref closes the window between two rapid events before React re-renders. Enter key presses and repeated clicks both go through the single form `onSubmit`.
- **Create availability:** the toolbar (filter and "New session") renders only in the `success` state. A session can only be appended to a list that is shown, so create is unreachable while loading or in error.

#### G-2 Tooling (versions checked against the npm registry on 2026-10-06)

`ctx7` (`node ./toolchain/bin/ctx7.mjs`) returned "Monthly quota exceeded", so APIs were checked against the official docs (mswjs.io, vitest.dev, the testing-library README) and peer dependencies with `npm view`. Nothing was installed.

| Package (devDependency) | Version at plan time | Why / compatibility evidence |
| --- | --- | --- |
| `vitest` | 5.0.3 | Peer `vite ^6.4 \|\| ^7 \|\| ^8` (repo has vite 8.3.3). Engine `node ^22.12 \|\| ^24 \|\| >=26` (local Node v24.21.0). Peer `@types/node >=24` (repo has ^24.13.3). |
| `jsdom` | 30.1.2 | Vitest `environment: 'jsdom'`. Engine `node ^24.15` is satisfied. |
| `@testing-library/react` | 16.3.3 | Peer React/ReactDOM/@types ^19 is satisfied. Requires peer `@testing-library/dom ^10`. |
| `@testing-library/dom` | 10.4.2 | Required peer of the two packages above. |
| `@testing-library/user-event` | 14.6.7 | User-level interactions for the behavior test (framework rule "React Behavior Testing"). |
| `msw` | 3.0.2 | Conventional HTTP-level mock (AC-MOCK-2). Peer `typescript >=5.9` (repo ~6.0.2), engine `node >=22.12`. ESM-only, which matches `"type": "module"`. |

- **Not added:** `@testing-library/jest-dom`. Its matchers are a convenience and would also require a `types` change in tsconfig. Assertions use Testing Library queries plus Vitest's built-in `expect` (for example `findByRole`, `queryByText(...)` with `toBeNull()`, `toBeTruthy()`, and `.checked` on radios). It can be added later as an optional improvement.
- **Install command** (run by `coder`; it needs network access and changes `package.json` and `package-lock.json`):
  `npm install -D vitest jsdom @testing-library/react @testing-library/dom @testing-library/user-event msw`
- **Browser worker script:** `npx msw init public --save`. This generates `public/mockServiceWorker.js` (commit it) and adds `"msw": { "workerDirectory": [...] }` to `package.json` so the script stays in sync with the installed MSW version. The MSW 3 `msw/vite` plugin is a documented alternative that serves the worker without copying it. It is not chosen because it adds a virtual module, a `vite-env.d.ts` type reference, and an untested interaction with Vitest reading the same `vite.config.ts`.
- **MSW 3 API facts the coder must respect** (from the 2.x→3.x migration guide and current docs):
  - Node: `setupServer` from `msw/node`. Lifecycle: `server.listen()`, `server.resetHandlers()`, `server.close()`, and `server.use(...)` for per-test overrides.
  - Browser: `setupWorker` from `msw/browser`. Await `worker.start()` before rendering.
  - The unhandled-request option is now **`onUnhandledFrame`** (`'warn' | 'error' | 'bypass'`). The 2.x name `onUnhandledRequest` was renamed.
  - Handlers use `http.get` / `http.post` with a resolver receiving `{ request, params }`. Responses use `HttpResponse.json(body, { status })` and `HttpResponse.error()` for a network error. The third argument `{ once: true }` marks a handler as used after its first match.
  - `delay` is available from `msw` / `msw/utils`. MSW 3 no longer patches `setTimeout`, so do not combine `delay()` with fake timers.
- **Vitest configuration:** add a `test` block to the existing `vite.config.ts` with a `/// <reference types="vitest/config" />` directive (documented Vitest 5 pattern) instead of a separate `vitest.config.ts`. Vitest prefers `vitest.config.*` when present, which would silently drop the React plugin. Options: `environment: 'jsdom'`, `setupFiles: ['./src/test/setup.ts']`. `globals` stays at the default (`false`), so tests import `describe/it/expect/...` from `vitest` explicitly. No tsconfig `types` change is needed.
- **Testing Library cleanup:** with Vitest globals off, Testing Library's automatic cleanup is not registered, so `src/test/setup.ts` must call `cleanup()` in `afterEach`.
- **`test` script:** `"test": "vitest run"`, a single non-watch run (AC-TEST-2). Developers can still run `npx vitest` for watch mode.
- **Forcing a failure on purpose (AC-MOCK-4):**
  - *Automated:* `src/mocks/handlers.ts` exports a factory `sessionsListError(options?: { once?: boolean })` that returns a `GET /api/sessions` handler responding `HttpResponse.json({ message }, { status: 500 })`. Tests prepend it with `server.use(sessionsListError({ once: true }))`. The first request then fails, and "Try again" hits the default success handler (AC-LIST-5 success path). Without `once`, every retry fails (AC-LIST-5 failure path).
  - *Manual (dev only):* `src/mocks/browser.ts` checks the page URL. If `?mock=sessions-error` is present, it calls `worker.use(sessionsListError({ once: true }))` before `worker.start()` resolves the app render. Opening `http://localhost:5173/?mock=sessions-error` shows the error state, and "Try again" recovers. This is a mock-only switch read by mock code and never by UI components.

#### G-3 Minimal provisional API contract (MOCK ONLY, not confirmed backend truth)

Label in code: a short comment in `src/mocks/handlers.ts` stating "Provisional contract, see tasks/training-sessions/implementation-plan.md G-3".

| Operation | Request | Success | Failure |
| --- | --- | --- | --- |
| List sessions | `GET /api/sessions` | `200`, body `TrainingSession[]` (a bare JSON array) | Any non-2xx with body `{ "message": string }`, or a network error |
| Create session | `POST /api/sessions`, `Content-Type: application/json`, body `{ "title": string, "startsAt": string }` | `201`, body `TrainingSession` with `status: "scheduled"` assigned by the mock (D-3, AC-MOCK-6) | `400 { "message": string }` for a malformed body; any other non-2xx or network error is a failure as well |

- **`TrainingSession`:** `{ id: string; title: string; status: 'scheduled' | 'completed' | 'cancelled'; startsAt: string }`.
- **Timestamp wire format (D-4):** ISO 8601 in UTC with milliseconds and a `Z` suffix, as produced by `Date.prototype.toISOString()` (for example `"2026-11-02T09:30:00.000Z"`). The client converts the `datetime-local` value (`YYYY-MM-DDTHH:mm`, parsed by `new Date(value)` as **local** time per ECMAScript) to this form before sending.
- **Error shape:** `{ "message": string }`. The client does **not** render server messages. It maps every failure to fixed plain-language UI copy (api-integration rule "Client Behavior": no leaking technical details; AC-LIST-4).
- **Mock behavior:**
  - The mock keeps an in-memory copy of the seed data, so a created session also appears in a later `GET` within the same page load. Reloading resets it, and persistence is a non-goal.
  - The mock assigns `id` with `crypto.randomUUID()` and returns the client-sent (already trimmed) title.
  - The mock rejects with `400` only when `title` is not a string or `startsAt` is not a parseable date. It does **not** re-check title length or "future". That rule lives in the client, as D-4 leaves mock-side rejection to planning, and it avoids clock-skew flakiness.
- **Seed data (D-6, AC-MOCK-5):** 4 sessions with distinct titles:
  - 2 × `scheduled` with fixed future timestamps, for example in 2027;
  - 1 × `completed` and 1 × `cancelled` with fixed past timestamps.

#### G-4 UI and interaction (minimal, no visual direction exists)

The plan uses plain semantic HTML with a small feature stylesheet. It introduces no design system or house style (ui-designer rule "Product Context"), and the layout is a compact single column suited to an operational tool.

- **Layout** inside `<main>`:
  - `<h1>Training sessions</h1>`;
  - a toolbar with the filter and a "New session" button;
  - the inline create form, when open;
  - the list area.
- **Filter:** a `<fieldset>` with `<legend>Status</legend>` and two radio inputs named `status-filter`, labelled "All" (value `all`, checked by default) and "Scheduled" (value `scheduled`). Each label wraps its control, so there are no dead zones (AC-FILTER-1).
- **Create form placement (OQ-10):**
  - The form is an **inline disclosure section** toggled by the "New session" button (`aria-expanded`, `aria-controls`). There is no dialog, route, or deep link.
  - The form has `noValidate`, so the custom messages are used instead of native bubbles.
  - Fields:
    - "Title": `<input type="text">` without `maxLength`, because a raw length limit would block valid input whose trimmed length is within range.
    - "Start date and time": native `<input type="datetime-local">` with minute granularity (default `step`) and no `min` attribute, because a static `min` goes stale and the rule is checked at submission time.
  - Buttons: "Create session" (submit) and "Cancel" (closes the form and discards its values).
  - On submit, focus moves to the first invalid field.
- **Validation messages** (AC-CREATE-4). Each field gets `aria-invalid="true"` and `aria-describedby` pointing at its message element, which sits inside an `aria-live="polite"` region:
  - Title empty or whitespace only: "Enter a title (3–80 characters)."
  - Title trimmed length <3 or >80: "Title must be between 3 and 80 characters."
  - Date/time missing: "Choose a start date and time."
  - Date/time not strictly in the future: "Start date and time must be in the future."
- **Pending (AC-CREATE-6):** the submit button is disabled and its label changes to "Creating…". The inputs stay editable but cannot trigger another request.
- **Create failure (OQ-5):** a form-level `role="alert"` reads "The session could not be created. Please try again." The values are kept and the submit control is re-enabled (AC-CREATE-9).
- **Create success:** the form resets and closes. The new session is appended at the end of the list (A-6; position is not significant). No toast is shown.
- **Loading:** `role="status"` with the text "Loading sessions…".
- **Error (A-5 / OQ-4):** `role="alert"` with "Sessions could not be loaded. Check your connection and try again." and a `<button>` labelled "Try again". There is no automatic retry.
- **Empty states (OQ-7):**
  - The `scheduled` filter matches nothing: "No scheduled sessions match this filter."
  - The list is empty under `All`: "No training sessions yet."
  - Both are plain paragraphs, visually and semantically distinct from loading (`role="status"`) and error (`role="alert"`) (AC-FILTER-5).
- **List:** `<ul aria-label="Training sessions">` with one `<li>` per session, containing:
  - the title;
  - the status as visible text (the raw value, for example `scheduled`);
  - `<time dateTime={startsAt}>` formatted with a module-level `Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })`, which uses the browser locale and timezone (OQ-6; guideline "use Intl.DateTimeFormat").
- **Styling:** one feature stylesheet with spacing, a status badge, and the error text colour. It must keep visible `:focus-visible` outlines (never `outline: none` without a replacement) and work at narrow widths without horizontal scroll. Exhaustive responsive and accessibility validation is a non-goal.

### Defaults for non-blocking questions

| Item | Default adopted |
| --- | --- |
| A-5 / OQ-4 | Accepted: a visible "Try again" button repeats `GET /api/sessions`. No automatic retry. |
| A-6 | Accepted: append the session from the `201` response to the client list. No refetch. Appended at the end. |
| OQ-5 | Keep the form values, show a form-level alert, end pending, allow resubmit. Nothing is added to the list. |
| OQ-6 | `Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })` in the browser locale and timezone, wrapped in `<time dateTime>`. |
| OQ-7 | "No scheduled sessions match this filter." / "No training sessions yet." |
| OQ-10 | Inline disclosure section toggled by "New session". |
| D-4 details | Minute granularity. The future check uses `Date.now()` at the moment of submit. The mock does not reject past dates. |

## Ordered File Changes

Steps are ordered by dependency. Steps 3a, 3b, and 3c can proceed in parallel once step 2 is done. Step 4 needs 2 and 3b/3c.

### Step 1: Tooling (no app code)

| File | Action | Why | AC |
| --- | --- | --- | --- |
| `package.json` | Modify (via `npm install -D ...`, then `npx msw init public --save`, then a manual script edit) | Add the 6 devDependencies above. Add `"test": "vitest run"`. The `msw.workerDirectory` field is written by `msw init --save`. Change nothing else. | AC-MOCK-2, AC-TEST-2 |
| `package-lock.json` | Modify (generated by npm) | Lock the new devDependencies. Never edit by hand. | AC-TEST-2 |
| `public/mockServiceWorker.js` | Create (generated by `msw init`) | Service Worker script for browser mocking in `npm run dev`. Commit it and never edit by hand. It is not linted (eslint targets `*.ts(x)` only). | AC-MOCK-2, AC-MANUAL-1 |
| `vite.config.ts` | Modify | Add the `/// <reference types="vitest/config" />` directive and a `test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'] }` block. Keep `plugins: [react()]` unchanged. | AC-TEST-2 |

### Step 2: Domain types

| File | Action | Why | AC |
| --- | --- | --- | --- |
| `src/features/training-sessions/types.ts` | Create | `SESSION_STATUSES` (readonly tuple of the D-1 values), `SessionStatus`, `TrainingSession`, `NewSessionInput { title: string; startsAt: string }`, `StatusFilter = 'all' \| 'scheduled'`. A type-only module shared by the API client, mocks, and UI. | AC-LIST-2, AC-FILTER-1, AC-CREATE-1 |

### Step 3a: Mock layer

| File | Action | Why | AC |
| --- | --- | --- | --- |
| `src/mocks/data.ts` | Create | Seed sessions (2 scheduled, 1 completed, 1 cancelled; fixed ISO timestamps; distinct titles), an in-memory store, and `resetMockSessions()` to restore the seed between tests. Exports the seed so tests can derive expected titles by status. | AC-MOCK-5, AC-MOCK-6 |
| `src/mocks/handlers.ts` | Create | `handlers` array: `GET /api/sessions` returns the store, and `POST /api/sessions` validates the shape, assigns `id` and `status: 'scheduled'`, pushes to the store, and returns 201. Also exports the `sessionsListError({ once })` factory. Carries the "provisional contract" label comment. | AC-MOCK-2, AC-MOCK-3, AC-MOCK-4, AC-MOCK-6 |
| `src/mocks/browser.ts` | Create | `setupWorker(...handlers)` from `msw/browser`, plus `startMockWorker()`, which applies `?mock=sessions-error` via `worker.use(sessionsListError({ once: true }))` and returns `worker.start({ onUnhandledFrame: 'bypass' })`. `bypass` keeps Vite dev-server/HMR traffic silent. | AC-MOCK-2, AC-MOCK-4 |
| `src/mocks/node.ts` | Create | `export const server = setupServer(...handlers)` from `msw/node`. Used only by tests. | AC-MOCK-2, AC-TEST-1 |

### Step 3b: Request boundary

| File | Action | Why | AC |
| --- | --- | --- | --- |
| `src/features/training-sessions/sessionsApi.ts` | Create | `fetchSessions`, `createSession`, `SessionsApiError`, and the runtime narrowing of response bodies (`unknown` → `TrainingSession`). Absolute URL from `window.location.origin`. The only `fetch` call site. No mock imports. | AC-MOCK-1, AC-LIST-1, AC-LIST-4, AC-CREATE-7, AC-CREATE-9 |

### Step 3c: Validation (pure)

| File | Action | Why | AC |
| --- | --- | --- | --- |
| `src/features/training-sessions/validateNewSession.ts` | Create | Pure function `validateNewSession(values, nowMs)`. It trims the title, checks length 3–80 inclusive, requires the date/time, parses it as local time, and requires `> nowMs`. Returns either the field errors (exact copy from G-4) or the normalized `NewSessionInput` (trimmed title, `startsAt` as an ISO UTC string). Injecting `nowMs` makes the boundaries testable without fake timers. | AC-CREATE-2, AC-CREATE-3, AC-CREATE-4 |

### Step 4: UI components

| File | Action | Why | AC |
| --- | --- | --- | --- |
| `src/features/training-sessions/SessionList.tsx` | Create | Presentational: receives the visible `TrainingSession[]` and the active `StatusFilter` (only to choose the empty-state copy). Renders the `<ul>` entries (title, status text, `<time>` with the hoisted `Intl.DateTimeFormat`) or the matching empty-state paragraph. | AC-LIST-1, AC-LIST-2, AC-FILTER-5, AC-CREATE-7 |
| `src/features/training-sessions/StatusFilterControl.tsx` | Create | Presentational radio group: `value: StatusFilter`, `onChange(next: StatusFilter)`. Exactly two options. | AC-FILTER-1…4 |
| `src/features/training-sessions/CreateSessionForm.tsx` | Create | Two labelled fields, `noValidate`, submit-time validation via `validateNewSession(values, Date.now())`, focus on the first invalid field, ref plus state duplicate guard, "Creating…" pending label, form-level create-failure alert, reset on success. Props: `onCreate(input: NewSessionInput): Promise<void>`, `onCancel(): void`. | AC-CREATE-1…6, AC-CREATE-9 |
| `src/features/training-sessions/TrainingSessionsWorkspace.tsx` | Create | Feature root. Owns the list union state, `filter`, `isCreateOpen`, and `reloadToken`. Runs the load effect with `AbortController`. Renders loading / error + "Try again" / success (toolbar, form, list). Derives the visible sessions during render. Implements `onCreate` with `createSession` plus a functional append. Imports its stylesheet. | AC-LIST-1, AC-LIST-3…5, AC-FILTER-2…4, AC-CREATE-7, AC-CREATE-8 |
| `src/features/training-sessions/TrainingSessionsWorkspace.css` | Create | Minimal feature styles (see G-4 Styling). Does not touch `src/index.css`. | AC-LIST-2 (readability), AC-CREATE-4 (error visibility) |

Each component file exports only its component (eslint `react-refresh/only-export-components`).

### Step 5: Application wiring

| File | Action | Why | AC |
| --- | --- | --- | --- |
| `src/App.tsx` | Modify | Replace the scaffold heading with `<TrainingSessionsWorkspace />`. Keep the default export. | AC-LIST-1, AC-MANUAL-1 |
| `src/main.tsx` | Modify | Before `createRoot(...).render(...)`, call an `enableMocking()` that returns immediately unless `import.meta.env.DEV`, and otherwise dynamically imports `./mocks/browser` and awaits `startMockWorker()`. Render in `.then(...)`. Keep `StrictMode`. Vite statically replaces `import.meta.env.DEV`, so the mock chunk is not part of the production build. | AC-MOCK-2, AC-MOCK-3, AC-MANUAL-1 |

### Step 6: Test infrastructure and the essential test

| File | Action | Why | AC |
| --- | --- | --- | --- |
| `src/test/setup.ts` | Create | `beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))`. `afterEach`: `cleanup()` from Testing Library, `server.resetHandlers()`, `resetMockSessions()`. `afterAll(() => server.close())`. Imports come from `vitest`. | AC-TEST-1, AC-TEST-2, AC-MOCK-4 |
| `src/features/training-sessions/TrainingSessionsWorkspace.test.tsx` | Create | The essential behavior test (below). | AC-TEST-1, AC-TEST-2 |

### Step 7: Verification and log (no code)

Run the Verification Commands below and the manual browser check. The developer then records the observed results in `tasks/training-sessions/workflow-log.md` (AC-MANUAL-1). This plan does not touch that file.

### Explicitly not changed

`index.html`, `src/index.css`, `eslint.config.js`, `tsconfig*.json` (unless Risk R-1 materializes; see mitigation), `README.md` (an optional later `docs-generator` update could document `npm test` and `?mock=sessions-error`), `rulesets/**`, `toolchain/**`, and other `tasks/**` files.

## Contracts And Dependencies

These are type-level contracts only. The implementation is the coder's.

```ts
// src/features/training-sessions/types.ts
export const SESSION_STATUSES = ['scheduled', 'completed', 'cancelled'] as const
export type SessionStatus = (typeof SESSION_STATUSES)[number]
export interface TrainingSession { id: string; title: string; status: SessionStatus; startsAt: string } // startsAt: ISO 8601 UTC
export interface NewSessionInput { title: string; startsAt: string } // title already trimmed; startsAt ISO 8601 UTC
export type StatusFilter = 'all' | 'scheduled'

// src/features/training-sessions/sessionsApi.ts
export class SessionsApiError extends Error {} // carries an optional HTTP status; never shown to the user verbatim
export function fetchSessions(signal?: AbortSignal): Promise<TrainingSession[]>
export function createSession(input: NewSessionInput): Promise<TrainingSession>

// src/features/training-sessions/validateNewSession.ts
export interface NewSessionFormValues { title: string; startsAtLocal: string } // raw input values ('' when empty)
export type NewSessionFieldErrors = Partial<Record<'title' | 'startsAt', string>>
export function validateNewSession(values: NewSessionFormValues, nowMs: number):
  | { ok: true; input: NewSessionInput }
  | { ok: false; errors: NewSessionFieldErrors }

// src/mocks/handlers.ts
export const handlers: RequestHandler[]          // default success handlers
export function sessionsListError(options?: { once?: boolean }): RequestHandler

// src/mocks/data.ts
export const seedSessions: readonly TrainingSession[]
export function resetMockSessions(): void

// src/mocks/browser.ts
export function startMockWorker(): Promise<unknown>

// src/mocks/node.ts
export const server: SetupServerApi
```

Dependency direction:
- `types` ← `sessionsApi`, `validateNewSession`, mocks, and components.
- `sessionsApi` ← `TrainingSessionsWorkspace` only.
- `validateNewSession` ← `CreateSessionForm` only.
- `src/mocks/**` ← `main.tsx` (dev only, dynamic import) and `src/test/**` / tests only.
- UI components never import from `src/mocks/**` (AC-MOCK-1). The only exception is the test file, which may import `seedSessions` and `server`/`sessionsListError`.

## Essential Tests

**One required behavior test:** `src/features/training-sessions/TrainingSessionsWorkspace.test.tsx`, "shows loaded sessions and filters them by Scheduled".

- **Why filtering:** filtering is deterministic. It does not depend on the client clock, the timezone, or user-event's handling of `datetime-local` in jsdom (Risk R-4). It still exercises the full request boundary and the MSW stack.
- **Setup:** render `<App />` without `StrictMode`, using the default MSW handlers from `src/test/setup.ts`. Do not mock modules or `fetch`.
- **Steps and assertions** (user-level, through accessible queries; no internal state, no snapshots):
  1. A loading indicator (`role="status"`, "Loading sessions…") is present first. Then wait (`findBy…`) until every seed title is visible. Assert the list contains one item per seed session. (AC-LIST-1, AC-LIST-3)
  2. The "All" radio is checked by default, and titles of all three statuses are visible. (AC-FILTER-1, AC-FILTER-2, AC-MOCK-5)
  3. `user.click` the "Scheduled" radio. Every `scheduled` seed title is visible, and every `completed`/`cancelled` seed title is absent (`queryByText` → `null`). (AC-FILTER-3)
  4. `user.click` "All". Every seed title is visible again. (AC-FILTER-4)
- **Expected titles** are derived from the exported `seedSessions` grouped by status, so the test does not hard-code duplicate data.
- **Covers:** AC-TEST-1 (behavior-level test of the main flow, filtering branch) and AC-TEST-2 (runs via `npm test`). It also covers AC-LIST-1, AC-LIST-3 (loading shown, then gone), AC-FILTER-1…4, AC-MOCK-1/2 (responses only through the boundary and MSW; `onUnhandledFrame: 'error'` fails the test on any unmocked request), and AC-MOCK-5.

## Additional Risk-Based Tests

These are optional, not required for onboarding, and ordered by regression damage. A follow-up `test-generator` role or the coder can add them if time allows.

1. **Successful creation** (AC-CREATE-1, AC-CREATE-7, AC-CREATE-8, AC-MOCK-6):
   - Open "New session", type a title with surrounding spaces, and set the date with `fireEvent.change(input, { target: { value: '2099-01-01T10:00' } })` (see R-4).
   - Submit. Assert the trimmed title appears in the list with `scheduled`, the form closes, and the session stays visible after switching to "Scheduled".
2. **List error and retry** (AC-LIST-3…5, AC-MOCK-4):
   - With `server.use(sessionsListError({ once: true }))`, assert the alert text and the absence of list and loading.
   - Click "Try again" and assert that the list appears.
   - Variant without `once`: the retry shows the error again.
3. **Validation boundaries** (AC-CREATE-2, AC-CREATE-3), a unit test of `validateNewSession` with fixed `nowMs`:
   - title `'  '`, 2, 3, 80, and 81 trimmed characters, and 3 characters with padding;
   - date `''`, equal to now, 1 minute before now, and 1 minute after now.
4. **No request while invalid** (AC-CREATE-4):
   - Submit an empty form. Assert both messages are associated with their fields (`aria-describedby`, or `getByRole('textbox', { description })`).
   - Assert that no `POST` was observed (`server.events.on('request:start', …)` counter).
5. **Duplicate-submission guard and pending label** (AC-CREATE-5, AC-CREATE-6):
   - Use a `POST` override that awaits a promise the test controls (avoid `delay()` with fake timers; see MSW 3 notes).
   - Double-click submit and press Enter. Assert "Creating…" is disabled and exactly one `POST` was observed.
6. **Create failure** (AC-CREATE-9): override `POST` with a 500. Assert the alert appears, the list length is unchanged, the values are kept, and submit is re-enabled.
7. **Empty filter state** (AC-FILTER-5): override `GET` to return only `completed`/`cancelled`. Select "Scheduled" and assert the no-match text, with no `role="status"` or `role="alert"` present.
8. **Malformed response** (api-integration rule): override `GET` to return `[{ id: 1 }]`. Assert the error state, not a crash.

Untested by design: real-browser Service Worker registration (covered by the manual check), visual layout, and cross-timezone display.

## Verification Commands

All commands run from the Repository Root.

| Purpose | Command | Expected |
| --- | --- | --- |
| Install the approved devDependencies (once, by `coder`, needs network) | `npm install -D vitest jsdom @testing-library/react @testing-library/dom @testing-library/user-event msw` | Lockfile updated, no peer-dependency errors |
| Generate the worker script (once) | `npx msw init public --save` | `public/mockServiceWorker.js` created, `package.json` has the `msw.workerDirectory` field |
| Lint (existing) | `npm run lint` | 0 errors |
| Type-check and build (existing) | `npm run build` | `tsc -b` and `vite build` pass; tests and mocks under `src/` are type-checked too |
| Tests (new, D-5) | `npm test` | The essential test passes, with no unhandled-request errors |
| Manual check (AC-MANUAL-1) | `npm run dev`, then open `http://localhost:5173/` (README) | Console shows `[MSW] Mocking enabled.` Exercise list → Scheduled → All → New session → invalid submit (messages) → valid future submit → the session appears |
| Manual error check (AC-MOCK-4) | Open `http://localhost:5173/?mock=sessions-error` | The error state appears, and "Try again" shows the list |

The developer records the actual manual observations in `workflow-log.md`. Nothing may be claimed as observed unless it was observed.

## Risks And Rollback

| ID | Risk | Likelihood / impact | Mitigation |
| --- | --- | --- | --- |
| R-1 | `tsc -b` type-checks `src/test/**`, `src/mocks/node.ts`, and `*.test.tsx` under `tsconfig.app.json` (`types: ["vite/client"]`, DOM lib). `msw/node` or Vitest typings may need Node types and fail the build. | Medium / blocks `npm run build` | First confirm the actual error. Minimal fix, a tool-required config change allowed by D-5: add `tsconfig.test.json` (`types: ["vite/client", "node"]`, including the test, setup, and node-mock files), exclude those files in `tsconfig.app.json`, and reference the new config from `tsconfig.json`. Do not loosen `strict`-like flags. |
| R-2 | Versions are new majors (Vitest 5, MSW 3, jsdom 30). ctx7 was unavailable, so API details come from the live web docs, not from version-pinned docs. | Medium / API mismatch | The coder checks the installed packages' typings (`node_modules/msw/lib/**/*.d.ts`, `vitest/config`) before use. Known MSW 3 rename: `onUnhandledFrame`. If a peer-dependency conflict appears, pin to the versions in the G-2 table and report it. Do not use `--force` or `--legacy-peer-deps` without developer approval. |
| R-3 | Node's `fetch` (used under Vitest's jsdom environment) rejects relative URLs, so `fetch('/api/sessions')` fails in tests. | High if ignored / test failure | `sessionsApi` always builds `new URL(path, window.location.origin)`. MSW relative handler paths resolve against the jsdom location (`http://localhost:3000` by default), so they match. |
| R-4 | `user-event` typing into `datetime-local` in jsdom is unreliable, because intermediate values are sanitized to `''`. | Medium / flaky create test | The essential test avoids it (filter path). Optional create tests set the value with `fireEvent.change` on that one field and use a far-future date (2099) to stay independent of clock and timezone. |
| R-5 | StrictMode runs effects twice in dev, which causes a duplicate `GET` and a possible stale state write. | Low / cosmetic | `AbortController` plus abort on cleanup. An aborted request must not set the error state (ignore `AbortError`). |
| R-6 | The Service Worker is not active before the first request, so the first load hits the Vite server and returns 404 / HTML. | Low / confusing first load | Await `worker.start()` before rendering (MSW docs). |
| R-7 | `npm run build` + `npm run preview` has no mock (dev only), so the list shows the error state. | Expected / by design | Documented: use `npm run dev` for the manual check. No backend is in scope (AC-MOCK-3). |
| R-8 | The future check uses the client clock at submit. A value 1 minute ahead may pass the client check yet be "past" by arrival time. | Low / acceptable per D-4 | The mock does not re-check. Recorded as a known limitation. |
| R-9 | The mock store is module-level, so state leaks between tests. | Medium / order-dependent tests | `resetMockSessions()` in `afterEach`, together with `server.resetHandlers()`. |

**Rollback:** all application changes are additive within `src/features/training-sessions/`, `src/mocks/`, and `src/test/`, plus small edits to `App.tsx` and `main.tsx`. To revert, restore those two files, `package.json`, `package-lock.json`, and `vite.config.ts` from git and delete the new folders and `public/mockServiceWorker.js`. No feature flag is needed for an onboarding exercise.

## Open Items (non-blocking)

- All G-3 contract elements are provisional. The owner is the developer, or a future backend/`api-integration` confirmation.
- The G-4 copy and layout are minimal defaults. A developer or `ui-designer` may revise them without changing the file plan.
- Adding `@testing-library/jest-dom` is optional and deferred.
