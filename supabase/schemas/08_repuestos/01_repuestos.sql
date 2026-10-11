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
