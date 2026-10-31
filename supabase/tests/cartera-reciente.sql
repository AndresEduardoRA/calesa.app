-- @test cartera-reciente (4.14-3a): el terreno y el relleno
-- `leads_asesores.lead_reciente_en` es una copia de `coalesce(leads.ultimo_seguimiento_en, leads.creado_en)` en TODAS las filas de la cartera de un lead (también las revocadas:
-- compartir revive una fila por `on conflict`, y ahí lo que calcula el `before insert` se descarta). La llenan el `before insert` y el trigger `trg_leads_reciente_seguir`; nadie
-- más la escribe. `now()` no cambia dentro de un bloque, así que todo lead del terreno parte con `creado_en` en el pasado y todo seguimiento lleva un `ocurrido_en` explícito, en
-- el pasado y distinto del `creado_en` de su lead y de los demás: un valor que cae en `now()` no distinguiría un trigger de otro. Corre después de `derivados-leads.sql`:
-- usa a sus personas (09d1, 09d2 y 09d4) y la dueña de la semilla.
create temp sequence cr_telefono start 79600000;

create or replace function pg_temp.cr_como(p_quien uuid, p_sql text) returns jsonb language plpgsql as $$
declare r jsonb;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  set local role authenticated;
  execute p_sql into r;
  reset role;
  return r;
exception when others then
  reset role;
  raise;
end $$;

-- Un lead de `p_dueno` por la RPC del alta (el teléfono se normaliza como siempre), con el alta en el pasado: la copia sigue al `creado_en`.
create or replace function pg_temp.cr_lead(p_dueno uuid, p_creado timestamptz, p_tel text default null) returns uuid language plpgsql as $$
declare v uuid := gen_random_uuid(); v_tel bigint := nextval('pg_temp.cr_telefono');
begin
  perform pg_temp.cr_como(p_dueno, format('select public.crear_lead(%L, %L::jsonb, null, null)', v,
    jsonb_build_object('nombre', 'Reciente ' || v_tel, 'telefono_principal', coalesce(p_tel, v_tel::text), 'origen_lead_id', (select id from public.origenes_lead where clave = 'web'))));
  update public.leads set creado_en = p_creado where id = v;
  return v;
end $$;

-- Un seguimiento por la RPC, de `p_quien` (que tiene el lead), con su `ocurrido_en`.
create or replace function pg_temp.cr_seg(p_quien uuid, p_lead uuid, p_ocurrido timestamptz) returns uuid language plpgsql as $$
declare v uuid := gen_random_uuid();
begin
  perform pg_temp.cr_como(p_quien, format('select public.seguimiento_crear(%L, %L, %L::jsonb)', v, p_lead,
    jsonb_build_object('tipo_id', (select id from public.tipos_seguimiento where clave = 'nota'), 'titulo', 'Reciente', 'ocurrido_en', p_ocurrido)));
  return v;
end $$;

create or replace function pg_temp.cr_version(p_seg uuid) returns timestamptz language sql as $$
  select actualizado_en from public.seguimientos where id = p_seg $$;

-- Toda fila de la cartera del lead (también las revocadas) vale `p_esperado`, y hay `p_filas`.
create or replace function pg_temp.cr_igual(p_lead uuid, p_esperado timestamptz, p_filas int, p_que text) returns void language plpgsql as $$
declare v_filas int; v_mal text;
begin
  select count(*), string_agg(format('%s=%s', la.usuario_id, la.lead_reciente_en), ', ') filter (where la.lead_reciente_en is distinct from p_esperado)
    into v_filas, v_mal from public.leads_asesores la where la.lead_id = p_lead;
  if v_filas <> p_filas then raise exception '%: % filas y esperaba %', p_que, v_filas, p_filas; end if;
  if v_mal is not null then raise exception '%: esperaba % y hay %', p_que, p_esperado, v_mal; end if;
end $$;

-- @test cartera-reciente (4.14-3a): el relleno deja cada fila igual a lo reciente de su lead, y llamado otra vez no cambia nada
do $$
declare
  a constant uuid := '00000000-0000-0000-0000-0000000009d1'; b constant uuid := '00000000-0000-0000-0000-0000000009d2';
  l1 uuid; l2 uuid; v_sucias int; v_n int;
begin
  l1 := pg_temp.cr_lead(a, '2020-01-01'::timestamptz);                -- sin seguimiento: lo reciente es el alta
  l2 := pg_temp.cr_lead(a, '2020-01-02'::timestamptz);
  perform pg_temp.cr_como(a, format('select public.lead_compartir(%L, %L)', l2, b));
  perform pg_temp.cr_seg(a, l2, '2020-03-01'::timestamptz);
  perform pg_temp.cr_como(a, format('select public.lead_revocar_acceso(%L, %L)', l2, b));  -- una fila revocada
  -- Las tres filas se ensucian a mano (con replica: la guarda corta toda escritura a profundidad 0) y el relleno corre también con replica.
  set local session_replication_role = replica;
  update public.leads_asesores set lead_reciente_en = '2000-01-01' where lead_id in (l1, l2);
  select count(*) into v_sucias from public.leads_asesores where lead_id in (l1, l2) and lead_reciente_en = '2000-01-01';
  v_n := public._leads_asesores_reciente_rellenar();
  set local session_replication_role = origin;
  if v_sucias <> 3 or v_n <> 3 then raise exception 'el relleno: % sucias y cambió %', v_sucias, v_n; end if;
  perform pg_temp.cr_igual(l1, '2020-01-01'::timestamptz, 1, 'el relleno, sin seguimiento');
  perform pg_temp.cr_igual(l2, '2020-03-01'::timestamptz, 2, 'el relleno, con seguimiento y una revocada');
  if public._leads_asesores_reciente_rellenar() <> 0 then raise exception 'el relleno cambió algo la segunda vez'; end if;
end $$;

-- @test cartera-reciente (4.14-3a): el alta, con y sin primer seguimiento
do $$
declare
  a constant uuid := '00000000-0000-0000-0000-0000000009d1'; v_web uuid := (select id from public.origenes_lead where clave = 'web');
  v_1 uuid := gen_random_uuid(); v_2 uuid := gen_random_uuid();
begin
  perform pg_temp.cr_como(a, format('select public.crear_lead(%L, %L::jsonb, null, null)', v_1,
    jsonb_build_object('nombre', 'Reciente alta', 'telefono_principal', nextval('pg_temp.cr_telefono')::text, 'origen_lead_id', v_web)));
  perform pg_temp.cr_igual(v_1, (select creado_en from public.leads where id = v_1), 1, 'alta sin seguimiento');
  perform pg_temp.cr_como(a, format('select public.crear_lead(%L, %L::jsonb, %L::jsonb, null)', v_2,
    jsonb_build_object('nombre', 'Reciente alta con seguimiento', 'telefono_principal', nextval('pg_temp.cr_telefono')::text, 'origen_lead_id', v_web),
    jsonb_build_object('tipo_id', (select id from public.tipos_seguimiento where clave = 'nota'), 'titulo', 'Primero', 'ocurrido_en', '2020-06-01'::timestamptz)));
  perform pg_temp.cr_igual(v_2, '2020-06-01'::timestamptz, 1, 'alta con primer seguimiento');
  if (select creado_en from public.leads where id = v_2) = '2020-06-01'::timestamptz then raise exception 'el terreno: el alta cae en el seguimiento'; end if;
end $$;

-- @test cartera-reciente (4.14-3a): seguimientos de un lead con dueño, compartido y una revocada: crear, eliminar, restaurar y cambiar la fecha
do $$
declare
  a constant uuid := '00000000-0000-0000-0000-0000000009d1'; b constant uuid := '00000000-0000-0000-0000-0000000009d2'; c constant uuid := '00000000-0000-0000-0000-0000000009d4';
  l uuid; s0 uuid; s1 uuid; s2 uuid;
begin
  l := pg_temp.cr_lead(a, '2020-01-01'::timestamptz);
  perform pg_temp.cr_como(a, format('select public.lead_compartir(%L, %L)', l, b));
  perform pg_temp.cr_como(a, format('select public.lead_compartir(%L, %L)', l, c));
  perform pg_temp.cr_como(a, format('select public.lead_revocar_acceso(%L, %L)', l, c));
  perform pg_temp.cr_igual(l, '2020-01-01'::timestamptz, 3, 'sin seguimientos');
  s1 := pg_temp.cr_seg(a, l, '2020-02-01'::timestamptz);
  perform pg_temp.cr_igual(l, '2020-02-01'::timestamptz, 3, 'el primer seguimiento');
  s2 := pg_temp.cr_seg(b, l, '2020-03-01'::timestamptz);                     -- de quien lo tiene compartido
  perform pg_temp.cr_igual(l, '2020-03-01'::timestamptz, 3, 'un seguimiento más nuevo');
  s0 := pg_temp.cr_seg(a, l, '2020-01-15'::timestamptz);
  perform pg_temp.cr_igual(l, '2020-03-01'::timestamptz, 3, 'uno más viejo no lo mueve');
  perform pg_temp.cr_como(b, format('select public.seguimiento_eliminar(%L, %L)', s2, pg_temp.cr_version(s2)));
  perform pg_temp.cr_igual(l, '2020-02-01'::timestamptz, 3, 'eliminar el último vuelve al anterior');
  perform pg_temp.cr_como(a, format('select public.seguimiento_eliminar(%L, %L)', s1, pg_temp.cr_version(s1)));
  perform pg_temp.cr_igual(l, '2020-01-15'::timestamptz, 3, 'eliminar otro');
  perform pg_temp.cr_como(a, format('select public.seguimiento_eliminar(%L, %L)', s0, pg_temp.cr_version(s0)));
  perform pg_temp.cr_igual(l, '2020-01-01'::timestamptz, 3, 'sin ninguno vuelve al alta');
  perform pg_temp.cr_como(a, format('select public.seguimiento_restaurar(%L, %L)', s1, pg_temp.cr_version(s1)));
  perform pg_temp.cr_igual(l, '2020-02-01'::timestamptz, 3, 'restaurar');
  perform pg_temp.cr_como(a, format('select public.seguimiento_guardar(%L, %L, %L::jsonb)', s1, pg_temp.cr_version(s1), jsonb_build_object('ocurrido_en', '2020-04-01'::timestamptz)));
  perform pg_temp.cr_igual(l, '2020-04-01'::timestamptz, 3, 'cambiar cuándo fue');
end $$;

-- @test cartera-reciente (4.14-3a): una fila revocada que revive por `on conflict` (compartir y «Tomar lead» del limbo) trae lo reciente de ahora, no el de cuando salió
do $$
declare
  a constant uuid := '00000000-0000-0000-0000-0000000009d1'; b constant uuid := '00000000-0000-0000-0000-0000000009d2';
  v_web uuid := (select id from public.origenes_lead where clave = 'web'); l uuid; v_tel text := nextval('pg_temp.cr_telefono')::text; r jsonb;
begin
  l := pg_temp.cr_lead(a, '2020-01-01'::timestamptz, v_tel);
  perform pg_temp.cr_como(a, format('select public.lead_compartir(%L, %L)', l, b));
  perform pg_temp.cr_como(a, format('select public.lead_revocar_acceso(%L, %L)', l, b));
  perform pg_temp.cr_seg(a, l, '2020-05-01'::timestamptz);                  -- mientras b está fuera
  perform pg_temp.cr_como(a, format('select public.lead_compartir(%L, %L)', l, b));  -- revive la fila de b
  perform pg_temp.cr_igual(l, '2020-05-01'::timestamptz, 2, 'compartir de nuevo');
  -- El limbo: el lead sin nadie, con un seguimiento nuevo hecho antes de la baja, y a toma el lead de nuevo (revive su propia fila).
  update public.leads_asesores set revocado_en = now() where lead_id = l;
  update public.seguimientos set ocurrido_en = '2020-07-01' where lead_id = l;
  perform pg_temp.cr_igual(l, '2020-07-01'::timestamptz, 2, 'el limbo, antes de tomarlo');
  r := pg_temp.cr_como(a, format('select public.crear_lead(%L, %L::jsonb, null, null)', gen_random_uuid(),
    jsonb_build_object('nombre', 'Reciente limbo', 'telefono_principal', v_tel, 'origen_lead_id', v_web, 'adoptar', true)));
  if not exists (select 1 from public.leads_asesores where lead_id = l and usuario_id = a and revocado_en is null) then raise exception 'el terreno: no tomó el lead (%)', r; end if;
  perform pg_temp.cr_igual(l, '2020-07-01'::timestamptz, 2, 'tomar del limbo');
end $$;

-- @test cartera-reciente (4.14-3a): quien entra a la cartera (compartir con alguien nuevo, sin `on conflict`; transferir) trae lo reciente del lead, no `now()` ni el alta
do $$
declare
  a constant uuid := '00000000-0000-0000-0000-0000000009d1'; b constant uuid := '00000000-0000-0000-0000-0000000009d2'; c constant uuid := '00000000-0000-0000-0000-0000000009d4';
  l uuid;
begin
  l := pg_temp.cr_lead(a, '2020-01-01'::timestamptz);
  perform pg_temp.cr_seg(a, l, '2020-02-01'::timestamptz);
  perform pg_temp.cr_como(a, format('select public.lead_compartir(%L, %L)', l, b));            -- b no tenía fila
  perform pg_temp.cr_igual(l, '2020-02-01'::timestamptz, 2, 'compartir con alguien nuevo');
  perform pg_temp.cr_como(a, format('select public.lead_transferir(%L, %L, %L)', l, c, a));    -- c no tenía fila
  perform pg_temp.cr_igual(l, '2020-02-01'::timestamptz, 3, 'transferir');
end $$;

-- @test cartera-reciente (4.14-3a): cambiar el alta mueve lo reciente de un lead sin seguimientos, y no el de uno con seguimientos
do $$
declare
  a constant uuid := '00000000-0000-0000-0000-0000000009d1'; b constant uuid := '00000000-0000-0000-0000-0000000009d2'; l1 uuid; l2 uuid;
begin
  l1 := pg_temp.cr_lead(a, '2020-01-01'::timestamptz);
  l2 := pg_temp.cr_lead(a, '2020-01-01'::timestamptz);
  perform pg_temp.cr_como(a, format('select public.lead_compartir(%L, %L)', l1, b));
  perform pg_temp.cr_seg(a, l2, '2020-02-01'::timestamptz);
  update public.leads set creado_en = '2020-01-10' where id in (l1, l2);
  perform pg_temp.cr_igual(l1, '2020-01-10'::timestamptz, 2, 'el alta de uno sin seguimientos');
  perform pg_temp.cr_igual(l2, '2020-02-01'::timestamptz, 1, 'el alta de uno con seguimientos');
end $$;

-- @test cartera-reciente (4.14-3a): nadie la escribe: la app no puede, la base a mano tampoco, y un insert con un valor falso lo pisa el trigger
do $$
declare
  a constant uuid := '00000000-0000-0000-0000-0000000009d1'; b constant uuid := '00000000-0000-0000-0000-0000000009d2'; l uuid; v_m text; v_e text;
begin
  l := pg_temp.cr_lead(a, '2020-01-01'::timestamptz);
  perform pg_temp.cr_seg(a, l, '2020-02-01'::timestamptz);
  begin
    perform pg_temp.cr_como(a, format($q$update public.leads_asesores set lead_reciente_en = '1999-01-01' where lead_id = %L returning to_jsonb(lead_id)$q$, l));
    raise exception 'authenticated escribió la copia';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.leads_asesores set lead_reciente_en = '1999-01-01' where lead_id = l;
    raise exception 'postgres a mano escribió la copia';
  exception when check_violation then
    get stacked diagnostics v_m = message_text;
    if v_m not like 'Lo reciente del lead en la cartera sigue al lead%' then raise exception 'el mensaje de la guarda: %', v_m; end if;
  end;
  insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, lead_reciente_en) values (l, b, 'compartido', '1999-01-01');
  perform pg_temp.cr_igual(l, '2020-02-01'::timestamptz, 2, 'un insert con un valor falso');
  v_e := (select count(*)::text from public.leads_asesores where lead_id = l and lead_reciente_en is null);
  if v_e <> '0' then raise exception 'hay filas sin lo reciente: %', v_e; end if;
end $$;

-- @test cartera-reciente (4.14-3a): las dos vistas dicen lo mismo, y el recorrido por cursor de «míos» por lo reciente da los mismos ids que ordenar leads_vista
-- Los cursores, con la forma de `aplicarCursor`: hacia adelante `<=` en la columna y `<` en la columna o en el id; hacia atrás, al revés recorriendo del más viejo al más nuevo.
create or replace function pg_temp.cr_ids(p_quien uuid, p_sql text) returns jsonb language sql as $$
  select coalesce(pg_temp.cr_como(p_quien, 'select coalesce(jsonb_agg(id), ''[]'') from (' || p_sql || ') t'), '[]') $$;

create or replace function pg_temp.cr_recorre(p_quien uuid, p_tam int, p_atras boolean) returns jsonb language plpgsql as $$
declare v_todo jsonb := '[]'; v_pag jsonb; v_cursor text := 'true'; v_dir text := case when p_atras then 'asc' else 'desc' end; v_op text := case when p_atras then '>' else '<' end;
  v_en timestamptz; v_id uuid; v_vueltas int := 0;
begin
  loop
    v_pag := pg_temp.cr_ids(p_quien, format('select id, reciente_en from public.leads_cartera_vista where %s order by reciente_en %s, id %s limit %s', v_cursor, v_dir, v_dir, p_tam + 1));
    exit when jsonb_array_length(v_pag) = 0;
    select coalesce(jsonb_agg(e), '[]') into v_pag from (select e from jsonb_array_elements(v_pag) with ordinality x(e, o) order by o limit p_tam) y;
    v_todo := v_todo || v_pag;
    exit when jsonb_array_length(v_pag) < p_tam;
    select reciente_en, id into v_en, v_id from public.leads_vista where id = (v_pag ->> (jsonb_array_length(v_pag) - 1))::uuid;
    v_cursor := format('reciente_en %s= %L and (reciente_en %s %L or id %s %L)', v_op, v_en, v_op, v_en, v_op, v_id);
    v_vueltas := v_vueltas + 1;
    exit when v_vueltas > 500;
  end loop;
  return case when p_atras then (select coalesce(jsonb_agg(e order by o desc), '[]') from jsonb_array_elements(v_todo) with ordinality x(e, o)) else v_todo end;
end $$;

do $$
declare p uuid; v_cartera jsonb; v_vista jsonb; v_filas int := 0;
begin
  foreach p in array array['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000009d1', '00000000-0000-0000-0000-0000000009d2',
                           '00000000-0000-0000-0000-0000000009d4']::uuid[] loop
    v_cartera := pg_temp.cr_ids(p, 'select id from public.leads_cartera_vista order by reciente_en desc, id desc');
    v_vista := pg_temp.cr_ids(p, 'select id from public.leads_vista where en_cartera order by coalesce(ultimo_seguimiento_en, creado_en) desc, id desc');
    if v_cartera is distinct from v_vista then raise exception '«míos» de %: la cartera dice % y leads_vista %', p, v_cartera, v_vista; end if;
    if pg_temp.cr_como(p, 'select to_jsonb(count(*)) from public.leads_cartera_vista c join public.leads_vista v on v.id = c.id where c.reciente_en is distinct from v.reciente_en') <> '0'::jsonb then
      raise exception '«míos» de %: reciente_en distinto entre las dos vistas', p; end if;
    if pg_temp.cr_recorre(p, 2, false) is distinct from v_cartera then raise exception 'el recorrido hacia adelante de %', p; end if;
    if pg_temp.cr_recorre(p, 2, true) is distinct from v_cartera then raise exception 'el recorrido hacia atrás de %', p; end if;
    v_filas := v_filas + jsonb_array_length(v_cartera);
  end loop;
  if v_filas < 12 then raise exception 'el terreno: sólo % filas entre las cuatro carteras', v_filas; end if;
end $$;

-- @test cartera-reciente (4.14-3a): la forma: la vista de «míos» toma lo reciente de la cartera, el índice es el que sirve su orden y la búsqueda por ids sigue inlineable
do $$
declare p pg_proc;
begin
  if position('la.lead_reciente_en AS reciente_en' in pg_get_viewdef('public.leads_cartera_vista'::regclass)) = 0 then raise exception 'leads_cartera_vista no toma reciente_en de la cartera'; end if;
  if pg_get_indexdef('public.leads_asesores_reciente_idx'::regclass) not like '%USING btree (usuario_id, lead_reciente_en DESC, lead_id DESC) WHERE (revocado_en IS NULL)' then
    raise exception 'el índice: %', pg_get_indexdef('public.leads_asesores_reciente_idx'::regclass); end if;
  select * into p from pg_proc where oid = 'public.leads_vista_por_ids(uuid[])'::regprocedure;
  if p.prosecdef or p.proisstrict or p.proconfig is not null or p.provolatile <> 's' or p.prolang <> (select oid from pg_language where lanname = 'sql') then
    raise exception 'leads_vista_por_ids perdió su forma inlineable'; end if;
end $$;

-- @test cartera-reciente (4.14-3a): los privilegios: ninguna función nueva se llama desde la app, la del trigger y la del relleno fijan el search_path, la cartera sigue calculándose y las vistas se leen y no se escriben
do $$
declare f text; p pg_proc; v_quien text;
begin
  foreach f in array array['public.leads_reciente_seguir()', 'public._leads_asesores_reciente_rellenar()'] loop
    select * into p from pg_proc where oid = f::regprocedure;
    if p.proconfig is distinct from array['search_path=""'] then raise exception '% sin search_path vacío: %', f, p.proconfig; end if;
    foreach v_quien in array array['anon', 'authenticated'] loop
      if has_function_privilege(v_quien, f::regprocedure, 'execute') then raise exception '% puede ejecutar %', v_quien, f; end if;
    end loop;
  end loop;
  if not (select prosecdef from pg_proc where oid = 'public.leads_reciente_seguir()'::regprocedure) then raise exception 'leads_reciente_seguir no corre con los derechos de su dueña'; end if;
  if (select prosecdef from pg_proc where oid = 'public._leads_asesores_reciente_rellenar()'::regprocedure) then raise exception 'el relleno corre con los derechos de su dueña'; end if;
  if exists (select 1 from pg_proc x, aclexplode(coalesce(x.proacl, acldefault('f', x.proowner))) a
              where x.oid in ('public.leads_reciente_seguir()'::regprocedure, 'public._leads_asesores_reciente_rellenar()'::regprocedure) and a.grantee = 0) then
    raise exception 'una función nueva tiene execute para PUBLIC'; end if;
  if (select tgenabled from pg_trigger where tgname = 'trg_leads_asesores_cartera_cambio' and tgrelid = 'public.leads_asesores'::regclass) <> 'O' then
    raise exception 'el trigger de la cartera quedó apagado'; end if;
  foreach f in array array['public.leads_vista', 'public.leads_cartera_vista'] loop
    if has_table_privilege('anon', f, 'select') then raise exception 'anon lee %', f; end if;
    if has_table_privilege('authenticated', f, 'insert') or has_table_privilege('authenticated', f, 'update') or has_table_privilege('authenticated', f, 'delete') then
      raise exception 'authenticated escribe %', f; end if;
    if not has_table_privilege('authenticated', f, 'select') then raise exception 'authenticated no lee %', f; end if;
  end loop;
end $$;
