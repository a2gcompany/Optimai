# Optimai - Pueblos + Tools Locales

## WORLD BUGS (URGENTE)
- [x] Arreglar crash cuando Ralph desconectado
- [x] Fallback elegante sin datos
- [x] Asegurar funciona en localhost:3000
- [x] Leer status.json local correctamente

## SUPABASE SCHEMA PUEBLOS
- [x] Crear tabla `pueblos`
- [x] Crear tabla `pueblo_stats`
- [x] Crear tabla `tareas_compartidas`
- [x] Migración SQL lista para ejecutar

## TOOL TAREAS/RECORDATORIOS (LOCAL)
- [x] Script para importar Apple Reminders
- [x] Interfaz visual de tareas
- [x] Integración Claude para priorización
- [x] Sistema de sugerencias AI
- [x] Funciona 100% offline/local

## TOOL FINANZAS (LOCAL)
- [x] Upload CSV extractos
- [x] Parser multi-banco (BBVA, Santander, Revolut)
- [x] Categorización automática AI
- [x] Dashboard de gastos
- [x] Todo local, nada sube a la nube

## WORLD MULTI-PUEBLO
- [ ] Mostrar 3 pueblos en mapa
- [ ] Cada pueblo tiene su Ralph
- [ ] Stats de cada pueblo visibles
- [ ] Caravanas para tareas compartidas
- [ ] País crece con actividad total

## ARQUITECTURA LOCAL
- [x] apps/web corre en localhost:3000
- [x] Lee archivos locales (status.json, logs)
- [ ] Claude como backend de análisis
- [x] Datos sensibles nunca salen del Mac

## MEJORAR RALPH MONITOR
- [x] Mostrar tarea actual en progreso
- [x] Parsear último log de Claude para última acción
- [x] Checklist visual de @fix_plan.md (completadas/pendientes)
- [x] Barra de progreso del plan
- [x] Actualizar ~/.ralph/ralph_monitor.sh
