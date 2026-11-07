-- El tipo de cambio que nombra un nodo de la fórmula (4.20-3c), para el ⚙ de una celda de tipo de cambio de la hoja (la pantalla es del 4.20-3d). La celda no trae la
-- clave del tipo de cambio: vive en `formulas.definicion`, que sólo lee quien tiene `cotizaciones.configurar` del origen, y el ⚙ de un tipo de cambio lo tiene quien
-- gestiona los tipos de cambio de la empresa (`ajustes` de la celda). Esta función le da a esa persona la fila de `tipos_cambio` (que ya lee toda cuenta) que nombra un
-- nodo que ve en esa versión, con su `actualizado_en` exacto: la esperada de `tipo_cambio_guardar()`. De la fórmula no devuelve nada más.
create or replace function public.formula_tipo_cambio_del_nodo(p_formula uuid, p_nodo text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_clave text;
begin
  perform public.assert_permiso('empresa.tipos_cambio.gestionar');
  -- La versión por `formulas_pkey`; un borrador no cuenta (una hoja dibuja la publicada o la versión de una guardada). Sólo un nodo `tipo_cambio` nombra una tarifa.
  select n ->> 'clave' into v_clave
    from public.formulas f
   cross join lateral jsonb_array_elements(f.definicion -> 'nodos') n
   where f.id = p_formula
     and f.estado <> 'borrador'
     and n ->> 'id' = p_nodo
     and n ->> 'tipo' = 'tipo_cambio'
   limit 1;
  if v_clave is null then
    return null;
  end if;
  -- Que quien llama vea el nodo en esa versión: `_nodos_visibles()` relee la versión por `formulas_pkey` (lo que un nivel esconde no sale).
  if not exists (select 1 from public._nodos_visibles(p_formula) v where v.nodo = p_nodo) then
    return null;
  end if;
  -- La fila por `tipos_cambio_clave_key`; desactivada viene con `activo: false`.
  return (
    select jsonb_build_object(
      'id', t.id,
      'clave', t.clave,
      'nombre', t.nombre,
      'moneda_de', t.moneda_de::text,
      'moneda_a', t.moneda_a::text,
      'valor', t.valor,
      'activo', t.activo,
      'actualizado_en', t.actualizado_en)
      from public.tipos_cambio t
     where t.clave = v_clave);
end;
$$;

revoke all on function public.formula_tipo_cambio_del_nodo(uuid, text) from public, anon, authenticated;
grant execute on function public.formula_tipo_cambio_del_nodo(uuid, text) to authenticated, service_role;

comment on function public.formula_tipo_cambio_del_nodo(uuid, text) is
  'La fila de tipos_cambio (id, clave, nombre, monedas, valor, activo y actualizado_en exacto) que nombra el nodo tipo_cambio p_nodo de la versión p_formula, para el ⚙ de una celda de tipo de cambio (4.20-3c/3d). Pide empresa.tipos_cambio.gestionar (42501) y que quien llama vea el nodo (_nodos_visibles); un borrador, un nodo de otro tipo o que no se ve, y una versión o tarifa que no existe dan null. Lee formulas_pkey dos veces (aquí y en _nodos_visibles) y tipos_cambio_clave_key.';
