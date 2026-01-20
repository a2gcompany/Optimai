# Optimai - Tareas

## FASE 1: ESTRUCTURA
- [ ] Inicializar monorepo con Turborepo
- [ ] Crear package.json raíz con workspaces
- [ ] Crear packages/types con todos los tipos TypeScript
- [ ] Crear packages/db con cliente Supabase y queries
- [ ] Crear packages/db/src/schema.sql con todas las tablas
- [ ] Crear packages/ai con cliente OpenAI y prompts

## FASE 2: CORE
- [ ] Crear apps/core con Next.js 14
- [ ] Implementar apps/core/src/lib/telegram.ts
- [ ] Implementar apps/core/src/lib/brain.ts
- [ ] Implementar apps/core/src/lib/agent.ts
- [ ] Implementar apps/core/src/app/api/telegram/webhook/route.ts
- [ ] Implementar apps/core/src/app/api/agent/cron/route.ts
- [ ] Implementar apps/core/src/app/api/inbound/route.ts
- [ ] Crear apps/core/vercel.json con cron config
- [ ] Crear apps/core/src/app/page.tsx

## FASE 3: FINANCE
- [ ] Crear apps/finance con Next.js 14
- [ ] Implementar apps/finance/src/lib/parser.ts para CSV
- [ ] Implementar apps/finance/src/lib/categorizer.ts con AI
- [ ] Implementar apps/finance/src/lib/analytics.ts
- [ ] Implementar apps/finance/src/app/api/upload/route.ts
- [ ] Implementar apps/finance/src/app/api/report/route.ts

## FASE 4: WEB
- [ ] Crear apps/web con Next.js 14
- [ ] Implementar dashboard en apps/web/src/app/page.tsx con stats cards

## FASE 5: CONFIG FINAL
- [ ] Crear turbo.json en raíz
- [ ] Crear .env.example con todas las variables
- [ ] Crear README.md con instrucciones
- [ ] Ejecutar npm install
- [ ] Verificar que npm run build funciona
