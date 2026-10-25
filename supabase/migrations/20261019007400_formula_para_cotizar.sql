-- La fórmula de una cotización viaja sólo a quien configura el origen (paso 4.10, prompt 1; D7, H3 y H4: «la fórmula viaja sólo a quien tiene cotizaciones.configurar del origen»).
--
-- `formula_para_cotizar(origen)` da la versión publicada del origen entera —`definicion`, `params`, `diseno` y `visibilidad`—, para el editor de la fórmula y el del diseño (4.19 a 4.22) y
-- para la hoja de quien configura. Desde el 4.08-2 la policy de `formulas` ya sólo la deja leer a esa persona; esta función es el camino que no depende de las columnas (la hoja de
-- quien cotiza no la lee: calcula con `cotizacion_evaluar()` y dibuja con el diseño recortado que dará su propia lectura, 4.13).
--
-- El permiso se pide ANTES de mirar si el origen existe o tiene fórmula: quien no configura recibe el mismo 42501 con cualquier uuid, y no averigua qué origen tiene una publicada.

create or replace function public.formula_para_cotizar(p_origen uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  f public.formulas;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  if p_origen is null then
    raise exception 'Falta el origen.' using errcode = '22023';
  end if;
  select * into f from public.formulas x where x.origen_id = p_origen and x.estado = 'publicada';   -- formulas_publicada_unica
  if f.id is null then
    raise exception 'Este origen no tiene una fórmula publicada.' using errcode = '22023';
  end if;
  return jsonb_build_object('id', f.id, 'version', f.version, 'nota', f.nota, 'publicado_en', f.publicado_en,
                            'definicion', f.definicion, 'params', f.params, 'diseno', f.diseno, 'visibilidad', f.visibilidad);
end $$;
revoke all on function public.formula_para_cotizar(uuid) from public, anon;
grant execute on function public.formula_para_cotizar(uuid) to authenticated;
comment on function public.formula_para_cotizar(uuid) is
  'La versión publicada de un origen entera (definicion, params, diseno y visibilidad), sólo con cotizaciones.configurar de ese origen. docs/COTIZADOR.md › «En la base (4.10-1)».';
