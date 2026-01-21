# OPTIMAI - MODO TESTING Y CORRECCIÓN DE BUGS

Trabaja 100% autónomo. El usuario está en reunión 2 horas.
OBJETIVO: Testear TODO y corregir TODOS los errores.

## INSTRUCCIONES CRÍTICAS
- Cada fix = commit + push (para que lleguen notificaciones de Vercel al móvil)
- NO marques tareas como completadas hasta que REALMENTE funcionen
- Testea en localhost:3000 antes de cada commit
- Si algo no funciona, arréglalo, no lo dejes

## BUGS CONOCIDOS (ARREGLAR PRIMERO)
1. World muestra "Conectando..." infinito cuando Ralph no corre
2. Click en edificios (Banco, Biblioteca, etc) no navega
3. Botón "← Dashboard" no funciona
4. Solo se ve 1 pueblo, deberían verse 3 (Aitzol, Alvaro, Sergi)
5. Caravanas no se ven entre pueblos
6. Visualmente está "petado" - revisar estilos

## PROCESO DE TESTING
1. Ejecutar `pnpm --filter web dev` para levantar localhost
2. Abrir http://localhost:3000/world
3. Verificar que se ven 3 pueblos
4. Verificar que click en edificios navega
5. Verificar botón volver funciona
6. Verificar que sin Ralph activo muestra fallback elegante (no "Conectando...")
7. Probar http://localhost:3000/tasks
8. Probar http://localhost:3000/finance
9. Probar http://localhost:3000/ideas
10. Probar http://localhost:3000/reminders

## DESPUÉS DE CADA FIX
```bash
git add . && git commit -m "fix: descripcion del fix" && git push
```

## REVISAR TAMBIÉN
- Navegación del sidebar funciona
- Todas las páginas cargan sin errores
- API endpoints responden
- No hay errores en consola del navegador
- Responsive en móvil (simular con DevTools)

## AL TERMINAR
Actualiza @fix_plan.md con el estado real de cada cosa.
Crea un archivo TESTING_REPORT.md con resumen de lo probado.

## Reglas
- NO pidas confirmación
- Commits frecuentes (1 por fix)
- Push después de cada commit
- Si encuentras más bugs, añádelos al plan y arreglalos
