-- Módulo vehículos: el dato central. Un vehículo pertenece a un origen, lleva los campos
-- comunes como columnas (para filtrar e indexar) y el resto del layout en `atributos`.

create table public.vehiculos (
  id                 uuid primary key default gen_random_uuid(),
  numero             bigint generated always as identity unique,
  origen_id          uuid not null references public.origenes (id) on delete restrict,
  categoria_id       uuid references public.categorias (id) on delete set null,
  titulo             text not null,                     -- «2021 Toyota RAV4 XLE» / nombre comercial
  marca              text,
  modelo             text,
  anio               smallint check (anio is null or anio between 1900 and 2100),
  vin                text check (vin is null or vin ~ '^[A-HJ-NPR-Z0-9]{11,17}$'),
  lote               text,                              -- subasta
  plataforma         text,                              -- 'copart' | 'iaai' | otra
  url_origen         text,
  precio             numeric(18, 2),                    -- precio de lista / compra inmediata, en moneda base
  precio_negociable  boolean,
  acepta_permuta     boolean,
  placado            boolean,
  kilometraje        int,
  atributos          jsonb not null default '{}'::jsonb, -- validado contra origenes_campos por trigger
  subasta_en         timestamptz,                       -- fecha/hora de la subasta (UTC)
  subasta_fin_en     timestamptz,
  subasta_zona       text,                              -- zona horaria de la yarda
  estado_subasta     text,                              -- FUTURE | PRE_BID | LIVE | SOLD | NO_SALE | …
  apibara_sync_en    timestamptz,
  apibara_raw        jsonb,                             -- última respuesta cruda, para re-mapear sin re-consultar
  fase_id            uuid references public.fases (id) on delete restrict,
  fase_desde         timestamptz,
  lead_id            uuid references public.leads (id) on delete set null,  -- vínculo activo (cliente/comprador)
  publicado_web      boolean not null default false,
  destacado_web      boolean not null default false,
  precio_web         numeric(18, 2),                    -- lo escribe un humano; NULL = «Consultar»
  precio_web_hasta   numeric(18, 2),
  precio_web_nota    text,
  creado_por         uuid references public.perfiles (id),
  eliminado_en       timestamptz,
  eliminado_por      uuid references public.perfiles (id),
  lote_papelera_id   uuid references public.lotes_papelera (id) on delete restrict,
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now()
);
comment on table public.vehiculos is 'Inventario. fase_id sólo lo escribe cambiar_fase(). publicado_web + fase.publica_web + integración web activa = sale en la vitrina. Papelera: eliminado_en + lote; una policy RESTRICTIVE esconde lo borrado a todos.';
create unique index vehiculos_lote_unico on public.vehiculos (origen_id, plataforma, lote) where lote is not null and eliminado_en is null;
create unique index vehiculos_vin_unico on public.vehiculos (vin) where vin is not null and eliminado_en is null;

alter table public.historial_fases add constraint historial_fases_vehiculo_fk foreign key (vehiculo_id) references public.vehiculos (id) on delete cascade;
alter table public.seguimientos add constraint seguimientos_vehiculo_fk foreign key (vehiculo_id) references public.vehiculos (id) on delete set null;
alter table public.recordatorios add constraint recordatorios_vehiculo_fk foreign key (vehiculo_id) references public.vehiculos (id) on delete cascade;
alter table public.oportunidades add constraint oportunidades_vehiculo_fk foreign key (vehiculo_id) references public.vehiculos (id) on delete set null;

create table public.vehiculos_imagenes (
  id          uuid primary key default gen_random_uuid(),
  vehiculo_id uuid not null references public.vehiculos (id) on delete cascade,
  ruta        text not null,                   -- bucket público `vehiculos`, nombrado por hash
  orden       smallint not null default 0,
  es_portada  boolean not null default false,
  ancho       int,
  alto        int,
  bytes       int,
  origen_url  text,                            -- si vino del scraper
  creado_en   timestamptz not null default now()
);
create unique index vehiculos_portada_unica on public.vehiculos_imagenes (vehiculo_id) where es_portada;
comment on table public.vehiculos_imagenes is 'Hasta 24 por vehículo (trigger). Se optimizan en el cliente (WebP, lado mayor 1600) antes de subir; el objeto se nombra por hash de contenido y puede compartirse entre filas: borrar pasa por storage_refcount.';

create table public.vehiculos_interesados (
  vehiculo_id uuid not null references public.vehiculos (id) on delete cascade,
  lead_id     uuid not null references public.leads (id) on delete cascade,
  usuario_id  uuid references public.perfiles (id),
  nota        text,
  creado_en   timestamptz not null default now(),
  primary key (vehiculo_id, lead_id)
);
comment on table public.vehiculos_interesados is 'Leads interesados en un vehículo (N:M). Distinto del vínculo activo vehiculos.lead_id, que es uno.';

create table public.vehiculos_vinculos (
  id          bigint generated always as identity primary key,
  vehiculo_id uuid not null references public.vehiculos (id) on delete cascade,
  lead_id     uuid not null references public.leads (id) on delete cascade,
  desde       timestamptz not null default now(),
  hasta       timestamptz,
  usuario_id  uuid references public.perfiles (id)
);
comment on table public.vehiculos_vinculos is 'Historial del vínculo activo vehículo ↔ lead.';

create table public.cola_gc_storage (
  bucket       text not null,
  ruta         text not null,
  encolado_en  timestamptz not null default now(),
  reclamado_en timestamptz,                     -- la limpieza lo va a borrar: nadie puede volver a referenciarlo
  primary key (bucket, ruta)
);
comment on table public.cola_gc_storage is 'Objetos de Storage que quizá ya nadie referencia: los encolan la purga de la papelera, el borrado de una foto y el barrido de huérfanos. storage_gc_reclamar() recuenta bajo candado y marca reclamado_en; sólo lo reclamado se borra por la API, y storage_gc_confirmar() lo saca. Sólo service_role.';
