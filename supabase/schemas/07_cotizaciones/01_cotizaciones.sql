-- Módulo cotizaciones: fórmula por origen como grafo de nodos versionado, tablas de
-- referencia, cotizaciones con snapshot, revisiones, comentarios, adjuntos, reportes,
-- plantilla de tarjeta versionada y comprobantes de venta.

create table public.formulas (
  id              uuid primary key default gen_random_uuid(),
  origen_id       uuid not null references public.origenes (id) on delete cascade,
  version         int,                               -- se asigna al publicar
  estado          public.estado_version not null default 'borrador',
  definicion      jsonb not null,                    -- grafo de nodos (ver docs/COTIZADOR.md); validado por validar_formula()
  params          jsonb not null default '{}'::jsonb, -- valores de las constantes versionadas: {nodo_id: numero}
  nota            text,                              -- obligatoria al publicar
  version_origen_id uuid references public.formulas (id) on delete set null,
  creado_por      uuid references public.perfiles (id),
  publicado_por   uuid references public.perfiles (id),
  publicado_en    timestamptz,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  unique (origen_id, version)
);
create unique index formulas_borrador_unico on public.formulas (origen_id) where estado = 'borrador';
create unique index formulas_publicada_unica on public.formulas (origen_id) where estado = 'publicada';
comment on table public.formulas is 'Una serie por origen, append-only. A lo sumo un borrador y una publicada. Publicar archiva la vigente. «Revertir» publica una copia. Escritura sólo por RPC formula_*.';

create table public.tablas_referencia (
  id         uuid primary key default gen_random_uuid(),
  origen_id  uuid references public.origenes (id) on delete cascade,   -- NULL = compartida
  clave      text not null,
  nombre     text not null,
  descripcion text,
  columnas   jsonb not null,    -- [{clave, etiqueta, tipo: numero|texto|pct|anio|rango}] ; la 1ª suele ser la de match
  activa     boolean not null default true,
  creado_en  timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique nulls not distinct (origen_id, clave)
);
comment on table public.tablas_referencia is 'Tablas que alimentan nodos lookup/bracket de la fórmula (impuestos por tipo, tramos por año y cilindrada, tarifas de transporte por ruta, depreciación por año). Editables desde el cotizador por quien tenga cotizaciones.configurar.';

create table public.tablas_referencia_filas (
  id        uuid primary key default gen_random_uuid(),
  tabla_id  uuid not null references public.tablas_referencia (id) on delete cascade,
  valores   jsonb not null,
  orden     smallint not null default 0,
  activa    boolean not null default true,
  actualizado_en timestamptz not null default now()
);

create table public.plantillas_tarjeta (
  id            uuid primary key default gen_random_uuid(),
  origen_id     uuid not null references public.origenes (id) on delete cascade,
  version       int,
  estado        public.estado_version not null default 'borrador',
  definicion    jsonb not null,
  nota          text,
  creado_por    uuid references public.perfiles (id),
  publicado_en  timestamptz,
  creado_en     timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (origen_id, version)
);
create unique index plantillas_borrador_unico on public.plantillas_tarjeta (origen_id) where estado = 'borrador';
create unique index plantillas_publicada_unica on public.plantillas_tarjeta (origen_id) where estado = 'publicada';
comment on table public.plantillas_tarjeta is 'Cómo se ve la cotización (PDF y tarjeta). Versionado espejo de formulas, independiente de ella.';

create table public.cotizaciones (
  id              uuid primary key default gen_random_uuid(),
  numero          bigint generated always as identity unique,
  origen_id       uuid not null references public.origenes (id) on delete restrict,
  lead_id         uuid references public.leads (id) on delete set null,
  vehiculo_id     uuid references public.vehiculos (id) on delete set null,
  creado_por      uuid not null references public.perfiles (id),
  clase           public.clase_cotizacion not null default 'preventa',
  estado          public.estado_cotizacion not null default 'activa',
  titulo          text,
  formula_id      uuid not null references public.formulas (id) on delete restrict,
  plantilla_id    uuid references public.plantillas_tarjeta (id) on delete set null,
  valores         jsonb not null,          -- {nodo_id: numero} — TODO lo que el cálculo usó
  fuentes         jsonb not null default '{}'::jsonb, -- {nodo_id: default|override|lookup|input}
  tipos_cambio    jsonb not null,          -- {clave: valor} congelados
  totales         jsonb not null,          -- {total_base, por_moneda:{…}, por_bucket:{…}}
  total_base      numeric(18, 2) not null,
  moneda_mostrar  char(3),
  modo_tc         text,
  notas           text,
  version         int not null default 1,  -- «cotizar encima» crea la versión N+1 (cotizacion_padre_id)
  cotizacion_padre_id uuid references public.cotizaciones (id) on delete set null,
  reportes_count  int not null default 0,
  favoritos_count int not null default 0,
  eliminado_en    timestamptz,
  eliminado_por   uuid references public.perfiles (id),
  lote_papelera_id uuid references public.lotes_papelera (id) on delete restrict,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);
create unique index cotizaciones_final_por_vehiculo on public.cotizaciones (vehiculo_id) where clase = 'final' and estado = 'activa' and eliminado_en is null;
comment on table public.cotizaciones is 'Una cotización = fórmula (de qué versión salieron los defaults) + valores (lo que realmente se usó) + tipos de cambio congelados. Recalcular usa SU versión, nunca la vigente. Un vehículo tiene a lo sumo una final activa; al entrar a logística la final queda como dato y las preventas de ese vehículo se envían a la papelera.';

create table public.cotizaciones_revisiones (
  id             bigint generated always as identity primary key,
  cotizacion_id  uuid not null references public.cotizaciones (id) on delete cascade,
  usuario_id     uuid references public.perfiles (id),
  diff           jsonb not null,           -- {campo: {de, a}}
  creado_en      timestamptz not null default now()
);

create table public.cotizaciones_comentarios (
  id             uuid primary key default gen_random_uuid(),
  cotizacion_id  uuid not null references public.cotizaciones (id) on delete cascade,
  usuario_id     uuid not null references public.perfiles (id),
  padre_id       uuid references public.cotizaciones_comentarios (id) on delete cascade,
  cuerpo         text not null,
  eliminado_en   timestamptz,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.cotizaciones_adjuntos (
  id             uuid primary key default gen_random_uuid(),
  cotizacion_id  uuid not null references public.cotizaciones (id) on delete cascade,
  ruta           text not null,            -- bucket privado `cotizaciones`
  nombre         text not null,
  mime           text not null,
  bytes          int not null,
  subido_por     uuid references public.perfiles (id),
  creado_en      timestamptz not null default now()
);

create table public.cotizaciones_reportes (
  cotizacion_id uuid not null references public.cotizaciones (id) on delete cascade,
  usuario_id    uuid not null references public.perfiles (id) on delete cascade,
  motivo        text,
  creado_en     timestamptz not null default now(),
  primary key (cotizacion_id, usuario_id)
);
create table public.cotizaciones_favoritos (
  cotizacion_id uuid not null references public.cotizaciones (id) on delete cascade,
  usuario_id    uuid not null references public.perfiles (id) on delete cascade,
  primary key (cotizacion_id, usuario_id)
);

create table public.comprobantes_contadores (
  serie  text primary key,
  ultimo bigint not null default 0
);
comment on table public.comprobantes_contadores is 'Tabla y no sequence: una sequence deja huecos al hacer rollback y en una numeración un hueco es un problema.';

create table public.comprobantes (
  id             uuid primary key default gen_random_uuid(),
  cotizacion_id  uuid not null references public.cotizaciones (id) on delete restrict,
  serie          text not null references public.comprobantes_contadores (serie),
  numero         bigint not null,
  datos          jsonb not null,           -- foto de cliente, vehículo, líneas y totales al emitir
  emitido_por    uuid references public.perfiles (id),
  emitido_en     timestamptz not null default now(),
  anulado_por    uuid references public.perfiles (id),
  anulado_en     timestamptz,
  motivo_anulacion text,
  unique (serie, numero)
);
comment on table public.comprobantes is 'Comprobante de venta interno al cliente (no fiscal). Se anula, nunca se borra. Un vehículo con comprobante emitido no puede ir a la papelera.';
