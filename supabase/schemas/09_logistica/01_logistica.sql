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
