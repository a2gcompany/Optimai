# Optimai

Centro de Control Personal de Aitzol - Asistente AI via Telegram con gestión de tareas, finanzas y recordatorios.

## Stack

- **Monorepo**: Turborepo con pnpm workspaces
- **Apps**: Next.js 14 con App Router
- **Styling**: Tailwind CSS + Lucide React
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4o + Claude (opcional)
- **Bot**: Telegram Bot API

## Estructura

```
optimai/
├── apps/
│   ├── web/          # Dashboard web (puerto 3000)
│   ├── core/         # Bot Telegram + AI Brain (puerto 3001)
│   ├── finance/      # Gestión financiera (puerto 3002)
│   └── cli/          # CLI para uso local
├── packages/
│   ├── types/        # Tipos TypeScript compartidos
│   ├── db/           # Cliente Supabase y repositorios
│   └── ai/           # Cliente OpenAI y funciones
├── scripts/          # Scripts de utilidad
└── supabase/         # Migraciones SQL
```

## Quick Start

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus claves

# 3. Desarrollo
pnpm dev

# 4. Abrir en el navegador
# http://localhost:3000
```

## Apps

### @optimai/web (Puerto 3000)

Dashboard web con:
- **Dashboard**: Métricas de tareas, finanzas y recordatorios
- **Tareas**: CRUD completo con prioridades, estados y búsqueda
- **Finanzas**: Registro de ingresos/gastos con categorías
- **Recordatorios**: Gestión con recurrencia
- **Ideas**: Backlog con votación y estados

### @optimai/core (Puerto 3001)

Bot de Telegram con:
- **Webhook seguro** con validación de secreto
- **Brain AI** con function calling
- **Comandos**:
  - `/start` - Bienvenida y ayuda
  - `/tareas` - Ver tareas pendientes
  - `/balance` - Resumen financiero
  - `/gastos` - Últimos gastos
  - `/recordatorios` - Ver recordatorios
  - `/nueva [título]` - Crear tarea rápida
  - `/ayuda` - Ver todos los comandos
- **Lenguaje natural**: "Recuérdame llamar al banco mañana"

### @optimai/finance (Puerto 3002)

Gestión financiera con:
- Parser CSV con auto-detección de formato
- Presets para bancos: BBVA, Santander, Revolut, Wise
- Categorizador AI con aprendizaje
- CRUD de transacciones

### @optimai/cli

Herramientas de línea de comandos:
- `optimai init` - Inicializar configuración
- `optimai serve` - Servidor local
- `optimai import [archivo]` - Importar tareas

## Packages

### @optimai/types
Tipos TypeScript para todo el proyecto.

### @optimai/db
Cliente Supabase con repositorios:
- UsersRepository
- TasksRepository
- RemindersRepository
- TransactionsRepository
- CategoriesRepository
- ConversationsRepository

### @optimai/ai
- Cliente OpenAI configurado
- Completions con/sin streaming
- Function calling para acciones
- Embeddings para categorización

## Configuración

### Variables de Entorno

Copia `.env.example` a `.env.local` y configura:

```env
# Supabase (obligatorio)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx

# OpenAI (obligatorio para el bot)
OPENAI_API_KEY=sk-xxx

# Telegram (obligatorio para el bot)
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_WEBHOOK_SECRET=xxx
ALLOWED_TELEGRAM_USER_IDS=123456789
```

### Configurar Webhook de Telegram

```bash
# Usando el script incluido
node scripts/setup-telegram-webhook.mjs

# O manualmente
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://tu-dominio.com/api/telegram/webhook" \
  -d "secret_token=<WEBHOOK_SECRET>"
```

## Comandos

```bash
# Desarrollo de todas las apps
pnpm dev

# Solo una app
pnpm -F @optimai/web dev
pnpm -F @optimai/core dev
pnpm -F @optimai/finance dev

# Build de producción
pnpm build

# Type checking
pnpm type-check
```

## Deploy a Vercel

1. Conecta el repositorio a Vercel
2. Configura las variables de entorno
3. El deploy es automático desde `main`

Para el bot de Telegram, después del deploy:
1. Configura el webhook con la URL de Vercel
2. Añade el `TELEGRAM_WEBHOOK_SECRET`

## Arquitectura

### Flujo del Bot

```
Telegram → Webhook → Validación → Brain AI → Acción → Respuesta
```

### Flujo de Transacciones

```
CSV Upload → Parser → Categorización AI → Base de datos
```

## Desarrollo

```bash
# Crear nuevo package
mkdir packages/nuevo
cd packages/nuevo
pnpm init

# Añadir dependencia entre packages
pnpm -F @optimai/core add @optimai/db@workspace:*
```

## Licencia

Privado - Uso exclusivo de A2G Company
