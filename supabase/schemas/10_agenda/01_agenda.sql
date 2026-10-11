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
