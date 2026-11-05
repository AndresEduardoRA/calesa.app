// Cotizaciones sembradas por SQL en un vehículo (paso 4.14-2b): el historial y «Cotizado (n)» se prueban con filas que la hoja no tiene que guardar una por una.
// Se escriben con la fórmula publicada del origen y un snapshot mínimo (cada nodo con un valor, como la medición `medir-historial-del-vehiculo.sql`), con
// `session_replication_role = replica`: así no corren `cotizacion_validar` ni el trigger de `cotizado_en`, que la siembra mueve a mano. `creado_en` va escalonado
// por minuto hacia atrás: la primera (g = 1) es la más nueva. La limpieza es la de siempre (`borrarOrigenesDeCotizar()` borra las cotizaciones del origen).
import { literal, sql } from './sql'

export function idDePersona(email: string): string {
  return sql(`select id from public.perfiles where email = ${literal(email)}`)
}

export function sembrarCotizaciones(datos: {
  origenId: string
  vehiculoId: string
  creadoPor: string
  cuantas: number
  clase?: 'preventa' | 'final'
  // Cuántos minutos más viejas que ahora empiezan: la g-ésima queda `desde + g` minutos atrás.
  desde?: number
}): void {
  const { origenId, vehiculoId, creadoPor, cuantas, clase = 'preventa', desde = 0 } = datos
  sql(`
    begin;
    set local session_replication_role = replica;
    with f as (select id, origen_id, definicion from public.formulas where origen_id = ${literal(origenId)}::uuid and estado = 'publicada'),
         s as (select f.id, f.origen_id,
                      (select jsonb_object_agg(n ->> 'id', round((n_ord * 13.37)::numeric, 2)) from jsonb_array_elements(f.definicion -> 'nodos') with ordinality x (n, n_ord)) as valores,
                      (select jsonb_object_agg(n ->> 'id', 'input') from jsonb_array_elements(f.definicion -> 'nodos') n where n ->> 'tipo' in ('input', 'constante', 'tipo_cambio')) as fuentes
                 from f)
    insert into public.cotizaciones (origen_id, creado_por, formula_id, vehiculo_id, valores, fuentes, tipos_cambio, totales, total_base, titulo, clase, creado_en, actualizado_en)
      select s.origen_id, ${literal(creadoPor)}::uuid, s.id, ${literal(vehiculoId)}::uuid, s.valores, s.fuentes, '{"oficial": 6.96, "paralelo": 12.4}', '{"usd": 1234.5}', 1234.5,
             'Sembrada ' || g, ${literal(clase)}::public.clase_cotizacion,
             now() - (${String(desde)} + g) * interval '1 minute', now() - (${String(desde)} + g) * interval '1 minute'
        from generate_series(1, ${String(cuantas)}) g cross join s;
    update public.vehiculos set cotizado_en = greatest(coalesce(cotizado_en, '-infinity'), now() - (${String(desde)} + 1) * interval '1 minute')
      where id = ${literal(vehiculoId)}::uuid;
    commit;`)
}
