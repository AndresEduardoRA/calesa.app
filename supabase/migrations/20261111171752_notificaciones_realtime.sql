-- La campana en vivo (paso 7.01-1): `notificaciones` entra en la publicación de Realtime. `postgres_changes` reparte la fila bajo la
-- policy «notificaciones: leer» (sólo el destinatario), con lo mismo que ya lee por PostgREST. Los DELETE no pasan por RLS en Realtime
-- (llegan a todo suscriptor con la PK): 7.02 se suscribe sólo a INSERT y UPDATE con `usuario_id=eq.<yo>`. Una nube que ya la
-- publicara no cae.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notificaciones'
  ) then
    alter publication supabase_realtime add table public.notificaciones;
  end if;
end $$;
