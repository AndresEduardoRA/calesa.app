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
