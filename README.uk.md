# Flow Aggregate

![.NET 10](https://img.shields.io/badge/.NET-10-512BD4?logo=dotnet&logoColor=white)
![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=0B1220)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![RabbitMQ](https://img.shields.io/badge/RabbitMQ-AMQP-FF6600?logo=rabbitmq&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-8-47A248?logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?logo=redis&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-gpt--4o--mini-412991?logo=openai&logoColor=white)
![License MIT](https://img.shields.io/badge/License-MIT-22C55E)

Flow Aggregate — це мікросервісна платформа для збору, нормалізації, зберігання та інтерпретації часових рядів із різнорідних джерел. Проєкт створено як дипломну роботу, але архітектурно він наслідує production-підхід: API Gateway, асинхронна взаємодія через брокер повідомлень, ізольовані сервіси, health checks, OAuth2, планувальник задач, plugin extensibility та AI-assisted analytics.

> **⚠️ Основна документація англійською:** [README.md](./README.md) містить повний технічний опис, Mermaid-діаграми, deployment flow та детальний розбір сервісів.  
> **Цей файл** — синхронізована українська довідкова версія.

## Що робить платформа

- Виконує internal parsers вручну або за розкладом.
- Приймає external push ingest від сторонніх систем.
- Оркеструє асинхронні процеси через RabbitMQ.
- Зберігає операційний стан і історичні виміри в MongoDB.
- Використовує Redis для кешу, швидкого статусу задач та аналітичних hot-path read.
- Надає єдиний React-портал для auth, parser management, history, charts та health monitoring.

> **💡 Pro Tip:** У репозиторії є два режими запуску frontend:
> `docker compose up` піднімає контейнерний UI на `http://localhost:3000`, а `npm run dev` у `src/web-ui` запускає Vite dev server на `http://localhost:5173`.

## Quick Start

### Передумови

- Docker Desktop з Compose v2
- Node.js 20+ і npm 10+ для локальної розробки frontend
- Вільні порти: `3000`, `5050`, `5672`, `15672`, `27017`, `6379`, `27170`, `5173`
- Google OAuth client
- OpenAI API key, якщо потрібні AI insights

### 1. Скопіюй env-шаблони

```bash
cp .env.example .env
cp src/web-ui/.env.example src/web-ui/.env
```

PowerShell:

```powershell
Copy-Item .env.example .env
Copy-Item src/web-ui/.env.example src/web-ui/.env
```

### 2. Заповни критичні змінні

У `.env`:

- `JWT__KEY`: секрет для підпису JWT access/refresh token. Рекомендовано 32+ символів.
- `GOOGLE__CLIENT_ID`: Google OAuth client ID, який перевіряє `AuthService`.
- `GOOGLE__CLIENT_SECRET`: Google OAuth client secret.
- `OpenAI__ApiKey`: серверний ключ для викликів OpenAI з `AnalyzeService`.

У `src/web-ui/.env`:

- `VITE_GOOGLE_CLIENT_ID`: browser-side Google OAuth client ID для React login flow.
- `VITE_API_BASE_URL`: базовий URL gateway API. Для локального запуску через Docker використовуй `http://localhost:5050/api`.

> **⚠️ Important:** `VITE_GOOGLE_CLIENT_ID` має відповідати тому самому Google OAuth app, що використовується backend. Для Vite потрібно додати origin `http://localhost:5173`, а для контейнерного frontend — `http://localhost:3000`.

### 3. Запусти backend + контейнерний frontend

```bash
docker compose up -d --build
```

Корисні URL:

- API Gateway: `http://localhost:5050`
- Frontend: `http://localhost:3000`
- RabbitMQ Management: `http://localhost:15672`
- Mongo Express: `http://localhost:27170`

### 4. Запусти frontend у Vite dev mode

```bash
cd src/web-ui
npm install
npm run dev
```

Vite UI буде доступний на `http://localhost:5173`.

Рекомендоване значення `src/web-ui/.env`:

```env
VITE_API_BASE_URL=http://localhost:5050/api
```

### 5. Перевір роботу системи

- Увійди через Google OAuth.
- Відкрий health page у UI.
- Запусти parser вручну або активуй scheduler-конфігурацію.
- Переконайся, що події проходять через RabbitMQ, а історія та charts з’являються в порталі.

## Архітектура

Архітектура розділяє ingress, orchestration, persistence, analytics, auth і presentation на окремі зони відповідальності. Ocelot централізує public routing, RabbitMQ переносить асинхронні події, а сервіси взаємодіють через контракти, а не через спільну базу напряму.

Основні ролі:

- **Gateway-first ingress** для єдиної точки входу.
- **Event-driven choreographies via AMQP** для слабкого зв’язування між сервісами.
- **Heterogeneous polyglot persistence** через MongoDB + Redis.
- **Read-path isolation**: Analyze читає дані через internal Storage API, а не дублює persistence.
- **Runtime extensibility** через `plugins_data` і динамічне завантаження parser DLL.

## Мікросервіси

### Gateway

Ocelot API Gateway приховує внутрішню топологію сервісів і надає єдину public API surface для React portal та майбутніх інтеграцій.

### Auth Service

- Валідує Google ID token.
- Видає JWT access token і refresh token.
- Підтримує token refresh для sliding-session UX.
- Працює з профілями користувачів і станом авторизації.

### Collector Service

- Виконує internal parsers.
- Динамічно завантажує external plugin DLL із `plugins_data`.
- Публікує parser catalog через RabbitMQ.
- Приймає external push ingest через `/collector/ingest`.
- Генерує `DataCollectedEvent` і parser status events з `CorrelationId`.

### Storage Service

- Споживає події з RabbitMQ та зберігає історичні дані.
- Є системою запису для parser definitions, user configs і execution logs.
- Надає aggregation endpoints для history, metrics, stats та dimension options.
- Об’єднує durable history з MongoDB і live-state з Redis.

### Analyze Service

- Отримує канонічні time-series дані зі Storage internal API.
- Обчислює deterministic analytics: trend, volatility, forecast, descriptive statistics.
- Кешує короткоживучі результати в Redis.
- Генерує AI summary лише після побудови математичного контексту.

### Scheduler Service

- Синхронізує активні parser-конфігурації.
- Перетворює cron/schedule налаштування у recurring jobs.
- Публікує `RunParserEvent` у RabbitMQ.

## Analyze Service: детермінована аналітика до OpenAI

Сильна сторона Flow Aggregate в тому, що OpenAI тут не використовується як калькулятор. Спочатку платформа рахує строгий deterministic analytics context, а вже потім передає його в LLM для природномовної інтерпретації.

### Метрики, які обчислюються до виклику OpenAI

- **Ordinary Least Squares (OLS) linear trend**: slope та intercept по впорядкованому часовому ряду.
- **Coefficient of Determination (R²)**: якість лінійної апроксимації.
- **Volatility via Coefficient of Variation (CV)**: відносна мінливість через нормалізоване стандартне відхилення.
- **Momentum evaluation using adaptive time-windows**: порівняння recent slope проти past slope для класифікації accelerating, decelerating або stable.
- **Descriptive statistics**: average, min, max, first value, last value, median, Q1, Q3, delta from average і percent change.
- **Interquartile spread analysis**: квартилі дають основу для IQR-oriented reasoning і robust spread analysis.
- **Forecast generation**: прогноз на конфігурований horizon на основі fitted linear trend.
- **3-sigma anomaly detection**: перед формуванням AI context система позначає останнє значення як аномальне, якщо воно виходить за межі трьох стандартних відхилень від середнього baseline, що краще зменшує кількість хибних спрацювань, ніж м’якший поріг `2σ`.

## Frontend Portal

Frontend знаходиться в `src/web-ui` і є операторською консоллю платформи. Він побудований на **React 19**, **TypeScript**, **Vite**, **Material UI**, **TanStack Query**, **Zustand** та **MUI X Charts**.

### Що реалізовано у UI

- Google OAuth login, який переходить у backend-issued JWT/refresh session.
- Dashboard pages для overview, metrics, history, parser management і analytics.
- Health monitoring page з опитуванням health endpoints.
- Chart-based visualization для trend, volatility, forecast та historical series.
- Dimension-aware filters для metadata slices.

### Інженерні деталі frontend

- **Vite** забезпечує швидкий DX і production build pipeline.
- **Zustand** відповідає за легковаговий global state для auth, parsers, health та UI.
- **Axios interceptors** автоматично підставляють Bearer token і запускають queued refresh flow при конкурентних `401`.
- **JWT sliding-expiration UX** реалізовано через `sessionStorage` для access token і persist auth state для refresh token/user.
- **MUI X Charts** використовується для high-performance data visualization.

### Команди frontend

```bash
cd src/web-ui
npm install
npm run dev
npm run build
npm run lint
npm run preview
```

## Конфігурація

### Backend `.env`

| Змінна | Обов’язково | Призначення |
|---|---|---|
| `JWT__KEY` | Так | Секрет підпису JWT access/refresh token. |
| `JWT__ISSUER` | Бажано | Ідентифікатор issuer у токенах. |
| `JWT__AUDIENCE` | Бажано | Ідентифікатор audience для валідації токенів. |
| `JWT__AT_LIFETIME_HOURS` | Бажано | Тривалість access token у годинах. |
| `JWT__RT_LIFETIME_DAYS` | Бажано | Тривалість refresh token у днях. |
| `GOOGLE__CLIENT_ID` | Так | Google OAuth client ID для backend verification flow. |
| `GOOGLE__CLIENT_SECRET` | Так | Google OAuth client secret. |
| `MONGO__DB` | Бажано | Назва основної MongoDB бази. |
| `MONGO__ROOT_USER` | Так | Адміністративний користувач MongoDB для локального compose. |
| `MONGO__ROOT_PASS` | Так | Пароль адміністративного користувача MongoDB. |
| `ConnectionStrings__Mongo` | Так | MongoDB connection string для сервісів. |
| `RABBITMQ__HOST` | Так | Hostname RabbitMQ усередині compose network. |
| `RABBITMQ__USER` | Так | Користувач RabbitMQ. |
| `RABBITMQ__PASS` | Так | Пароль RabbitMQ. |
| `REDIS__HOST` | Так | Hostname Redis. |
| `REDIS__PORT` | Так | Redis port mapping і connection port. |
| `REDIS__PASS` | Так | Пароль Redis. |
| `HANGFIRE__USER` | Бажано | Username для Hangfire dashboard, якщо його експонувати. |
| `HANGFIRE__PASS` | Бажано | Password для Hangfire dashboard, якщо його експонувати. |
| `OpenAI__ApiKey` | Необов’язково, але потрібно для AI insights | Серверний ключ для викликів OpenAI з AnalyzeService. |

### Frontend `src/web-ui/.env`

| Змінна | Обов’язково | Призначення |
|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Так | Google OAuth client ID, який передається у браузер для React login flow. |
| `VITE_API_BASE_URL` | Так | Базовий URL gateway API, зазвичай `http://localhost:5050/api` для локальної розробки. |

## Deployment

### Стандартний локальний запуск

```bash
docker compose up -d --build
```

Це піднімає:

- Gateway на `5050:8080`
- Frontend на `3000:80`
- RabbitMQ на `5672`
- RabbitMQ Management на `15672`
- MongoDB на `27017`
- Redis на `${REDIS__PORT}:6379`

### Azure-style port mapping

```bash
docker compose -f docker-compose.yml -f docker-compose.azure.yml up -d --build
```

У цьому режимі Gateway буде доступний на `http://localhost:80`.

## API Surface

Public routes через Gateway:

- `/api/auth/*` — auth і token lifecycle
- `/api/collector/*` — parser execution та external ingest
- `/api/storage/*` — parser configs і historical data
- `/api/analyze/*` — deterministic analytics та AI summaries

Internal routes:

- `/internal/storage/*` — міжсервісне читання для Analyze та orchestration flows

## BI Layer

Metabase не входить до compose stack у цьому репозиторії, але архітектура вже BI-ready:

- Історичні виміри зберігаються у стабільній документній структурі.
- Події містять `parserSlug`, `metric`, `capturedAt` і metadata dimensions для slicing.
- `execution_logs` придатні для operational dashboards: success rate, latency, error trends.

Рекомендований шлях:

1. Підняти Metabase окремо.
2. Підключити MongoDB як data source.
3. Побудувати dashboards над `collected_data` і `execution_logs`.

## Project Structure

```text
src/
├── server/
│   ├── Gateway/             # Ocelot API Gateway
│   ├── AuthService/         # Google OAuth2 + JWT
│   ├── CollectorService/    # Parser execution and push ingest
│   ├── StorageService/      # Durable state and historical data
│   ├── AnalyzeService/      # Deterministic analytics + AI summaries
│   ├── SchedulerService/    # Hangfire recurring orchestration
│   └── Common/              # Shared contracts and abstractions
└── web-ui/                  # React 19 + TypeScript + Vite portal
```

Додатково:

- `plugins_data/` — external parser assemblies для Collector.
- `docs/` — зображення та візуальні assets для README.

## Статус

Flow Aggregate демонструє:

- Модульний ingestion даних з internal parsers і external push integrations.
- Асинхронну оркестрацію через RabbitMQ та MassTransit.
- Керований parser lifecycle із schedule-aware execution.
- Dimension-based analytics поверх гнучкої event document model.
- AI-assisted summaries, побудовані на deterministic calculations.
- Архітектуру, готову до подальшого розвитку в бік BI, alerting і plugin ecosystem.

Для дипломного захисту це не просто набір парсерів, а повноцінна **extensible data platform** з переконливою production-style архітектурою.

---

**[English documentation](./README.md)** — повна версія з розгорнутими поясненнями та Mermaid-діаграмами.
