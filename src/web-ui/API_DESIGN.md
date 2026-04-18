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
  recordsCount: number,
  parserOptions?: Record<string, string | number | boolean | null>
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
  recordsCount: number,
  parserOptions?: Record<string, string | number | boolean | null>
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

## Analytics - Parser Metrics History

### Get available metrics for a parser
```
GET /analyze/parsers/{slug}/available-metrics

Response:
[ 
  { "metric": "temperature", "dimensions": ["city"] },
  { "metric": "humidity", "dimensions": ["city", "sensor_type"] }
]
```

Interpretation:
1. Each item describes one metric and supported dimension keys for filtering
2. `dimensions` can be empty; in that case no dimension filter controls are needed
3. Metric is required for history/stats, dimensions are optional
4. If dimensions are omitted, backend aggregates across all dimension values

### Get available values for a metric dimension
```
GET /analyze/parsers/{slug}/dimension-options?metric=temperature&dimension=city
GET /analyze/parsers/{slug}/dimension-options?metric=temperature&dimension=sensor_type&city=lviv
```

Query Parameters:
  metric (required): Metric name
  dimension (required): Dimension key to inspect, e.g. city
  {dimensionKey} (optional): Additional dimension filters; all filters are ANDed

Response: string[]
[
  "kyiv",
  "lviv",
  "odesa"
]

Rules:
  1. If no additional dimension filters are passed, return all available values for the metric dimension
  2. If multiple dimension filters are passed, apply AND filtering
  3. Only dimension keys supported by the parser should be forwarded by the frontend

### Get parser metric history (time series for charts)
```
GET /analyze/parsers/{slug}/history?metric=temperature&range=week
GET /analyze/parsers/{slug}/history?metric=temperature&from=2026-04-01T00:00:00Z&to=2026-04-08T00:00:00Z&interval=day

Query Parameters:
  metric (required): Name of the metric to retrieve
  range (optional): Preset time range -
    'day' | 'week' | 'month' |
    'quarter' | '3m' | '3-month' | '3 months' |
    'year' | '1y' |
    'all' | 'all-time' | 'all time'
  interval (optional): Aggregation interval - 'hour' | 'day' | 'week' | 'month'
  from (optional): Start date-time (ISO 8601) - used if range is not specified
  to (optional): End date-time (ISO 8601) - used if range is not specified
  {dimensionKey} (optional): Dynamic dimension filters, e.g. city=lviv&sensor_type=outdoor

Response: Array<{ timestamp: string, value: number }>
[
  { timestamp: "2026-04-08T00:00:00Z", value: 25.5 },
  { timestamp: "2026-04-08T01:00:00Z", value: 26.1 }
]

Range Presets:
  - 'day': Last 24 hours
  - 'week': Last 7 days
  - 'month': Last 30 days
  - 'quarter' / '3m' / '3-month' / '3 months': Last 3 months
  - 'year' / '1y': Last 12 months
  - 'all' / 'all-time' / 'all time': Full available period

History interval mapping (recommended defaults):
  - range=quarter => interval=week
  - range=year => interval=month

Rules:
  1. If 'range' is provided, 'from' and 'to' are ignored
  2. If 'range' is not provided, both 'from' and 'to' are required
  3. 'interval' is optional; backend defaults to appropriate interval based on range
  4. Do not mix data from different parser slugs in single request
  5. Timestamps are always returned in ISO 8601 format
  6. Pass selected dimensions as dynamic query keys, not as fixed dimensionKey/dimensionValue fields

### Get parser metric statistics (summary stats)
```
GET /analyze/parsers/{slug}/stats?metric=temperature&range=week
GET /analyze/parsers/{slug}/stats?metric=temperature&from=2026-04-01T00:00:00Z&to=2026-04-08T00:00:00Z

Query Parameters:
  metric (required): Name of the metric to retrieve stats for
  range (optional): Preset time range -
    'day' | 'week' | 'month' |
    'quarter' | '3m' | '3-month' | '3 months' |
    'year' | '1y' |
    'all' | 'all-time' | 'all time'
  interval (optional): Aggregation interval - 'hour' | 'day' | 'week' | 'month'
  from (optional): Start date-time (ISO 8601) - used if range is not specified
  to (optional): End date-time (ISO 8601) - used if range is not specified
  {dimensionKey} (optional): Dynamic dimension filters, e.g. city=lviv&sensor_type=outdoor

Response: ParserMetricStats
{
  count: number,
  min: number,
  max: number,
  average: number,
  firstValue: number,
  lastValue: number,
  delta: number,
  percentChange: number | null,
  firstTimestamp: string | null,
  lastTimestamp: string | null
}

Example Response:
{
  "count": 168,
  "min": 15.2,
  "max": 28.9,
  "average": 22.1,
  "firstValue": 20.5,
  "lastValue": 23.8,
  "delta": 3.3,
  "percentChange": 16.1,
  "firstTimestamp": "2026-04-11T00:00:00Z",
  "lastTimestamp": "2026-04-18T00:00:00Z"
}

Rules:
  1. Same parameters and rules as /history endpoint
  2. For quarter/year ranges, stats only extend period and do not require interval
  3. Returns aggregated statistics, not time-series data
  4. Used for quick summary cards without building charts
  5. Delta = lastValue - firstValue
  6. percentChange = (delta / firstValue) * 100 (null if firstValue is 0)
  7. count = total number of data points in range

Examples:
  - /analyze/parsers/open-weather/history?metric=temperature&range=quarter
  - /analyze/parsers/open-weather/stats?metric=temperature&range=year
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
