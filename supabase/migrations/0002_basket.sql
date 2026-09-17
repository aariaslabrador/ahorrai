-- ahorrAI: cesta de la compra
-- Ejecutar después de 0001_init.sql en el SQL Editor de Supabase.

-- ─────────────────────────────────────────────
-- Cesta (una por usuario)
-- ─────────────────────────────────────────────
create table if not exists public.baskets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.baskets enable row level security;

create policy "Un usuario ve su propia cesta"
  on public.baskets for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Un usuario crea su propia cesta"
  on public.baskets for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Un usuario borra su propia cesta"
  on public.baskets for delete
  to authenticated
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- Productos dentro de la cesta
-- ─────────────────────────────────────────────
create table if not exists public.basket_items (
  id uuid primary key default gen_random_uuid(),
  basket_id uuid not null references public.baskets (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (basket_id, product_id)
);

create index if not exists basket_items_basket_idx on public.basket_items (basket_id);

alter table public.basket_items enable row level security;

create policy "Un usuario ve los productos de su cesta"
  on public.basket_items for select
  to authenticated
  using (
    basket_id in (select id from public.baskets where user_id = auth.uid())
  );

create policy "Un usuario añade productos a su cesta"
  on public.basket_items for insert
  to authenticated
  with check (
    basket_id in (select id from public.baskets where user_id = auth.uid())
  );

create policy "Un usuario actualiza productos de su cesta"
  on public.basket_items for update
  to authenticated
  using (
    basket_id in (select id from public.baskets where user_id = auth.uid())
  );

create policy "Un usuario quita productos de su cesta"
  on public.basket_items for delete
  to authenticated
  using (
    basket_id in (select id from public.baskets where user_id = auth.uid())
  );
