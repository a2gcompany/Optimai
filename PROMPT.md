# OPTIMAI - Funcionalidad 100%

Trabaja 100% autónomo. Enfócate en que TODO funcione perfecto.

## PRIORIDAD MÁXIMA: World 2D Simple

El World 3D/isométrico se ve mal. Simplificarlo a 2D limpio:
- Vista top-down simple (como un mapa)
- Rectángulos/cuadrados para edificios
- Colores sólidos del tema oscuro actual
- Sin efectos 3D ni isométricos
- Click en edificio = navega al módulo
- Ralph como un icono simple que se mueve
- Tareas como puntos/iconos pequeños

## PRIORIDAD 2: Todos los botones funcionando

Verificar y arreglar:
- Click en cada edificio del World navega correctamente
- Botón "← Dashboard" vuelve al dashboard
- Sidebar: todos los links funcionan
- Cada página carga sin errores

## PRIORIDAD 3: Páginas funcionales

- /tasks - CRUD funciona
- /finance - muestra datos, upload CSV
- /ideas - kanban drag & drop
- /reminders - CRUD funciona
- /settings - guarda configuración
- Dashboard - stats visibles

## PROCESO
1. Simplificar World a 2D
2. Testear cada botón
3. Arreglar lo que no funcione
4. Commit después de cada fix

## REGLAS
- Código limpio y simple
- Sin efectos fancy que no funcionen
- Testear en localhost:3000 antes de commit
- Commits frecuentes: git add . && git commit -m "fix: descripcion" && git push
