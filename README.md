# ValoraMercados

Aplicación web para localizar supermercados de tu ciudad, valorarlos y
consultar/reportar precios actualizados por la comunidad a partir de fotos
de etiquetas (con lectura automática por OCR).

## Funcionalidades

- **Localización de supermercados**: mapa interactivo (Leaflet + OpenStreetMap)
  y listado filtrable por ciudad. Cualquier usuario registrado puede añadir un
  supermercado marcando su ubicación en el mapa.
- **Valoración de supermercados**: puntuación de 1 a 5 estrellas + comentario
  opcional, un voto por usuario y supermercado (se puede actualizar).
- **Precios por foto con OCR**: al reportar un precio, el usuario sube una foto
  de la etiqueta; el navegador ejecuta OCR (Tesseract.js) para detectar el
  precio automáticamente y el usuario lo confirma o corrige antes de enviarlo.
- **Ofertas**: listado de los precios más bajos reportados recientemente,
  filtrable por ciudad y buscable por producto.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- [Supabase](https://supabase.com): Postgres, Auth, Storage y RLS
- [Leaflet](https://leafletjs.com) / [react-leaflet](https://react-leaflet.js.org) con teselas de OpenStreetMap (sin coste, sin API key)
- [Tesseract.js](https://github.com/naptha/tesseract.js) para OCR en el navegador (sin coste, sin servicios externos de pago)

## Puesta en marcha

### 1. Crear el proyecto de Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ve a **SQL Editor** y ejecuta el contenido de
   [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql).
   Esto crea las tablas (`profiles`, `supermarkets`, `ratings`, `products`,
   `price_reports`), las vistas (`latest_prices`, `supermarket_ratings`), las
   políticas de RLS y el bucket de Storage `price-photos` (público en lectura).
3. En **Project Settings → API** copia la `Project URL` y la `anon public key`.

### 2. Variables de entorno

```bash
cp .env.local.example .env.local
```

Rellena `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` con los
valores del paso anterior.

### 3. Instalar dependencias y arrancar

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Estructura del proyecto

```
src/
  app/
    page.tsx                     Home
    login/, registro/            Autenticación
    supermercados/                Listado + mapa, alta, detalle y valoraciones
    precios/nuevo/                Reporte de precio con foto + OCR
    ofertas/                      Mejores precios recientes
    auth/actions.ts               Server actions de login/registro/logout
  components/
    Map.tsx / MapView.tsx         Mapa Leaflet (carga solo en cliente)
    RatingStars.tsx
    Navbar.tsx
  lib/
    supabase/                     Clientes de Supabase (browser/server/middleware)
    ocr.ts                        Lógica de OCR con Tesseract.js
  types/database.ts               Tipos TypeScript del esquema
supabase/migrations/0001_init.sql Esquema SQL completo
```

## Notas de diseño

- El precio detectado por OCR **siempre es editable** antes de enviarse: el
  reconocimiento de imagen no es 100% fiable, así que se trata como una
  sugerencia, nunca como un dato definitivo.
- Los "supermercados" y "productos" son un catálogo abierto: cualquier usuario
  autenticado puede darlos de alta la primera vez que los usa (evita depender
  de un administrador central en el MVP).
- El sistema de valoración es un modelo simple de 1 a 5 estrellas por ahora;
  se puede sofisticar más adelante (subcriterios, verificación de compra, etc.).

## Próximos pasos sugeridos

- Geocodificación de direcciones (autocompletar lat/lng al escribir la
  dirección) en vez de solo click-en-mapa.
- Detección de duplicados de supermercados/productos.
- Moderación de fotos y reportes de precio dudosos.
- Notificaciones cuando un producto seguido baja de precio.
