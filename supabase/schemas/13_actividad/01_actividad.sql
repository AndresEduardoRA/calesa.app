-- Módulo actividad: auditoría genérica, 14 días (ajustes_empresa.actividad_dias).

create table public.actividad (
  id          bigint generated always as identity primary key,
  accion      text not null,            -- 'lead.creado', 'vehiculo.fase_cambiada', 'rol.permiso_otorgado'…
  actor_id    uuid,
  tabla       text,
  registro_id text,
  antes       jsonb,
  despues     jsonb,
  detalle     jsonb,
  creado_en   timestamptz not null default now()
);
comment on table public.actividad is 'Registro inmutable de acciones. Lo escriben triggers y RPC (registrar_actividad). Se purga por pg_cron pasados ajustes_empresa.actividad_dias. Sólo lo lee quien tiene actividad.ver.';
