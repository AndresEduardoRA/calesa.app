-- Los últimos abiertos del buscador (paso 7.12-1): `visita_registrar()` escribe la visita propia y deja a lo sumo 50 por persona; el índice lo lee
-- «Últimos abiertos» (7.12-2) y el tope. Las policies y los grants de `visitados` no cambian: cada quien lee y escribe sólo las suyas.

-- Lo que leen «Últimos abiertos» y el tope: las visitas de una persona de la más nueva a la más vieja.
create index visitados_usuario_visto_idx on public.visitados (usuario_id, visto_en desc);

create function public.visita_registrar(p_tipo text, p_id uuid)
returns void
language plpgsql volatile
set search_path = ''
as $$
declare
  v_yo constant uuid := (select auth.uid());
  v_corte record;
begin
  if v_yo is null then
    raise exception 'Necesitas iniciar sesión.' using errcode = '42501';
  end if;
  if p_tipo is null or p_tipo not in ('lead', 'vehiculo', 'cotizacion') then
    raise exception 'Ese tipo de visita no existe.' using errcode = '22023', hint = 'tipo';
  end if;
  if p_id is null then
    raise exception 'Falta qué se visitó.' using errcode = '22023', hint = 'id';
  end if;
  -- La fila propia, por la PK (usuario_id, tipo, referencia_id). No mira si la entidad se ve: no revela nada y la lectura la pasa por su RLS.
  insert into public.visitados (usuario_id, tipo, referencia_id, visto_en)
  values (v_yo, p_tipo, p_id, now())
  on conflict (usuario_id, tipo, referencia_id) do update set visto_en = excluded.visto_en;
  -- El tope: la 51.ª más nueva (por `visitados_usuario_visto_idx`, sin offset ni count) y todas las más viejas que ella se van.
  select x.visto_en, x.tipo, x.referencia_id into v_corte
    from (select v.visto_en, v.tipo, v.referencia_id, row_number() over (order by v.visto_en desc, v.tipo desc, v.referencia_id desc) as n
            from public.visitados v
           where v.usuario_id = v_yo
           order by v.visto_en desc, v.tipo desc, v.referencia_id desc
           limit 51) x
   where x.n = 51;
  if found then
    delete from public.visitados v
     where v.usuario_id = v_yo
       and (v.visto_en, v.tipo, v.referencia_id) <= (v_corte.visto_en, v_corte.tipo, v_corte.referencia_id);
  end if;
end $$;

revoke all on function public.visita_registrar(text, uuid) from public, anon;
grant execute on function public.visita_registrar(text, uuid) to authenticated;

comment on function public.visita_registrar(text, uuid) is
  'Registra que quien llama abrió un lead, un vehículo o una cotización (7.12): upsert de su fila de visitados y a lo sumo 50 por persona (se van las más viejas). Invocadora: la RLS de visitados ata todo a (select auth.uid()). Sin sesión, 42501; tipo o id inválidos, 22023 con hint. La llamará <RegistrarVisita> en las fichas (7.13).';
