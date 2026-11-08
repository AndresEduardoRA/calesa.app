-- El tope de tamaño del diseño al publicar (paso 4.22-6, 4-30): un borrador de más de `_diseno_maximo_de_items()` ítems se guarda (guardar sólo mira
-- la forma) y publicarlo da 22023 `demasiados_items` con la sección en `hint`; el mismo diseño sin los ítems de más se publica. Los casos de la regla,
-- su orden y su `donde` los cubre el juego compartido (`validar-diseno.sql` y `validar-diseno.test.ts`); acá, el camino de la RPC.
-- Corre en PGlite (`pnpm db:probar`, después de la lista fija); arma su terreno dentro de su transacción y la revierte: no se apoya en otro archivo.

-- @test fórmula: publicar un diseño de 41 ítems da demasiados_items en la última sección; sin los dos de más se publica
begin;
do $$
declare
  s public.formulas;
  o uuid;
  v_rol uuid;
  v_quien uuid := '00000000-0000-4000-8000-0000000e4226';
  v_max int := public._diseno_maximo_de_items();
  v_items int;
  v_ultima int;
  v_grande jsonb;
  v_estado text;
  v_detalle text;
  v_pista text;
begin
  -- La publicada de la semilla con más ítems (`subasta_usa`, 39): la base, que ya pasa la regla.
  select f.* into s from public.formulas f
   where f.estado = 'publicada' and f.diseno is not null
   order by (select sum(jsonb_array_length(x -> 'items')) from jsonb_array_elements(f.diseno -> 'secciones') x) desc, f.id
   limit 1;
  if s.id is null then raise exception 'la semilla no trae una fórmula publicada con diseño'; end if;
  select sum(jsonb_array_length(x -> 'items')) into v_items from jsonb_array_elements(s.diseno -> 'secciones') x;
  if v_max <> 40 then raise exception 'el tope es %, no 40', v_max; end if;
  if v_items > v_max - 1 then raise exception 'la semilla más grande ya tiene % ítems', v_items; end if;

  -- La última sección crece con copias de su primer ítem hasta pasar el tope (los repetidos no importan: el tope va antes que `nodo_repetido`).
  v_ultima := jsonb_array_length(s.diseno -> 'secciones') - 1;
  v_grande := s.diseno;
  while v_items <= v_max loop
    v_grande := jsonb_insert(v_grande, array['secciones', v_ultima::text, 'items', '-1'], v_grande -> 'secciones' -> v_ultima -> 'items' -> 0, true);
    v_items := v_items + 1;
  end loop;

  -- Un origen sin fórmula y una persona que lo configura.
  insert into public.origenes (clave, nombre) values ('prueba_tope', 'Prueba tope') returning id into o;
  insert into auth.users (id, email, raw_app_meta_data) values (v_quien, v_quien || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = 'Tope', invitacion_aceptada_en = now() where id = v_quien;
  delete from public.usuarios_roles where usuario_id = v_quien;
  insert into public.roles (clave, nombre) values ('prueba_tope', 'Prueba tope') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_quien, v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'cotizaciones.configurar', o, 'todos');

  perform set_config('request.jwt.claim.sub', v_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_quien, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- El borrador grande se guarda.
  perform public.formula_guardar_borrador(p_origen => o, p_def => s.definicion, p_params => s.params, p_diseno => v_grande,
                                          p_actualizado_en_esperado => null);
  -- Publicarlo da la regla y la sección donde se pasa.
  begin
    perform public.formula_publicar(p_origen => o, p_nota => 'Demasiados ítems');
    v_estado := 'sin error';
  exception when others then
    get stacked diagnostics v_estado = returned_sqlstate, v_detalle = pg_exception_detail, v_pista = pg_exception_hint;
  end;
  reset role;
  if v_estado is distinct from '22023' or v_detalle is distinct from 'demasiados_items'
     or v_pista is distinct from (s.diseno -> 'secciones' -> v_ultima ->> 'id') then
    raise exception 'publicar 41 ítems: esperaba 22023:demasiados_items@%, dio %:%@%', s.diseno -> 'secciones' -> v_ultima ->> 'id', v_estado, v_detalle, v_pista;
  end if;
  if exists (select 1 from public.formulas where origen_id = o and estado = 'publicada') then raise exception 'se publicó un diseño de más de 40 ítems'; end if;
  if not exists (select 1 from public.formulas where origen_id = o and estado = 'borrador' and diseno = v_grande) then
    raise exception 'el borrador grande no quedó guardado';
  end if;

  -- El mismo borrador con el diseño de la semilla (sin los ítems de más) se publica: lo rechazado era el tamaño.
  set local role authenticated;
  perform public.formula_guardar_borrador(p_origen => o, p_def => s.definicion, p_params => s.params, p_diseno => s.diseno,
    p_actualizado_en_esperado => (select actualizado_en from public.formulas where origen_id = o and estado = 'borrador'));
  perform public.formula_publicar(p_origen => o, p_nota => 'En el tope');
  reset role;
  if not exists (select 1 from public.formulas where origen_id = o and estado = 'publicada' and version = 1) then
    raise exception 'el diseño de la semilla no se publicó';
  end if;
end $$;
rollback;
