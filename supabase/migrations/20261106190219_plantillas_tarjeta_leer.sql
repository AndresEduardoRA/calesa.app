-- La tabla de plantillas, sólo para quien configura el origen (paso 4.18-1, P8). Un borrador, una archivada o la publicada que quedó vieja ante una versión
-- nueva de la fórmula pueden nombrar por su id, con un texto propio, un nodo que hoy no es del nivel «todos»: la tabla la lee quien ya lee `formulas`
-- (la misma regla que «formulas: leer», un InitPlan) y los demás leen la tarjeta sólo por `cotizacion_tarjeta()`, que revalida contra SU versión.
-- Nadie en la app lee la tabla; las RPC de la plantilla y la lectura son `security definer`. Su caso de humo: «plantillas de tarjeta» en supabase/tests/humo.sql.
alter policy "plantillas_tarjeta: leer" on public.plantillas_tarjeta
  using (origen_id = any ((select public.origenes_con_alcance('cotizaciones.configurar', 'propios'))::uuid[]));
