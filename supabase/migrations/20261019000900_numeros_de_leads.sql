-- La numeración de los leads (9f-2): el número propio de cada creador y el permiso del número global.
--
-- Cada lead lleva dos números. El global (`leads.numero`, identity) ya existía. El propio
-- (`leads.numero_propio`) es un consecutivo por creador que se asigna al crear, por cualquier camino, con un
-- trigger `before insert`: cubre `_lead_crear` (alta e importación), la semilla y lo que venga. El contador es una
-- tabla de un renglón por creador (`leads_contadores`), no una sequence: el candado del renglón ordena a quienes
-- crean a la vez, y un rollback (también el de la subtransacción de una fila de la importación que falla) deshace
-- el incremento y no deja un hueco. Cuesta un acceso por clave primaria: lo mismo con 20 que con 50.000 leads.
--
-- Los dos números se *leen* de dos tablas (`leads_numeros_globales` y `leads_numeros_propios`), no de `leads`,
-- porque una columna no puede ser legible según quién mira y el global no debe llegar a quien no tiene
-- `leads.numero_global.ver`. La policy de cada una ES la regla. Esta migración sólo las crea y las llena; quitar
-- `leads.numero` de lo que se lee es la siguiente (`…001000_numero_global_enmascarado.sql`).
--
-- Un lead sin creador vivo (`creado_por` nulo) no lleva número propio, pero el que ya tenía se conserva si su
-- creador desaparece después (la copia guarda quién fue). Los números nunca se reasignan ni se reutilizan:
-- restaurar de la papelera los conserva y purgar no baja el contador.

-- ---------------------------------------------------------------------------------------------------
-- El permiso, y a quién se concede por defecto: el dueño y todo rol que hoy ve «todos» los leads.
-- ---------------------------------------------------------------------------------------------------
insert into public.permisos (clave, modulo, nombre, descripcion, por_origen, con_alcance, aplicado_en, orden) values
  ('leads.numero_global.ver', 'leads', 'Ver el número global de los leads',
   'Ver el número global de cada lead (el consecutivo de toda la empresa). Sin este permiso se ve sólo el número propio, y sólo de los leads que se crearon',
   false, false, 'policy leads_numeros_globales, policy leads_numeros_propios', 145)
on conflict (clave) do update set nombre = excluded.nombre, descripcion = excluded.descripcion, por_origen = excluded.por_origen,
  con_alcance = excluded.con_alcance, aplicado_en = excluded.aplicado_en, orden = excluded.orden;

insert into public.roles_permisos (rol_id, permiso_clave, alcance)
select distinct rp.rol_id, 'leads.numero_global.ver', 'todos'::public.alcance_permiso
  from public.roles_permisos rp
 where rp.permiso_clave = 'leads.ver' and rp.alcance = 'todos'
on conflict do nothing;
insert into public.roles_permisos (rol_id, permiso_clave, alcance)
select r.id, 'leads.numero_global.ver', 'todos' from public.roles r where r.clave = 'dueno'
on conflict do nothing;

-- ---------------------------------------------------------------------------------------------------
-- Grants y policies (RLS ya está encendida en el esquema)
-- ---------------------------------------------------------------------------------------------------
revoke all on table public.leads_contadores, public.leads_numeros_globales, public.leads_numeros_propios from anon, authenticated;
grant select, insert, update, delete on table public.leads_contadores, public.leads_numeros_globales, public.leads_numeros_propios to service_role;
-- El contador no se lee ni se escribe desde la app: sin grant y sin policy (lo escribe el trigger).

grant select on table public.leads_numeros_globales to authenticated;
create policy "leads_numeros_globales: leer" on public.leads_numeros_globales for select to authenticated
  using ((select public.tiene_permiso('leads.numero_global.ver'))
         and exists (select 1 from public.leads l where l.id = lead_id));

grant select on table public.leads_numeros_propios to authenticated;
create policy "leads_numeros_propios: leer" on public.leads_numeros_propios for select to authenticated
  using (((select public.tiene_permiso('leads.numero_global.ver')) or creado_por = (select auth.uid()))
         and exists (select 1 from public.leads l where l.id = lead_id));

-- ---------------------------------------------------------------------------------------------------
-- Asignar al crear: BEFORE INSERT. Ignora lo que traiga la fila: el número lo da el contador.
-- ---------------------------------------------------------------------------------------------------
create or replace function public.lead_numero_propio_asignar()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.creado_por is null then
    new.numero_propio := null;
  else
    insert into public.leads_contadores as c (usuario_id, ultimo) values (new.creado_por, 1)
    on conflict (usuario_id) do update set ultimo = c.ultimo + 1
    returning c.ultimo into new.numero_propio;
  end if;
  return new;
end;
$$;
revoke all on function public.lead_numero_propio_asignar() from public, anon, authenticated;
create trigger trg_lead_numero_propio before insert on public.leads
  for each row execute function public.lead_numero_propio_asignar();

-- El número propio no cambia nunca. Una sola excepción interna: renumerar por fila un lote de la importación,
-- que pone `importadora.numerar_lote = 'si'` sólo en su transacción (el relleno de lo que ya existía apaga el
-- trigger en su UPDATE).
create or replace function public.lead_numeros_inmutables()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.numero_propio is distinct from old.numero_propio
     and coalesce(current_setting('importadora.numerar_lote', true), 'no') <> 'si' then
    raise exception 'El número de un lead no cambia.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.lead_numeros_inmutables() from public, anon, authenticated;
create trigger trg_lead_numeros_inmutables before update of numero_propio on public.leads
  for each row execute function public.lead_numeros_inmutables();

-- Las copias que se leen: se escriben al crear, y la del número propio sigue al renumerado de un lote.
create or replace function public.lead_numeros_proyectar()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.leads_numeros_globales (lead_id, numero) values (new.id, new.numero);
    if new.numero_propio is not null then
      insert into public.leads_numeros_propios (lead_id, creado_por, numero) values (new.id, new.creado_por, new.numero_propio);
    end if;
  else
    update public.leads_numeros_propios p set numero = new.numero_propio where p.lead_id = new.id;
  end if;
  return null;
end;
$$;
revoke all on function public.lead_numeros_proyectar() from public, anon, authenticated;
create trigger trg_lead_numeros_proyectar after insert on public.leads
  for each row execute function public.lead_numeros_proyectar();
create trigger trg_lead_numeros_proyectar_cambio after update of numero_propio on public.leads
  for each row when (old.numero_propio is distinct from new.numero_propio and new.numero_propio is not null)
  execute function public.lead_numeros_proyectar();

-- ---------------------------------------------------------------------------------------------------
-- Los leads que ya existen: los que no tienen número se numeran por creador en el orden `creado_en, id`, a
-- continuación del mayor que ya tenga ese creador (también cuentan los de la papelera: un número nunca se
-- reutiliza); los contadores quedan en el último y se llenan las dos copias. Idempotente y segura de repetir: no
-- renumera lo que ya tiene número (un hueco por un lead purgado no corre a los demás) ni pisa quién fue el creador
-- de una copia. Sin grant: la llama esta migración y el sembrado de volumen.
-- ---------------------------------------------------------------------------------------------------
create or replace function public._leads_numerar_existentes()
returns void language plpgsql security definer set search_path = '' as $$
begin
  -- Sin los triggers de `leads` en este UPDATE (la versión, la auditoría, la copia, la inmutabilidad): con 62.000
  -- leads bajan de ~12 s a ~3,5 s, y ninguno tiene nada que hacer con un número que se está dando. El `alter` es
  -- transaccional: si algo falla, los triggers vuelven a estar encendidos.
  alter table public.leads disable trigger user;
  update public.leads l set numero_propio = x.n
    from (select s.id, coalesce(m.mayor, 0) + row_number() over (partition by s.creado_por order by s.creado_en, s.id)::integer as n
            from public.leads s
            left join (select creado_por, max(numero_propio) as mayor from public.leads
                        where numero_propio is not null group by creado_por) m on m.creado_por = s.creado_por
           where s.creado_por is not null and s.numero_propio is null) x
   where l.id = x.id;
  alter table public.leads enable trigger user;

  insert into public.leads_contadores as c (usuario_id, ultimo)
  select creado_por, max(numero_propio) from public.leads where creado_por is not null group by creado_por
  on conflict (usuario_id) do update set ultimo = greatest(c.ultimo, excluded.ultimo);

  insert into public.leads_numeros_globales (lead_id, numero) select id, numero from public.leads
  on conflict (lead_id) do nothing;
  insert into public.leads_numeros_propios (lead_id, creado_por, numero)
  select id, creado_por, numero_propio from public.leads where numero_propio is not null and creado_por is not null
  on conflict (lead_id) do update set numero = excluded.numero;
end;
$$;
revoke all on function public._leads_numerar_existentes() from public, anon, authenticated;
select public._leads_numerar_existentes();

-- ---------------------------------------------------------------------------------------------------
-- Importar: dentro de un lote las filas se insertan en el orden del teléfono (dos lotes que se cruzan toman los
-- candados en el mismo orden). El número propio, en cambio, se reparte por orden de FILA: el primero del archivo
-- lleva el menor. El renglón del contador sigue bloqueado por esta transacción desde la primera fila creada, así
-- que los números de este lote son un bloque contiguo y propio: sólo se reparten entre sus filas, en un UPDATE
-- (la unicidad de `leads` es diferible y se comprueba al final de la sentencia).
-- ---------------------------------------------------------------------------------------------------
create or replace function public.leads_importar_lote(p_importacion uuid, p_total integer, p_filas jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo uuid := (select auth.uid());
  v_cc text := (select e.telefono_cc from public.ajustes_empresa e where e.id = 1);
  v_dueno uuid;
  v_estado public.estado_importacion;
  v_fila record;
  v_lead jsonb;
  v_res jsonb;
  v_salida jsonb := '[]'::jsonb;
  v_numero_de_fila integer;
  v_sqlstate text;
  v_mensaje text;
  v_hint text;
  v_permitidas constant text[] := array['nombre', 'telefono_principal', 'tipo', 'origen_lead_id', 'atributos'];
  v_k text;
  v_ids uuid[] := '{}';
  v_filas integer[] := '{}';
begin
  perform public.assert_permiso('leads.crear');
  perform public.assert_activo();
  if p_importacion is null then
    raise exception 'Falta el identificador de la importación.' using errcode = '22023';
  end if;
  if p_total is null or p_total < 1 or p_total > 500 then
    raise exception 'Una importación lleva de 1 a 500 filas.' using errcode = '22023';
  end if;
  if p_filas is null or jsonb_typeof(p_filas) <> 'array' or jsonb_array_length(p_filas) < 1 or jsonb_array_length(p_filas) > 50 then
    raise exception 'Un lote lleva de 1 a 50 filas.' using errcode = '22023';
  end if;

  -- La importación es de quien la empieza: retomarla con el mismo id es lo que hace un reintento.
  insert into public.importaciones (id, usuario_id, entidad, archivo_ruta, estado, filas_total, iniciada_en)
  values (p_importacion, v_yo, 'leads', null, 'procesando', p_total, now())
  on conflict (id) do nothing;
  select i.usuario_id, i.estado into v_dueno, v_estado from public.importaciones i where i.id = p_importacion for update;
  if v_dueno is distinct from v_yo or not exists (select 1 from public.importaciones i where i.id = p_importacion and i.entidad = 'leads') then
    raise exception 'No encontramos esta importación.' using errcode = '42501';
  end if;
  if v_estado <> 'procesando' then
    raise exception 'Esta importación ya terminó.' using errcode = '22023';
  end if;

  -- Cada elemento, validado antes de tocar nada: una forma rota es un error del cliente, no de una fila.
  for v_fila in select e.value as v from jsonb_array_elements(p_filas) e loop
    if jsonb_typeof(v_fila.v) <> 'object' or jsonb_typeof(v_fila.v -> 'lead') is distinct from 'object'
       or jsonb_typeof(v_fila.v -> 'id') is distinct from 'string'
       or jsonb_typeof(v_fila.v -> 'fila') is distinct from 'number' then
      raise exception 'Una fila del lote no tiene la forma esperada.' using errcode = '22023';
    end if;
  end loop;

  -- En el orden del teléfono: dos lotes de dos personas que se cruzan toman los candados en el mismo
  -- orden y no se bloquean entre sí.
  for v_fila in
    select e.value as v, e.ordinality as ord
    from jsonb_array_elements(p_filas) with ordinality e
    order by public._telefono_o_nulo(v_cc, e.value -> 'lead' ->> 'telefono_principal') nulls first, e.ordinality
  loop
    v_numero_de_fila := (v_fila.v ->> 'fila')::integer;
    begin
      v_lead := v_fila.v -> 'lead';
      -- Sólo viajan las claves conocidas: `adoptar` y cualquier otra se rechazan, no se ignoran.
      for v_k in select jsonb_object_keys(v_lead) loop
        if not (v_k = any (v_permitidas)) then
          raise exception 'El dato «%» no se puede importar.', v_k using errcode = '22023', hint = v_k;
        end if;
      end loop;
      v_res := public._lead_crear((v_fila.v ->> 'id')::uuid, v_lead, null, null, false);
      if (v_res ->> 'resultado') = 'creado' then
        insert into public.importaciones_leads (importacion_id, lead_id, fila)
        values (p_importacion, (v_res ->> 'id')::uuid, v_numero_de_fila)
        on conflict do nothing;
        -- Los que ya existían (un reintento) conservan el número que tienen: sólo se reparten los de ahora.
        if not coalesce((v_res ->> 'repetido')::boolean, false) then
          v_ids := v_ids || (v_res ->> 'id')::uuid;
          v_filas := v_filas || v_numero_de_fila;
        end if;
        v_salida := v_salida || jsonb_build_array(jsonb_build_object(
          'id', v_fila.v ->> 'id', 'fila', v_numero_de_fila, 'resultado', 'creado',
          'numero', (v_res ->> 'numero')::bigint, 'repetido', coalesce((v_res ->> 'repetido')::boolean, false)));
      else
        -- existe, de_otro y limbo se dicen igual: en masa sólo se sabe que el número ya está.
        v_salida := v_salida || jsonb_build_array(jsonb_build_object(
          'id', v_fila.v ->> 'id', 'fila', v_numero_de_fila, 'resultado', 'ya_existe'));
      end if;
    exception when others then
      get stacked diagnostics v_sqlstate = returned_sqlstate, v_mensaje = message_text, v_hint = pg_exception_hint;
      -- Lo que levantan nuestras reglas es humano; lo inesperado no se cuenta.
      if v_sqlstate not in ('22023', '23502', '23514', 'PT409') then
        v_mensaje := 'No pudimos importar esta fila. Inténtalo de nuevo.';
        v_hint := null;
      end if;
      v_salida := v_salida || jsonb_build_array(jsonb_build_object(
        'id', v_fila.v ->> 'id', 'fila', v_numero_de_fila, 'resultado', 'error',
        'campo', nullif(v_hint, ''), 'motivo', v_mensaje));
    end;
  end loop;

  -- Los números propios de lo que entró ahora, repartidos por orden de fila (el menor, a la primera del archivo).
  if cardinality(v_ids) > 1 then
    perform set_config('importadora.numerar_lote', 'si', true);
    with a as (select t.id, row_number() over (order by t.fila) as rn from unnest(v_ids, v_filas) as t(id, fila)),
         n as (select l.numero_propio, row_number() over (order by l.numero_propio) as rn
                 from public.leads l where l.id = any (v_ids)),
         m as (select a.id, n.numero_propio from a join n using (rn))
    update public.leads l set numero_propio = m.numero_propio
      from m where l.id = m.id and l.numero_propio is distinct from m.numero_propio;
    perform set_config('importadora.numerar_lote', 'no', true);
  end if;

  update public.importaciones i set filas_ok = (select count(*) from public.importaciones_leads x where x.importacion_id = i.id)
   where i.id = p_importacion;
  return jsonb_build_object('importacion', p_importacion, 'filas', v_salida);
end;
$$;
revoke all on function public.leads_importar_lote(uuid, integer, jsonb) from public, anon;
grant execute on function public.leads_importar_lote(uuid, integer, jsonb) to authenticated;
