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
