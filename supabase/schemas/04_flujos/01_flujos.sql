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
