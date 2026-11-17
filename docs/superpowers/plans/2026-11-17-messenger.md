# Messenger Workshop Implementation Plan

> **For agentic workers:** use superpowers:executing-plans; implement in the existing isolated cloud checkout.

**Goal:** работающий русскоязычный командный воркшоп с серверным сохранением.
**Architecture:** React/TypeScript + Express/SQLite, SSE, серверные роли и версии полей.
**Tech Stack:** Node 24, React, Vite, Express, Zod, Playwright, node:test.
**Spec:** docs/superpowers/specs/2026-11-17-messenger-design.md; docs/game-spec.md.

## Global Constraints
- Только единый мессенджер; 7 основных заданий + вводная и финал.
- 30 минут; 8 критериев; порог 2; 2 метрики принятия.
- Не менять исходные материалы; не использовать localStorage для ответов.

## Review Focus
- Утечка ответов/приглашений между командами: API isolation test.
- Параллельные записи одного поля: 409 без потери сохранённого ответа.
- Перезапуск: ответы, роли, таймер и сессии восстанавливаются из SQLite.
- Незавершённые ответы: экспорт помечает пробелы, не подставляет идеальный план.
- Истечение таймера/потеря сети: общий серверный отсчёт, reconnect и явные ошибки.

### Task 1: Методология и итоговый план
Files: shared/content.ts, shared/model.ts, tests/model.test.ts.
Interface: evaluateStage(stage, answers), buildPlan(answers), fieldSchema.
- [x] Написать тесты восьми критериев и порога 2, тайминга и экспорта реального маршрута.
- [x] Запустить тесты, увидеть отсутствие реализации.
- [x] Реализовать контент, проверку и 20 разделов плана.
- [x] Проверить node test через tsx.

### Task 2: Совместная работа
Files: server/store.ts, server/app.ts, server/index.ts, tests/api.test.ts.
Interface: createApp({dbPath}), HTTP API rooms/join/state/answers/comments/members/timer/events/export.
- [x] Написать тесты создания, полномочий, изоляции, CAS, SSE и восстановления БД.
- [x] Запустить до реализации; реализовать API и транзакционное хранение.
- [x] Прогнать весь набор и исправить ошибки.

### Task 3: Пользовательский сценарий
Files: src/App.tsx, src/components.tsx, src/Stages.tsx, src/styles.css, tests/workshop.spec.ts.
Interface: cookie-auth API, SSE state snapshots; поля сохраняются индивидуально.
- [x] Написать browser-тест создания/приглашения/прохождения/экспорта.
- [x] Реализовать вход, рабочий стол 9 экранов, панель ведущего и журнал.
- [x] Проверить desktop/mobile, роли и синхронизацию двух браузеров.

### Task 4: Поставка
Files: README.md (добавить инструкции), docs/deployment.md, Dockerfile, compose.yaml, .gitignore.
- [x] Собрать production, запустить и выполнить функциональный запрос.
- [x] Прогнать typecheck, unit/API/browser, audit.
- [x] Сохранить проверенные install_script/start_skill в черновик среды.
- [x] Проверить diff, подготовить Git-изменения и сообщить ограничения публикации.


## Результат исполнения

Исполнено в существующей изолированной облачной рабочей копии, без отдельного worktree. Пользователь поручил полную реализацию и подготовку для GitHub; дополнительное согласование технологических вариантов не требовалось. Выбор исполнителя: один Node-процесс + SQLite вместо внешнего PostgreSQL; цена ограничения — для нескольких реплик потребуется миграция БД/шины.

Проверено: npm ci, 13 unit/API-тестов, production build с проверкой типов, 4 браузерных теста, npm audit. Независимое read-only ревью: проблема SSE после завершения сессии исправлена, регрессии logout/expiry сначала воспроизведены тестами. Два замечания об исправлении ответов (скрытые кандидаты при отказе от чемпионов, очистка select) устранены с RED→GREEN тестами. Отложенных замечаний нет.

Вне доказанного: внешние DNS/HTTPS/прокси и корпоративный SSO; человеческий хронометраж воркшопа. Тайминг структуры и серверный отсчёт проверены, фактический 30-минутный воркшоп с людьми не проводился. Docker проверен отдельно, включая перезапуск постоянного тома. CI-файл добавлен, запуск GitHub Actions будет выполнен после сохранения в GitHub.
