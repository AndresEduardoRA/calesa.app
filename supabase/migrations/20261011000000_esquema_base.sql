-- GENERADO por scripts/esquema-base.mjs a partir de supabase/schemas. No editar a mano:
-- se edita el archivo de schemas/ y se corre `pnpm db:base`.

-- >>> schemas/00_base/01_extensiones.sql
-- Extensiones. En Supabase viven en el schema `extensions`.
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists citext with schema extensions;
-- pg_cron y pg_net las instala `migrations/20261013001000_storage_gc_funcion.sql`, sólo donde
-- están disponibles (el Postgres embebido de `pnpm db:probar` no las trae y usa dobles).

-- >>> schemas/00_base/02_tipos.sql
-- Enums: SÓLO para conjuntos que decide el código. Todo lo que el dueño configura es tabla.

create type public.alcance_permiso as enum ('propios', 'todos');
create type public.tipo_origen as enum ('subasta', 'manual');
create type public.estado_subasta as enum ('abierta', 'en_vivo', 'terminada', 'vendida');
create type public.genero_gramatical as enum ('m', 'f');
create type public.tipo_campo as enum ('texto', 'texto_largo', 'numero', 'moneda', 'booleano', 'fecha', 'fecha_hora', 'opcion', 'multi_opcion', 'url', 'vin', 'lote', 'correo', 'documento');
create type public.ambito_flujo as enum ('vehiculos', 'repuestos');
create type public.tipo_requisito as enum ('documento', 'dato', 'espera');
create type public.ambito_espera as enum ('padre', 'hijos');
create type public.estado_documento as enum ('pendiente', 'subido', 'aprobado', 'rechazado');
create type public.modo_vencimiento as enum ('ninguno', 'renovar', 'solicitar');
create type public.tipo_lead as enum ('prospecto', 'cliente');
create type public.tipo_acceso_lead as enum ('dueno', 'compartido', 'adoptado');
create type public.visibilidad_seguimiento as enum ('privado', 'publico');
create type public.estado_oportunidad as enum ('abierta', 'ganada', 'perdida', 'cancelada');
create type public.estado_version as enum ('borrador', 'publicada', 'archivada');
create type public.clase_cotizacion as enum ('preventa', 'final');
create type public.estado_cotizacion as enum ('activa', 'reportada', 'invalida');
create type public.canal_aforo as enum ('verde', 'amarillo', 'rojo');
create type public.estado_agenda as enum ('pendiente', 'completado', 'cancelado');
create type public.visibilidad_evento as enum ('privado', 'publico', 'seleccionados');
create type public.tipo_conversacion as enum ('directa', 'grupo');
create type public.tipo_mensaje as enum ('texto', 'evento', 'tarea', 'vehiculo', 'lead', 'cotizacion');
create type public.tipo_lote_papelera as enum ('vehiculos', 'leads', 'cotizaciones');
create type public.estado_solicitud_web as enum ('asignada', 'contactada', 'vencida', 'sin_asignar', 'cancelada');
create type public.estado_importacion as enum ('pendiente', 'procesando', 'terminada', 'fallida');
create type public.estado_cotizacion_repuestos as enum ('borrador', 'aceptada', 'anulada');

-- >>> schemas/00_base/03_utilidades.sql
-- Funciones de utilidad sin dominio. Las de seguridad (RBAC) viven en migrations/…_rbac.

create or replace function public.set_actualizado_en()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

-- Clave estable (slug) a partir de un texto: minúsculas, sin acentos, guiones.
create or replace function public.slugificar(p text)
returns text language sql immutable set search_path = '' as $$
  select trim(both '-' from regexp_replace(
    lower(translate(coalesce(p, ''), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')),
    '[^a-z0-9]+', '-', 'g'));
$$;

-- Teléfono normalizado: sólo dígitos, con el código de país adelante (entre 8 y 15). Es la fuente:
-- `leads/entities/telefono.ts` la espeja y un test compara las dos con la misma tabla de casos.
-- - Con «+» al inicio o con «00» es internacional: el número ya trae su código y `p_cc` se ignora.
-- - Sin ellos es nacional: lleva el código `p_cc` (el de la empresa) y pierde un 0 troncal inicial.
-- - Espacios, guiones, puntos y paréntesis se admiten; una letra o un «+» en medio, no.
-- Lo que no pasa se rechaza con el motivo y `hint = 'telefono_principal'`.
create or replace function public.normalizar_telefono(p_cc text, p_tel text)
returns text language plpgsql immutable set search_path = '' as $$
declare
  v_tel text := btrim(coalesce(p_tel, ''));
  v_cc text := regexp_replace(coalesce(p_cc, ''), '\D', '', 'g');
  v_d text;
  v_internacional boolean;
  v_n text;
begin
  if v_tel = '' then
    raise exception 'Escribe el teléfono.' using errcode = '22023', hint = 'telefono_principal';
  end if;
  if v_tel ~ '[^0-9+[:space:]().-]' then
    raise exception 'El teléfono sólo lleva números; se admiten espacios, guiones, paréntesis y un «+» al inicio.'
      using errcode = '22023', hint = 'telefono_principal';
  end if;
  if v_tel ~ '.\+' then
    raise exception 'El «+» va sólo al inicio del teléfono.' using errcode = '22023', hint = 'telefono_principal';
  end if;
  v_d := regexp_replace(v_tel, '\D', '', 'g');
  v_internacional := v_tel ~ '^\+';
  if not v_internacional and v_d ~ '^00' then
    v_internacional := true;
    v_d := substr(v_d, 3);
  end if;
  if v_d = '' then
    raise exception 'Escribe el teléfono.' using errcode = '22023', hint = 'telefono_principal';
  end if;
  if v_internacional then
    if v_d ~ '^0' then
      raise exception 'El código de país no empieza con 0.' using errcode = '22023', hint = 'telefono_principal';
    end if;
    v_n := v_d;
  else
    if v_cc = '' then
      raise exception 'Escribe el número completo, con «+» y el código de país.'
        using errcode = '22023', hint = 'telefono_principal';
    end if;
    v_n := v_cc || regexp_replace(v_d, '^0', '');
  end if;
  if length(v_n) < 8 then
    raise exception 'Al teléfono le faltan dígitos: con el código de país lleva entre 8 y 15.'
      using errcode = '22023', hint = 'telefono_principal';
  end if;
  if length(v_n) > 15 then
    raise exception 'Al teléfono le sobran dígitos: con el código de país lleva entre 8 y 15.'
      using errcode = '22023', hint = 'telefono_principal';
  end if;
  return v_n;
end;
$$;

create or replace function public.enmascarar_telefono(p text)
returns text language sql immutable set search_path = '' as $$
  select case when p is null or length(p) < 6 then '•••••'
              else left(p, 3) || repeat('•', greatest(length(p) - 5, 2)) || right(p, 2) end;
$$;

-- Código dictable por teléfono: alfabeto de 32 símbolos sin I, O, 0 ni 1. Con bytes de
-- `gen_random_bytes` (criptográficos; `random()` no lo es): 256 = 8 × 32, así que `% 32` no sesga. Arma
-- también la clave que genera `otorgar_portal` (10 símbolos, 50 bits).
create or replace function public.codigo_dictable(p_largo int default 5)
returns text language plpgsql volatile set search_path = '' as $$
declare
  alfabeto constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  b bytea := extensions.gen_random_bytes(p_largo);
  r text := '';
begin
  for i in 0..p_largo - 1 loop
    r := r || substr(alfabeto, 1 + get_byte(b, i) % 32, 1);
  end loop;
  return r;
end;
$$;

-- >>> schemas/01_empresa/01_empresa.sql
-- Módulo empresa: la fila única de la empresa, sus monedas y tipos de cambio, integraciones.

create table public.ajustes_empresa (
  id                 int primary key default 1 check (id = 1),
  nombre             text not null default 'Mi importadora',
  razon_social       text,
  nit                text,
  direccion          text,
  ciudad             text,
  pais               text not null default 'Bolivia',
  telefono           text,
  telefono_cc        text check (telefono_cc ~ '^\+[1-9][0-9]{0,2}$'),  -- código de país de los teléfonos de los leads: «+» y 1 a 3 dígitos
  whatsapp           text,
  email              text,
  logo_ruta          text,                      -- bucket público `marca`
  logo_oscuro_ruta   text,
  iconos             jsonb,                     -- rutas de los íconos generados desde el logo; NULL = los neutros de public/
  color_acento       text check (color_acento ~ '^#[0-9a-fA-F]{6}$'),
  locale             text not null default 'es-BO',
  zona_horaria       text not null default 'America/La_Paz',
  moneda_base        char(3) not null default 'USD',
  registro_abierto   boolean not null default false,  -- aplicado en DB por trigger sobre auth.users
  papelera_dias      int not null default 30 check (papelera_dias between 1 and 365),
  actividad_dias     int not null default 14 check (actividad_dias between 1 and 365),
  demora_dias_default int not null default 7 check (demora_dias_default >= 0),
  lead_dormido_meses int not null default 3 check (lead_dormido_meses between 1 and 24),
  limpieza_automatica boolean not null default true,  -- interruptor general de la limpieza de vehículos de subasta
  limpieza_dias_gracia int not null default 7 check (limpieza_dias_gracia between 1 and 90),
  actualizado_en     timestamptz not null default now(),
  actualizado_por    uuid
);
comment on column public.ajustes_empresa.iconos is 'Objeto {"32","180","192","512","512m"} → ruta en el bucket marca. Lo escribe «Regenerar íconos»; lo lee manifest.ts.';
comment on column public.ajustes_empresa.limpieza_automatica is 'Interruptor general de la limpieza automática de vehículos de subasta. Apagado: no hay job, filtro ni banner.';
comment on column public.ajustes_empresa.limpieza_dias_gracia is 'Días que pasan desde que terminó la subasta hasta que un vehículo sin ancla va a la papelera (1 a 90).';
comment on table public.ajustes_empresa is 'Fila única (id = 1). Marca, país, locale, zona horaria, moneda base y políticas globales. Nada de cotización vive acá: eso es formulas.';

create table public.monedas (
  codigo     char(3) primary key,
  nombre     text not null,
  simbolo    text not null,
  decimales  smallint not null default 2 check (decimales between 0 and 4),
  activa     boolean not null default true,
  orden      smallint not null default 0,
  actualizado_en timestamptz not null default now()
);
comment on table public.monedas is 'Monedas que la empresa usa. La base está en ajustes_empresa.moneda_base; las demás se convierten con tipos_cambio.';

create table public.tipos_cambio (
  id              uuid primary key default gen_random_uuid(),
  clave           text not null unique,               -- 'oficial', 'paralelo', 'banco'…
  nombre          text not null,
  moneda_de       char(3) not null references public.monedas (codigo),
  moneda_a        char(3) not null references public.monedas (codigo),
  valor           numeric(18, 6) not null check (valor > 0),
  es_default      boolean not null default false,
  activo          boolean not null default true,
  orden           smallint not null default 0,
  actualizado_en  timestamptz not null default now(),
  actualizado_por uuid,
  check (moneda_de <> moneda_a)
);
-- A lo sumo un tipo de cambio por defecto entre dos monedas.
create unique index tipos_cambio_un_default_por_par on public.tipos_cambio (moneda_de, moneda_a) where es_default;
comment on table public.tipos_cambio is 'Tipos de cambio nombrados (N por par de monedas). Cambian seguido: no se versionan, se congelan en cada cotización (cotizaciones.tipos_cambio).';

create table public.tipos_cambio_historial (
  id              bigint generated always as identity primary key,
  tipo_cambio_id  uuid not null references public.tipos_cambio (id) on delete cascade,
  valor_anterior  numeric(18, 6),
  valor_nuevo     numeric(18, 6) not null,
  cambiado_por    uuid,
  cambiado_en     timestamptz not null default now()
);

create table public.integraciones (
  clave          text primary key,                 -- 'apibara', 'push_web', 'web_publica'
  activa         boolean not null default false,
  config         jsonb not null default '{}'::jsonb, -- NUNCA secretos: esos van en Vault
  secreto_guardado_en timestamptz,                -- cuándo se guardó su secreto en Vault; NULL = no hay
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid
);
comment on table public.integraciones is 'Interruptor y configuración no secreta de cada integración. Las claves de API viven en Vault (vault.secrets, nombre integracion:<clave>) y se escriben con integracion_guardar_secreto(); acá sólo queda cuándo se guardaron.';

-- >>> schemas/02_equipo/01_equipo.sql
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

-- >>> schemas/03_origenes/01_origenes.sql
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

-- >>> schemas/04_flujos/01_flujos.sql
-- Módulo flujos: UN motor para todo lo que recorre fases (vehículos por origen, repuestos).
-- Reemplaza las tres copias de ip (vehicle_states / part_states / china_unit_states).

create table public.flujos (
  id        uuid primary key default gen_random_uuid(),
  ambito    public.ambito_flujo not null,
  origen_id uuid references public.origenes (id) on delete cascade,   -- obligatorio si ambito = vehiculos
  nombre    text not null,
  activo    boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  check ((ambito = 'vehiculos') = (origen_id is not null))
);
create unique index flujos_origen_unico on public.flujos (origen_id) where ambito = 'vehiculos';
create unique index flujos_repuestos_unico on public.flujos (ambito) where ambito = 'repuestos';
comment on table public.flujos is 'Un flujo por origen de vehículos y uno para repuestos. Es la unidad de configuración: fases, transiciones, requisitos, reglas y tipos de documento cuelgan de acá.';

create table public.flujos_reglas (
  flujo_id uuid not null references public.flujos (id) on delete cascade,
  regla    text not null check (regla in ('logistica', 'alerta_demora', 'vitrina_web', 'portal_cliente', 'transporte', 'contenedor', 'aduana', 'gastos', 'pagos', 'esperas')),
  activa   boolean not null default true,
  primary key (flujo_id, regla)
);
comment on table public.flujos_reglas is 'Capacidades del flujo soportadas por el CÓDIGO y encendidas por DATO. Sin fila = apagada. Una regla apagada no se puede marcar en ninguna fase (trigger).';

create table public.fases (
  id                 uuid primary key default gen_random_uuid(),
  flujo_id           uuid not null references public.flujos (id) on delete cascade,
  nombre             text not null,
  descripcion        text,
  color              text not null default '#717c93' check (color ~ '^#[0-9a-fA-F]{6}$'),
  icono              text,
  orden              smallint not null default 0,
  es_inicial         boolean not null default false,
  es_final           boolean not null default false,
  activa             boolean not null default true,    -- false = jubilada: válida para históricos, nunca destino nuevo
  es_logistica       boolean not null default true,    -- entra a la cadena, bandeja y medición
  demora_dias        int check (demora_dias is null or demora_dias >= 0), -- NULL hereda el default; 0 = nunca alerta
  alerta_cada_horas  int check (alerta_cada_horas is null or alerta_cada_horas between 1 and 720),
  nota_obligatoria   boolean not null default false,
  permite_contenedor boolean not null default true,
  permite_aduana     boolean not null default false,
  cuenta_llegada_repuestos boolean not null default false,  -- a lo sumo una por flujo
  publica_web        boolean not null default false,    -- vitrina del sitio público
  visible_portal     boolean not null default false,    -- el cliente la ve en su portal…
  alias_portal       text,                              -- …con este nombre (no revela proveedores)
  descripcion_portal text,
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),
  unique (flujo_id, nombre),
  check (not (es_inicial and es_final)),
  check (not visible_portal or alias_portal is not null)
);
create unique index fases_llegada_repuestos_unica on public.fases (flujo_id) where cuenta_llegada_repuestos;
comment on table public.fases is 'Fase de un flujo. Nombre único POR FLUJO. Jubilar (activa=false) la saca de los destinos sin romper el historial; borrar sólo sin historial ni unidades paradas (RPC).';

create table public.fases_transiciones (
  id               uuid primary key default gen_random_uuid(),
  flujo_id         uuid not null references public.flujos (id) on delete cascade,
  de_fase_id       uuid not null references public.fases (id) on delete cascade,
  a_fase_id        uuid not null references public.fases (id) on delete cascade,
  accion           text,                                -- texto del botón («Marcar llegó»)
  nota_obligatoria boolean not null default false,
  unique (de_fase_id, a_fase_id),
  check (de_fase_id <> a_fase_id)
);

create table public.fases_roles (
  fase_id uuid not null references public.fases (id) on delete cascade,
  rol_id  uuid not null references public.roles (id) on delete restrict,
  primary key (fase_id, rol_id)
);
comment on table public.fases_roles is 'Roles que pueden mover una unidad HASTA esta fase. Sin filas = cualquiera con flujos.mover del origen. Manda la lista de la transición si existe (fases_transiciones_roles).';

create table public.fases_transiciones_roles (
  transicion_id uuid not null references public.fases_transiciones (id) on delete cascade,
  rol_id        uuid not null references public.roles (id) on delete restrict,
  primary key (transicion_id, rol_id)
);

create table public.tipos_documento (
  id                      uuid primary key default gen_random_uuid(),
  flujo_id                uuid references public.flujos (id) on delete cascade,   -- NULL = global
  nombre                  text not null,
  descripcion             text,
  activo                  boolean not null default true,
  orden                   smallint not null default 0,
  visible_portal_permitido boolean not null default false,
  proposito               text,                      -- 'comprobante_tributos', 'titulo', 'bl'…
  modo_vencimiento        public.modo_vencimiento not null default 'ninguno',
  vigencia_dias           int check (vigencia_dias is null or vigencia_dias > 0),
  aviso_dias              int check (aviso_dias is null or aviso_dias >= 0),
  formatos                text[] not null default '{application/pdf,image/jpeg,image/png,image/webp}',
  creado_en               timestamptz not null default now(),
  actualizado_en          timestamptz not null default now(),
  unique nulls not distinct (flujo_id, nombre)
);
comment on table public.tipos_documento is 'Catálogo de documentos del ciclo (título, BL, DUI, factura, evidencia…). Global (flujo_id NULL) o propio de un flujo. Un tipo en uso no se borra: se desactiva.';

create table public.fases_requisitos (
  id                uuid primary key default gen_random_uuid(),
  fase_id           uuid not null references public.fases (id) on delete cascade,
  tipo              public.tipo_requisito not null,
  bloqueante        boolean not null default true,
  orden             smallint not null default 0,
  notas             text,
  -- documento
  tipo_documento_id uuid references public.tipos_documento (id) on delete restrict,
  min_archivos      int check (min_archivos is null or min_archivos >= 1),
  max_archivos      int check (max_archivos is null or max_archivos >= 1),
  formatos          text[],
  -- dato: clave de un catálogo fijo por código (evaluadores en _requisito_dato_cumplido)
  clave_dato        text,
  config            jsonb not null default '{}'::jsonb,
  -- espera: a una fase de otro flujo
  espera_fase_id    uuid references public.fases (id) on delete restrict,
  espera_ambito     public.ambito_espera,
  check (
    (tipo = 'documento' and tipo_documento_id is not null and clave_dato is null and espera_fase_id is null) or
    (tipo = 'dato' and clave_dato is not null and tipo_documento_id is null and espera_fase_id is null) or
    (tipo = 'espera' and espera_fase_id is not null and espera_ambito is not null and tipo_documento_id is null and clave_dato is null)
  ),
  check (max_archivos is null or min_archivos is null or max_archivos >= min_archivos)
);
comment on table public.fases_requisitos is 'Qué pide una fase para ENTRAR. documento: N aprobados de un tipo; dato: una clave evaluada por código (vehiculo.vin, transporte.contenedor, aduana.tributos_pagados, pagos.umbral_pct…); espera: que el padre o los hijos hayan llegado a una fase de otro flujo. Se evalúa sólo al entrar.';

create table public.historial_fases (
  id            bigint generated always as identity primary key,
  flujo_id      uuid not null references public.flujos (id) on delete cascade,
  vehiculo_id   uuid,            -- FK en 06_vehiculos
  repuesto_id   uuid,            -- FK en 08_repuestos
  de_fase_id    uuid references public.fases (id) on delete restrict,
  a_fase_id     uuid not null references public.fases (id) on delete restrict,
  nota          text,
  usuario_id    uuid references public.perfiles (id),
  creado_en     timestamptz not null default now(),
  check (num_nonnulls(vehiculo_id, repuesto_id) = 1)
);
comment on table public.historial_fases is 'Cada cambio de fase, con su nota interna. Lo escribe SÓLO cambiar_fase(). «Llegó a una fase» se calcula sobre esta tabla.';

-- >>> schemas/05_leads/01_leads.sql
-- Módulo leads: prospectos y clientes, cartera por asesor, seguimientos, recordatorios,
-- etiquetas y favoritos privados, embudos de oportunidades, acceso al portal.

create table public.origenes_lead (
  id     uuid primary key default gen_random_uuid(),
  clave  text not null unique,
  nombre text not null,
  activo boolean not null default true,
  orden  smallint not null default 0,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()   -- versión: guardar, mover y eliminar la mandan
);
-- Un nombre por origen, sin importar mayúsculas ni espacios de los bordes.
create unique index origenes_lead_nombre_unico on public.origenes_lead (lower(btrim(nombre)));
comment on table public.origenes_lead is 'De dónde llegó el lead. Configurable (Configuración › Leads › Orígenes): sólo de lectura para la app, se escribe por origen_lead_*(). Uno con leads no se elimina, se desactiva: sigue nombrando a los leads que ya lo tienen pero no se ofrece para uno nuevo. Distinto de origenes, que son los de los vehículos.';

create table public.lotes_papelera (
  id          uuid primary key default gen_random_uuid(),
  tipo        public.tipo_lote_papelera not null,
  creado_por  uuid references public.perfiles (id),
  creado_en   timestamptz not null default now(),
  restaurado_en timestamptz,
  restaurado_por uuid references public.perfiles (id),
  purgado_en  timestamptz,
  resumen     jsonb not null default '{}'::jsonb,    -- {cantidad, restaurados, purgados}
  es_limpieza boolean not null default false,        -- lo armó la limpieza automática (creado_por nulo)
  actualizado_en timestamptz not null default now()  -- versión del lote: restaurar y purgar la mandan
);
comment on table public.lotes_papelera is 'Un «mandar a la papelera», de 1 o de 200. Unidad de restaurar y purgar, entero o por partes. Se cierra (restaurado_en o purgado_en) cuando no le queda nada; nunca se borra: sobrevive a la purga como constancia. actualizado_en es su versión y la sellan las RPC con la hora del reloj.';

create table public.leads (
  id                   uuid primary key default gen_random_uuid(),
  numero               bigint generated always as identity unique,
  nombre               text not null,
  telefono_cc          text,                       -- el código de país del número, si es el de la empresa
  telefono_principal   text not null,                -- normalizado: dígitos con código de país
  tipo                 public.tipo_lead not null default 'prospecto',
  origen_lead_id       uuid references public.origenes_lead (id) on delete restrict,
  atributos            jsonb not null default '{}'::jsonb check (jsonb_typeof(atributos) = 'object'),  -- los campos de leads_campos; no es legible: se lee por leads_vista
  creado_por           uuid references public.perfiles (id),   -- NULL = sin creador vivo (limbo se decide por cartera)
  numero_propio        integer check (numero_propio > 0),      -- consecutivo de quien lo creó (leads_contadores); NULL = sin creador. No se lee de aquí: leads_numeros_propios
  ultimo_seguimiento_en timestamptz,
  -- Derivadas (9h): las mantienen triggers, nadie las escribe. La policy de `leads` y `leads_vista` las leen para que el
  -- planificador estime la cartera visible (`docs/DECISIONES.md`, 9h).
  cartera              uuid[] not null default '{}',              -- quiénes tienen el lead: los usuario_id vigentes de leads_asesores, ordenados; vacía = limbo
  atributos_publicos   jsonb not null default '{}'::jsonb,        -- atributos sin los campos solo_cartera (ni los que van a serlo): lo que recibe quien ve el lead sin la cartera
  eliminado_en         timestamptz,
  eliminado_por        uuid references public.perfiles (id),
  lote_papelera_id     uuid references public.lotes_papelera (id) on delete restrict,
  creado_en            timestamptz not null default now(),
  actualizado_en       timestamptz not null default now(),
  check (telefono_principal ~ '^[0-9]{7,15}$'),
  -- Diferible: renumerar por fila un lote de la importación intercambia números dentro de un solo UPDATE.
  constraint leads_numero_propio_unico unique (creado_por, numero_propio) deferrable initially immediate
);
create unique index leads_telefono_unico on public.leads (telefono_principal) where eliminado_en is null;
comment on table public.leads is 'Prospectos y clientes. El teléfono principal es único entre leads vivos y sólo lo ve completo quien está en la cartera (leads_asesores): la app lee leads_vista, no esta tabla. Un lead sin asesores vigentes está en el LIMBO: invisible hasta que alguien lo adopta registrando su teléfono. Fijos: nombre, teléfono, tipo y origen; el resto son campos configurables (leads_campos) y viven en atributos, que sólo lee quien está en la cartera completos.';

-- La numeración (9f-2). Cada lead lleva dos números: el global (`leads.numero`, identity) y el propio de quien lo
-- creó (`leads.numero_propio`, consecutivo por creador). Ninguno de los dos se lee de `leads`: sin el permiso
-- `leads.numero_global.ver` el global no debe llegar a nadie, y una columna no puede ser legible según quién mira.
-- Se leen de estas dos tablas, cuya policy ES la regla (una fila existe para quien puede ver ese número). RLS se
-- enciende acá porque `…000200_rls_y_grants.sql` termina comprobando que ninguna tabla de `public` quede sin ella;
-- las policies y los grants van en `…20261019000900_numeros_de_leads.sql`.
create table public.leads_contadores (
  usuario_id uuid primary key references public.perfiles (id) on delete cascade,
  ultimo     integer not null default 0 check (ultimo >= 0)
);
alter table public.leads_contadores enable row level security;
comment on table public.leads_contadores is 'Último número propio asignado a cada creador. Tabla y no sequence: un rollback deshace el incremento y no deja un hueco, y el candado del renglón ordena a quienes crean a la vez. Nadie la lee ni la escribe más que el trigger de leads.';

create table public.leads_numeros_globales (
  lead_id uuid primary key references public.leads (id) on delete cascade,
  numero  bigint not null unique
);
alter table public.leads_numeros_globales enable row level security;
comment on table public.leads_numeros_globales is 'El número global de cada lead (copia de leads.numero), visible sólo con leads.numero_global.ver y sólo de leads que se ven. Es lo que lee leads_vista: leads.numero no tiene grant. La escribe el trigger de leads; nunca cambia.';

create table public.leads_numeros_propios (
  lead_id        uuid primary key references public.leads (id) on delete cascade,
  creado_por     uuid not null,   -- quien lo creó, sin FK: se conserva aunque leads.creado_por quede nulo
  numero         integer not null check (numero > 0)
);
-- Buscar «#12» sin el permiso es (creado_por = yo, numero = 12). La unicidad es de leads (diferible).
create index leads_numeros_propios_creador_idx on public.leads_numeros_propios (creado_por, numero);
alter table public.leads_numeros_propios enable row level security;
comment on table public.leads_numeros_propios is 'El número propio de cada lead (copia de leads.numero_propio) con su creador: lo ve quien lo creó y, con leads.numero_global.ver, todos, sólo de leads que se ven. La escribe el trigger de leads; nunca cambia.';

create table public.leads_campos (
  id            uuid primary key default gen_random_uuid(),
  clave         text not null unique check (clave ~ '^[a-z][a-z0-9_]{1,40}$'),
  etiqueta      text not null,
  tipo          public.tipo_campo not null,
  opciones      jsonb not null default '[]'::jsonb,     -- para opcion/multi_opcion: [{clave, etiqueta}]
  requerido     boolean not null default false,
  valor_defecto jsonb,                                   -- lo que trae puesto el formulario de alta; NULL = nada
  valor_defecto_empresa text check (valor_defecto_empresa in ('ciudad', 'pais')),  -- «la de la empresa»: se resuelve al leer el layout
  grupo         text,                                    -- bloque del formulario y de la ficha
  orden         smallint not null default 0,
  en_tabla      boolean not null default false,          -- columna del listado
  filtrable     boolean not null default false,          -- entra al panel de filtros
  solo_cartera  boolean not null default false,          -- sólo lo recibe quien está en la cartera (como el teléfono)
  solo_cartera_pendiente boolean,                        -- 9h: a dónde va un cambio de privacidad que se aplica por lotes (true: a privado; false: a público); NULL = nada pendiente
  es_sistema    boolean not null default false,          -- de fábrica: no se borra, ni cambia de tipo ni de clave
  activo        boolean not null default true,
  actualizado_en timestamptz not null default now(),     -- versión de la fila: toda edición la manda
  constraint leads_campos_tipo_de_lead check (tipo not in ('vin', 'lote')),
  constraint leads_campos_defecto_excluyente check (valor_defecto_empresa is null or (valor_defecto is null and tipo = 'texto'))
);
comment on table public.leads_campos is 'Layout de campos de los leads: uno por despliegue, igual para prospectos y clientes. Lo que no es columna de leads (nombre, teléfono, tipo y origen) vive en leads.atributos, validado contra esta tabla por trigger. solo_cartera se recorta en la base (atributos_lead): quien ve el lead sin estar en la cartera no lo recibe. Distinta de una etiqueta, que es privada de cada persona.';

create table public.leads_telefonos (
  id       uuid primary key default gen_random_uuid(),
  lead_id  uuid not null references public.leads (id) on delete cascade,
  telefono text not null,                              -- normalizado, como el principal
  etiqueta text,
  creado_en timestamptz not null default now(),
  constraint leads_telefonos_formato check (telefono ~ '^[0-9]{7,15}$'),
  constraint leads_telefonos_etiqueta_largo check (etiqueta is null or char_length(etiqueta) between 1 and 40),
  constraint leads_telefonos_unico unique (lead_id, telefono)   -- sin duplicado dentro del lead; entre leads no hay unicidad
);
-- Para avisar que un número figura como teléfono extra de otro lead (el índice único empieza por lead_id).
create index leads_telefonos_telefono_idx on public.leads_telefonos (telefono);
comment on table public.leads_telefonos is 'Teléfonos extra de un lead (alternos: sin unicidad entre leads, hasta 10 por lead). RLS no esconde columnas: la app no lee ni escribe esta tabla; los lee lead_telefonos(), que da el número completo a la cartera y enmascarado al resto, y los escriben sólo lead_telefono_guardar(), lead_telefono_quitar() y cambiar_telefono_lead() (el principal que se reemplaza queda aquí con la etiqueta «Anterior»).';

create table public.leads_asesores (
  lead_id       uuid not null references public.leads (id) on delete cascade,
  usuario_id    uuid not null references public.perfiles (id) on delete cascade,
  tipo_acceso   public.tipo_acceso_lead not null,
  compartido_por uuid references public.perfiles (id),
  desde         timestamptz not null default now(),
  revocado_en   timestamptz,
  revocado_por  uuid references public.perfiles (id),
  primary key (lead_id, usuario_id)
);
comment on table public.leads_asesores is 'Cartera: quién tiene acceso a qué lead y cómo (dueño, compartido, adoptado del limbo). Un lead tiene a lo sumo un dueño vigente.';
create unique index leads_asesores_dueno_unico on public.leads_asesores (lead_id) where tipo_acceso = 'dueno' and revocado_en is null;

create table public.leads_favoritos (
  lead_id    uuid not null references public.leads (id) on delete cascade,
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  creado_en  timestamptz not null default now(),
  primary key (lead_id, usuario_id)
);
comment on table public.leads_favoritos is 'Favorito POR PERSONA: marcar un lead compartido no lo marca para el otro asesor. Sólo se lee (la propia); lo escribe lead_favorito_poner(), que exige ver el lead. No mueve la versión del lead ni deja actividad.';
create table public.leads_tachados (
  lead_id    uuid not null references public.leads (id) on delete cascade,
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  creado_en  timestamptz not null default now(),
  primary key (lead_id, usuario_id)
);
comment on table public.leads_tachados is 'Tachado POR PERSONA: tachar un lead compartido no lo tacha para el otro asesor. Privado incluso para el dueño del sistema. El listado lo oculta por defecto. Sólo se lee (lo propio); lo escribe lead_tachado_poner().';

create table public.etiquetas (
  id             uuid primary key default gen_random_uuid(),
  usuario_id     uuid not null references public.perfiles (id) on delete cascade,
  nombre         text not null,
  color          text not null default 'gris',     -- clave de la paleta cerrada (los tokens --etiqueta-<clave>), nunca un hex
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),  -- versión: la sellan las RPC con la hora del reloj
  constraint etiquetas_nombre_largo check (nombre = btrim(nombre) and char_length(nombre) between 1 and 30),
  constraint etiquetas_color_paleta check (color in ('gris', 'rojo', 'naranja', 'ambar', 'verde', 'turquesa', 'azul', 'violeta'))
);
-- Un nombre por persona, sin importar mayúsculas («VIP» y «vip» son la misma).
create unique index etiquetas_nombre_unico on public.etiquetas (usuario_id, lower(nombre));
comment on table public.etiquetas is 'Etiquetas PRIVADAS de cada persona (hasta 50), con color de una paleta cerrada guardado como clave. Sólo se leen (las propias); las escriben etiqueta_crear|guardar|eliminar. No es un campo de lead: ese es del despliegue.';
create table public.leads_etiquetas (
  lead_id     uuid not null references public.leads (id) on delete cascade,
  etiqueta_id uuid not null references public.etiquetas (id) on delete cascade,
  primary key (lead_id, etiqueta_id)
);
comment on table public.leads_etiquetas is 'Qué etiquetas puso cada persona en un lead (hasta 20 suyas por lead). Sólo se leen las de etiquetas propias; las escribe lead_etiquetas_poner(), que exige ver el lead. Compartir el lead no las comparte.';

create table public.tipos_seguimiento (
  id     uuid primary key default gen_random_uuid(),
  clave  text not null unique,
  nombre text not null,
  icono  text,
  activo boolean not null default true,
  orden  smallint not null default 0
);

create table public.seguimientos (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid not null references public.leads (id) on delete cascade,
  usuario_id      uuid not null references public.perfiles (id),
  tipo_id         uuid not null references public.tipos_seguimiento (id) on delete restrict,
  titulo          text not null,
  detalle_doc     jsonb,                          -- el documento del editor (lista blanca de _seguimiento_detalle); nulo = sin detalle o sólo texto plano
  detalle_texto   text,                           -- lo deriva la base del documento (o lo escribe el alta): buscar, portal y respaldo
  visibilidad     public.visibilidad_seguimiento not null default 'privado',  -- publico = «Visible para el cliente» (portal)
  ocurrido_en     timestamptz not null default now(),
  vehiculo_id     uuid,                           -- FK en 06_vehiculos
  eliminado_en    timestamptz,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),   -- versión: la sellan las RPC con la hora del reloj
  constraint seguimientos_titulo_largo check (char_length(titulo) between 1 and 120),
  constraint seguimientos_detalle_texto_largo check (detalle_texto is null or char_length(detalle_texto) <= 5000),
  constraint seguimientos_detalle_doc_objeto check (detalle_doc is null or jsonb_typeof(detalle_doc) = 'object')
);
create index seguimientos_usuario_idx on public.seguimientos (usuario_id);
create index seguimientos_tipo_idx on public.seguimientos (tipo_id);
create index seguimientos_vehiculo_idx on public.seguimientos (vehiculo_id) where vehiculo_id is not null;
comment on table public.seguimientos is 'Contactos con el lead. Se escriben sólo por RPC (crear_lead, seguimiento_*), y sólo su autor con el lead en su cartera. Nacen privados: privado = sólo lo ve su autor; público («Visible para el cliente») = lo ven también quienes ven el lead y el portal. El detalle viaja como documento del editor (detalle_doc), nunca como HTML; detalle_texto lo deriva la base. Un seguimiento no mueve la versión del lead.';

create table public.recordatorios (
  id             uuid primary key default gen_random_uuid(),
  usuario_id     uuid not null references public.perfiles (id) on delete cascade,
  lead_id        uuid references public.leads (id) on delete cascade,
  vehiculo_id    uuid,                            -- FK en 06_vehiculos
  titulo         text not null,
  recordar_en    timestamptz not null,
  notificado_en  timestamptz,
  completado_en  timestamptz,
  eliminado_en   timestamptz,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),   -- versión: la sellan las RPC con la hora del reloj
  constraint recordatorios_titulo_largo check (char_length(titulo) between 1 and 120)
);
create index recordatorios_usuario_idx on public.recordatorios (usuario_id, recordar_en) where completado_en is null and eliminado_en is null;
create index recordatorios_lead_idx on public.recordatorios (lead_id) where lead_id is not null;
create index recordatorios_vehiculo_idx on public.recordatorios (vehiculo_id) where vehiculo_id is not null;
comment on table public.recordatorios is 'Recordatorios personales con fecha y hora: sólo los ve y los toca su dueño, y se escriben sólo por RPC (crear_lead, recordatorio_*). Con lead, crearlo exige tenerlo en la cartera; si después lo pierde, el recordatorio sigue siendo suyo y recordatorios_vista lo entrega sin el lead. Se muestran en la ficha (y en la agenda, Fase 7) y disparan una notificación a su hora.';

-- Embudos personales: de cada persona, que no los ve nadie más (ni la supervisión). Se escriben sólo
-- por RPC (`embudo_*`), que garantizan una sola etapa inicial, al menos una ganada y una perdida, y los
-- topes. `actualizado_en` es la versión de la estructura (nombre y etapas): la sellan las RPC.
create table public.embudos (
  id             uuid primary key default gen_random_uuid(),
  usuario_id     uuid not null references public.perfiles (id) on delete cascade,
  nombre         text not null,
  es_default     boolean not null default false,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint embudos_nombre_largo check (char_length(nombre) between 1 and 40),
  constraint embudos_usuario_id_id_key unique (usuario_id, id)
);
create unique index embudos_default_unico on public.embudos (usuario_id) where es_default;
create unique index embudos_nombre_unico on public.embudos (usuario_id, lower(nombre));
comment on table public.embudos is 'Embudos de oportunidades de cada persona: sólo los ve y los toca su dueña, y se escriben sólo por RPC (embudo_*). El de por defecto lo crea embudo_por_defecto() la primera vez que hace falta.';

-- El color es una clave de la paleta cerrada de las etiquetas (espejo de `_etiquetas_paleta()`).
create table public.embudos_etapas (
  id         uuid primary key default gen_random_uuid(),
  embudo_id  uuid not null references public.embudos (id) on delete cascade,
  nombre     text not null,
  color      text not null default 'gris',
  es_inicial boolean not null default false,
  es_ganada  boolean not null default false,
  es_perdida boolean not null default false,
  orden      smallint not null default 0,
  constraint embudos_etapas_nombre_largo check (char_length(nombre) between 1 and 30),
  constraint embudos_etapas_color_paleta check (color in ('gris', 'rojo', 'naranja', 'ambar', 'verde', 'turquesa', 'azul', 'violeta')),
  constraint embudos_etapas_final_unica check (not (es_ganada and es_perdida)),
  constraint embudos_etapas_inicial_no_final check (not (es_inicial and (es_ganada or es_perdida))),
  constraint embudos_etapas_embudo_id_id_key unique (embudo_id, id)
);
create unique index embudos_etapas_nombre_unico on public.embudos_etapas (embudo_id, lower(nombre));
create unique index embudos_etapas_inicial_unica on public.embudos_etapas (embudo_id) where es_inicial;

-- Las FK compuestas garantizan que la etapa es del embudo y que el embudo es de quien tiene la
-- oportunidad: transferir mueve embudo y etapa juntos. `estado` lo deriva un trigger de la etapa
-- (salvo `cancelada`, que pone la baja). `moneda` es la de la empresa al crearla (no se convierte).
create table public.oportunidades (
  id                 uuid primary key default gen_random_uuid(),
  lead_id            uuid not null references public.leads (id) on delete cascade,
  vehiculo_id        uuid,                        -- FK en 06_vehiculos
  -- Una cuenta que se borra (no la baja, que las cancela) se lleva sus oportunidades, como sus embudos.
  usuario_id         uuid not null references public.perfiles (id) on delete cascade,
  embudo_id          uuid not null,
  etapa_id           uuid not null,
  estado             public.estado_oportunidad not null default 'abierta',
  titulo             text not null,
  notas              text,
  monto_estimado     numeric(18, 2),
  moneda             char(3) not null,
  motivo_perdida     text,
  ultima_actividad_en timestamptz not null default now(),
  eliminado_en       timestamptz,
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),   -- versión: la sellan las RPC con la hora del reloj
  constraint oportunidades_embudo_de_la_persona foreign key (usuario_id, embudo_id)
    references public.embudos (usuario_id, id) on delete restrict,
  constraint oportunidades_etapa_del_embudo foreign key (embudo_id, etapa_id)
    references public.embudos_etapas (embudo_id, id) on delete restrict,
  constraint oportunidades_titulo_largo check (char_length(titulo) between 1 and 120),
  constraint oportunidades_notas_largo check (notas is null or char_length(notas) <= 2000),
  constraint oportunidades_monto_rango check (monto_estimado is null or (monto_estimado >= 0 and monto_estimado < 1000000000000)),
  constraint oportunidades_moneda_iso check (moneda ~ '^[A-Z]{3}$'),
  constraint oportunidades_motivo_largo check (motivo_perdida is null or char_length(motivo_perdida) <= 200)
);
create index oportunidades_tablero_idx on public.oportunidades (usuario_id, etapa_id, ultima_actividad_en desc, id desc) where eliminado_en is null;
create index oportunidades_usuario_embudo_idx on public.oportunidades (usuario_id, embudo_id);
create index oportunidades_embudo_etapa_idx on public.oportunidades (embudo_id, etapa_id);
comment on table public.oportunidades is 'Negocios de un lead dentro de un embudo de una persona. Un lead puede tener varias. Ganada/perdida no la saca del kanban: queda en su columna final. Se escriben sólo por RPC (oportunidad_*): exigen ser su dueña, la cartera del lead y leads.editar. Sólo las ve su dueña, mientras tenga el lead en su cartera.';

create table public.oportunidades_historial (
  id             bigint generated always as identity primary key,
  oportunidad_id uuid not null references public.oportunidades (id) on delete cascade,
  de_etapa_id    uuid references public.embudos_etapas (id) on delete set null,
  a_etapa_id     uuid references public.embudos_etapas (id) on delete set null,
  usuario_id     uuid references public.perfiles (id) on delete set null,
  creado_en      timestamptz not null default now()
);

create table public.accesos_portal (
  lead_id             uuid primary key references public.leads (id) on delete cascade,
  codigo              text not null unique check (codigo ~ '^[A-Z]{2,4}-[2-9A-HJ-NP-Z]{5}$'),
  clave_hash          text not null,
  habilitado          boolean not null default true,
  debe_cambiar_clave  boolean not null default true,
  intentos_fallidos   smallint not null default 0,
  bloqueado_hasta     timestamptz,
  ultimo_ingreso_en   timestamptz,
  otorgado_por        uuid references public.perfiles (id) on delete set null,
  otorgado_en         timestamptz not null default now(),
  revocado_por        uuid references public.perfiles (id) on delete set null,
  revocado_en         timestamptz
);
comment on table public.accesos_portal is 'Acceso del cliente al portal de la web pública. Código dictable (prefijo de la empresa + 5 sin I/O/0/1) + clave con bcrypt. 5 fallos → 15 min de bloqueo. `otorgado_en` es la versión del acceso: la sesión del portal la lleva y deja de valer al revocar o volver a otorgar. El equipo lo lee con `portal_estado`; la web, con las `web.portal_*` (service_role).';
-- Lo que teclea el cliente se compara sin el guion (`web.portal_login`).
create unique index accesos_portal_codigo_sin_guion_key on public.accesos_portal (replace(codigo, '-', ''));

-- >>> schemas/06_vehiculos/01_vehiculos.sql
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
alter table public.recordatorios add constraint recordatorios_vehiculo_fk foreign key (vehiculo_id) references public.vehiculos (id) on delete set null;
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

-- >>> schemas/07_cotizaciones/01_cotizaciones.sql
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

-- >>> schemas/08_repuestos/01_repuestos.sql
-- Módulo repuestos: proyecto por vehículo, ítems que recorren el flujo de repuestos,
-- stock, compras y su propio cotizador.

create table public.repuestos_catalogos (
  id        uuid primary key default gen_random_uuid(),
  catalogo  text not null check (catalogo in ('tipo_pieza', 'condicion', 'modo_transporte', 'pais_origen')),
  nombre    text not null,
  datos     jsonb not null default '{}'::jsonb,  -- p.ej. tipo_pieza: {caja_usd, caja_bob}
  activo    boolean not null default true,
  orden     smallint not null default 0,
  unique (catalogo, nombre)
);
comment on table public.repuestos_catalogos is 'Valores configurables de repuestos (tipo de pieza, condición, vía de transporte, país). Ninguna migración los llena.';

create table public.repuestos_proyectos (
  id               uuid primary key default gen_random_uuid(),
  numero           bigint generated always as identity unique,
  vehiculo_id      uuid references public.vehiculos (id) on delete set null,  -- NULL = vehículo externo
  vehiculo_etiqueta text,
  vin              text,
  lead_id          uuid references public.leads (id) on delete set null,
  cliente_nombre   text,
  cliente_telefono text,
  notas            text,
  cerrado_en       timestamptz,
  creado_por       uuid references public.perfiles (id),
  eliminado_en     timestamptz,
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now()
);
create unique index repuestos_proyecto_por_vehiculo on public.repuestos_proyectos (vehiculo_id) where vehiculo_id is not null and eliminado_en is null;
comment on table public.repuestos_proyectos is 'Un proyecto de repuestos por vehículo (o externo). El cliente es dato propio con vínculo opcional a un lead.';

create table public.repuestos_items (
  id               uuid primary key default gen_random_uuid(),
  proyecto_id      uuid not null references public.repuestos_proyectos (id) on delete cascade,
  descripcion      text not null,
  tipo_pieza_id    uuid references public.repuestos_catalogos (id) on delete set null,
  condicion_id     uuid references public.repuestos_catalogos (id) on delete set null,
  pais_origen_id   uuid references public.repuestos_catalogos (id) on delete set null,
  modo_transporte_id uuid references public.repuestos_catalogos (id) on delete set null,
  cantidad         int not null default 1 check (cantidad > 0),
  precio_cliente   numeric(18, 2),
  moneda           char(3) references public.monedas (codigo),
  fase_id          uuid references public.fases (id) on delete restrict,
  fase_desde       timestamptz,
  tracking         text,
  en_stock_desde   timestamptz,           -- sobrante: no cuenta para la espera del vehículo
  stock_cantidad   int not null default 0 check (stock_cantidad >= 0),
  notas            text,
  creado_por       uuid references public.perfiles (id),
  eliminado_en     timestamptz,
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now()
);
comment on table public.repuestos_items is 'ES EL ÍTEM el que recorre el flujo de repuestos (fase_id → fases del flujo ambito=repuestos). Ningún costo vive acá: precio_cliente es precio, los costos van en repuestos_compras (permiso aparte).';

alter table public.historial_fases add constraint historial_fases_repuesto_fk foreign key (repuesto_id) references public.repuestos_items (id) on delete cascade;

create table public.repuestos_items_imagenes (
  id        uuid primary key default gen_random_uuid(),
  item_id   uuid not null references public.repuestos_items (id) on delete cascade,
  ruta      text not null,
  orden     smallint not null default 0,
  creado_en timestamptz not null default now()
);

create table public.repuestos_stock_movimientos (
  id         bigint generated always as identity primary key,
  item_id    uuid not null references public.repuestos_items (id) on delete cascade,
  cantidad   int not null check (cantidad <> 0),
  motivo     text not null,
  usuario_id uuid references public.perfiles (id),
  creado_en  timestamptz not null default now()
);

create table public.repuestos_compras (
  id           uuid primary key default gen_random_uuid(),
  proyecto_id  uuid not null references public.repuestos_proyectos (id) on delete cascade,
  item_id      uuid references public.repuestos_items (id) on delete set null,
  proveedor    text,
  moneda       char(3) not null references public.monedas (codigo),
  monto        numeric(18, 2) not null check (monto >= 0),
  tipo_cambio_aplicado numeric(18, 6),
  monto_base   numeric(18, 2),
  fecha        date not null default current_date,
  comprobante_ruta text,
  notas        text,
  creado_por   uuid references public.perfiles (id),
  eliminado_en timestamptz,
  creado_en    timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
comment on table public.repuestos_compras is 'COSTO. Se lee sólo con repuestos.costos.ver. El margen del proyecto = Σ precios de ítems − Σ compras, por moneda.';

create table public.repuestos_cotizador_config (
  id               bigint generated always as identity primary key,
  factor_importado numeric(10, 4) not null check (factor_importado > 0),
  recargo_local    numeric(10, 4) not null check (recargo_local >= 0),
  redondeo         numeric(10, 2) not null default 1,
  vigente_desde    timestamptz not null default now(),
  creado_por       uuid references public.perfiles (id)
);
comment on table public.repuestos_cotizador_config is 'Append-only: la vigente es la de id más alto.';

create table public.repuestos_tramos_logistica (
  id       uuid primary key default gen_random_uuid(),
  moneda   char(3) not null references public.monedas (codigo),
  costo_min numeric(18, 2) not null,
  costo_max numeric(18, 2),                 -- NULL = sin tope
  monto    numeric(18, 2) not null,
  activo   boolean not null default true,
  check (costo_max is null or costo_max > costo_min)
);

create table public.repuestos_cajas (
  id       uuid primary key default gen_random_uuid(),
  moneda   char(3) not null references public.monedas (codigo),
  monto    numeric(18, 2) not null check (monto > 0),
  activa   boolean not null default true,
  unique (moneda, monto)
);

create table public.repuestos_cotizaciones (
  id              uuid primary key default gen_random_uuid(),
  numero          bigint generated always as identity unique,
  proyecto_id     uuid not null references public.repuestos_proyectos (id) on delete cascade,
  moneda          char(3) not null references public.monedas (codigo),
  estado          public.estado_cotizacion_repuestos not null default 'borrador',
  config_snapshot jsonb not null,
  total           numeric(18, 2),
  notas           text,
  creado_por      uuid references public.perfiles (id),
  aceptada_en     timestamptz,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

create table public.repuestos_cotizaciones_lineas (
  id              uuid primary key default gen_random_uuid(),
  cotizacion_id   uuid not null references public.repuestos_cotizaciones (id) on delete cascade,
  item_id         uuid references public.repuestos_items (id) on delete set null,
  descripcion     text not null,
  tipo_pieza_id   uuid references public.repuestos_catalogos (id) on delete set null,
  condicion_id    uuid references public.repuestos_catalogos (id) on delete set null,
  bloque          text not null check (bloque in ('importado', 'local')),
  cantidad        int not null default 1 check (cantidad > 0),
  costo           numeric(18, 2),
  logistica_sugerida numeric(18, 2),
  logistica       numeric(18, 2),
  caja_sugerida   numeric(18, 2),
  caja            numeric(18, 2),
  total           numeric(18, 2),
  orden           smallint not null default 0
);

-- >>> schemas/09_logistica/01_logistica.sql
-- Módulo logística: lo que le pasa a una unidad (vehículo o repuesto) mientras recorre su
-- flujo: documentos, transporte, aduana, gastos, pagos, notas. Todo cuelga de la unidad.

create table public.documentos (
  id                uuid primary key default gen_random_uuid(),
  vehiculo_id       uuid references public.vehiculos (id) on delete cascade,
  repuesto_id       uuid references public.repuestos_items (id) on delete cascade,
  tipo_documento_id uuid not null references public.tipos_documento (id) on delete restrict,
  estado            public.estado_documento not null default 'subido',
  ruta              text,                       -- bucket privado `documentos`; NULL mientras está pendiente
  nombre_archivo    text,
  mime              text,
  bytes             int,
  emitido_el        date,
  recibido_el       date,
  vence_el          date,
  subido_por        uuid references public.perfiles (id),
  revisado_por      uuid references public.perfiles (id),
  revisado_en       timestamptz,
  motivo_rechazo    text,
  visible_portal    boolean not null default false,
  nota              text,
  eliminado_en      timestamptz,
  eliminado_por     uuid references public.perfiles (id),
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now(),
  check (num_nonnulls(vehiculo_id, repuesto_id) = 1)
);
comment on table public.documentos is 'Archivos del ciclo de una unidad. Borrado suave; el objeto de Storage nunca se borra desde la fila (puede estar compartido). Un requisito cuenta aprobados, vivos y no vencidos.';

create table public.puertos (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null,
  pais   text,
  codigo text,
  activo boolean not null default true,
  orden  smallint not null default 0,
  unique (nombre, pais)
);

create table public.navieras (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activo boolean not null default true
);

create table public.transportes (
  id                uuid primary key default gen_random_uuid(),
  vehiculo_id       uuid unique references public.vehiculos (id) on delete cascade,
  repuesto_id       uuid unique references public.repuestos_items (id) on delete cascade,
  sigue_al_vehiculo boolean not null default false,   -- repuesto que viaja con su vehículo: se LEE del padre
  naviera_id        uuid references public.navieras (id) on delete set null,
  puerto_origen_id  uuid references public.puertos (id) on delete set null,
  puerto_destino_id uuid references public.puertos (id) on delete set null,
  contenedor        text,
  booking           text,
  zarpe_el          date,
  eta_el            date,
  arribo_el         date,
  notas             text,
  actualizado_por   uuid references public.perfiles (id),
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now(),
  check (num_nonnulls(vehiculo_id, repuesto_id) = 1),
  check (not sigue_al_vehiculo or (naviera_id is null and contenedor is null and booking is null))
);
comment on table public.transportes is 'Transporte 1:1 por unidad. «Embarque» y «contenedor» NO son entidades: son grupos por booking o contenedor sobre esta tabla (vista embarques).';

create table public.flujos_transporte_oferta (
  flujo_id   uuid not null references public.flujos (id) on delete cascade,
  tipo       text not null check (tipo in ('puerto_origen', 'puerto_destino', 'naviera')),
  puerto_id  uuid references public.puertos (id) on delete cascade,
  naviera_id uuid references public.navieras (id) on delete cascade,
  primary key (flujo_id, tipo, puerto_id, naviera_id),
  check ((tipo = 'naviera') = (naviera_id is not null)),
  check ((tipo <> 'naviera') = (puerto_id is not null))
);
comment on table public.flujos_transporte_oferta is 'Qué puertos y navieras ofrecen los selectores de un flujo. Lista vacía = todo. Filtra lo ofrecido, nunca invalida lo guardado.';

create table public.declaraciones_aduana (
  id               uuid primary key default gen_random_uuid(),
  numero           text not null unique,
  canal            public.canal_aforo,
  aceptada_el      date,
  vence_tributos_el date,
  despachante      text,
  deposito         text,
  notas            text,
  creado_por       uuid references public.perfiles (id),
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now()
);
comment on table public.declaraciones_aduana is 'DUI como dato estructurado y delgado: el archivo va en documentos, los tributos en gastos (categoría con propósito tributos), el avance en fases. Composición congelada al asignarse canal de aforo.';

create table public.declaraciones_vehiculos (
  declaracion_id uuid not null references public.declaraciones_aduana (id) on delete cascade,
  vehiculo_id    uuid not null references public.vehiculos (id) on delete cascade,
  agregado_en    timestamptz not null default now(),
  removido_en    timestamptz,
  primary key (declaracion_id, vehiculo_id)
);
create unique index declaraciones_vehiculo_activo_unico on public.declaraciones_vehiculos (vehiculo_id) where removido_en is null;

create table public.categorias_gasto (
  id        uuid primary key default gen_random_uuid(),
  nombre    text not null unique,
  proposito text check (proposito is null or proposito in ('tributos', 'flete', 'grua', 'chaperia', 'despachante', 'otro')),
  activo    boolean not null default true,
  orden     smallint not null default 0
);

create table public.gastos (
  id                   uuid primary key default gen_random_uuid(),
  vehiculo_id          uuid references public.vehiculos (id) on delete cascade,
  repuesto_id          uuid references public.repuestos_items (id) on delete cascade,
  categoria_id         uuid not null references public.categorias_gasto (id) on delete restrict,
  proveedor            text,
  moneda               char(3) not null references public.monedas (codigo),
  monto                numeric(18, 2) not null check (monto >= 0),
  tipo_cambio_aplicado numeric(18, 6),
  monto_base           numeric(18, 2) not null,
  fecha                date not null default current_date,
  comprobante_ruta     text,
  notas                text,
  creado_por           uuid references public.perfiles (id),
  eliminado_en         timestamptz,
  creado_en            timestamptz not null default now(),
  actualizado_en       timestamptz not null default now(),
  check (num_nonnulls(vehiculo_id, repuesto_id) = 1)
);
comment on table public.gastos is 'Gasto REAL imputado a una unidad, en su moneda y convertido a la base con el tipo de cambio aplicado. Se compara contra la cotización final (desviación) y contra la venta (margen).';

create table public.pagos (
  id                   uuid primary key default gen_random_uuid(),
  vehiculo_id          uuid references public.vehiculos (id) on delete cascade,
  proyecto_repuestos_id uuid references public.repuestos_proyectos (id) on delete cascade,
  lead_id              uuid references public.leads (id) on delete set null,
  concepto             text not null,
  moneda               char(3) not null references public.monedas (codigo),
  monto                numeric(18, 2) not null check (monto > 0),
  tipo_cambio_aplicado numeric(18, 6),
  monto_base           numeric(18, 2) not null,
  metodo               text,
  fecha                date not null default current_date,
  confirmado           boolean not null default false,
  confirmado_por       uuid references public.perfiles (id),
  confirmado_en        timestamptz,
  comprobante_ruta     text,
  notas                text,
  creado_por           uuid references public.perfiles (id),
  eliminado_en         timestamptz,
  creado_en            timestamptz not null default now(),
  actualizado_en       timestamptz not null default now(),
  check (num_nonnulls(vehiculo_id, proyecto_repuestos_id) = 1)
);
comment on table public.pagos is 'Pago del CLIENTE. Confirmar es un acto aparte (permiso logistica.pagos.confirmar) y queda sellado.';

create table public.notas (
  id                uuid primary key default gen_random_uuid(),
  vehiculo_id       uuid references public.vehiculos (id) on delete cascade,
  repuesto_id       uuid references public.repuestos_items (id) on delete cascade,
  historial_fase_id bigint references public.historial_fases (id) on delete set null,
  cuerpo            text not null,
  autor_id          uuid not null references public.perfiles (id),
  eliminado_en      timestamptz,
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now(),
  check (num_nonnulls(vehiculo_id, repuesto_id) = 1)
);
comment on table public.notas is 'Bloc de notas de una unidad. La nota de un cambio de fase apunta a su fila de historial. Sólo el autor edita o borra.';

-- >>> schemas/10_agenda/01_agenda.sql
-- Módulo agenda: eventos y tareas. Los recordatorios viven en leads (recordatorios) y las
-- subastas en vehiculos.subasta_en; la agenda los compone en una vista.

create table public.eventos (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null,
  descripcion   text,
  inicia_en     timestamptz not null,
  termina_en    timestamptz,
  lugar         text,
  estado        public.estado_agenda not null default 'pendiente',
  visibilidad   public.visibilidad_evento not null default 'privado',
  lead_id       uuid references public.leads (id) on delete set null,
  vehiculo_id   uuid references public.vehiculos (id) on delete set null,
  creado_por    uuid not null references public.perfiles (id),
  eliminado_en  timestamptz,
  creado_en     timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  check (termina_en is null or termina_en >= inicia_en)
);

create table public.eventos_destinatarios (
  evento_id  uuid not null references public.eventos (id) on delete cascade,
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  primary key (evento_id, usuario_id)
);

create table public.tareas (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null,
  descripcion    text,
  vence_en       timestamptz,
  estado         public.estado_agenda not null default 'pendiente',
  responsable_id uuid not null references public.perfiles (id),
  creado_por     uuid not null references public.perfiles (id),
  lead_id        uuid references public.leads (id) on delete set null,
  vehiculo_id    uuid references public.vehiculos (id) on delete set null,
  cotizacion_id  uuid references public.cotizaciones (id) on delete set null,
  completada_en  timestamptz,
  eliminado_en   timestamptz,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
comment on table public.tareas is 'Tarea con responsable y vencimiento. Dar una tarea exige agenda.tareas.asignar; recibirla, agenda.tareas.recibir (se valida en el trigger). responsable_id sólo cambia por reasignar_tarea().';

-- >>> schemas/11_chat/01_chat.sql
-- Módulo chat: conversaciones directas, grupos y el canal global; mensajes con fichas y
-- menciones de entidades del sistema.

create table public.conversaciones (
  id          uuid primary key default gen_random_uuid(),
  tipo        public.tipo_conversacion not null,
  nombre      text,
  es_global   boolean not null default false,   -- el «chat global»: entran los que tienen chat.global
  creado_por  uuid references public.perfiles (id),
  creado_en   timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  check ((tipo = 'grupo') = (nombre is not null))
);
create unique index conversaciones_global_unica on public.conversaciones (es_global) where es_global;

create table public.conversaciones_miembros (
  conversacion_id uuid not null references public.conversaciones (id) on delete cascade,
  usuario_id      uuid not null references public.perfiles (id) on delete cascade,
  ultimo_leido_en timestamptz,
  silenciada      boolean not null default false,
  agregado_en     timestamptz not null default now(),
  primary key (conversacion_id, usuario_id)
);
comment on table public.conversaciones_miembros is 'Membresía: eje de TODA la RLS del chat. Los no leídos se calculan contra ultimo_leido_en.';

create table public.mensajes (
  id              uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references public.conversaciones (id) on delete cascade,
  autor_id        uuid not null references public.perfiles (id),
  tipo            public.tipo_mensaje not null default 'texto',
  cuerpo          text,
  evento_id       uuid references public.eventos (id) on delete restrict,
  tarea_id        uuid references public.tareas (id) on delete restrict,
  vehiculo_id     uuid references public.vehiculos (id) on delete set null,
  lead_id         uuid references public.leads (id) on delete set null,
  cotizacion_id   uuid references public.cotizaciones (id) on delete set null,
  responde_a_id   uuid references public.mensajes (id) on delete set null,
  editado_en      timestamptz,
  eliminado_en    timestamptz,
  creado_en       timestamptz not null default now(),
  check (
    (tipo = 'texto' and cuerpo is not null) or
    (tipo = 'evento' and evento_id is not null) or
    (tipo = 'tarea' and tarea_id is not null) or
    (tipo = 'vehiculo' and vehiculo_id is not null) or
    (tipo = 'lead' and lead_id is not null) or
    (tipo = 'cotizacion' and cotizacion_id is not null)
  )
);
comment on table public.mensajes is 'Mensajes. Una ficha (evento/tarea/vehículo/lead/cotización) NO amplía el alcance del lector: se hidrata bajo su propia RLS y muestra un placeholder si no accede.';

create table public.mensajes_menciones (
  mensaje_id    uuid not null references public.mensajes (id) on delete cascade,
  tipo          text not null check (tipo in ('usuario', 'vehiculo', 'lead', 'cotizacion')),
  referencia_id uuid not null,
  primary key (mensaje_id, tipo, referencia_id)
);
comment on table public.mensajes_menciones is 'Menciones por # dentro del texto. Sin FK: la mención sobrevive a la purga y se pinta como «eliminado».';

-- >>> schemas/12_notificaciones/01_notificaciones.sql
-- Módulo notificaciones: campana, realtime y push.

create table public.notificaciones (
  id               bigint generated always as identity primary key,
  usuario_id       uuid not null references public.perfiles (id) on delete cascade,
  tipo             text not null,            -- 'turno_web', 'recordatorio', 'demora_fase', 'tarea_asignada', 'lead_duplicado', …
  titulo           text not null,
  cuerpo           text,
  referencia_tipo  text,
  referencia_id    uuid,
  ruta             text,                     -- a dónde lleva el clic
  requiere_accion  boolean not null default false,
  leida_en         timestamptz,
  accionada_en     timestamptz,
  creado_en        timestamptz not null default now()
);
create unique index notificaciones_antispam on public.notificaciones (usuario_id, tipo, referencia_id) where accionada_en is null and referencia_id is not null;
comment on table public.notificaciones is 'Una por (destinatario, tipo, referencia) mientras esté abierta: anti-spam estructural. Las escriben triggers y RPC, nunca el cliente.';

create table public.suscripciones_push (
  id         uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  endpoint   text not null unique,
  claves     jsonb not null,                 -- {p256dh, auth}
  user_agent text,
  creado_en  timestamptz not null default now(),
  ultimo_envio_en timestamptz,
  fallos     smallint not null default 0
);

-- >>> schemas/13_actividad/01_actividad.sql
-- Módulo actividad: auditoría genérica, 14 días (ajustes_empresa.actividad_dias).

create table public.actividad (
  id          bigint generated always as identity primary key,
  accion      text not null,            -- 'lead.creado', 'vehiculo.fase_cambiada', 'rol.permiso_otorgado'…
  actor_id    uuid,
  tabla       text,
  registro_id text,
  antes       jsonb,
  despues     jsonb,
  detalle     jsonb,
  creado_en   timestamptz not null default now()
);
comment on table public.actividad is 'Registro inmutable de acciones. Lo escriben triggers y RPC (registrar_actividad). Se purga por pg_cron pasados ajustes_empresa.actividad_dias. Sólo lo lee quien tiene actividad.ver.';

-- El límite de exportaciones por hora y persona (`leads_exportacion_registrar`) cuenta por actor y acción.
create index actividad_actor_accion_idx on public.actividad (actor_id, accion, creado_en desc);
-- `crear_lead` pregunta si un intento ya adoptó un lead del limbo: sin este índice recorría la tabla entera.
create index actividad_intento_adopcion_idx on public.actividad ((detalle ->> 'intento')) where accion = 'lead.adoptado_del_limbo';

-- >>> schemas/14_web/01_web.sql
-- Módulo web: contenido y política de la web pública (que vive en otro repo y consume el
-- esquema `web`), cola de turnos, solicitudes de contacto y eventos anónimos.

create table public.ajustes_web (
  id                      int primary key default 1 check (id = 1),
  nombre_sitio            text,
  lema                    text,
  whatsapp_respaldo       text check (whatsapp_respaldo is null or whatsapp_respaldo ~ '^\+[1-9][0-9]{6,14}$'),
  horario                 text,
  redes                   jsonb not null default '{}'::jsonb,   -- {facebook, tiktok, instagram, youtube}
  mostrar_moneda_secundaria boolean not null default true,
  origenes_visibles       uuid[] not null default '{}',          -- qué orígenes salen en el catálogo
  cola_activa             boolean not null default true,
  ttl_contacto_minutos    int not null default 30 check (ttl_contacto_minutos between 5 and 1440),
  dias_pegajoso           int not null default 30 check (dias_pegajoso between 0 and 365),
  max_abiertas_default    int not null default 3 check (max_abiertas_default between 1 and 50),
  max_intentos            int not null default 3 check (max_intentos between 1 and 10),
  legales                 jsonb not null default '{}'::jsonb,   -- {cookies_html, privacidad_html, accesibilidad_html, terminos_html}
  seo                     jsonb not null default '{}'::jsonb,
  -- La dirección pública de la web (la arma el texto para WhatsApp del acceso al portal). Sin pantalla
  -- hasta Configuración › Sitio web (Fase 8): nula, el texto sale sin enlace.
  direccion_publica       text check (direccion_publica is null or direccion_publica ~ '^https://[^[:space:]]+$'),
  actualizado_en          timestamptz not null default now(),
  actualizado_por         uuid references public.perfiles (id)
);
comment on table public.ajustes_web is 'Fila única. Contenido y política de la web pública. Separado de ajustes_empresa a propósito.';

create table public.web_categorias_guias (
  id     uuid primary key default gen_random_uuid(),
  slug   text not null unique,
  nombre text not null,
  orden  smallint not null default 0,
  activa boolean not null default true
);

create table public.web_guias (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  titulo          text not null,
  resumen         text,
  cuerpo_html     text not null default '',
  portada_ruta    text,
  categoria_id    uuid references public.web_categorias_guias (id) on delete set null,
  autor_id        uuid references public.perfiles (id) on delete set null,
  minutos_lectura smallint,
  seo_titulo      text,
  seo_descripcion text,
  publicada_en    timestamptz,                -- NULL = borrador
  orden           smallint not null default 0,
  creado_por      uuid references public.perfiles (id),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

create table public.web_faqs (
  id        uuid primary key default gen_random_uuid(),
  pregunta  text not null,
  respuesta text not null,
  categoria text,
  publicada boolean not null default false,
  orden     smallint not null default 0,
  actualizado_en timestamptz not null default now()
);

create table public.web_testimonios (
  id                  uuid primary key default gen_random_uuid(),
  lead_id             uuid references public.leads (id) on delete set null,
  cliente             text not null,
  ciudad              text,
  texto               text not null,
  vehiculo            text,
  foto_ruta           text,
  publicado           boolean not null default false,
  consent_por         uuid references public.perfiles (id),
  consent_en          timestamptz,
  consent_canal       text,
  consent_ciudad      boolean not null default false,
  consent_vehiculo    boolean not null default false,
  consent_foto        boolean not null default false,
  consent_retirado_en timestamptz,
  orden               smallint not null default 0,
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now()
);
comment on table public.web_testimonios is 'Publicar el nombre de un cliente exige su consentimiento registrado (quién, cuándo, canal) con alcance por dato. La vista web.testimonios exige el trío cargado y no retirado.';

create table public.cola_web_asesores (
  usuario_id           uuid primary key references public.perfiles (id) on delete cascade,
  habilitado           boolean not null default false,    -- lo enciende quien administra la cola (publicar de menos)
  disponible           boolean not null default true,     -- lo pone el propio asesor
  max_abiertas         int check (max_abiertas is null or max_abiertas between 1 and 50),
  prioridad            smallint not null default 0,       -- mayor = más turnos (peso en la ruleta)
  orden                smallint not null default 0,
  ultima_asignacion_en timestamptz,
  asignadas_total      int not null default 0,
  contactadas_total    int not null default 0,
  vencidas_total       int not null default 0
);
comment on table public.cola_web_asesores is 'La rueda de turnos. Tabla aparte de perfiles: se escribe en cada clic de un anónimo. prioridad > 0 da turnos extra (ponderado).';

create table public.solicitudes_contacto_web (
  id                   uuid primary key default gen_random_uuid(),
  codigo               text not null unique,            -- '#WEB-4F2K'
  token_visitante      text not null check (token_visitante ~ '^[A-Za-z0-9_-]{16,64}$'),
  usuario_id           uuid references public.perfiles (id) on delete set null,
  estado               public.estado_solicitud_web not null default 'asignada',
  es_directa           boolean not null default false,
  fuente               text not null,                   -- boton_general | ficha_vehiculo | perfil_asesor | listado | guia | portal
  ruta                 text,
  vehiculo_id          uuid references public.vehiculos (id) on delete set null,
  utm                  jsonb,
  intento              smallint not null default 1,
  solicitud_previa_id  uuid references public.solicitudes_contacto_web (id) on delete set null,
  asignada_en          timestamptz not null default now(),
  vence_en             timestamptz,
  contactada_en        timestamptz,
  contactada_por       uuid references public.perfiles (id),
  senal_contacto       text,                            -- manual | seguimiento | lead_creado
  lead_id              uuid references public.leads (id) on delete set null,
  creado_en            timestamptz not null default now()
);
comment on table public.solicitudes_contacto_web is 'Una fila por cada «Contactar asesor» en la web. Es el mecanismo del turno, la bitácora del canal y la métrica del embudo.';

create table public.eventos_web (
  id            bigint generated always as identity primary key,
  token         text not null,
  evento        text not null check (evento in ('page_view', 'vehiculo_view', 'contacto_click', 'guia_view', 'filtro_uso', 'asesor_view')),
  ruta          text,
  referencia_id uuid,
  utm           jsonb,
  creado_en     timestamptz not null default now()
);
comment on table public.eventos_web is 'Eventos anónimos de primera parte. NO guarda IP ni user agent. Se borra a los 12 meses.';

-- >>> schemas/15_datos/01_datos.sql
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
