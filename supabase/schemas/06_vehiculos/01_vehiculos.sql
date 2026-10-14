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
  estado_subasta     public.estado_subasta,             -- abierta | en_vivo | terminada | vendida; lo deriva la base del bruto
  apibara_sync_en    timestamptz,                       -- cuándo se consultó a apibara por última vez
  apibara_raw        jsonb,                             -- última respuesta cruda, para re-mapear sin re-consultar; la copia la base de apibara_consultas
  importado_apibara  boolean not null default false,    -- nació de una consulta a apibara; no cambia nunca
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
create index vehiculos_subasta_estado_idx on public.vehiculos (estado_subasta, subasta_en) where eliminado_en is null and estado_subasta is not null;
create index vehiculos_apibara_sync_idx on public.vehiculos (apibara_sync_en) where eliminado_en is null and apibara_sync_en is not null;

alter table public.historial_fases add constraint historial_fases_vehiculo_fk foreign key (vehiculo_id) references public.vehiculos (id) on delete cascade;
alter table public.seguimientos add constraint seguimientos_vehiculo_fk foreign key (vehiculo_id) references public.vehiculos (id) on delete set null;
alter table public.recordatorios add constraint recordatorios_vehiculo_fk foreign key (vehiculo_id) references public.vehiculos (id) on delete cascade;
alter table public.oportunidades add constraint oportunidades_vehiculo_fk foreign key (vehiculo_id) references public.vehiculos (id) on delete set null;

comment on column public.vehiculos.importado_apibara is 'Nació de una consulta a apibara (vehiculo_crear con p_consulta). No cambia nunca: la limpieza automática sólo mira a estos.';
comment on column public.vehiculos.apibara_raw is 'La última respuesta de apibara, entera. La copia la base desde apibara_consultas: nunca llega del navegador.';

create table public.apibara_consultas (
  id          uuid primary key default gen_random_uuid(),
  origen_id   uuid not null references public.origenes (id) on delete cascade,
  creado_por  uuid not null references public.perfiles (id) on delete cascade,
  raw         jsonb not null,
  creado_en   timestamptz not null default now(),
  vehiculo_id uuid references public.vehiculos (id) on delete set null  -- el vehículo que la usó
);
create index apibara_consultas_origen_idx on public.apibara_consultas (origen_id);
create index apibara_consultas_creado_por_idx on public.apibara_consultas (creado_por);
create index apibara_consultas_vehiculo_idx on public.apibara_consultas (vehiculo_id) where vehiculo_id is not null;
create index apibara_consultas_creado_en_idx on public.apibara_consultas (creado_en);
comment on table public.apibara_consultas is 'Cada respuesta que trajo la edge function apibara, a nombre de quien consultó. vehiculo_crear() y vehiculo_subasta_refrescar() la reciben por id y copian el bruto: así sólo la función origina lo que la base deriva (fecha y estado de la subasta). Vale 24 h y la usa un solo vehículo. Sólo service_role.';

create table public.vehiculos_imagenes (
  id             uuid primary key default gen_random_uuid(),
  vehiculo_id    uuid not null references public.vehiculos (id) on delete cascade,
  hash           text not null check (hash ~ '^[0-9a-f]{64}$'),  -- SHA-256 del archivo que eligió la persona
  ruta           text not null,                -- la completa (lado mayor ≤ 1600): `<vehiculo_id>/<sha-256 del contenido>.<ext>`
  ruta_miniatura text not null,                -- lado mayor ≤ 480: la que cargan el listado y la grilla
  orden          smallint not null default 0,
  es_portada     boolean not null default false,
  ancho          int not null check (ancho > 0),   -- de la completa
  alto           int not null check (alto > 0),
  bytes          int not null check (bytes > 0),
  origen_url     text,                         -- si vino del scraper
  creado_en      timestamptz not null default now()
);
create unique index vehiculos_portada_unica on public.vehiculos_imagenes (vehiculo_id) where es_portada;
create unique index vehiculos_imagenes_hash_unico on public.vehiculos_imagenes (vehiculo_id, hash);
comment on table public.vehiculos_imagenes is 'Las fotos de un vehículo: hasta 24, una sola portada. De sólo lectura para la app: se escriben por vehiculo_fotos_agregar(), vehiculo_foto_mover(), vehiculo_foto_portada() y vehiculo_foto_eliminar(). Cada foto son dos objetos del bucket público `vehiculos`, generados en el navegador y nombrados por el hash de su contenido, siempre en la carpeta de su vehículo. `hash` es el del archivo original: la misma foto no entra dos veces al mismo vehículo.';

create table public.vehiculos_imagenes_version (
  vehiculo_id    uuid primary key references public.vehiculos (id) on delete cascade,
  actualizado_en timestamptz not null default now()
);
comment on table public.vehiculos_imagenes_version is 'La versión de las fotos de un vehículo, aparte de la de su ficha (subir fotos no le da un conflicto a quien edita los datos). Mover, fijar portada y eliminar la mandan; su fila es además el candado que ordena las operaciones sobre las fotos de un mismo vehículo.';

create table public.vehiculos_interesados (
  vehiculo_id uuid not null references public.vehiculos (id) on delete cascade,
  lead_id     uuid not null references public.leads (id) on delete cascade,
  usuario_id  uuid references public.perfiles (id),
  nota        text,
  creado_en   timestamptz not null default now(),
  primary key (vehiculo_id, lead_id)
);
comment on table public.vehiculos_interesados is 'Leads interesados en un vehículo (N:M). Distinto del vínculo activo vehiculos.lead_id, que es uno. De sólo lectura para la app: vehiculo_interesado_marcar() y vehiculo_interesado_quitar().';

create table public.vehiculos_vinculos (
  id          bigint generated always as identity primary key,
  vehiculo_id uuid not null references public.vehiculos (id) on delete cascade,
  lead_id     uuid not null references public.leads (id) on delete cascade,
  desde       timestamptz not null default now(),
  hasta       timestamptz,
  usuario_id  uuid references public.perfiles (id)
);
create unique index vehiculos_vinculo_abierto_unico on public.vehiculos_vinculos (vehiculo_id) where hasta is null;
comment on table public.vehiculos_vinculos is 'Historial del vínculo activo vehículo ↔ lead: la fila sin `hasta` es el vigente, y hay a lo sumo una por vehículo. La escribe un trigger cuando cambia vehiculos.lead_id, que sólo cambia por vehiculo_vincular() y cotizacion_marcar_final().';

create table public.cola_gc_storage (
  bucket       text not null,
  ruta         text not null,
  encolado_en  timestamptz not null default now(),
  reclamado_en timestamptz,                     -- la limpieza lo va a borrar: nadie puede volver a referenciarlo
  primary key (bucket, ruta)
);
comment on table public.cola_gc_storage is 'Objetos de Storage que quizá ya nadie referencia: los encolan la purga de la papelera, el borrado de una foto y el barrido de huérfanos. encolado_en es desde cuándo corre la espera de 24 h (la purga y el barrido lo retro-fechan). storage_gc_reclamar() recuenta bajo candado y marca reclamado_en; sólo lo reclamado se borra por la API, y storage_gc_confirmar() lo saca. Sólo service_role.';

create table public.cola_gc_pases (
  pase      uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  usado_en  timestamptz                         -- la función storage-gc lo canjeó: no vale otra vez
);
comment on table public.cola_gc_pases is 'Pases de un solo uso con los que el job le pide a la función storage-gc que limpie: storage_gc_disparar() crea uno y lo manda, storage_gc_abrir() lo quema (vale 10 minutos). Es la bitácora de las corridas. Sólo service_role.';

create table public.vehiculos_conservados (
  vehiculo_id    uuid primary key references public.vehiculos (id) on delete cascade,
  conservado_por uuid references public.perfiles (id) on delete set null,
  conservado_en  timestamptz not null default now()
);
create index vehiculos_conservados_por_idx on public.vehiculos_conservados (conservado_por) where conservado_por is not null;
comment on table public.vehiculos_conservados is 'La marca «Conservar»: la limpieza automática no toca estos vehículos. Aparte de vehiculos para no mover la versión de la ficha. Se escribe sólo por vehiculo_conservar() y, al restaurar un lote de limpieza, por trigger.';

create table public.limpieza_corridas (
  id          uuid primary key default gen_random_uuid(),
  fecha       date not null,
  parcial     boolean not null default false,
  lote_id     uuid references public.lotes_papelera (id) on delete set null,
  movidos     int not null default 0,
  saltados    jsonb not null default '{}'::jsonb,
  pendientes  int not null default 0,
  empezo_en   timestamptz not null default clock_timestamp(),
  termino_en  timestamptz
);
create unique index limpieza_corridas_dia_unica on public.limpieza_corridas (fecha) where not parcial;
create index limpieza_corridas_lote_idx on public.limpieza_corridas (lote_id) where lote_id is not null;
comment on table public.limpieza_corridas is 'Una fila por noche (la de verdad; las parciales son de pruebas, acotadas a unos orígenes): cuántos vehículos movió la limpieza, cuántos dejó y por qué ancla, y cuántos quedaron para la noche siguiente. Sólo service_role y limpieza_ultima().';
