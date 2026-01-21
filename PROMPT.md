# OPTIMAI - PRIORIDAD: World View + Monitor Ralph

Trabaja 100% autónomo sin pedir confirmación.

## MÁXIMA PRIORIDAD: OPTIMAI WORLD

Crear apps/world - una vista 2D isométrica tipo pueblo/ciudad donde:

### Edificios (representan módulos)
- Edificio "HQ" = Dashboard principal
- Edificio "Bank" = Finanzas
- Edificio "Workshop" = Tareas
- Edificio "Library" = Ideas
- Edificio "Tower" = Core/Telegram
- Click en edificio = navega al módulo

### Personaje Ralph
- Un personaje especial que representa a la IA trabajando
- Cuando Ralph está ejecutando tareas, se ve construyendo/martillando
- Cuando está idle, pasea por el pueblo
- Burbuja de texto mostrando qué está haciendo

### Personajes Tareas
- Cada tarea activa = un personaje pequeño
- Se mueven entre edificios según el tipo de tarea
- Cuando se completa una tarea, el personaje celebra y desaparece
- Nuevas tareas = nuevos personajes aparecen

### Sistema de Energía/Monedas
- Barra de energía visible = llamadas API restantes (ej: 45/50)
- Monedas = tareas completadas hoy
- La energía se recarga cada hora (visual de reloj)
- Efecto visual cuando se gasta energía (Ralph trabaja)
- Efecto visual cuando se gana moneda (tarea completada)

### Estilo Visual
- Pixel art 2D, vista isométrica o top-down
- Paleta oscura como el dashboard actual (grises, cyan, verde)
- Animaciones suaves pero simples
- Usar canvas HTML5 o Pixi.js

### Panel lateral
- Stats en tiempo real: energía, monedas, tareas activas
- Log de actividad de Ralph (últimas 5 acciones)
- Botón para ver World a pantalla completa

## SECUNDARIO: Conectar datos reales
- Las stats del World deben leer de Supabase
- El estado de Ralph debe leer de status.json y ralph.log
- WebSocket o polling cada 2 segundos para actualizar

## Reglas
- Código completo y funcional
- Commits frecuentes
- NO pedir confirmación
