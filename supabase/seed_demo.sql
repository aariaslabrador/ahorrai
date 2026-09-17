-- ahorrAI: datos de ejemplo para ver la app "con vida"
--
-- Esto NO es necesario para que la app funcione: es solo para tener algo
-- real que enseñar (índice, cotizaciones, mayores movimientos de la semana)
-- nada más crear el proyecto, sin esperar a que usuarios de verdad reporten
-- precios varias veces.
--
-- Ejecutar DESPUÉS de 0001_init.sql, 0002_basket.sql y 0003_price_source.sql.
-- Los precios se insertan como source = 'scraper' (no son de un scraper real,
-- pero es la categoría que ya existe en el esquema para "precio de partida
-- que cualquier usuario puede sobrescribir con su propio reporte").
--
-- Seguro de ejecutar más de una vez: los supermercados y productos usan
-- upsert; los price_reports simplemente añaden más historial (igual que
-- pasaría con reportes reales).

do $$
declare
  v_mercadona_granvia uuid;
  v_carrefour_sol uuid;
  v_lidl_atocha uuid;
  v_dia_malasana uuid;
  v_mercadona_eixample uuid;
  v_carrefour_diagonal uuid;
  v_consum_ruzafa uuid;

  v_leche uuid;
  v_aceite uuid;
  v_huevos uuid;
  v_pan uuid;
  v_tomate uuid;
  v_yogur uuid;
  v_cafe uuid;
  v_detergente uuid;
begin
  -- ─────────────────────────────────────────
  -- Supermercados (evita duplicados por nombre+ciudad)
  -- ─────────────────────────────────────────
  insert into public.supermarkets (name, chain, address, city, lat, lng)
  select 'Mercadona', 'Mercadona', 'C. Gran Vía 34', 'Madrid', 40.4200, -3.7038
  where not exists (select 1 from public.supermarkets where name = 'Mercadona' and city = 'Madrid' and address = 'C. Gran Vía 34')
  returning id into v_mercadona_granvia;
  if v_mercadona_granvia is null then
    select id into v_mercadona_granvia from public.supermarkets where name = 'Mercadona' and city = 'Madrid' and address = 'C. Gran Vía 34';
  end if;

  insert into public.supermarkets (name, chain, address, city, lat, lng)
  select 'Carrefour Express', 'Carrefour', 'Puerta del Sol 8', 'Madrid', 40.4169, -3.7033
  where not exists (select 1 from public.supermarkets where name = 'Carrefour Express' and city = 'Madrid')
  returning id into v_carrefour_sol;
  if v_carrefour_sol is null then
    select id into v_carrefour_sol from public.supermarkets where name = 'Carrefour Express' and city = 'Madrid';
  end if;

  insert into public.supermarkets (name, chain, address, city, lat, lng)
  select 'Lidl', 'Lidl', 'Av. Ciudad de Barcelona 2', 'Madrid', 40.4025, -3.6890
  where not exists (select 1 from public.supermarkets where name = 'Lidl' and city = 'Madrid')
  returning id into v_lidl_atocha;
  if v_lidl_atocha is null then
    select id into v_lidl_atocha from public.supermarkets where name = 'Lidl' and city = 'Madrid';
  end if;

  insert into public.supermarkets (name, chain, address, city, lat, lng)
  select 'Dia', 'Dia', 'C. Fuencarral 55', 'Madrid', 40.4260, -3.7020
  where not exists (select 1 from public.supermarkets where name = 'Dia' and city = 'Madrid')
  returning id into v_dia_malasana;
  if v_dia_malasana is null then
    select id into v_dia_malasana from public.supermarkets where name = 'Dia' and city = 'Madrid';
  end if;

  insert into public.supermarkets (name, chain, address, city, lat, lng)
  select 'Mercadona', 'Mercadona', 'C. Aragó 250', 'Barcelona', 41.3897, 2.1610
  where not exists (select 1 from public.supermarkets where name = 'Mercadona' and city = 'Barcelona')
  returning id into v_mercadona_eixample;
  if v_mercadona_eixample is null then
    select id into v_mercadona_eixample from public.supermarkets where name = 'Mercadona' and city = 'Barcelona';
  end if;

  insert into public.supermarkets (name, chain, address, city, lat, lng)
  select 'Carrefour', 'Carrefour', 'Av. Diagonal 471', 'Barcelona', 41.3901, 2.1462
  where not exists (select 1 from public.supermarkets where name = 'Carrefour' and city = 'Barcelona')
  returning id into v_carrefour_diagonal;
  if v_carrefour_diagonal is null then
    select id into v_carrefour_diagonal from public.supermarkets where name = 'Carrefour' and city = 'Barcelona';
  end if;

  insert into public.supermarkets (name, chain, address, city, lat, lng)
  select 'Consum', 'Consum', 'C. de Cuba 12', 'Valencia', 39.4650, -0.3730
  where not exists (select 1 from public.supermarkets where name = 'Consum' and city = 'Valencia')
  returning id into v_consum_ruzafa;
  if v_consum_ruzafa is null then
    select id into v_consum_ruzafa from public.supermarkets where name = 'Consum' and city = 'Valencia';
  end if;

  -- ─────────────────────────────────────────
  -- Productos
  -- ─────────────────────────────────────────
  insert into public.products (name, brand, category) values ('Leche entera 1L', 'Hacendado', 'Lácteos')
    on conflict (name, brand) do update set category = excluded.category returning id into v_leche;
  insert into public.products (name, brand, category) values ('Aceite de oliva virgen extra 1L', 'Carbonell', 'Aceites')
    on conflict (name, brand) do update set category = excluded.category returning id into v_aceite;
  insert into public.products (name, brand, category) values ('Huevos camperos docena', '', 'Huevos')
    on conflict (name, brand) do update set category = excluded.category returning id into v_huevos;
  insert into public.products (name, brand, category) values ('Pan de molde integral', '', 'Panadería')
    on conflict (name, brand) do update set category = excluded.category returning id into v_pan;
  insert into public.products (name, brand, category) values ('Tomate frito 400g', 'Orlando', 'Conservas')
    on conflict (name, brand) do update set category = excluded.category returning id into v_tomate;
  insert into public.products (name, brand, category) values ('Yogur natural pack 8', '', 'Lácteos')
    on conflict (name, brand) do update set category = excluded.category returning id into v_yogur;
  insert into public.products (name, brand, category) values ('Café molido 250g', '', 'Desayuno')
    on conflict (name, brand) do update set category = excluded.category returning id into v_cafe;
  insert into public.products (name, brand, category) values ('Detergente líquido 40 lav.', '', 'Droguería')
    on conflict (name, brand) do update set category = excluded.category returning id into v_detergente;

  -- ─────────────────────────────────────────
  -- Historial de precios (últimos 7 días) — mezcla de subidas y bajadas
  -- ─────────────────────────────────────────

  -- Leche entera 1L @ Mercadona Gran Vía: baja (0.99 → 0.92)
  insert into public.price_reports (product_id, supermarket_id, price, source, created_at) values
    (v_leche, v_mercadona_granvia, 0.99, 'scraper', now() - interval '6 days'),
    (v_leche, v_mercadona_granvia, 0.95, 'scraper', now() - interval '3 days'),
    (v_leche, v_mercadona_granvia, 0.92, 'scraper', now() - interval '4 hours');

  -- Aceite de oliva 1L @ Lidl Atocha: sube (6.20 → 6.79)
  insert into public.price_reports (product_id, supermarket_id, price, source, created_at) values
    (v_aceite, v_lidl_atocha, 6.20, 'scraper', now() - interval '6 days'),
    (v_aceite, v_lidl_atocha, 6.49, 'scraper', now() - interval '3 days'),
    (v_aceite, v_lidl_atocha, 6.79, 'scraper', now() - interval '2 hours');

  -- Huevos camperos docena @ Dia Malasaña: baja fuerte (2.15 → 1.89)
  insert into public.price_reports (product_id, supermarket_id, price, source, created_at) values
    (v_huevos, v_dia_malasana, 2.15, 'scraper', now() - interval '6 days'),
    (v_huevos, v_dia_malasana, 2.05, 'scraper', now() - interval '3 days'),
    (v_huevos, v_dia_malasana, 1.89, 'scraper', now() - interval '5 hours');

  -- Pan de molde integral @ Carrefour Express Sol: sube (1.30 → 1.45)
  insert into public.price_reports (product_id, supermarket_id, price, source, created_at) values
    (v_pan, v_carrefour_sol, 1.30, 'scraper', now() - interval '6 days'),
    (v_pan, v_carrefour_sol, 1.40, 'scraper', now() - interval '3 days'),
    (v_pan, v_carrefour_sol, 1.45, 'scraper', now() - interval '3 hours');

  -- Tomate frito 400g @ Mercadona Gran Vía: baja (1.05 → 0.95)
  insert into public.price_reports (product_id, supermarket_id, price, source, created_at) values
    (v_tomate, v_mercadona_granvia, 1.05, 'scraper', now() - interval '5 days'),
    (v_tomate, v_mercadona_granvia, 0.99, 'scraper', now() - interval '2 days'),
    (v_tomate, v_mercadona_granvia, 0.95, 'scraper', now() - interval '6 hours');

  -- Yogur natural pack 8 @ Mercadona Eixample (Barcelona): sube (1.65 → 1.80)
  insert into public.price_reports (product_id, supermarket_id, price, source, created_at) values
    (v_yogur, v_mercadona_eixample, 1.65, 'scraper', now() - interval '5 days'),
    (v_yogur, v_mercadona_eixample, 1.75, 'scraper', now() - interval '2 days'),
    (v_yogur, v_mercadona_eixample, 1.80, 'scraper', now() - interval '7 hours');

  -- Café molido 250g @ Carrefour Diagonal (Barcelona): baja (3.20 → 2.95)
  insert into public.price_reports (product_id, supermarket_id, price, source, created_at) values
    (v_cafe, v_carrefour_diagonal, 3.20, 'scraper', now() - interval '5 days'),
    (v_cafe, v_carrefour_diagonal, 3.10, 'scraper', now() - interval '2 days'),
    (v_cafe, v_carrefour_diagonal, 2.95, 'scraper', now() - interval '8 hours');

  -- Detergente líquido 40 lav. @ Consum Ruzafa (Valencia): sube (6.60 → 7.20)
  insert into public.price_reports (product_id, supermarket_id, price, source, created_at) values
    (v_detergente, v_consum_ruzafa, 6.60, 'scraper', now() - interval '5 days'),
    (v_detergente, v_consum_ruzafa, 6.95, 'scraper', now() - interval '2 days'),
    (v_detergente, v_consum_ruzafa, 7.20, 'scraper', now() - interval '9 hours');

  -- Un par de precios más en otros mercados, para que el índice por
  -- supermercado tenga más de un producto donde promediar.
  insert into public.price_reports (product_id, supermarket_id, price, source, created_at) values
    (v_leche, v_carrefour_sol, 1.05, 'scraper', now() - interval '6 days'),
    (v_leche, v_carrefour_sol, 1.05, 'scraper', now() - interval '1 day'),
    (v_huevos, v_mercadona_granvia, 1.95, 'scraper', now() - interval '6 days'),
    (v_huevos, v_mercadona_granvia, 1.99, 'scraper', now() - interval '1 day'),
    (v_pan, v_lidl_atocha, 1.20, 'scraper', now() - interval '6 days'),
    (v_pan, v_lidl_atocha, 1.15, 'scraper', now() - interval '1 day');
end $$;
