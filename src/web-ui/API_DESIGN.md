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
  allowCustomValues: boolean,
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
GET /api/storage/tasks?page=1&pageSize=20&oldFirst=true|false&status=Running|Success|Failed&parserSlug=open-weather&from=2026-04-01T00:00:00Z&to=2026-04-02T00:00:00Z
Response: PagedResponse<ParserTaskItem>
```

ParserTaskItem:
```
{
  correlationId: string,
  parserSlug: string,
  status: "Running" | "Success" | "Failed",
  errorMessage?: string,
  startedAt: string,
  finishedAt: string | null,
  recordsCount: number
}
```

Note: list is composed from MongoDB (finished tasks) + Redis/cache (running tasks not yet persisted).

### Get task status by correlationId
```
GET /api/storage/tasks/status/{correlationId}
Response: {
  correlationId: string,
  parserSlug: string,
  status: "Running" | "Success" | "Failed",
  errorMessage?: string | null,
  startedAt: string,
  finishedAt: string | null,
  recordsCount: number
}
```

---

## Storage - Collected Data

### Get collected data (paginated)
```
GET /api/storage/collected?page=1&pageSize=20&oldFirst=true|false&correlationId={guid?}&configId={guid?}&parserSlug=open-weather&from=2026-04-01T00:00:00Z&to=2026-04-02T00:00:00Z
Response: PagedResponse<DataResultDto>
```

DataResultDto (shape expected by frontend):
```
{
  id: string,
  parserSlug: string,
  correlationId: string | null,
  configId: string | null,
  timestamp: string | null,
  capturedAt: string,
  metrics: Record<string, string | number | boolean | null>
}
```

Notes:
1. `correlationId` and `configId` are optional filters and should work independently.
2. `oldFirst=false` means newest data first (default UI mode).
3. Frontend additionally supports local text search across parser slug, IDs, and metric preview values.

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
7. ✅ **Tasks list = Mongo + Redis** - в одному paged response
8. ✅ **GET /api/storage/tasks/status/{correlationId}** - точковий статус задачі для polling
9. ⏳ **Stop task** - поки немає на бекенді (correlationId може використовуватись як taskId в майбутньому)
