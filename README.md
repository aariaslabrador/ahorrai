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
- **Importar supermercados desde Google Maps**: en `/supermercados/importar`,
  cualquier usuario autenticado puede buscar una ciudad en la API oficial de
  Google Places, ver los resultados (marcando los que ya existen para no
  duplicar) y elegir cuáles añadir de golpe — sin necesidad de clave alguna
  "todopoderosa": usa el mismo mecanismo que dar de alta un supermercado a
  mano. También existe un script de línea de comandos equivalente para
  cargas más grandes — ver
  [Importar supermercados desde Google Maps](#importar-supermercados-desde-google-maps).

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
   prefieres arrancar con la base de datos limpia. Cuando quieras quitarlos
   (por ejemplo, al pasar a datos reales), ejecuta
   [`supabase/remove_demo.sql`](./supabase/remove_demo.sql): borra
   exactamente lo que insertó `seed_demo.sql`, sin tocar nada añadido de
   verdad desde la app.
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
    supermercados/                Listado + mapa, alta, detalle, valoraciones e importar desde Google Maps
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
    import-google-places.mjs      Importador opcional de supermercados vía Google Places (ver más abajo)
    import-flyer.mjs              Importador opcional de precios desde fotos de folletos, vía API de Claude (ver más abajo)
    import-flyer-json.mjs         Igual, pero desde un JSON ya extraído a mano/gratis (ver más abajo)
    lib/flyerInsert.mjs           Lógica de inserción compartida por los dos importadores de folletos
supabase/
  migrations/
    0001_init.sql                 Esquema base (supermercados, valoraciones, precios)
    0002_basket.sql               Cesta de la compra
    0003_price_source.sql         Distingue precios 'community' vs 'scraper'
    0005_flyer_price_source.sql   Añade el origen de precio 'flyer'
  seed_demo.sql                   Datos de ejemplo opcionales para ver la app con datos
  remove_demo.sql                 Quita exactamente los datos de seed_demo.sql
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

## Importar precios de un folleto semanal (Lidl y similares)

Muchos supermercados (Lidl entre ellos) publican folletos de ofertas
semanales en su web, normalmente como imágenes o un catálogo interactivo,
no como una API de datos. Automatizar la descarga de esas imágenes sería
scraping recurrente contra su web — probablemente contra sus condiciones de
uso, y exactamente lo que este proyecto evita (ver la sección anterior).

[`scripts/import-flyer.mjs`](./scripts/import-flyer.mjs) resuelve esto de
otra forma: **tú** te haces las fotos del folleto a mano (o exportas el PDF
a imágenes), navegando la web como cualquier visitante, y se las pasas al
script como archivos locales. El script nunca se conecta a la web del
supermercado — solo le pide a la API de Claude que lea los productos y
precios de esas imágenes (visión), y los inserta como precios normales en
`price_reports` con `source = 'flyer'`.

**Necesitas:**

1. Una clave de [console.anthropic.com](https://console.anthropic.com) en
   `ANTHROPIC_API_KEY` (servidor, sin prefijo `NEXT_PUBLIC_`).
2. `SUPABASE_SERVICE_ROLE_KEY`, igual que en el importador de Mercadona.
3. Las imágenes del folleto guardadas en tu máquina.

**Uso:**

```bash
# 1) Prueba solo la extracción, sin escribir nada en Supabase:
node scripts/import-flyer.mjs --dry-run --file folleto-pag1.jpg --file folleto-pag2.jpg

# 2) O con todas las imágenes de una carpeta, en orden:
node scripts/import-flyer.mjs --dry-run --dir ./folletos/lidl-semana-38

# 3) Si lo detectado tiene sentido, impórtalo de verdad:
npm run import:folleto -- --supermarket <uuid> --dir ./folletos/lidl-semana-38
```

Cada imagen se sube también a Supabase Storage (`price-photos`) y su URL
pública queda como evidencia (`image_url`) de los precios que salieron de
ella, igual que las fotos que suben los usuarios.

### Probarlo gratis, sin clave de Anthropic

`import-flyer.mjs` llama a la API de pago de Claude. Para probar el flujo
sin gastar nada, usa [`scripts/import-flyer-json.mjs`](./scripts/import-flyer-json.mjs):
hace exactamente lo mismo (sube la imagen, crea el producto, inserta el
precio con `source = 'flyer'`) pero a partir de un JSON que ya tienes tú
extraído — no llama a ninguna API.

```bash
# 1) Pega la foto del folleto en cualquier chat de Claude (claude.ai, la
#    app, o aquí mismo en Claude Code) y pídele algo como:
#
#      "Extrae los productos y precios de esta foto de un folleto de
#      supermercado. Devuélvelo solo como JSON con este formato exacto:
#      {"products": [{"name": "...", "brand": "", "price": 1.99, "unit": "..."}]}"
#
# 2) Guarda esa respuesta en un archivo, p. ej. folleto.json

# 3) Valida el contenido sin tocar Supabase:
node scripts/import-flyer-json.mjs --json folleto.json --dry-run

# 4) Si tiene sentido, impórtalo de verdad (incluye la foto como evidencia):
npm run import:folleto-json -- --supermarket <uuid> --json folleto.json --image folleto-pag1.jpg
```

Cuando quieras automatizarlo de verdad cada semana sin copiar/pegar a mano,
`import-flyer.mjs` (con `ANTHROPIC_API_KEY`) hace la extracción sola.

## Importar supermercados desde Google Maps

Da de alta de golpe los supermercados de una ciudad usando la **API oficial
de Google Places**. A diferencia del importador de Mercadona, esto no tiene
ningún problema de términos de uso: es exactamente para lo que Google
ofrece esa API.

**Necesitas:**

1. Un proyecto en [Google Cloud Console](https://console.cloud.google.com)
   con facturación activada (dan crédito gratuito mensual; consulta el
   pricing actual de Google Maps Platform).
2. Habilitar **"Places API (New)"** en ese proyecto — ojo, no la "Places
   API" clásica/legacy: esa ya no se puede activar en proyectos nuevos.
3. Crear una **API key** en *Credenciales*, y restringirla a "Places API
   (New)" para que no se pueda usar para otra cosa si se filtra.
4. Poner esa clave en `GOOGLE_MAPS_API_KEY` en tu `.env.local` (servidor,
   **sin** prefijo `NEXT_PUBLIC_`: nunca llega al navegador).

### Desde la app (recomendado)

En `/supermercados/importar` (enlace junto a "+ Añadir supermercado"), busca
una ciudad, revisa los resultados (los que ya existen aparecen marcados y no
se pueden seleccionar) y elige cuáles añadir. Usa el mismo mecanismo que dar
de alta un supermercado a mano — cada uno queda como creado por el usuario
que lo importó, sin necesitar ninguna clave con acceso total a la base de
datos.

### Desde la terminal (para cargas grandes)

[`scripts/import-google-places.mjs`](./scripts/import-google-places.mjs) hace lo mismo por línea de comandos, sin límite de revisión manual:

```bash
# 1) Prueba sin escribir nada en la base de datos:
node scripts/import-google-places.mjs --city "Madrid" --dry-run

# 2) Si la lista tiene sentido, impórtala de verdad (requiere también
#    SUPABASE_SERVICE_ROLE_KEY en tu .env.local, porque este sí se salta
#    la sesión de usuario):
npm run import:supermercados -- --city "Madrid" --limit 60
```

Por defecto busca "supermercado en <ciudad>"; puedes afinar la búsqueda con
`--query` (ej. `--query "Mercadona"` para solo esa cadena). Evita duplicados
comprobando nombre + dirección antes de insertar, así que puedes ejecutarlo
varias veces o para varias ciudades sin miedo a repetir supermercados.

Google Maps Platform tiene sus propias condiciones sobre cuánto tiempo y
cómo se pueden guardar los datos de Places — esto solo guarda nombre,
dirección y coordenadas para tu catálogo, pero si vas a usar esto en un
producto real con más usuarios, revisa las condiciones vigentes.

## Próximos pasos sugeridos

- Geocodificación de direcciones (autocompletar lat/lng al escribir la
  dirección) en vez de solo click-en-mapa.
- Detección de duplicados de supermercados/productos.
- Moderación de fotos y reportes de precio dudosos.
- Notificaciones cuando un producto seguido baja de precio.
