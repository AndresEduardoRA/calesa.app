-- Módulo leads: prospectos y clientes, cartera por asesor, seguimientos, recordatorios,
-- etiquetas y favoritos privados, embudos de oportunidades, acceso al portal.

create table public.origenes_lead (
  id     uuid primary key default gen_random_uuid(),
  clave  text not null unique,
  nombre text not null,
  activo boolean not null default true,
  orden  smallint not null default 0
);
comment on table public.origenes_lead is 'Por dónde llegó el lead (Facebook, web, referido…). Configurable.';

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
  telefono_cc          text not null default '+591',
  telefono_principal   text not null,                -- normalizado: dígitos con código de país
  tipo                 public.tipo_lead not null default 'prospecto',
  origen_lead_id       uuid references public.origenes_lead (id) on delete restrict,
  atributos            jsonb not null default '{}'::jsonb check (jsonb_typeof(atributos) = 'object'),  -- los campos de leads_campos; no es legible: se lee por leads_vista
  creado_por           uuid references public.perfiles (id),   -- NULL = sin creador vivo (limbo se decide por cartera)
  ultimo_seguimiento_en timestamptz,
  eliminado_en         timestamptz,
  eliminado_por        uuid references public.perfiles (id),
  lote_papelera_id     uuid references public.lotes_papelera (id) on delete restrict,
  creado_en            timestamptz not null default now(),
  actualizado_en       timestamptz not null default now(),
  check (telefono_principal ~ '^[0-9]{7,15}$')
);
create unique index leads_telefono_unico on public.leads (telefono_principal) where eliminado_en is null;
comment on table public.leads is 'Prospectos y clientes. El teléfono principal es único entre leads vivos y sólo lo ve completo quien está en la cartera (leads_asesores): la app lee leads_vista, no esta tabla. Un lead sin asesores vigentes está en el LIMBO: invisible hasta que alguien lo adopta registrando su teléfono. Fijos: nombre, teléfono, tipo y origen; el resto son campos configurables (leads_campos) y viven en atributos, que sólo lee quien está en la cartera completos.';

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
  telefono text not null,
  etiqueta text
);

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
create table public.leads_tachados (
  lead_id    uuid not null references public.leads (id) on delete cascade,
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  creado_en  timestamptz not null default now(),
  primary key (lead_id, usuario_id)
);
comment on table public.leads_tachados is 'Tachado POR USUARIO: tachar un lead compartido no lo tacha para el otro asesor. Privado incluso para el dueño del sistema.';

create table public.etiquetas (
  id         uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  nombre     text not null,
  color      text not null default '#465fff' check (color ~ '^#[0-9a-fA-F]{6}$'),
  unique (usuario_id, nombre)
);
create table public.leads_etiquetas (
  lead_id     uuid not null references public.leads (id) on delete cascade,
  etiqueta_id uuid not null references public.etiquetas (id) on delete cascade,
  primary key (lead_id, etiqueta_id)
);

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
  detalle_html    text,                          -- saneado en servidor con allowlist del editor
  detalle_texto   text,                          -- versión plana para buscar
  visibilidad     public.visibilidad_seguimiento not null default 'privado',  -- publico = sale en el portal del cliente
  ocurrido_en     timestamptz not null default now(),
  vehiculo_id     uuid,                           -- FK en 06_vehiculos
  eliminado_en    timestamptz,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);
comment on table public.seguimientos is 'Contactos con el lead. Nacen privados; público = visible en el portal del cliente. Un co-asesor ve sólo los públicos del otro.';

create table public.recordatorios (
  id             uuid primary key default gen_random_uuid(),
  usuario_id     uuid not null references public.perfiles (id) on delete cascade,
  lead_id        uuid references public.leads (id) on delete cascade,
  vehiculo_id    uuid,                            -- FK en 06_vehiculos
  titulo         text not null,
  detalle_html   text,
  recordar_en    timestamptz not null,
  notificado_en  timestamptz,
  completado_en  timestamptz,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
comment on table public.recordatorios is 'Recordatorios personales con fecha y hora. Se muestran en la agenda y disparan una notificación (y push) a su hora.';

create table public.embudos (
  id         uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  nombre     text not null,
  es_default boolean not null default false,
  creado_en  timestamptz not null default now(),
  unique (usuario_id, nombre)
);
create unique index embudos_default_unico on public.embudos (usuario_id) where es_default;

create table public.embudos_etapas (
  id         uuid primary key default gen_random_uuid(),
  embudo_id  uuid not null references public.embudos (id) on delete cascade,
  nombre     text not null,
  color      text not null default '#717c93' check (color ~ '^#[0-9a-fA-F]{6}$'),
  es_inicial boolean not null default false,
  es_ganada  boolean not null default false,
  es_perdida boolean not null default false,
  orden      smallint not null default 0,
  unique (embudo_id, nombre),
  check (not (es_ganada and es_perdida))
);

create table public.oportunidades (
  id                 uuid primary key default gen_random_uuid(),
  lead_id            uuid not null references public.leads (id) on delete cascade,
  vehiculo_id        uuid,                        -- FK en 06_vehiculos
  usuario_id         uuid not null references public.perfiles (id),
  embudo_id          uuid not null references public.embudos (id) on delete restrict,
  etapa_id           uuid not null references public.embudos_etapas (id) on delete restrict,
  estado             public.estado_oportunidad not null default 'abierta',
  titulo             text not null,
  notas              text,
  monto_estimado     numeric(18, 2),
  ultima_actividad_en timestamptz not null default now(),
  eliminado_en       timestamptz,
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now()
);
comment on table public.oportunidades is 'Negocios de un lead dentro de un embudo del asesor. Un lead puede tener varias. Ganada/perdida no la saca del kanban: queda en su columna final.';

create table public.oportunidades_historial (
  id             bigint generated always as identity primary key,
  oportunidad_id uuid not null references public.oportunidades (id) on delete cascade,
  de_etapa_id    uuid references public.embudos_etapas (id) on delete set null,
  a_etapa_id     uuid references public.embudos_etapas (id) on delete set null,
  usuario_id     uuid references public.perfiles (id),
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
  otorgado_por        uuid references public.perfiles (id),
  otorgado_en         timestamptz not null default now(),
  revocado_por        uuid references public.perfiles (id),
  revocado_en         timestamptz
);
comment on table public.accesos_portal is 'Acceso del cliente al portal de la web pública. Código dictable (sin I/O/0/1) + clave con bcrypt. 5 fallos → 15 min de bloqueo. Sólo lo lee la web vía RPC portal_* con service_role.';
