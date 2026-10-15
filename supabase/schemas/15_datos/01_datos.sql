-- Módulo datos: importaciones CSV en segundo plano (la exportación es una lectura paginada,
-- no necesita tabla).

create table public.importaciones (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references public.perfiles (id) on delete cascade,
  entidad       text not null check (entidad in ('leads', 'vehiculos', 'seguimientos', 'repuestos_items')),
  archivo_ruta  text,                          -- bucket privado `importaciones`; nulo sólo en la de leads (el navegador manda lotes)
  mapeo         jsonb not null default '{}'::jsonb,
  estado        public.estado_importacion not null default 'pendiente',
  filas_total   int,
  filas_ok      int,
  errores       jsonb not null default '[]'::jsonb,  -- [{fila, campo, motivo}]
  iniciada_en   timestamptz,
  terminada_en  timestamptz,
  creado_en     timestamptz not null default now(),
  -- Deshacer una importación de leads (24 h): cuándo, a qué lote de la papelera fueron los intactos y
  -- qué contestó (conteos, motivos y números de fila; nunca datos del archivo). Lo escribe la RPC.
  deshecha_en        timestamptz,
  deshecha_lote      uuid,
  deshecha_resultado jsonb,
  check (archivo_ruta is not null or entidad = 'leads'),
  check ((deshecha_en is null) = (deshecha_resultado is null))
);
comment on table public.importaciones is 'Importación con vista previa validada por fila; importa las válidas aunque fallen algunas. La procesa la edge function importar-csv.';

-- Los leads que creó una importación de leads, y de qué fila del archivo salió cada uno. Sólo la escriben
-- las RPC (`leads_importar_lote`); el dueño de la importación la lee. No guarda ningún dato del archivo.
create table public.importaciones_leads (
  importacion_id uuid not null references public.importaciones (id) on delete cascade,
  lead_id        uuid not null references public.leads (id) on delete cascade,
  fila           integer not null check (fila > 0),
  creado_en      timestamptz not null default now(),
  primary key (importacion_id, lead_id)
);
create unique index importaciones_leads_lead_idx on public.importaciones_leads (lead_id);
comment on table public.importaciones_leads is 'Lo que creó cada importación de leads (para deshacerla). Sin datos del archivo: sólo ids y el número de fila.';
