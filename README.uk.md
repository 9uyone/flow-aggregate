# Flow Aggregate

Мікросервісна платформа збору, зберігання та аналітики даних для дипломного проєкту.

> **⚠️ Основна документація англійською:** [README.md](./README.md) містить повний опис архітектури, microservices, data model та deployment інструкції.  
> **Цей файл** — скорочена українська довідка.

Система побудована навколо універсального ingestion-конвеєра:
- Підключення джерел даних через internal parsers або external push integrations
- Асинхронна обробка через RabbitMQ
- MongoDB для збереження даних + Redis для кешування
- Аналітичний шар: тренди, волатильність, прогноз
- Централізований доступ через API Gateway + React портал

---

## Quick Start (скорочено)

### Передумови
- Docker Desktop (Compose v2)
- Вільні порти: 5050, 5672, 15672, 27017, 6379, 27170

### Setup

```bash
# 1. Налаштування
cp .env.example .env
cp src/web-ui/.env.example src/web-ui/.env
# Заповни JWT__KEY, GOOGLE__CLIENT_ID, GOOGLE__CLIENT_SECRET

# 2. Запуск backend
docker compose up -d --build

# 3. Запуск frontend
cd src/web-ui
npm install
npm run dev
```

**URLs:**
- API: http://localhost:5050
- RabbitMQ: http://localhost:15672
- Mongo Express: http://localhost:27170
- Frontend: http://localhost:5173

- Health dashboard (frontend): http://localhost:5173/health — віджети стану сервісів і перевірки `/health/{service}`

---

## Архітектура (коротко)

**5 мікросервісів (.NET 10):**
1. **Gateway** — маршрутизація (Ocelot)
2. **Auth** — Google OAuth2 + JWT
3. **Collector** — запуск парсерів + external ingest
4. **Storage** — центральний стан + історичні дані
5. **Analyze** — тренди, волатильність, прогнози
6. **Scheduler** — Hangfire для планування задач

**Messaging:** RabbitMQ + MassTransit  
**Data:** MongoDB + Redis (cache)

---

## Ключові можливості

✅ **Dynamic Plugins** — завантаження зовнішніх parser DLL без переоборки  
✅ **Dimension Filters** — багатовимірні зрізи через metadata  
✅ **Analytics Suite** — trend (OLS), volatility, forecast  
✅ **BI-Ready** — MongoDB структурована для Metabase  
✅ **AI Insights** — OpenAI gpt-4o-mini інтеграція для аналітики

---

## Структура проєкту

```
src/
├── server/
│   ├── Gateway/           — Ocelot API Gateway
│   ├── Auth/              — Google OAuth2 + JWT
│   ├── Collector/         — Parser execution + ingest
│   ├── Storage/           — Central state + data persistence
│   ├── Analyze/           — Analytics layer
│   ├── Scheduler/         — Hangfire + recurring jobs
│   └── Common/            — Shared interfaces & entities
└── web-ui/               — React 19 + TypeScript + Vite + MUI
```

---

## Deployment

Див. **[README.md § Deployment](./README.md#deployment-docker-compose)** для повних інструкцій.

Коротко:
```bash
docker compose up -d --build
```

---

## Документація

- **[Основна документація](./README.md)** — Full architecture, data model, microservices (АНГЛІЙСЬКА)
- **[Web UI Setup](./src/web-ui/src/README.md)** — Auth flow, folder structure
- **[Design System](./src/web-ui/src/theme/README.md)** — Theme tokens, component guidelines

---

## Статус

Проєкт демонструє production-like архітектуру з:
- Модульним ingestion даних
- Асинхронною оркестрацією (RabbitMQ)
- Керованими конфігураціями парсерів
- Dimension-based аналітикою
- Готовністю до розширення (BI, AI)

Це не просто набір парсерів, а **extensible data platform** для дипломного захисту.

---

**👉 [Читай основну документацію англійською](./README.md)** — там повний опис архітектури, data model, мікросервісів, та всього іншого!
