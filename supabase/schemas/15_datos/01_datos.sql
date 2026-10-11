-- Módulo datos: importaciones CSV en segundo plano (la exportación es una lectura paginada,
-- no necesita tabla).

create table public.importaciones (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references public.perfiles (id) on delete cascade,
  entidad       text not null check (entidad in ('leads', 'vehiculos', 'seguimientos', 'repuestos_items')),
  archivo_ruta  text not null,                 -- bucket privado `importaciones`
  mapeo         jsonb not null default '{}'::jsonb,
  estado        public.estado_importacion not null default 'pendiente',
  filas_total   int,
  filas_ok      int,
  errores       jsonb not null default '[]'::jsonb,  -- [{fila, campo, motivo}]
  iniciada_en   timestamptz,
  terminada_en  timestamptz,
  creado_en     timestamptz not null default now()
);
comment on table public.importaciones is 'Importación con vista previa validada por fila; importa las válidas aunque fallen algunas. La procesa la edge function importar-csv.';
