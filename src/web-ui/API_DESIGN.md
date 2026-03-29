# Backend API Design

## Storage - Parser Configurations

### Get all configs (paginated)
```
GET /api/storage/configs?page=1&pageSize=20&type=internal|external&enabled=true|false
Response: PagedResponse<InternalParserConfig | ExternalParserConfig>
```

### Get config by ID
```
GET /api/storage/configs/{configId}
Response: InternalParserConfig | ExternalParserConfig
```

### Create internal parser config
```
POST /api/storage/configs/internal
Body: {
  parserSlug: string,
  isEnabled?: boolean,
  customName?: string,
  cronExpression: string,
  options?: Record<string, string>
}
Response: 200 OK
```

### Create external parser config
```
POST /api/storage/configs/external
Body: {
  parserSlug: string,
  isEnabled?: boolean
}
Response: 200 OK { token: string }
```

### Update config (partial)
```
PATCH /api/storage/configs/{configId}
Body: {
  isEnabled?: boolean,
  cronExpression?: string,  // internal only
  options?: Record<string, string>  // internal only
}
Response: 204 No Content
```

### Delete config
```
DELETE /api/storage/configs/{configId}
Response: 204 No Content
```

### Run saved config (internal only)
```
POST /api/storage/configs/{configId}/run
Response: 202 Accepted { correlationId: string }
```

---

## Collector - Parser Catalog & Execution

### Get all available parsers
```
GET /api/collector/parsers
Response: ParserCatalogItem[]
```

### Get parser details with parameters
```
GET /api/collector/parsers/{slug}
Response: ParserDetailsResponse
{
  slug: string,
  displayName: string,
  description: string,
  sourceType: "internal" | "plugin" | "external",
  metricFields: string[],
  parameters: ParserParameterDefinition[]
}
```

ParserParameterDefinition:
```
{
  name: string,
  description: string,
  isRequired: boolean,
  options: Array<{ value: string, label: string }>
}
```

### Run parser by slug (ad-hoc run without config)
```
POST /api/collector/run/{slug}
Body: { options?: Record<string, string> }
Response: 202 Accepted { correlationId: string }
```

---

## Storage - Tasks (Execution History)

### Get all tasks (paginated)
```
GET /api/storage/tasks?page=1&pageSize=20&status=Running|Success|Failed&slug=weather
Response: PagedResponse<ParserTaskItem>
```

### Get task by ID
```
GET /api/storage/tasks/{taskId}
Response: ParserTaskItem
```

### Get task logs
```
GET /api/storage/tasks/{taskId}/logs
Response: { logs: string, errorMessage?: string }
```

---

## Storage - Stats & Analytics

### Get overall stats
```
GET /api/storage/stats?from=2024-01-01&to=2024-12-31
Response: OverallStatsResponse
{
  totalRecords: number,
  activeParsers: number,
  successRate: number,
  runsTotal: number,
  runsByStatus: { Running, Success, Failed, PartialSuccess }
}
```

### Get stats for specific parser
```
GET /api/storage/stats/{slug}?from=2024-01-01&to=2024-12-31
Response: ParserStatsResponse
{
  slug: string,
  totalRuns: number,
  successRate: number,
  averageRecords: number,
  lastRunAt: string
}
```

---

## Storage - Metrics (для графиків)

### Get metric history (time series)
```
GET /api/storage/metrics/{slug}/history?metric=recordsCount&from=2024-01-01&to=2024-12-31&interval=hour|day
Response: Array<{ timestamp: string, value: number }>
```

### Get latest metric value
```
GET /api/storage/metrics/{slug}/latest?metric=recordsCount
Response: { timestamp: string, value: number }
```

---

## Ключові особливості API:

1. ✅ **POST /api/collector/run/{slug}** - slug в URL (відповідає бекенду)
2. ✅ **GET /api/storage/configs/{configId}** - по ID, не по slug (slug не унікальний)
3. ✅ **Два створюючі ендпоінти:**
   - `POST /api/storage/configs/internal` - для запланованих парсерів (cron)
   - `POST /api/storage/configs/external` - для API ingestion (повертає token)
4. ✅ **PATCH** замість PUT - часткове оновлення конфігів
5. ✅ **POST /api/storage/configs/{configId}/run** - окремий endpoint для запуску збереженого конфігу
6. ✅ **CustomName** - можливість давати власні назви конфігам
7. ⏳ **Stop task** - поки немає на бекенді (correlationId може використовуватись як taskId в майбутньому)
