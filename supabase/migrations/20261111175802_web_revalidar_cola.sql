-- Revalidar la web pública (paso 8.06): la cola de lo que cambió. Cada tabla que alimenta la web anota su etiqueta con un trigger por
-- sentencia (no por fila: una limpieza de mil vehículos anota una vez); el job `web-revalidar` (siguiente migración) junta las etiquetas
-- cada minuto y se las manda al sitio en un solo pedido.
--
-- Sin clave única sobre `etiqueta` y sin `on conflict` (auditoría del plan): la inserción especulativa de `on conflict` espera el commit de
-- quien encoló primero, y serializaría todas las escrituras de vehículos de cada minuto (con interbloqueos nuevos). Un insert simple nunca
-- espera. Se deduplica sólo dentro de la propia transacción (`transaccion`): confiar en la fila confirmada de otra transacción dejaría que el
-- job la consuma y avise al sitio antes de que la propia confirme, y su cambio no se revalidaría. Lo que no está confirmado el job no lo ve
-- y sale al minuto siguiente. Las filas repetidas entre transacciones las borra el job al enviar o las compacta si no puede.

create table interno.web_revalidar_pendiente (
  id bigint generated always as identity primary key,
  etiqueta text not null check (etiqueta in ('guias', 'faqs', 'testimonios', 'ajustes', 'asesores', 'vehiculos')),
  transaccion xid8 not null default pg_current_xact_id(),
  pedido_en timestamptz not null default now()
);
comment on table interno.web_revalidar_pendiente is
  'Lo que cambió de la web pública y todavía no se le avisó al sitio: una fila por etiqueta y transacción. La escriben los triggers web_revalidar y la vacía web_revalidar_correr(). Sin índice único sobre etiqueta: un on conflict serializaría las escrituras.';
create index web_revalidar_pendiente_etiqueta_idx on interno.web_revalidar_pendiente (etiqueta, transaccion);
alter table interno.web_revalidar_pendiente enable row level security;
revoke all on table interno.web_revalidar_pendiente from public, anon, authenticated;

create or replace function public._web_revalidar_anotar() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  insert into interno.web_revalidar_pendiente (etiqueta)
  select tg_argv[0]
  where not exists (
    select 1 from interno.web_revalidar_pendiente q
    where q.etiqueta = tg_argv[0] and q.transaccion = pg_current_xact_id()
  );
  return null;
end $$;
comment on function public._web_revalidar_anotar() is
  'Trigger por sentencia: anota en la cola de revalidación la etiqueta que recibe como argumento, una vez por transacción.';
revoke all on function public._web_revalidar_anotar() from public, anon, authenticated;

create trigger web_revalidar after insert or update or delete on public.web_guias
  for each statement execute function public._web_revalidar_anotar('guias');
create trigger web_revalidar after insert or update or delete on public.web_categorias_guias
  for each statement execute function public._web_revalidar_anotar('guias');
create trigger web_revalidar after insert or update or delete on public.web_faqs
  for each statement execute function public._web_revalidar_anotar('faqs');
create trigger web_revalidar after insert or update or delete on public.web_testimonios
  for each statement execute function public._web_revalidar_anotar('testimonios');
create trigger web_revalidar after insert or update or delete on public.ajustes_web
  for each statement execute function public._web_revalidar_anotar('ajustes');
create trigger web_revalidar after insert or update or delete on public.ajustes_empresa
  for each statement execute function public._web_revalidar_anotar('ajustes');
create trigger web_revalidar after insert or update or delete on public.perfiles
  for each statement execute function public._web_revalidar_anotar('asesores');
-- Sólo el orden es público: `disponible`, `ultima_asignacion_en` y `asignadas_total` cambian con cada turno asignado.
create trigger web_revalidar after insert or delete or update of orden on public.cola_web_asesores
  for each statement execute function public._web_revalidar_anotar('asesores');
create trigger web_revalidar after insert or update or delete on public.vehiculos
  for each statement execute function public._web_revalidar_anotar('vehiculos');
create trigger web_revalidar after insert or update or delete on public.vehiculos_imagenes
  for each statement execute function public._web_revalidar_anotar('vehiculos');
create trigger web_revalidar after insert or update or delete on public.fases
  for each statement execute function public._web_revalidar_anotar('vehiculos');
create trigger web_revalidar after insert or update or delete on public.origenes
  for each statement execute function public._web_revalidar_anotar('vehiculos');
create trigger web_revalidar after insert or update or delete on public.origenes_campos
  for each statement execute function public._web_revalidar_anotar('vehiculos');
-- `interno.vitrina_vehiculos` publica `categorias.nombre`.
create trigger web_revalidar after insert or update or delete on public.categorias
  for each statement execute function public._web_revalidar_anotar('vehiculos');
-- Encender o apagar la web cambia qué vehículos se ven.
create trigger web_revalidar after insert or update or delete on public.integraciones
  for each statement execute function public._web_revalidar_anotar('vehiculos');

-- Catálogo: la fila de la integración la creaba sólo el seed, que la nube no vuelve a correr.
insert into public.integraciones (clave, activa, config) values ('web_publica', false, '{"revalidar_url": null}')
on conflict (clave) do nothing;
