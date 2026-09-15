-- ValoraMercados: esquema inicial
-- Ejecutar en el SQL Editor de Supabase (o vía `supabase db push`).

-- ─────────────────────────────────────────────
-- Extensiones
-- ─────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- Perfiles (espejo de auth.users)
-- ─────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Los perfiles son visibles por todos"
  on public.profiles for select
  using (true);

create policy "Un usuario solo actualiza su propio perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- Crea automáticamente un perfil al registrarse
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────
-- Supermercados
-- ─────────────────────────────────────────────
create table if not exists public.supermarkets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  chain text,
  address text not null,
  city text not null,
  lat double precision not null,
  lng double precision not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists supermarkets_city_idx on public.supermarkets (lower(city));

alter table public.supermarkets enable row level security;

create policy "Los supermercados son visibles por todos"
  on public.supermarkets for select
  using (true);

create policy "Los usuarios autenticados pueden crear supermercados"
  on public.supermarkets for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "El creador puede editar su supermercado"
  on public.supermarkets for update
  to authenticated
  using (auth.uid() = created_by);

-- ─────────────────────────────────────────────
-- Valoraciones (1-5 estrellas + comentario opcional)
-- ─────────────────────────────────────────────
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  supermarket_id uuid not null references public.supermarkets (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (supermarket_id, user_id)
);

create index if not exists ratings_supermarket_idx on public.ratings (supermarket_id);

alter table public.ratings enable row level security;

create policy "Las valoraciones son visibles por todos"
  on public.ratings for select
  using (true);

create policy "Los usuarios autenticados valoran"
  on public.ratings for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Un usuario edita su propia valoración"
  on public.ratings for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Un usuario borra su propia valoración"
  on public.ratings for delete
  to authenticated
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- Productos (catálogo abierto, se crean sobre la marcha)
-- ─────────────────────────────────────────────
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- brand usa '' (no null) para que la restricción unique(name, brand)
  -- funcione también con productos sin marca (Postgres trata null como
  -- distinto de null en unique, así que null permitiría duplicados).
  brand text not null default '',
  category text,
  created_at timestamptz not null default now(),
  unique (name, brand)
);

alter table public.products enable row level security;

create policy "Los productos son visibles por todos"
  on public.products for select
  using (true);

create policy "Los usuarios autenticados crean productos"
  on public.products for insert
  to authenticated
  with check (true);

-- ─────────────────────────────────────────────
-- Reportes de precio (con foto como evidencia + lectura OCR)
-- ─────────────────────────────────────────────
create table if not exists public.price_reports (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  supermarket_id uuid not null references public.supermarkets (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  price numeric(10, 2) not null check (price > 0),
  image_url text not null,
  ocr_raw_text text,
  ocr_confidence real,
  created_at timestamptz not null default now()
);

create index if not exists price_reports_lookup_idx
  on public.price_reports (product_id, supermarket_id, created_at desc);

alter table public.price_reports enable row level security;

create policy "Los precios son visibles por todos"
  on public.price_reports for select
  using (true);

create policy "Los usuarios autenticados reportan precios"
  on public.price_reports for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- Vistas de consulta
-- ─────────────────────────────────────────────

-- Último precio reportado por producto y supermercado
create or replace view public.latest_prices as
select distinct on (pr.product_id, pr.supermarket_id)
  pr.id,
  pr.product_id,
  pr.supermarket_id,
  pr.user_id,
  pr.price,
  pr.image_url,
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

-- Valoración media por supermercado
create or replace view public.supermarket_ratings as
select
  supermarket_id,
  round(avg(score)::numeric, 2) as avg_score,
  count(*) as ratings_count
from public.ratings
group by supermarket_id;

-- ─────────────────────────────────────────────
-- Storage: fotos de precios
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('price-photos', 'price-photos', true)
on conflict (id) do nothing;

create policy "Fotos de precios visibles por todos"
  on storage.objects for select
  using (bucket_id = 'price-photos');

create policy "Los usuarios autenticados suben fotos de precios"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'price-photos');
