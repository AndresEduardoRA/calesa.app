-- Fórmula v1 de oficina: precio acordado − descuento (un origen manual no es un caso especial).
-- Sin grupos, sin variante y sin modos: su diseño es una sección de dos celdas.
-- Nace por el mismo camino que publicar: `validar_formula()`, `validar_diseno()` con los niveles y los tonos de verdad y
-- `_compilar_visibilidad()` (todo en `_preparar_publicacion()`, la que usa `_publicar_formula()`). Un diseño inválido tumba el seed con la regla y su
-- `donde`. Y la versión pasa el `check` «una publicada tiene diseño y visibilidad». `entities/semilla.test.ts` la compara con `casos-de-formula.json` y
-- `casos-de-diseno.json`; `supabase/tests/semilla-cotizador.sql` la evalúa contra las cifras de las capturas y del Excel.
do $$
declare v_origen uuid; v_def jsonb; v_params jsonb; v_diseno jsonb;
begin
  select id into v_origen from public.origenes where clave = 'oficina';
  if exists (select 1 from public.formulas where origen_id = v_origen) then return; end if;
  v_def := $j${"nodos": [
    {"id":"tc_paralelo","tipo":"tipo_cambio","clave":"paralelo","etiqueta":"TC paralelo","formato":"raw"},
    {"id":"precio","tipo":"input","etiqueta":"Precio acordado","formato":"usd","seccion":"Venta","bucket":"origen"},
    {"id":"descuento","tipo":"input","etiqueta":"Descuento","formato":"usd","seccion":"Venta","bucket":"origen"},
    {"id":"total","tipo":"calculo","op":"restar","de":["precio","descuento"],"etiqueta":"Total","formato":"usd","salida":"total","bucket":"origen"}
  ], "buckets": {"origen":"tc_paralelo"}}$j$;
  v_params := $j${}$j$;
  v_diseno := $j${"secciones": [
    {"id":"oficina","titulo":"Oficina","presentacion":"principal","items":[{"tipo":"celda","nodo":"precio","ancho":"mitad"},{"tipo":"celda","nodo":"descuento","ancho":"mitad"}]}
  ], "cabecera": {"modos":[],"ver_total_bs":false}, "tarjeta_total": {"nodo":"total","secundarios":[]}}$j$;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_en)
  values (v_origen, 1, 'publicada', v_def, v_params, v_diseno, public._preparar_publicacion(v_def, v_params, v_diseno, false), 'Fórmula inicial', now());
end $$;
