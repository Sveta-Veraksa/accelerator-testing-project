# accelerator-testing-project

Технический каркас приложения на React + TypeScript + Vite.

## Требования

- Node.js 24+
- npm 11+

## Скрипты

| Команда           | Описание                                  |
| ----------------- | ----------------------------------------- |
| `npm install`     | Установка зависимостей                    |
| `npm run dev`     | Dev-сервер с HMR (http://localhost:5173)  |
| `npm run build`   | Проверка типов (`tsc -b`) и сборка в `dist` |
| `npm run preview` | Локальный просмотр production-сборки      |
| `npm run lint`    | Линтинг (ESLint)                          |

## Структура

```
public/            статические файлы
src/
  main.tsx         точка входа
  App.tsx          корневой компонент
  index.css        глобальные стили
index.html         HTML-шаблон Vite
vite.config.ts     конфигурация Vite
eslint.config.js   конфигурация ESLint
tsconfig*.json     конфигурация TypeScript
```
