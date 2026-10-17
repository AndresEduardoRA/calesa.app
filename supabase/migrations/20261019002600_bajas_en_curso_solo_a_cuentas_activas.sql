-- `_bajas_en_curso()` no le dice nada a una cuenta que ya no está activa (cierre 2, paso 0a).
--
-- La función es `definer` y `authenticated` la ejecuta: devuelve quiénes están en una baja en curso. Para una cuenta activa eso es
-- un subconjunto de lo que `perfiles` ya le entrega (su policy es `es_usuario_activo()`, y `equipo_bajas.usuario_id` es una
-- clave a `perfiles`). Una cuenta apagada o bloqueada, en cambio, conserva su sesión hasta que vence el JWT, `perfiles` ya no le
-- entrega nada, y la función seguía diciéndole quién más está en baja. Ahora devuelve la lista vacía a quien no está activo.
-- Los jobs y `service_role` no tienen `auth.uid()` y siguen viéndola entera. No cambia lo que ve nadie más: una cuenta apagada
-- tampoco lee leads (`alcance_de()` y `tiene_permiso()` ya la dejan sin permisos).
--
-- La condición va escrita en línea y no con `es_usuario_activo()`: `atributos_lead()` llama a esta función por cada fila de una
-- página, y la llamada a la otra función `definer` sumaba 6 ms a la página de 51 leads (13 -> 20 ms con 62.000 leads); en línea
-- cuesta lo mismo que antes (medido, mejor de 9 en la misma sesión).

create or replace function public._bajas_en_curso()
returns uuid[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(b.usuario_id order by b.usuario_id), '{}'::uuid[])
    from public.equipo_bajas b
   where b.terminada_en is null
     and ((select auth.uid()) is null
          or exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and p.activo and not p.bloqueado));
$$;
