# ahorrAI

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
- **Cotizaciones**: cada producto reportado tiene un símbolo tipo ticker
  (ej. `ACE-1L`) y muestra su variación en los últimos 7 días, calculada de
  verdad a partir del historial de `price_reports` (nunca inventada). El
  listado es buscable y filtrable por ciudad.
- **Índice y mayores movimientos**: en el Inicio se muestra la variación
  media de precios de la semana y un ranking de los productos que más han
  subido y bajado, y cada supermercado cotiza su propio índice semanal junto
  a sus valoraciones.
- **Mi cartera y comparador**: el usuario arma una cartera con los productos
  que suele comprar y la aplicación calcula su coste total en los
  supermercados más cercanos (usando la geolocalización del navegador, con
  alternativa por ciudad) a partir de los últimos precios reportados,
  señalando cuál da la mejor cotización.
- **Precios importados (opcional)**: un script aparte (`scripts/import-mercadona.mjs`)
  puede poblar precios "oficiales" desde la web de un supermercado como base,
  que luego los usuarios sobrescriben con sus propios reportes — ver
  [Importar precios oficiales](#importar-precios-oficiales-opcional-y-bajo-tu-responsabilidad).

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- [Supabase](https://supabase.com): Postgres, Auth, Storage y RLS
- [Leaflet](https://leafletjs.com) / [react-leaflet](https://react-leaflet.js.org) con teselas de OpenStreetMap (sin coste, sin API key)
- [Tesseract.js](https://github.com/naptha/tesseract.js) para OCR en el navegador (sin coste, sin servicios externos de pago)

## Puesta en marcha

### 1. Crear el proyecto de Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ve a **SQL Editor** y ejecuta, en orden, el contenido de
   [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql),
   [`supabase/migrations/0002_basket.sql`](./supabase/migrations/0002_basket.sql) y
   [`supabase/migrations/0003_price_source.sql`](./supabase/migrations/0003_price_source.sql).
   Esto crea las tablas (`profiles`, `supermarkets`, `ratings`, `products`,
   `price_reports`, `baskets`, `basket_items`), las vistas (`latest_prices`,
   `supermarket_ratings`), las políticas de RLS y el bucket de Storage
   `price-photos` (público en lectura).
3. (Opcional, pero recomendado para ver la app "con vida" desde el primer
   momento) Ejecuta también [`supabase/seed_demo.sql`](./supabase/seed_demo.sql):
   crea 7 supermercados de ejemplo (Madrid, Barcelona, Valencia) con varios
   días de historial de precios, así que el índice, las cotizaciones y los
   "mayores movimientos de la semana" del Inicio muestran datos reales desde
   ya, en vez de aparecer vacíos hasta que usuarios de verdad reporten
   precios repetidos. No hace falta para que la app funcione — sáltatelo si
   prefieres arrancar con la base de datos limpia.
4. En **Project Settings → API** copia la `Project URL` y la `anon public key`.

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
    ofertas/                      Cotizaciones (símbolo, precio y variación semanal)
    cesta/                        Mi cartera + comparador de supermercados cercanos
    auth/actions.ts               Server actions de login/registro/logout
  components/
    Map.tsx / MapView.tsx         Mapa Leaflet (carga solo en cliente)
    RatingStars.tsx
    ChangeBadge.tsx                Badge ▲/▼ de variación de precio
    PriceSourceBadge.tsx           Badge 'oficial' vs 'comunidad'
    AddToBasketButton.tsx         Botón rápido "+ Cartera" reutilizable
    Navbar.tsx
  lib/
    supabase/                     Clientes de Supabase (browser/server/middleware)
    ocr.ts                        Lógica de OCR con Tesseract.js
    geo.ts                        Distancia entre coordenadas (fórmula de Haversine)
    priceHistory.ts               Variación semanal real por producto/supermercado
    ticker.ts                     Símbolo tipo ticker a partir del nombre del producto
  types/database.ts               Tipos TypeScript del esquema
  scripts/
    import-mercadona.mjs          Importador opcional de precios (ver más abajo)
supabase/
  migrations/
    0001_init.sql                 Esquema base (supermercados, valoraciones, precios)
    0002_basket.sql               Cesta de la compra
    0003_price_source.sql         Distingue precios 'community' vs 'scraper'
  seed_demo.sql                   Datos de ejemplo opcionales para ver la app con datos
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
- La cartera es única por usuario (no hay listas múltiples en el MVP). El
  comparador solo puede sumar precios de productos que ya tengan algún
  reporte en ese supermercado; si faltan, se muestra cuántos y cuáles para
  que el usuario sepa que el total es parcial en lugar de ocultarlo.
- Las variaciones de precio (▲/▼) se calculan siempre a partir de reportes
  reales en `price_reports` de los últimos 7 días; si una pareja
  producto+supermercado no tiene al menos dos reportes en esa ventana,
  simplemente no muestra variación (nunca se rellena con datos inventados).

## Importar precios oficiales (opcional, y bajo tu responsabilidad)

Además de los precios que reportan los usuarios con foto, puedes precargar
precios "oficiales" desde la web de un supermercado con
[`scripts/import-mercadona.mjs`](./scripts/import-mercadona.mjs). Son
precios normales en `price_reports`, solo que con `source = 'scraper'` en
vez de `'community'`; la app siempre muestra el más reciente de los dos, así
que en cuanto un usuario reporte un precio nuevo, ese pasa a ser el vigente.

**Antes de usarlo, ten en cuenta:**

- **Legal**: las condiciones de uso de la mayoría de supermercados prohíben
  la extracción automatizada de su catálogo. Esto es distinto de los precios
  que suben tus usuarios (cada uno reporta lo que ve en persona en la
  tienda física) — aquí se trata de acceder de forma automatizada a los
  sistemas de otra empresa. Revísalo tú antes de usarlo en producción.
- **No probado contra la web real**: lo escribí sin poder acceder a
  `tienda.mercadona.es` desde mi entorno de desarrollo, y al comprobarlo
  después, su API devolvió `HTTP 403` a una petición sin cookies de sesión
  ni huella de navegador real — es decir, tienen protección activa contra
  bots. El script tal cual probablemente no funcione sin más trabajo (por
  ejemplo, obtener cookies válidas lanzándolo con un navegador real vía
  Playwright/Puppeteer, y aun así podría seguir bloqueado). Trátalo como un
  punto de partida, no como algo que vaya a funcionar tal cual.
- **Precio por zona, no por tienda**: Mercadona da precios por almacén/zona
  logística (un código como `mad1`, asociado a un código postal), no por
  tienda física. Todo lo que importes se guardará contra el
  `supermarket_id` que le indiques — si quieres más de una zona, dales de
  alta como supermercados distintos.

**Uso:**

```bash
# 1) Averigua el código de almacén (`wh`) abriendo tienda.mercadona.es,
#    eligiendo tu código postal, y mirando las peticiones a /api/... en la
#    pestaña Red/Network del navegador.

# 2) Prueba sin escribir nada en la base de datos:
node scripts/import-mercadona.mjs --supermarket <uuid> --warehouse mad1 --dry-run

# 3) Si el paso anterior tiene sentido, importa de verdad (requiere
#    SUPABASE_SERVICE_ROLE_KEY en tu .env.local, ver más abajo):
npm run import:mercadona -- --supermarket <uuid> --warehouse mad1 --limit 100
```

Necesita `SUPABASE_SERVICE_ROLE_KEY` (la clave `service_role` de tu proyecto
Supabase, en **Project Settings → API**) porque se salta la seguridad por
fila (RLS) para poder insertar precios sin que haya un usuario detrás.
**Nunca** la pongas con prefijo `NEXT_PUBLIC_` ni la uses en código que se
ejecute en el navegador — se ejecuta solo en tu máquina, a mano.

## Próximos pasos sugeridos

- Geocodificación de direcciones (autocompletar lat/lng al escribir la
  dirección) en vez de solo click-en-mapa.
- Detección de duplicados de supermercados/productos.
- Moderación de fotos y reportes de precio dudosos.
- Notificaciones cuando un producto seguido baja de precio.
