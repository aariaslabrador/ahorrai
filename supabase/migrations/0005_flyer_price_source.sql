-- ahorrAI: añade 'flyer' como origen de precio, para los folletos semanales
-- que se importan a mano con scripts/import-flyer.mjs (no scraping web: el
-- folleto se te pasa a ti como imagen y el script solo hace de OCR/inserción).
-- Ejecutar después de 0004_rating_criteria.sql.

alter table public.price_reports drop constraint if exists price_reports_source_check;

alter table public.price_reports
  add constraint price_reports_source_check
  check (source in ('community', 'scraper', 'flyer'));

comment on column public.price_reports.source is
  'community: reportado por un usuario con foto. scraper: importado de la web oficial del supermercado (ver scripts/import-mercadona.mjs). flyer: extraído de una foto del folleto semanal subida a mano (ver scripts/import-flyer.mjs).';
