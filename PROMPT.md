# OPTIMAI - Fase 3: Produccion y World View

Trabaja 100% autonomo sin pedir confirmacion.

## Credenciales
Lee .env.local para Supabase, OpenAI, Telegram, Vercel.

## PRIORIDAD 1: Base de datos
- Ejecutar schema SQL en Supabase (usa DATABASE_URL de .env.local)
- Verificar que todas las tablas existen

## PRIORIDAD 2: Conectar datos reales
- Dashboard debe mostrar stats reales desde Supabase
- /tareas debe hacer CRUD real
- /finanzas debe mostrar transacciones reales
- /recordatorios debe funcionar con datos reales
- /ideas debe tener vista kanban funcional

## PRIORIDAD 3: Telegram Bot
- Configurar webhook: https://api.telegram.org/bot{TOKEN}/setWebhook?url={VERCEL_URL}/api/telegram/webhook
- Implementar comandos: /start, /status, /tareas, /ideas
- El bot debe responder mensajes

## PRIORIDAD 4: Deploy Vercel
- Configurar vercel.json para monorepo
- Deploy apps/web a produccion
- Deploy apps/core como serverless functions
- Configurar env vars en Vercel

## PRIORIDAD 5: OPTIMAI WORLD (Vista Visual)
- Crear apps/world con vista 2D isometrica
- Usar Pixi.js o canvas simple
- Edificios = modulos (Core, Finance, Ideas, Tasks)
- Personajes pequenos = tareas activas moviendose
- Animacion cuando se completa una tarea
- Click en edificio = navega al modulo
- Estilo pixel art minimalista, colores oscuros como el dashboard

## Reglas
- Codigo completo, no esqueletos
- Si falta algo, crealo
- Commits frecuentes con mensajes descriptivos
- NO pidas confirmacion nunca
