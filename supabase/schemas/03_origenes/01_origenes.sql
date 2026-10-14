-- Módulo orígenes: de dónde vienen los vehículos (subasta USA, China, oficina, Corea…),
-- el layout de campos de cada origen y sus categorías.

create table public.origenes (
  id          uuid primary key default gen_random_uuid(),
  clave       text not null unique check (clave ~ '^[a-z][a-z0-9_]{1,30}$'),
  nombre      text not null,
  sustantivo  text not null default 'vehículo',   -- lo que la UI nombra: «unidad», «lote», «vehículo»
  genero      public.genero_gramatical not null default 'm',
  tipo        public.tipo_origen not null default 'manual',
  color       text not null default '#465fff' check (color ~ '^#[0-9a-fA-F]{6}$'),
  icono       text,
  activo      boolean not null default true,
  orden       smallint not null default 0,
  apibara_plataformas text[] not null default '{}',  -- {'copart','iaai'} si tipo = subasta
  creado_en   timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
-- El nombre se ve en pantalla y en selectores: dos orígenes no pueden llamarse igual.
create unique index origenes_nombre_unico on public.origenes (lower(btrim(nombre)));
comment on table public.origenes is 'Origen configurable de vehículos. tipo=subasta usa la preconfiguración apibara (lote, link, plataforma…); tipo=manual la preconfiguración de venta directa. Cada origen tiene exactamente un flujo de logística (flujos.origen_id) y una serie de fórmulas de cotización.';

alter table public.roles_permisos
  add constraint roles_permisos_origen_fk foreign key (origen_id) references public.origenes (id) on delete cascade;

create table public.origenes_campos (
  id            uuid primary key default gen_random_uuid(),
  origen_id     uuid not null references public.origenes (id) on delete cascade,
  clave         text not null check (clave ~ '^[a-z][a-z0-9_]{1,40}$'),
  etiqueta      text not null,
  tipo          public.tipo_campo not null,
  opciones      jsonb not null default '[]'::jsonb,     -- para opcion/multi_opcion: [{clave, etiqueta}]
  requerido     boolean not null default false,
  valor_defecto jsonb,                                   -- lo que trae puesto el formulario de alta; NULL = nada
  grupo         text,                                    -- bloque del formulario
  orden         smallint not null default 0,
  en_tarjeta    boolean not null default false,          -- se muestra en la card del listado
  filtrable     boolean not null default false,          -- entra al panel de filtros
  publico_web   boolean not null default false,          -- la web pública puede mostrarlo
  clave_apibara text,                                    -- de qué campo del scraper se llena
  es_sistema    boolean not null default false,          -- viene de la preconfiguración: no se borra
  activo        boolean not null default true,
  actualizado_en timestamptz not null default now(),     -- versión de la fila: toda edición la manda
  unique (origen_id, clave),
  -- El correo y el documento son tipos de los leads: un vehículo no los lleva.
  constraint origenes_campos_tipo_de_vehiculo check (tipo not in ('correo', 'documento'))
);
create unique index origenes_campos_apibara_unico on public.origenes_campos (origen_id, clave_apibara) where clave_apibara is not null;
comment on table public.origenes_campos is 'Layout de campos de un origen. Los campos comunes (marca, modelo, año, vin, lote, precio) viven como columnas de vehiculos; el resto en vehiculos.atributos, validado contra esta tabla por trigger. valor_defecto sólo precarga el formulario de alta: la base nunca lo aplica sola.';

create table public.categorias (
  id        uuid primary key default gen_random_uuid(),
  origen_id uuid not null references public.origenes (id) on delete cascade,
  padre_id  uuid references public.categorias (id) on delete set null,
  nombre    text not null,
  orden     smallint not null default 0,
  activa    boolean not null default true,
  actualizado_en timestamptz not null default now()
);
-- Un nombre por lugar, sin importar mayúsculas ni espacios. `padre_id` nulo es una raíz: en un
-- UNIQUE común dos raíces con el mismo nombre no chocarían (los nulos no son iguales entre sí).
create unique index categorias_nombre_unico on public.categorias
  (origen_id, coalesce(padre_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(btrim(nombre)));
comment on table public.categorias is 'Categorías dentro de un origen (marcas, «vehículos medio uso», segmentos). Un nivel de anidado opcional.';
