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

-- El límite de exportaciones por hora y persona (`leads_exportacion_registrar`) cuenta por actor y acción.
create index actividad_actor_accion_idx on public.actividad (actor_id, accion, creado_en desc);
-- `crear_lead` pregunta si un intento ya adoptó un lead del limbo: sin este índice recorría la tabla entera.
create index actividad_intento_adopcion_idx on public.actividad ((detalle ->> 'intento')) where accion = 'lead.adoptado_del_limbo';
