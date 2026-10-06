# training-sessions: Training Sessions Workspace

Source: `frontend-accelerator-onboarding/TASK.md` (onboarding task "Training Sessions Workspace"). The repository copy is identical to the toolset copy at `frontend-accelerator-toolset/training/frontend-accelerator-onboarding/TASK.md`.

Revision 2: developer decisions applied. OQ-1, OQ-2, OQ-3, OQ-8, and OQ-9 are closed; A-1, A-2, A-3, A-4, and A-7 became confirmed decisions D-1 to D-5; D-6 adds a mock-data requirement.

## Goal

Build a small frontend workspace in which a trainer can view, filter, and create training sessions against a mock API. The exercise exists to practise the accelerator workflow, so product and technical scope stay deliberately small.

## Users And Outcome

- **Primary user:** a trainer.
- **Problem:** the trainer needs one place to see their training sessions and add new ones.
- **Desired outcome:** the trainer opens the workspace, sees the sessions loaded from a mock API, narrows the list to `scheduled` sessions, creates a new session with a title and a future date/time, and sees that session in the list without leaving the workspace.

Required flow (from TASK.md):

1. Open the workspace and see sessions loaded from a mock API.
2. Filter sessions by one status.
3. Open a create form.
4. Create a session with a title and a future date/time.
5. See the created session in the list.

## Acceptance Criteria

Each criterion can be checked on its own. "Request" means a call through the replaceable request boundary (AC-MOCK-1).

### Sessions list

- [ ] **AC-LIST-1 Load from mock API.** When the workspace opens, it requests sessions through the request boundary and, after a successful response, renders one list entry per returned session.
- [ ] **AC-LIST-2 Displayed fields.** Each list entry shows the session **title**, **status** (one of `scheduled`, `completed`, `cancelled`; D-1), and **start date/time**. The display format of date/time is not specified (see OQ-6).
- [ ] **AC-LIST-3 Loading state.** While the list request is pending, a loading indicator is visible. The session entries and the error state are not shown at the same time. The loading indicator disappears when the request settles (success or failure).
- [ ] **AC-LIST-4 Request-error state.** When the list request fails, the workspace shows one error state whose message says in plain language that sessions could not be loaded. Raw technical details such as stack traces or status codes alone are not enough.
- [ ] **AC-LIST-5 Recoverable error.** The error state offers a way to recover without reloading the page (assumed to be a retry action; see A-5 / OQ-4). Using it issues the list request again. A subsequent success replaces the error state with the list, and a subsequent failure shows the error state again.

### Status filter

- [ ] **AC-FILTER-1 Filter options.** The list provides exactly two filter options: `All` and `scheduled` (D-2).
- [ ] **AC-FILTER-2 Default.** On first load, `All` is selected and every loaded session is visible, whatever its status.
- [ ] **AC-FILTER-3 Status filter.** Selecting `scheduled` shows only sessions with status `scheduled`. Sessions with status `completed` or `cancelled` are hidden.
- [ ] **AC-FILTER-4 Back to All.** Selecting `All` after `scheduled` shows every loaded session again.
- [ ] **AC-FILTER-5 No matches.** If no loaded session has status `scheduled` while that filter is selected, the list area makes it clear that nothing matches. It must not look like the loading state or the error state. TASK.md does not define empty-state wording (see OQ-7).

### Create session

- [ ] **AC-CREATE-1 Open form.** From the workspace, the trainer can open a create-session form. The form has exactly two inputs, a title and a start date/time, and **no status field** (D-3).
- [ ] **AC-CREATE-2 Title required, trimmed length.** The title is validated after trimming leading and trailing whitespace. Submission is rejected when the trimmed length is less than 3 or more than 80 characters. Exactly 3 and exactly 80 trimmed characters are accepted. A title made only of whitespace counts as empty and is rejected.
- [ ] **AC-CREATE-3 Date/time required and in the future.** Submission is rejected when the date/time is missing or is not strictly later than the client clock at the moment of submission, with the entered value interpreted in the browser's local timezone (D-4).
- [ ] **AC-CREATE-4 Validation messages.** Every rejected field shows a message next to or associated with that field. The message says what is wrong and what is expected, for example that the title must be 3–80 characters or that the date/time must be in the future. No create request is sent while any field is invalid.
- [ ] **AC-CREATE-5 Duplicate-submission guard.** While a create request is pending, further submit attempts (repeated clicks, pressing Enter) send no additional request. Exactly one create request is sent per accepted submission.
- [ ] **AC-CREATE-6 Pending feedback.** While the create request is pending, the form shows that submission is in progress, for example a disabled or busy submit control.
- [ ] **AC-CREATE-7 Created session appears.** After a successful create response, the created session appears in the visible list without a page reload. It shows the submitted (trimmed) title, status `scheduled` as assigned by the API (D-3), and the submitted start date/time.
- [ ] **AC-CREATE-8 Created session and filter.** The created session has status `scheduled`, so it is visible under both `All` and `scheduled`. No filter switching or "hidden session" notice is required (OQ-8 closed).
- [ ] **AC-CREATE-9 Create failure (minimal).** TASK.md does not specify create-request failure behavior (see OQ-5). At minimum, a failed create request must not add a session to the list and must end the pending state so the trainer can submit again.

### Mock boundary

- [ ] **AC-MOCK-1 Replaceable request boundary.** UI code obtains and creates sessions only through an HTTP client or an equivalent request boundary. Mock data is not imported directly into or hard-coded in UI components. Pointing the boundary at a real backend would need no UI component changes.
- [ ] **AC-MOCK-2 Conventional HTTP mock.** The repository has no existing mock mechanism (F-4), so mocked responses come from MSW or another conventional HTTP-level mock, added as a dev dependency (D-5). The specific library belongs to `writing-plans` / `architect` (G-2).
- [ ] **AC-MOCK-3 No backend service.** No backend service, server process, or database is implemented.
- [ ] **AC-MOCK-4 Failure is reproducible.** The list-request failure (AC-LIST-4/5) can be triggered on purpose, at least in automated tests and ideally also for manual checks. Otherwise the error state cannot be verified. The trigger mechanism is a planning decision.
- [ ] **AC-MOCK-5 Observable filter data.** The initial mock session data contains sessions with at least two different statuses, and at least one of them is `scheduled` (D-6). This ensures that selecting `scheduled` visibly changes the list compared with `All`.
- [ ] **AC-MOCK-6 Create response status.** The mock create endpoint returns the created session with status `scheduled` (D-3). The client does not set the status itself.

### Automated test

- [ ] **AC-TEST-1 Behavior-level test.** At least one automated test exercises the main flow at the behavior level, through rendered UI and user interactions rather than internal functions. It covers either filtering (AC-FILTER-3) or successful creation (AC-CREATE-7).
- [ ] **AC-TEST-2 Runs from a documented command.** The test runs from a `test` script in `package.json` and passes (D-5).

### Manual check (process requirement from TASK.md)

- [ ] **AC-MANUAL-1** The application starts with a documented repository command. The list → filter → create flow is exercised once in a real browser, and what was actually observed is recorded in `tasks/training-sessions/workflow-log.md`. Screenshots and the `browser-verify` role are optional.

## Constraints

From TASK.md "Constraints" and "Mock boundary", plus developer decision D-5:

- Use the repository's existing framework, package manager, scripts, and test stack (React 19 + TypeScript + Vite, npm; see Facts).
- Because the repository has no test or mock tooling, adding a test runner and an HTTP-mock library as `devDependencies` and adding a `test` script to `package.json` is approved (D-5). Other configuration changes are allowed only where these tools need them.
- Do not rewrite unrelated code or configuration.
- Do not add features outside the required flow until onboarding is complete.
- Report incomplete behavior honestly instead of claiming an unperformed check.
- Keep mock data behind a replaceable request boundary. Use MSW or another conventional HTTP mock. Do not implement a backend service.

## Non-Goals

From TASK.md "Explicitly Optional". These are not required and should not be built during onboarding:

- Session details, drawers, or deep links.
- Search or multiple filters (exactly `All` + `scheduled`).
- Pagination.
- A complete API contract or scenario matrix.
- Desktop/mobile screenshot sets.
- Exhaustive responsive and accessibility validation.
- Full test coverage.
- CI, deployment, or a public URL.
- Strict TypeScript migration or unrelated refactoring.

Also out of scope because TASK.md does not mention them: editing or deleting sessions, choosing or changing a session's status in the UI, persistence across page reloads, authentication or permissions, and localization.

## Facts

- **F-1** The repository is one React 19 + TypeScript + Vite application at the repository root (`package.json`, `src/`, `vite.config.ts`). This is the only frontend candidate, so the Repository Root is the Application Root.
- **F-2** The package manager is npm (`package-lock.json`). The scripts are `dev`, `build` (`tsc -b && vite build`), `lint`, and `preview`. The README documents `npm run dev` on `http://localhost:5173`.
- **F-3** There is **no test script and no test tooling** in `package.json`: no Vitest, Jest, Testing Library, or Playwright. Adding them is now approved (D-5).
- **F-4** There is **no existing mock mechanism**: no MSW and no other HTTP mock in dependencies or source. Adding one is now approved (D-5).
- **F-5** `src/` contains only the scaffold (`App.tsx` renders a heading, plus `main.tsx` and `index.css`). No session domain code, HTTP client, or routing exists.
- **F-6** No living specifications (`specs/`) or product documentation (`docs/`) exist. `rulesets/project/` contains only the placeholder README, so there are no project-specific rules.
- **F-7** TASK.md itself does not name the status values, the status of a new session, the reference clock for "future", or the recovery mechanism. The first three are now settled by developer decisions D-1 to D-4; recovery remains assumption A-5.

## Confirmed Decisions

Developer decisions recorded on 2026-10-06. These replace the earlier assumptions shown in brackets.

- **D-1 Status set** (was A-1; closes OQ-1). A session has exactly one status from the fixed set `scheduled`, `completed`, `cancelled`.
- **D-2 Filtered status** (was A-2; closes OQ-1). The single status filter option is `scheduled`. The filter options are `All` and `scheduled`.
- **D-3 New session status** (was A-3; closes OQ-2 and OQ-8). The create form has no status field. The API assigns status `scheduled` to every created session and returns it in the create response.
- **D-4 Meaning of "in the future"** (was A-4; closes OQ-3). The entered date/time is interpreted in the browser's local timezone. It is valid when it is strictly later than the client clock at the moment of submission. The value sent to the API is an unambiguous absolute timestamp, for example ISO 8601 with offset or UTC. The exact wire format is left to `api-integration` / `writing-plans`. Input granularity (minute or second) and whether the mock API also rejects past dates are planning details and do not block planning.
- **D-5 Tooling** (was A-7; closes OQ-9). Adding a test runner and an HTTP-mock library to `devDependencies`, and adding a `test` script to `package.json`, is approved and counts as using a conventional mechanism, not as rewriting unrelated configuration. The specific tools are chosen in planning (G-2).
- **D-6 Mock data variety** (new). The initial mock session data contains sessions with at least two different statuses, including at least one `scheduled`, so that the filter has an observable effect (AC-MOCK-5).

## Assumptions

Remaining working assumptions. They are not confirmed and must not be written into living specs until they are.

- **A-5 Recovery (OQ-4).** "Recoverable" means a visible retry action in the error state that repeats the list request.
- **A-6 Created-session placement.** The created session is added to the client-side list from the create response, with no full refetch required. Its position in the list is not significant.

A-1, A-2, A-3, A-4, and A-7 are now D-1 to D-5 (see Confirmed Decisions).

## Open Questions

None of the remaining questions blocks planning.

| ID | Question | Blocking? | Owner |
| --- | --- | --- | --- |
| OQ-4 | What does the error state offer for recovery: a retry button, automatic retry, or something else? | Non-blocking if A-5 is accepted | Developer / `ui-designer` |
| OQ-5 | What should happen when the create request fails (message, keep form values, retry)? TASK.md defines only the list error state. | Non-blocking (AC-CREATE-9 gives a minimum) | Developer |
| OQ-6 | How is the start date/time displayed in the list (format, locale, timezone)? | Non-blocking | `ui-designer` |
| OQ-7 | What do the empty states look like (no sessions at all; no `scheduled` sessions match the filter)? | Non-blocking | `ui-designer` |
| OQ-10 | Should the create form be a separate view or route, an inline section, or a dialog? | Non-blocking (no deep links required) | `ui-designer` / `architect` |

### Closed questions

| ID | Resolution |
| --- | --- |
| OQ-1 | Closed by D-1 and D-2: statuses are `scheduled` / `completed` / `cancelled`; the filter exposes `scheduled`. |
| OQ-2 | Closed by D-3: the API assigns `scheduled`; the form has no status field. |
| OQ-3 | Closed by D-4: browser local timezone, strictly later than the client clock at submission, absolute timestamp to the API. |
| OQ-8 | Closed by D-3: a created session is always `scheduled`, so it is visible under both filter options. |
| OQ-9 | Closed by D-5: a test runner, an HTTP mock in `devDependencies`, and a `test` script are approved. |

### Gaps handed to specialist roles

These gaps are intentionally not decided here:

- **G-1 Architecture** (`architect` or `writing-plans`): request-boundary shape, state ownership for the list, filter, and pending create, where the filter is applied (client or query parameter), and file structure.
- **G-2 Tooling** (`writing-plans`; approval already given by D-5): the specific test runner, DOM testing library, and HTTP mock library (MSW or equivalent), plus how mock failures are toggled (AC-MOCK-4).
- **G-3 API contract** (`api-integration`, optional for onboarding): endpoint paths, methods, the session payload shape (id, title, status, start timestamp), the timestamp wire format (D-4), and the error response shape. TASK.md says a complete API contract is not required, so a minimal provisional contract is enough.
- **G-4 Visual and interaction** (`ui-designer`, optional): form placement, date/time input control, loading, error, and empty presentation, and validation message wording.

## Readiness

**Verdict: Ready for planning.**

- All required TASK.md behavior maps to independently verifiable acceptance criteria (AC-LIST, AC-FILTER, AC-CREATE, AC-MOCK, AC-TEST, AC-MANUAL), and the non-goals are explicit.
- Every blocking question (OQ-1, OQ-2, OQ-3, OQ-9) is closed by a developer decision (D-1 to D-5). OQ-8 is closed by D-3. D-6 makes the filter observable in mock data.
- The remaining open questions (OQ-4, OQ-5, OQ-6, OQ-7, OQ-10) and assumptions (A-5, A-6) do not block planning. `writing-plans` can adopt the stated defaults or route them to `ui-designer`.
- The recommended next role is **`writing-plans`**. It owns G-1 and G-2, and it can take minimal decisions for G-3 and G-4 itself because the API contract and visual direction are explicitly optional for onboarding. Choose `architect` or `ui-designer` first only if the developer wants those gaps decided by a specialist.
