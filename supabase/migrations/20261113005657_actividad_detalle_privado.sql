-- Actividad: la app ya no lee `actividad.detalle` (paso 9.01-2). Algunas llamadas a `registrar_actividad()` guardan ahí un teléfono enmascarado
-- (`lead.telefono_*`), el código del portal (`portal.*`, la mitad de la credencial) o montos de un pago (`pago.*`), y nadie de la app lo lee:
-- sólo funciones `security definer` (`_lead_crear`, `leads_importaciones_recientes`) y service_role. Si un día la app lo necesita, será por una
-- función definer que lo recorte, como `actividad_diff()`.
-- El grant de authenticated sobre `actividad` es por columna: se quita sólo la de `detalle` (un revoke de tabla se llevaría las demás).

revoke select (detalle) on public.actividad from anon, authenticated;

comment on column public.actividad.detalle is
  'Contexto de una acción, sin recortar (puede llevar un teléfono enmascarado, el código del portal o montos). La app no lo lee: sólo funciones security definer que lo recortan (9.01-2).';
