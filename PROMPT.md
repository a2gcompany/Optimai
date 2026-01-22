# OPTIMAI WORLD - Estilo Thronglets/Pixel Art Isométrico

Trabaja 100% autónomo. Crea un World View tipo videojuego retro.

## REFERENCIA VISUAL: Thronglets (Black Mirror)
- Perspectiva isométrica 2D (~30° desde arriba)
- Tiles en forma de ROMBO/diamante (no cuadrados)
- Estética PIXEL ART con píxeles visibles
- Paleta de colores limitada y armónica (tema oscuro)

## ELEMENTOS DEL MUNDO

### Terreno (Grid isométrico)
- Base de tiles de césped/suelo en tonos oscuros
- Variaciones sutiles de color entre tiles
- Caminos entre edificios
- Decoraciones: árboles pixelados, rocas, flores

### Edificios (Como casitas pixel art)
- HQ: Edificio principal grande (azul/cyan)
- Taller: Casa con herramientas (naranja)
- Banco: Edificio con monedas (verde)
- Biblioteca: Casa con libros (morado)
- Torre: Estructura alta (rojo)
- Click en edificio = navega al módulo

### Personaje Ralph
- Sprite pixel art pequeño (~16x16 o 32x32 px)
- Animación idle: respira/parpadea
- Animación working: martilla/construye
- Se mueve entre edificios
- Burbuja de texto con tarea actual

### Tareas como criaturas/NPCs
- Cada tarea activa = un personaje pequeño
- Se mueven por el mapa
- Desaparecen con efecto cuando se completan

## UI (Estilo retro)
- Panel lateral derecho con:
  - Energía: barra pixel art (calls API restantes)
  - Monedas: contador pixelado (tareas completadas)
  - Lista de tareas activas
- Botones pixelados para navegación

## IMPLEMENTACIÓN TÉCNICA
- Usar Canvas HTML5
- Sprites pueden ser emojis o caracteres Unicode inicialmente
- O crear sprites simples con CSS/divs
- Grid isométrico: x' = (x - y) * tileWidth/2, y' = (x + y) * tileHeight/2

## PROCESO
1. Crear grid isométrico básico
2. Añadir edificios como sprites
3. Añadir Ralph animado
4. Añadir UI lateral
5. Conectar navegación
6. Añadir efectos y polish

## REGLAS
- Código funcional, no esqueletos
- Commits frecuentes
- Testear en localhost antes de push
- Push después de cada mejora significativa
