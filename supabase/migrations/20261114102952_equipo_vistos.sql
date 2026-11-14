-- «Visto» y «último visto» por persona y por módulo (`docs/GLOSARIO.md`): abrir la ficha o el resumen de un registro en un módulo lo marca visto en
-- ese módulo (el mismo vehículo visto en Vehículos no cuenta en Logística). Aparte de `visitados` (los últimos abiertos del buscador, tope 50): esta
-- tabla crece con lo que cada persona abre y se purga por la retención que cada una elige en `/perfil` (`preferencias_usuario.vistos`).

create table public.vistos (
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  modulo text not null,
  tipo text not null,
  referencia_id uuid not null,
  visto_en timestamptz not null default now(),
  primary key (usuario_id, modulo, tipo, referencia_id),
  constraint vistos_modulo_check check (modulo in ('vehiculos', 'leads', 'cotizaciones', 'agenda', 'logistica', 'repuestos', 'notificaciones')),
  constraint vistos_tipo_check check (tipo in ('vehiculo', 'lead', 'cotizacion', 'evento', 'tarea', 'proyecto_repuestos', 'notificacion'))
);

comment on table public.vistos is 'Lo que cada persona abrió, por módulo: la fila de una lista se marca «vista» y la última, «último visto». Se escribe por visto_registrar(); se purga por vistos_purgar() con la retención de cada persona.';

-- El último visto de un módulo (`vistos_de`, `limit 1`) y la purga por persona (`vistos_purgar`). La lectura de una página va por la PK.
create index vistos_ultimo_idx on public.vistos (usuario_id, modulo, tipo, visto_en desc);
create index vistos_usuario_visto_idx on public.vistos (usuario_id, visto_en);

alter table public.vistos enable row level security;
revoke all on table public.vistos from anon, authenticated;
grant select, delete on table public.vistos to authenticated;
grant all on table public.vistos to service_role;

-- Cada persona ve y borra sólo lo suyo; se escribe sólo por la RPC.
create policy "vistos: leer" on public.vistos for select to authenticated
  using (usuario_id = (select auth.uid()));
create policy "vistos: borrar" on public.vistos for delete to authenticated
  using (usuario_id = (select auth.uid()));

-- La preferencia: `{ activado, dias, ultimo }`; los días, sólo los de la lista de `/perfil`.
alter table public.preferencias_usuario
  add constraint preferencias_vistos_valida check (
    clave <> 'vistos'
    or (jsonb_typeof(valor) = 'object'
        and (not (valor ? 'dias') or valor -> 'dias' = any (array['7', '30', '90', '365']::jsonb[]))
        and (not (valor ? 'activado') or jsonb_typeof(valor -> 'activado') = 'boolean')
        and (not (valor ? 'ultimo') or jsonb_typeof(valor -> 'ultimo') = 'boolean'))
  );

-- Marca visto un registro en un módulo para quien llama. Con «Vistos» apagado no escribe. Un mismo registro abierto otra vez dentro de 30 s no vuelve
-- a escribir (antirrebote en la base). Una fila nueva sólo entra si la persona tiene menos de 20.000 (techo: el id no se valida contra su tabla, así
-- que un bucle no llena la base); la purga libera lugar. Devuelve si escribió.
create function public.visto_registrar(p_modulo text, p_tipo text, p_id uuid) returns boolean
  language plpgsql security definer
  set search_path = ''
  as $$
declare
  v_yo uuid := (select auth.uid());
  v_n int;
begin
  if v_yo is null then
    raise exception 'Tu sesión venció. Vuelve a ingresar.' using errcode = '42501';
  end if;
  if exists (select 1 from public.preferencias_usuario p
              where p.usuario_id = v_yo and p.clave = 'vistos' and (p.valor ->> 'activado') = 'false') then
    return false;
  end if;
  -- Ya visto: sólo se mueve la hora (por la PK), con el antirrebote.
  update public.vistos v set visto_en = now()
  where v.usuario_id = v_yo and v.modulo = p_modulo and v.tipo = p_tipo and v.referencia_id = p_id
    and v.visto_en < now() - interval '30 seconds';
  get diagnostics v_n = row_count;
  if v_n > 0 or exists (select 1 from public.vistos v
                         where v.usuario_id = v_yo and v.modulo = p_modulo and v.tipo = p_tipo and v.referencia_id = p_id) then
    return v_n > 0;
  end if;
  -- Nuevo: el techo por persona, contado con tope (vistos_usuario_visto_idx).
  if (select count(*) from (select 1 from public.vistos v where v.usuario_id = v_yo limit 20000) x) >= 20000 then
    return false;
  end if;
  insert into public.vistos (usuario_id, modulo, tipo, referencia_id)
  values (v_yo, p_modulo, p_tipo, p_id)
  on conflict (usuario_id, modulo, tipo, referencia_id) do nothing;
  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;

revoke all on function public.visto_registrar(text, text, uuid) from public, anon;
grant execute on function public.visto_registrar(text, text, uuid) to authenticated, service_role;

-- Lo visto de una página (hasta 100 ids, por la PK) y el último visto del módulo (vistos_ultimo_idx, limit 1), de quien llama: una llamada por página.
create function public.vistos_de(p_modulo text, p_tipo text, p_ids uuid[]) returns jsonb
  language sql stable security invoker
  set search_path = ''
  as $$
  select jsonb_build_object(
    'vistos', coalesce((
      select jsonb_agg(jsonb_build_object('id', v.referencia_id, 'visto_en', v.visto_en))
      from public.vistos v
      where v.usuario_id = (select auth.uid()) and v.modulo = p_modulo and v.tipo = p_tipo
        and v.referencia_id = any (coalesce(p_ids[1:100], '{}'::uuid[]))
    ), '[]'::jsonb),
    'ultimo', (
      select v.referencia_id
      from public.vistos v
      where v.usuario_id = (select auth.uid()) and v.modulo = p_modulo and v.tipo = p_tipo
      order by v.visto_en desc
      limit 1
    )
  );
$$;

revoke all on function public.vistos_de(text, text, uuid[]) from public, anon;
grant execute on function public.vistos_de(text, text, uuid[]) to authenticated, service_role;

-- La purga, cada hora: por persona, lo más viejo que su retención (7 días si nunca eligió), por lotes de 5.000 y hasta 50.000 por corrida
-- (vistos_usuario_visto_idx). El orden de las personas rota con la hora, así el tope nunca deja siempre a las mismas sin purgar.
create function public.vistos_purgar() returns integer
  language plpgsql security definer
  set search_path = ''
  as $$
declare
  c_lote constant int := 5000;
  c_tope constant int := 50000;
  v_total int := 0;
  v_n int;
  u record;
begin
  for u in
    select p.id, coalesce((pu.valor ->> 'dias')::int, 7) as dias
    from public.perfiles p
    left join public.preferencias_usuario pu on pu.usuario_id = p.id and pu.clave = 'vistos'
    order by md5(p.id::text || to_char(now(), 'YYYYMMDDHH24'))
  loop
    loop
      delete from public.vistos v
      where (v.usuario_id, v.modulo, v.tipo, v.referencia_id) in (
        select x.usuario_id, x.modulo, x.tipo, x.referencia_id
        from public.vistos x
        where x.usuario_id = u.id and x.visto_en < now() - make_interval(days => u.dias)
        limit c_lote);
      get diagnostics v_n = row_count;
      v_total := v_total + v_n;
      exit when v_n < c_lote or v_total >= c_tope;
    end loop;
    exit when v_total >= c_tope;
  end loop;
  return v_total;
end;
$$;

revoke all on function public.vistos_purgar() from public, anon, authenticated;
grant execute on function public.vistos_purgar() to service_role;

select cron.schedule('vistos-purgar', '20 * * * *', 'select public.vistos_purgar()');
