-- ahorrAI: distinguir precios reportados por la comunidad de precios
-- importados automáticamente (scraper). Ejecutar después de 0002_basket.sql.

alter table public.price_reports
  add column if not exists source text not null default 'community'
    check (source in ('community', 'scraper'));

-- El scraper no tiene foto ni usuario real detrás.
alter table public.price_reports alter column image_url drop not null;
alter table public.price_reports alter column user_id drop not null;

-- Recreamos la vista para exponer el nuevo campo.
create or replace view public.latest_prices as
select distinct on (pr.product_id, pr.supermarket_id)
  pr.id,
  pr.product_id,
  pr.supermarket_id,
  pr.user_id,
  pr.price,
  pr.image_url,
  pr.source,
  pr.created_at,
  p.name as product_name,
  p.brand as product_brand,
  p.category as product_category,
  s.name as supermarket_name,
  s.city as supermarket_city
from public.price_reports pr
join public.products p on p.id = pr.product_id
join public.supermarkets s on s.id = pr.supermarket_id
order by pr.product_id, pr.supermarket_id, pr.created_at desc;

comment on column public.price_reports.source is
  'community: reportado por un usuario con foto. scraper: importado de la web oficial del supermercado (ver scripts/import-mercadona.mjs).';
