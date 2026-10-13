-- Vitrina: una sola definición de lo público, y publicar con versión. Escrito a mano.
--
-- Hasta acá `web.vehiculos` exponía, además de lo que el origen marcó como público, el kilometraje,
-- el lote, los datos de la subasta, parte del VIN, el nombre interno de la fase y todas las fotos;
-- y `vehiculo_vitrina()` escribía sin versión, sin bloquear la fila y pisando precio y nota con sus
-- defaults. Ahora:
--   interno.vitrina_vehiculos — todo vehículo vivo, ya proyectado a lo público, con sus banderas
--   web.vehiculos             — esa misma proyección, sólo lo que hoy se ve
--   vehiculo_vitrina()        — publicar y despublicar, con la versión del vehículo (obligatoria)
--   vehiculo_vitrina_previa() — la tarjeta tal como la vería un visitante, y por qué no se ve
--   vitrina_del_origen()      — qué hace falta para que algo de ese origen se vea
-- La frontera es la lista de columnas de `interno.vitrina_vehiculos`: lo que no está ahí no sale.
-- Las fotos llegan por la URL pública del bucket `vehiculos`; `anon` no lista el bucket, así que la
-- vista es el único índice de rutas, y sólo da la portada de lo publicado.

-- ---------------------------------------------------------------------------
-- El esquema `interno`: lo que comparten la web y el CRM, sin puerta propia
-- ---------------------------------------------------------------------------
-- No se expone en PostgREST y ningún rol de la app tiene USAGE: se llega sólo a través de
-- `web.vehiculos` y de las funciones DEFINER de abajo. En `public` no podría vivir: ahí toda
-- relación nueva nace con privilegios para `anon` y `authenticated`.
create schema if not exists interno;
revoke all on schema interno from public, anon, authenticated;

create or replace view interno.vitrina_vehiculos as
select v.id, v.numero, v.origen_id, o.clave as origen, o.nombre as origen_nombre, v.titulo, v.marca, v.modelo, v.anio,
       c.nombre as categoria,
       v.precio_web as precio, v.precio_web_hasta as precio_hasta, v.precio_web_nota as precio_nota, v.destacado_web as destacado,
       coalesce((select jsonb_object_agg(oc.clave, v.atributos -> oc.clave) from public.origenes_campos oc
                 where oc.origen_id = v.origen_id and oc.publico_web and oc.activo and v.atributos ? oc.clave), '{}'::jsonb) as atributos,
       p.ruta as imagen, p.ruta_miniatura as miniatura,
       v.actualizado_en,
       v.publicado_web as publicado,
       v.fase_id is not null as con_fase,
       coalesce(f.publica_web and f.activa, false) as fase_publica,
       o.activo as origen_activo,
       v.origen_id = any (w.origenes_visibles) as origen_visible,
       exists (select 1 from public.integraciones i where i.clave = 'web_publica' and i.activa) as web_activa,
       v.publicado_web and coalesce(f.publica_web and f.activa, false) and o.activo and v.origen_id = any (w.origenes_visibles)
         and exists (select 1 from public.integraciones i where i.clave = 'web_publica' and i.activa) as visible
from public.vehiculos v
join public.origenes o on o.id = v.origen_id
left join public.fases f on f.id = v.fase_id
left join public.categorias c on c.id = v.categoria_id
left join public.vehiculos_imagenes p on p.vehiculo_id = v.id and p.es_portada
cross join public.ajustes_web w
where w.id = 1 and v.eliminado_en is null;
revoke all on interno.vitrina_vehiculos from public, anon, authenticated;
comment on view interno.vitrina_vehiculos is 'Lo que la web pública puede mostrar de cada vehículo vivo, y las cinco condiciones para que se vea. Única definición: de acá salen web.vehiculos y la vista previa del CRM. Una columna nueva acá es una columna nueva a la vista de cualquiera.';

-- ---------------------------------------------------------------------------
-- web.vehiculos: lo publicado, con lo público
-- ---------------------------------------------------------------------------
-- Cambia la lista de columnas: `create or replace` no alcanza. Nada depende de la vista.
drop view if exists web.vehiculos;
create view web.vehiculos with (security_invoker = false) as
select t.id, t.numero, t.origen, t.origen_nombre, t.titulo, t.marca, t.modelo, t.anio, t.categoria,
       t.precio, t.precio_hasta, t.precio_nota, t.destacado, t.atributos, t.imagen, t.miniatura, t.actualizado_en
from interno.vitrina_vehiculos t
where t.visible;
grant select on web.vehiculos to anon, authenticated;
comment on view web.vehiculos is 'La vitrina: sólo lo publicado y hoy visible, con la identidad del vehículo, el precio público, los campos que el origen marcó como públicos y la portada (completa y miniatura). Ni costos, ni VIN, ni lote, ni fase, ni el resto de las fotos.';

-- ---------------------------------------------------------------------------
-- Publicar y despublicar
-- ---------------------------------------------------------------------------
-- Sin defaults: el formulario manda el estado entero, y un parámetro omitido no borra nada por
-- descuido. `p_precio` nulo es «Consultar». Publicar no exige que la fase publique ni que el origen
-- esté visible: la marca es del vehículo, y si hoy se ve lo dice `vehiculo_vitrina_previa()`.
drop function if exists public.vehiculo_vitrina(uuid, boolean, boolean, numeric, numeric, text);

create or replace function public.vehiculo_vitrina(p_vehiculo uuid, p_actualizado_en_esperado timestamptz, p_publicado boolean,
  p_precio numeric, p_precio_hasta numeric, p_nota text, p_destacado boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v public.vehiculos;
  v_precio numeric := round(p_precio, 2);
  v_hasta numeric := round(p_precio_hasta, 2);
  v_nota text := nullif(btrim(p_nota), '');
  v_destacado boolean := coalesce(p_publicado, false) and coalesce(p_destacado, false);
begin
  perform public.assert_activo();
  select * into v from public.vehiculos x where x.id = p_vehiculo and x.eliminado_en is null for update;
  if not found then
    raise exception 'Ese vehículo ya no existe o está en la papelera.' using errcode = 'PT409';
  end if;
  if not public.puede_vehiculo(v.id, 'vehiculos.ver') or not public.tiene_permiso('vehiculos.vitrina', v.origen_id) then
    raise exception 'No tienes permiso para publicar este vehículo en la web.' using errcode = '42501';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  if p_publicado is null then
    raise exception 'Falta decir si el vehículo se publica o no.' using errcode = '22023';
  end if;
  if v_precio is not null and (v_precio < 0 or v_precio > 999999999999) then
    raise exception 'El precio público tiene que estar entre 0 y 999999999999.' using errcode = '22023', hint = 'precio_web';
  end if;
  if v_hasta is not null and v_precio is null then
    raise exception 'Para poner un precio «hasta» falta el precio público.' using errcode = '22023', hint = 'precio_web_hasta';
  end if;
  if v_hasta is not null and (v_hasta < v_precio or v_hasta > 999999999999) then
    raise exception 'El precio «hasta» no puede ser menor que el precio público.' using errcode = '22023', hint = 'precio_web_hasta';
  end if;
  if char_length(v_nota) > 120 then
    raise exception 'La nota del precio admite hasta 120 caracteres.' using errcode = '22023', hint = 'precio_web_nota';
  end if;

  -- Guardar lo que ya está guardado no es un conflicto (un reintento no choca consigo mismo).
  if v.publicado_web = p_publicado and v.destacado_web = v_destacado and v.precio_web is not distinct from v_precio
     and v.precio_web_hasta is not distinct from v_hasta and v.precio_web_nota is not distinct from v_nota then
    return jsonb_build_object('actualizado_en', v.actualizado_en);
  end if;
  if v.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._conflicto_de_edicion('vehiculos', v.id, v.actualizado_en, 'este vehículo');
  end if;

  update public.vehiculos x
  set publicado_web = p_publicado, destacado_web = v_destacado, precio_web = v_precio, precio_web_hasta = v_hasta, precio_web_nota = v_nota
  where x.id = v.id
  returning * into v;
  perform public.registrar_actividad('vehiculo.vitrina', 'vehiculos', v.id::text, null, null,
    jsonb_build_object('publicado', p_publicado, 'destacado', v_destacado));
  return jsonb_build_object('actualizado_en', v.actualizado_en);
end;
$$;
revoke all on function public.vehiculo_vitrina(uuid, timestamptz, boolean, numeric, numeric, text, boolean) from public, anon;
grant execute on function public.vehiculo_vitrina(uuid, timestamptz, boolean, numeric, numeric, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Lo que verá el visitante
-- ---------------------------------------------------------------------------
-- `tarjeta` es la fila de `web.vehiculos` que tiene (o tendría) el vehículo: sale de la misma
-- vista, quitándole las banderas. Nulo si quien pregunta no ve el vehículo.
create or replace function public.vehiculo_vitrina_previa(p_vehiculo uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'tarjeta', to_jsonb(t) - array['origen_id', 'publicado', 'con_fase', 'fase_publica', 'origen_activo', 'origen_visible', 'web_activa', 'visible'],
    'publicado', t.publicado, 'con_fase', t.con_fase, 'fase_publica', t.fase_publica, 'origen_activo', t.origen_activo,
    'origen_visible', t.origen_visible, 'web_activa', t.web_activa, 'visible', t.visible)
  from interno.vitrina_vehiculos t
  where t.id = p_vehiculo and public.puede_vehiculo(p_vehiculo, 'vehiculos.ver');
$$;
revoke all on function public.vehiculo_vitrina_previa(uuid) from public, anon;
grant execute on function public.vehiculo_vitrina_previa(uuid) to authenticated;

-- Las condiciones que no son del vehículo: con ellas el listado sabe, sin copiar la regla, cuáles
-- de sus filas publicadas se ven (las que están en una de `fases_que_publican`) y arma el filtro.
create or replace function public.vitrina_del_origen(p_origen uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'web_activa', exists (select 1 from public.integraciones i where i.clave = 'web_publica' and i.activa),
    'origen_activo', o.activo,
    'origen_visible', o.id = any (w.origenes_visibles),
    'fases_que_publican', coalesce((
      select jsonb_agg(f.id order by f.orden, f.id) from public.fases f join public.flujos fl on fl.id = f.flujo_id
      where fl.origen_id = o.id and fl.ambito = 'vehiculos' and f.publica_web and f.activa), '[]'::jsonb))
  from public.origenes o cross join public.ajustes_web w
  where o.id = p_origen and w.id = 1 and public.tiene_permiso('vehiculos.ver', o.id);
$$;
revoke all on function public.vitrina_del_origen(uuid) from public, anon;
grant execute on function public.vitrina_del_origen(uuid) to authenticated;

comment on table public.vehiculos is 'Inventario. De sólo lectura para la app: se escribe por vehiculo_crear() y vehiculo_guardar(). fase_id lo escriben cambiar_fase() y, sólo al nacer, vehiculo_crear() (entrada a la única fase inicial). publicado_web lo escribe vehiculo_vitrina(); que además se vea en la web lo decide interno.vitrina_vehiculos (fase activa que publica, origen activo y visible, integración web activa). Papelera: eliminado_en + lote; una policy RESTRICTIVE esconde lo borrado a todos.';
