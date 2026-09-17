-- ahorrAI: quita los datos de ejemplo que carga supabase/seed_demo.sql
--
-- Borra exactamente lo que insertó seed_demo.sql (por nombre/dirección
-- exactos), no "todo lo que parezca de ejemplo" — así no toca nada que
-- hayas añadido tú de verdad desde la app, salvo un caso: el catálogo de
-- productos es compartido entre todos los usuarios, así que si ya
-- reportaste un precio real con el mismo nombre+marca exactos que uno de
-- estos productos de ejemplo, ese reporte se borraría también con él.

delete from public.price_reports where source = 'scraper';

delete from public.supermarkets
where (name, address, city) in (
  ('Mercadona', 'C. Gran Vía 34', 'Madrid'),
  ('Carrefour Express', 'Puerta del Sol 8', 'Madrid'),
  ('Lidl', 'Av. Ciudad de Barcelona 2', 'Madrid'),
  ('Dia', 'C. Fuencarral 55', 'Madrid'),
  ('Mercadona', 'C. Aragó 250', 'Barcelona'),
  ('Carrefour', 'Av. Diagonal 471', 'Barcelona'),
  ('Consum', 'C. de Cuba 12', 'Valencia')
);

delete from public.products
where (name, brand) in (
  ('Leche entera 1L', 'Hacendado'),
  ('Aceite de oliva virgen extra 1L', 'Carbonell'),
  ('Huevos camperos docena', ''),
  ('Pan de molde integral', ''),
  ('Tomate frito 400g', 'Orlando'),
  ('Yogur natural pack 8', ''),
  ('Café molido 250g', ''),
  ('Detergente líquido 40 lav.', '')
);
