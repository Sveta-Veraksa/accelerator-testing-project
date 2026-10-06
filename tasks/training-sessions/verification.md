# training-sessions: Verification

Verified on 2026-10-06 (~16:32 local) by the `verify` role (Claude, assistant session). Read-only: no code, test, config, dependency or lock-file changes. No dev server or browser was run. This file replaces an earlier, uncommitted `verification.md` from ~16:21: all commands below were run again, and Browser Evidence now follows the current `workflow-log.md`.

## Application Root

- Application Root = Repository Root: `C:\WORK\INNOWISE\Accelerator testing project\accelerator-testing-project`. It holds a single React 19 + TypeScript + Vite 8 app that uses npm.
- Tooling: Node `v24.21.0`, npm `11.19.0`.
- Scripts used from `package.json`: `lint` (`eslint .`), `build` (`tsc -b && vite build`), `test` (`vitest run`).
- There is no separate `typecheck` or `format` script. Type checking runs as part of `build` (`tsc -b`). No end-to-end test script exists.
- Verified code state:
  - `git log --oneline -3`:
    - `5a99d65 Block duplicate session creation via Cancel or New session while a request is pending`
    - `ac881ae Add Training Sessions workspace with mocked API, filter, create form and behavior test`
    - `0ff08d6 Add training-sessions requirements, implementation plan and workflow log`
  - `git status --short`, before and after the checks:
    - ` M tasks/training-sessions/workflow-log.md`
    - `?? tasks/training-sessions/verification.md`
  - Both entries are task documentation, so the checked source code is exactly commit `5a99d65`.
  - `npm run build` rewrote `dist/`, which is git-ignored. Nothing else in the working tree changed.

## Commands And Results

All commands ran from the Application Root in the order shown. Every command was present and applicable, and none was blocked by the environment.

| # | Command | Exit code | Result | Decisive output |
| --- | --- | --- | --- | --- |
| 1 | `npm run lint` | `0` | PASS (1 warning) | `✖ 1 problem (0 errors, 1 warning)`. The warning is `public/mockServiceWorker.js 1:1 Unused eslint-disable directive (no problems were reported)`, which is known review finding N-7. It does not fail the command. |
| 2 | `npm run build` | `0` | PASS | `tsc -b` reported no errors. `vite v8.3.3` reported `✓ 25 modules transformed`, `dist/assets/index-Dibhyy_G.js 225.99 kB │ gzip: 70.73 kB` and `✓ built in 230ms`. |
| 3a | `npm test` (1st run) | `0` | PASS | `vitest v5.0.3`: `Test Files 1 passed (1)`, `Tests 2 passed (2)`, `Duration 3.60s`. |
| 3b | `npm test` (2nd run, immediately after) | `0` | PASS | `Test Files 1 passed (1)`, `Tests 2 passed (2)`, `Duration 4.46s`. |
| 4 | `git status --short`, `git log --oneline -3` | `0` | Recorded | See Application Root. These were used only to record what was checked. |

Both tests are in `src/features/training-sessions/TrainingSessionsWorkspace.test.tsx`:

1. **`shows loaded sessions and filters them by Scheduled`**
   - Asserts `Loading sessions…` and then the list, with one item per seed session.
   - Asserts that `All` is the default, `Scheduled` hides the other statuses, and `All` shows everything again.
   - Covers AC-LIST-1, AC-LIST-3 (loading followed by success only), AC-FILTER-2, AC-FILTER-3, AC-FILTER-4, AC-MOCK-5, AC-TEST-1 and AC-TEST-2.
2. **`sends exactly one create request while it is pending, even via Cancel or New session`**
   - Holds the POST open with a controlled promise.
   - Asserts the `Creating…` label, that Cancel and New session are disabled, and that exactly one POST is sent after Cancel → New session → resubmit.
   - After the POST resolves, asserts that the form closes and the first title appears.
   - Covers AC-CREATE-5 (S-1 scenario and a click on the pending submit button), AC-CREATE-6, and the title part of AC-CREATE-7.

The earlier Vitest cold-start error `Timeout waiting for worker to respond` did **not** happen in either run. Two clean runs make a flake less likely but do not prove it is gone.

## Browser Evidence

Source: `tasks/training-sessions/workflow-log.md`, section "Manual Browser Observation". This role did not run a browser and only restates what the log records.

- **Who checked:** the developer (Veraksa Svetlana), in Chrome, on 2026-10-06 at about 16:25, with code at commit `5a99d65`. Role Decisions row `~16:25` says the result matched the earlier check by the assistant session.
- **Command and URLs:** `npm run dev`, then `http://localhost:5173/` and `http://localhost:5173/?mock=sessions-error`.
- **Flow:** list → Scheduled → All → New session → empty submit → past date → valid future submit, then `?mock=sessions-error`.
- **Recorded observations:**
  - The list showed 4 sessions, each with title, status and date. Scheduled showed 2 sessions, and All showed 4 again.
  - Empty submit showed two validation messages (title and date/time), and no session was added.
  - A past date showed "Start date and time must be in the future."
  - A valid title with a future date closed the form, and the new session appeared in the list.
  - With `?mock=sessions-error` the error state did **not** appear, and the normal list loaded.
- **Gaps recorded in the log:**
  - AC-LIST-4/5 (error state and Try again) was not observed. The StrictMode double effect means the aborted first request consumes the `{ once: true }` error handler.
  - AC-CREATE-9 was not exercised.
  - AC-CREATE-5 is covered only by the regression test.
- **Not recorded:**
  - the loading indicator;
  - the status and date of the created session, and whether it appears under Scheduled;
  - title trimming;
  - console and network output.
- **Other runtime evidence:** the Completion section of the log says that N-3 (blank dev page when the Service Worker cannot start) was reproduced in the Claude desktop app's built-in browser.

## Unverified Items

None of these is proven by a test that ran here or by the recorded browser observation.

**Not verified:**

- **AC-LIST-4 and AC-LIST-5 (list error state and "Try again").**
  - No automated test exists, and the `sessionsListError` handler from `src/mocks/handlers.ts` is not used in any test.
  - The manual switch `?mock=sessions-error` (`src/mocks/browser.ts:11-12`) does not show the error in dev. React StrictMode runs the load effect twice, and the aborted first request consumes the `{ once: true }` handler, so the second request returns 200. The developer confirmed this in Chrome.
  - So neither the error message nor the retry outcome has been seen: success after retry, or failure again after retry.
  - AC-LIST-3 is unproven for the failure case: no one has confirmed that the loading indicator disappears on failure or that the error and the list are never shown together.
- **AC-MOCK-4 (failure is reproducible).** The mechanism exists but no test uses it, and the manual trigger has no effect under StrictMode in dev.
- **AC-FILTER-5 (no matches).** No test covers it and it was not observed. The seed data always contains `scheduled` sessions.
- **AC-CREATE-8 (created session visible under Scheduled).** The developer's record stops at "appeared in the list". The regression test does not switch the filter.
- **AC-CREATE-9 (create failure).** No test covers it and it was not exercised. Nobody has checked that a failed POST adds no session and ends the pending state.
- **AC-MOCK-6 (create response has status `scheduled`).** The regression test overrides the POST handler with its own response, so the default mock create handler is not tested. The browser record does not mention the status of the created session.

**Partly verified:**

- **AC-FILTER-1 (exactly two options).** `All` and `Scheduled` were exercised. Neither the test nor the record confirms that no other option exists.
- **AC-CREATE-1 (exactly two inputs, no status field).** The test and the record use Title and Start date and time. Neither confirms that there are no other fields.
- **AC-CREATE-2 (title rules).**
  - Observed: an empty title is rejected.
  - Not checked: lengths of exactly 3 and 80 characters, lengths of 2 and 81, a whitespace-only title, and trimming.
- **AC-CREATE-3 (date in the future).**
  - Observed: a missing date and a past date are rejected.
  - Not checked: the "strictly later than now" boundary and the local-time interpretation.
- **AC-CREATE-4 (validation messages).**
  - Observed: messages for the empty title, the missing date and the past date.
  - Not checked: the title-length message, and that no request is sent while a field is invalid. The record only says "no session added".
- **AC-CREATE-5 (duplicate-submit guard).**
  - Covered: the Cancel / New session / resubmit path and a click on the pending button.
  - Not covered: a fast double click before the first re-render, and pressing Enter while the request is pending.
- **AC-CREATE-7 (created session appears).** The test checks only the title. The browser record says only that the session appeared, with no status or date.

**Not proven by a command:**

- **AC-MOCK-3 (no backend).** Only the reviewer's reading of the code supports it.
- **Production bundle at runtime.** `dist/` was built but not served (no `vite preview`). In production MSW is off and `/api/sessions` does not exist, so the app should show the error state. That has not been observed.
- **Vitest cold-start flake.** It did not happen in 2 consecutive runs, but that does not prove it is fixed.
- **Fix not re-reviewed.** No code review has run since the S-1 / N-1 fix (`5a99d65`). The fix is supported only by the regression test (command 3) and by the coder's report that the test fails without the fix. This role did not reproduce that claim.

**Known review findings left open on purpose** (from `review.md`; the decision is in the `~15:55` row of Role Decisions in `workflow-log.md`):

- **N-2:** keyboard focus is lost when the form unmounts, and a successful create is not announced (no `aria-live`).
- **N-3:** `enableMocking()` has no `catch`, so the dev page stays blank if the Service Worker cannot start. The log reports this was reproduced in the built-in browser pane.
- **N-4:** with `onUnhandledRequest: 'error'`, tests catch unmocked requests only indirectly.
- **N-5:** title length is counted in UTF-16 code units.
- **N-6:** `aria-controls` points to an element that is missing while the form is closed.
- **N-7:** the lint warning on `public/mockServiceWorker.js` is still there (command 1).

## Verdict

**PASS** for all selected checks on commit `5a99d65`:

- `npm run lint`: exit 0 (0 errors, 1 known warning N-7)
- `npm run build`: exit 0
- `npm test`: exit 0 on two runs in a row (2/2 tests each time)

This verdict covers only these commands. It does **not** mean every acceptance criterion is met. AC-LIST-4/5, AC-MOCK-4, AC-FILTER-5, AC-CREATE-8, AC-CREATE-9 and AC-MOCK-6 are still unverified, and several other criteria are only partly verified (see Unverified Items).
