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
  whatsapp           text,
  email              text,
  logo_ruta          text,                      -- bucket público `marca`
  logo_oscuro_ruta   text,
  color_acento       text check (color_acento ~ '^#[0-9a-fA-F]{6}$'),
  locale             text not null default 'es-BO',
  zona_horaria       text not null default 'America/La_Paz',
  moneda_base        char(3) not null default 'USD',
  registro_abierto   boolean not null default false,  -- aplicado en DB por trigger sobre auth.users
  papelera_dias      int not null default 30 check (papelera_dias between 1 and 365),
  actividad_dias     int not null default 14 check (actividad_dias between 1 and 365),
  demora_dias_default int not null default 7 check (demora_dias_default >= 0),
  lead_dormido_meses int not null default 3 check (lead_dormido_meses between 1 and 24),
  actualizado_en     timestamptz not null default now(),
  actualizado_por    uuid
);
comment on table public.ajustes_empresa is 'Fila única (id = 1). Marca, país, locale, zona horaria, moneda base y políticas globales. Nada de cotización vive acá: eso es formulas.';

create table public.monedas (
  codigo     char(3) primary key,
  nombre     text not null,
  simbolo    text not null,
  decimales  smallint not null default 2 check (decimales between 0 and 4),
  activa     boolean not null default true,
  orden      smallint not null default 0
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
  config         jsonb not null default '{}'::jsonb, -- NUNCA secretos: esos van en Vault o en env
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid
);
comment on table public.integraciones is 'Interruptor y configuración no secreta de cada integración. Las claves de API viven en Vault (vault.secrets) o en variables de entorno del despliegue, nunca acá.';
