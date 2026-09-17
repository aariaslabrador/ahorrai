-- ahorrAI: valoración estructurada por criterios en vez de una sola
-- puntuación. Ejecutar después de 0003_price_source.sql.

alter table public.ratings add column if not exists cleanliness smallint check (cleanliness between 1 and 5);
alter table public.ratings add column if not exists service smallint check (service between 1 and 5);
alter table public.ratings add column if not exists organization smallint check (organization between 1 and 5);
alter table public.ratings add column if not exists price smallint check (price between 1 and 5);
alter table public.ratings add column if not exists has_fish_counter boolean;
alter table public.ratings add column if not exists has_butcher boolean;

-- Rellena las valoraciones que ya existían con su puntuación general en
-- los 4 criterios, para que no queden huecos, y luego exige los 4 a
-- partir de ahora.
update public.ratings
set cleanliness = score, service = score, organization = score, price = score
where cleanliness is null;

alter table public.ratings alter column cleanliness set not null;
alter table public.ratings alter column service set not null;
alter table public.ratings alter column organization set not null;
alter table public.ratings alter column price set not null;

comment on column public.ratings.score is
  'Puntuación general: redondeo de la media de cleanliness/service/organization/price. La calcula la app al guardar.';
comment on column public.ratings.has_fish_counter is 'Si el supermercado tiene pescadería. NULL = sin opinión.';
comment on column public.ratings.has_butcher is 'Si el supermercado tiene carnicería. NULL = sin opinión.';

-- La vista de medias ahora también desglosa por criterio y el % de
-- valoraciones que dicen que sí hay pescadería/carnicería.
create or replace view public.supermarket_ratings as
select
  supermarket_id,
  round(avg(score)::numeric, 2) as avg_score,
  count(*) as ratings_count,
  round(avg(cleanliness)::numeric, 2) as avg_cleanliness,
  round(avg(service)::numeric, 2) as avg_service,
  round(avg(organization)::numeric, 2) as avg_organization,
  round(avg(price)::numeric, 2) as avg_price,
  round(
    100.0 * count(*) filter (where has_fish_counter) / nullif(count(*) filter (where has_fish_counter is not null), 0)
  ) as fish_counter_pct,
  round(
    100.0 * count(*) filter (where has_butcher) / nullif(count(*) filter (where has_butcher is not null), 0)
  ) as butcher_pct
from public.ratings
group by supermarket_id;
