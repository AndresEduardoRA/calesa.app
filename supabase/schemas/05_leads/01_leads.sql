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
