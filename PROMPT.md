# OPTIMAI - Arquitectura Pueblos + Tools Locales

Trabaja 100% autónomo sin pedir confirmación.

## CONTEXTO IMPORTANTE
OptimAI es un "país" con 3 "pueblos" (usuarios: Aitzol, Alvaro, Sergi).
- Datos sensibles = LOCAL (nunca suben a la nube)
- Datos compartidos = Supabase (tareas colaborativas, estado pueblos)
- Cada tool es una INTERFAZ VISUAL de un proceso local con Claude analizando

## PRIORIDAD 1: Arreglar World
- World está bugeado cuando Ralph está desconectado
- Debe mostrar fallback elegante si no hay datos
- Debe funcionar 100% en local (localhost:3000)
- Leer status.json y ralph.log del proyecto actual

## PRIORIDAD 2: Arquitectura Multi-Pueblo
En Supabase crear schema para:
- `pueblos` (id, nombre, owner_id, created_at)
- `pueblo_stats` (pueblo_id, energy, coins, tasks_completed, updated_at)
- `tareas_compartidas` (id, titulo, pueblos_involucrados[], estado)
- Cada pueblo puede ver el estado de los otros (solo stats públicas)

## PRIORIDAD 3: Tool Tareas/Recordatorios (LOCAL)
- Importar desde Apple Reminders (usar AppleScript o shortcuts)
- Mostrar en interfaz visual bonita
- Claude analiza y sugiere priorización
- Ayuda con decisión de qué ejecutar primero
- TODO corre en LOCAL, la web es solo visualización

## PRIORIDAD 4: Tool Finanzas (LOCAL)
- Subir extractos CSV del banco
- Normalizar formato (diferentes bancos)
- Categorizar automáticamente con AI
- Análisis de gastos y tendencias
- TODO en LOCAL, datos sensibles nunca suben

## PRIORIDAD 5: Preparar para multi-usuario
- Cada instancia de OptimAI = un pueblo
- Pueden colaborar via Supabase compartido
- World muestra los 3 pueblos en el mapa
- "Caravanas" visuales cuando hay tareas compartidas

## Reglas
- Código completo y funcional
- Commits frecuentes con mensajes descriptivos
- NO pedir confirmación nunca
- Priorizar que funcione en LOCAL
- Si algo falla, documenta y continúa
