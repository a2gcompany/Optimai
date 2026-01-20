# Optimai

Centro de control personal - Asistente AI via Telegram con gestión de tareas y finanzas.

## Stack

- **Monorepo**: Turborepo con pnpm workspaces
- **Apps**: Next.js 14 con App Router
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4o
- **Bot**: Telegram Bot API

## Estructura

```
optimai/
├── apps/
│   ├── web/          # Dashboard web (puerto 3000)
│   ├── core/         # Bot Telegram + AI Brain (puerto 3001)
│   └── finance/      # Gestión financiera (puerto 3002)
├── packages/
│   ├── types/        # Tipos TypeScript compartidos
│   ├── db/           # Cliente Supabase y repositorios
│   └── ai/           # Cliente OpenAI y funciones
└── docs/
```

## Apps

### @optimai/web (Puerto 3000)
Dashboard web con:
- Métricas de tareas, finanzas y recordatorios
- Lista de tareas con estados y prioridades
- Últimas transacciones con categorías
- Recordatorios próximos

### @optimai/core (Puerto 3001)
Bot de Telegram con:
- Webhook seguro con validación
- Brain AI con function calling
- Gestión de tareas y recordatorios
- Cron jobs para notificaciones

### @optimai/finance (Puerto 3002)
Gestión financiera con:
- Parser CSV con auto-detección de formato
- Presets para bancos (BBVA, Santander, Revolut, Wise)
- Categorizador AI con aprendizaje
- CRUD de transacciones

## Packages

### @optimai/types
Tipos TypeScript para:
- Telegram (User, Message, Update, Webhook)
- AI/Brain (Messages, Actions, Context)
- Database (User, Task, Reminder, Transaction)
- Finance (Category, Budget, Summary)
- API (Response, Error, Pagination)

### @optimai/db
- Cliente Supabase configurado
- Repositorios: Users, Tasks, Reminders, Transactions, Categories

### @optimai/ai
- Cliente OpenAI configurado
- Completions con y sin streaming
- Function calling
- Embeddings

## Setup

```bash
# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar con tus claves de Supabase, OpenAI y Telegram

# Desarrollo
pnpm dev

# Build
pnpm build

# Lint
pnpm lint
```

## Variables de entorno

```env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# OpenAI
OPENAI_API_KEY=sk-xxx

# Telegram
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_WEBHOOK_SECRET=xxx
ALLOWED_TELEGRAM_USER_IDS=123,456

# URLs (para apps/web)
NEXT_PUBLIC_CORE_API_URL=http://localhost:3001
NEXT_PUBLIC_FINANCE_API_URL=http://localhost:3002
```

## Comandos

```bash
# Desarrollo de todas las apps
pnpm dev

# Solo una app
pnpm --filter @optimai/web dev
pnpm --filter @optimai/core dev
pnpm --filter @optimai/finance dev

# Build de producción
pnpm build

# Type checking
pnpm type-check

# Linting
pnpm lint
```
