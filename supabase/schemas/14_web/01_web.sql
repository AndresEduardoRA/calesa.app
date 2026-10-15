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
