# accelerator-testing-project

Учебный проект на React + TypeScript + Vite для онбординга Frontend Accelerator.

Реализован **Training Sessions Workspace** — рабочее пространство тренера:

- список учебных сессий (название, статус, дата и время начала), загружаемый из mock API;
- фильтр `All` / `Scheduled`;
- состояния загрузки, ошибки с кнопкой «Try again» и пустого результата;
- форма создания сессии: название 3–80 символов после trim, дата и время строго в будущем, защита от повторной отправки;
- созданная сессия сразу появляется в списке со статусом `scheduled`.

Условие задачи — [`frontend-accelerator-onboarding/TASK.md`](frontend-accelerator-onboarding/TASK.md).

## Требования

- Node.js 24+
- npm 11+

## Скрипты

| Команда           | Описание                                                        |
| ----------------- | --------------------------------------------------------------- |
| `npm install`     | Установка зависимостей                                          |
| `npm run dev`     | Dev-сервер с HMR и mock API (http://localhost:5173)             |
| `npm run build`   | Проверка типов (`tsc -b`) и сборка в `dist`                     |
| `npm run preview` | Локальный просмотр production-сборки (без mock API)             |
| `npm run lint`    | Линтинг (ESLint)                                                |
| `npm test`        | Поведенческие тесты (Vitest + Testing Library + MSW), один прогон |

## Mock API

Бэкенда нет. Запросы идут через единственный HTTP-клиент `src/features/training-sessions/sessionsApi.ts`, а ответы подставляет [MSW](https://mswjs.io/) 2.x:

- в `npm run dev` — через Service Worker (`public/mockServiceWorker.js`, генерируется `npx msw init public --save`);
- в тестах — через `msw/node` (`src/mocks/node.ts`, `src/test/setup.ts`).

Провизорный контракт (только для мока):

| Операция | Запрос | Ответ |
| --- | --- | --- |
| Список сессий | `GET /api/sessions` | `200`, массив `{ id, title, status, startsAt }` |
| Создание сессии | `POST /api/sessions`, тело `{ title, startsAt }` | `201`, сессия со статусом `scheduled` |

`status` — одно из `scheduled`, `completed`, `cancelled`; `startsAt` — ISO 8601 в UTC. Данные хранятся в памяти и сбрасываются при перезагрузке страницы.

Mock API включается только в dev-режиме. В `npm run preview` запросы уходят на несуществующий `/api/sessions`, поэтому список показывает состояние ошибки — это ожидаемо.

Mock API требует браузер, который разрешает Service Worker'ы (например, Chrome). Если Service Worker не регистрируется, dev-страница остаётся пустой.

## Структура

```
public/
  mockServiceWorker.js         сгенерированный MSW Service Worker (не редактировать)
src/
  main.tsx                     точка входа; в dev сначала запускает MSW
  App.tsx                      корневой компонент
  index.css                    глобальные стили
  features/training-sessions/
    types.ts                   типы сессии, статусы, фильтр
    sessionsApi.ts             HTTP-клиент (единственное место с fetch)
    validateNewSession.ts      валидация формы создания
    TrainingSessionsWorkspace.tsx  корень фичи: загрузка, фильтр, создание
    SessionList.tsx            список и пустые состояния
    StatusFilterControl.tsx    фильтр All / Scheduled
    CreateSessionForm.tsx      форма создания
    TrainingSessionsWorkspace.css
    TrainingSessionsWorkspace.test.tsx  поведенческие тесты
  mocks/
    data.ts                    начальные данные и in-memory хранилище
    handlers.ts                обработчики MSW
    browser.ts                 MSW для браузера (dev)
    node.ts                    MSW для тестов
  test/setup.ts                настройка Vitest
tasks/training-sessions/       артефакты онбординга (см. ниже)
frontend-accelerator-onboarding/  условие, критерии и шаблон лога онбординга
index.html                     HTML-шаблон Vite
vite.config.ts                 конфигурация Vite и Vitest
eslint.config.js               конфигурация ESLint
tsconfig*.json                 конфигурация TypeScript
```

## Frontend Accelerator

В репозиторий установлен Frontend Accelerator: `.claude/`, `.agents/`, `.codex/`, `rulesets/`, `toolchain/` и квитанция `.frontend-accelerator/installation.json`. Эти файлы управляются установщиком аксселератора — не редактируйте их вручную.

Проверка готовности окружения:

```bash
node ./toolchain/bin/doctor.mjs --json
```

Работа велась ролями аксселератора по одной, с ручным выбором следующей роли: `requirements-analyst` → `writing-plans` → `coder` → `code-reviewer` → `coder` (исправления по ревью) → ручная проверка в браузере → `verify`.

Артефакты задачи в [`tasks/training-sessions/`](tasks/training-sessions/):

| Файл | Содержимое |
| --- | --- |
| [`requirements.md`](tasks/training-sessions/requirements.md) | Требования и критерии приёмки (AC-*), подтверждённые решения |
| [`implementation-plan.md`](tasks/training-sessions/implementation-plan.md) | Пофайловый план реализации |
| [`review.md`](tasks/training-sessions/review.md) | Ревью кода (дословно) |
| [`verification.md`](tasks/training-sessions/verification.md) | Результаты проверок и непроверенные пункты |
| [`workflow-log.md`](tasks/training-sessions/workflow-log.md) | Промпты, решения по каждой роли, ручная проверка, известные ограничения |

## Известные ограничения

- Состояние ошибки списка и «Try again» реализованы, но не проверены: автотеста нет, а переключатель `?mock=sessions-error` в dev не показывает ошибку из-за двойного эффекта React StrictMode.
- Автотестами покрыты только фильтрация и защита от повторной отправки.
- Используется MSW 2.15 вместо 3.x из плана: Vitest 5 совместим только с MSW 2.x.
- `npm run lint` выдаёт одно предупреждение в сгенерированном `public/mockServiceWorker.js`.

Полный список — в разделе «Completion» файла [`workflow-log.md`](tasks/training-sessions/workflow-log.md).
