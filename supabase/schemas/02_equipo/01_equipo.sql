-- Módulo equipo: perfiles espejo de auth.users, roles libres, catálogo fijo de permisos,
-- concesiones por rol (parametrizadas por origen y alcance), preferencias y vistas guardadas.

create table public.perfiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  nombre            text not null default '',
  handle            extensions.citext unique,
  email             extensions.citext,
  avatar_ruta       text,
  telefono          text,
  cargo             text,
  bio               text,
  activo            boolean not null default true,     -- false = dado de baja (sus leads van al limbo)
  bloqueado         boolean not null default false,
  bloqueado_en      timestamptz,
  bloqueado_por     uuid references public.perfiles (id),
  bloqueo_motivo    text,
  baja_en           timestamptz,
  baja_por          uuid references public.perfiles (id),
  invitado_en       timestamptz,                       -- la cuenta nació invitada (app_metadata.invitado)
  invitacion_aceptada_en timestamptz,                  -- eligió su contraseña; hasta entonces está pendiente
  publico_web       boolean not null default false,    -- aparece en /asesores de la web
  cargo_web         text,
  whatsapp_web      text check (whatsapp_web is null or whatsapp_web ~ '^\+[1-9][0-9]{6,14}$'),
  bio_web           text,
  especialidades    text[] not null default '{}',
  ultimo_acceso_en  timestamptz,
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now()
);
comment on table public.perfiles is 'Perfil de cada usuario del equipo. Se crea por trigger al nacer en auth.users. activo=false es baja; bloqueado=true impide operar sin perder nada. invitado_en sin invitacion_aceptada_en = invitación pendiente.';

create table public.roles (
  id          uuid primary key default gen_random_uuid(),
  clave       text not null unique check (clave ~ '^[a-z][a-z0-9_]{1,40}$'),
  nombre      text not null,
  descripcion text,
  color       text check (color is null or color ~ '^#[0-9a-fA-F]{6}$'),
  es_sistema  boolean not null default false,   -- 'dueno' es de sistema: no se borra
  orden       smallint not null default 0,
  creado_en   timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
comment on table public.roles is 'Roles libres creados por el dueño. Sólo `dueno` es de sistema. Los permisos son la unión de los de todos los roles de la persona; no hay herencia ni deny.';

create table public.permisos (
  clave        text primary key check (clave ~ '^[a-z]+(\.[a-z_]+){1,3}$'),
  modulo       text not null,
  nombre       text not null,
  descripcion  text not null,
  por_origen   boolean not null default false,  -- la concesión puede acotarse a un origen
  con_alcance  boolean not null default false,  -- la concesión lleva alcance propios|todos
  aplicado_en  text not null,                   -- dónde se hace cumplir (policy, RPC)
  orden        smallint not null default 0
);
comment on table public.permisos is 'CATÁLOGO FIJO POR CÓDIGO. Un permiso existe sólo si hay un punto de enforcement (policy o RPC) que lo consulta. Se siembra por migración; la UI lo lee y lo asigna, nunca lo crea. Sin política de escritura para nadie: la ausencia de política ES el enforcement.';

create table public.roles_permisos (
  id           uuid primary key default gen_random_uuid(),
  rol_id       uuid not null references public.roles (id) on delete cascade,
  permiso_clave text not null references public.permisos (clave) on delete cascade,
  origen_id    uuid,                                   -- NULL = todos los orígenes (FK en 03_origenes)
  alcance      public.alcance_permiso not null default 'todos',
  creado_en    timestamptz not null default now(),
  unique nulls not distinct (rol_id, permiso_clave, origen_id)
);
comment on table public.roles_permisos is 'Qué permisos tiene cada rol, opcionalmente acotados a un origen y con alcance (propios = sólo lo que creó o tiene en cartera). Escritura sólo por RPC rbac_* con dominancia y auditoría.';

create table public.usuarios_roles (
  usuario_id   uuid not null references public.perfiles (id) on delete cascade,
  rol_id       uuid not null references public.roles (id) on delete restrict,
  es_principal boolean not null default false,
  asignado_por uuid references public.perfiles (id),
  asignado_en  timestamptz not null default now(),
  primary key (usuario_id, rol_id)
);

create table public.preferencias_usuario (
  usuario_id   uuid not null references public.perfiles (id) on delete cascade,
  clave        text not null,                 -- 'tema', 'densidad', 'listas.por_pagina', 'tablero', 'notificaciones'
  valor        jsonb not null default '{}'::jsonb,
  actualizado_en timestamptz not null default now(),
  primary key (usuario_id, clave),
  -- «Ítems por página» (9g): sólo uno de los cuatro tamaños que ofrece el selector (`TAMANOS_DE_PAGINA` de
  -- `src/shared/lib/paginacion.ts`; `scripts/guardas/paginas.test.ts` los compara). Un número (no un texto), ni 7 ni 1000.
  constraint preferencias_por_pagina_valida check (
    clave <> 'listas.por_pagina' or valor in ('10'::jsonb, '25'::jsonb, '50'::jsonb, '100'::jsonb))
);
comment on table public.preferencias_usuario is 'Preferencias de interfaz por usuario (tema, densidad, widgets del tablero, canales de notificación). Privadas: nadie más las lee.';

create table public.vistas_guardadas (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references public.perfiles (id) on delete cascade,
  pantalla    text not null,                  -- 'leads', 'vehiculos', 'cotizaciones', 'logistica'
  nombre      text not null,
  params      jsonb not null default '{}'::jsonb,
  orden       smallint not null default 0,
  creado_en   timestamptz not null default now(),
  unique (usuario_id, pantalla, nombre)
);
comment on table public.vistas_guardadas is 'Combinaciones de filtros con nombre, por usuario y pantalla.';

create table public.visitados (
  usuario_id    uuid not null references public.perfiles (id) on delete cascade,
  tipo          text not null check (tipo in ('lead', 'vehiculo', 'cotizacion', 'evento', 'tarea', 'proyecto_repuestos')),
  referencia_id uuid not null,
  visto_en      timestamptz not null default now(),
  primary key (usuario_id, tipo, referencia_id)
);
comment on table public.visitados is 'Últimos abiertos por usuario para el buscador y los enlaces «visitado». Sin FK: una entidad borrada deja una fila huérfana inofensiva que muere por TTL.';

-- La baja de una persona, en dos tiempos (cierre 1 de la Fase 3): `equipo_dar_de_baja` la apaga y anota acá; sus leads
-- y sus oportunidades se pasan por lotes (`_baja_lote`, el job `equipo-bajas`). Mientras `terminada_en` es nulo la
-- persona está en «baja en curso» y la regla de visibilidad ya la cuenta fuera de toda cartera (`_bajas_en_curso()`).
create table public.equipo_bajas (
  usuario_id               uuid primary key references public.perfiles (id) on delete cascade,
  por                      uuid references public.perfiles (id) on delete set null,
  empezada_en              timestamptz not null default now(),
  terminada_en             timestamptz,
  leads_al_limbo           integer not null default 0 check (leads_al_limbo >= 0),
  oportunidades_canceladas integer not null default 0 check (oportunidades_canceladas >= 0)
);
create index equipo_bajas_en_curso_idx on public.equipo_bajas (usuario_id) where terminada_en is null;
create index equipo_bajas_por_idx on public.equipo_bajas (por);
alter table public.equipo_bajas enable row level security;
comment on table public.equipo_bajas is 'Una fila por baja. terminada_en nulo = baja en curso: la persona ya no está activa y sus filas de leads_asesores y sus oportunidades abiertas se pasan por lotes. leads_al_limbo cuenta lo hecho (exacto: son las filas que pasó). Sólo la escriben equipo_dar_de_baja y el job.';
