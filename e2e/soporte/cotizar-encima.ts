// Lo que los e2e de las revisiones y de cotizar encima (paso 4.15-3b) preparan por SQL, como la siembra: sin pasar por la hoja y sin los triggers de la base.
import { literal, sql } from './sql'

// Suma copias de la revisión más nueva de la cotización hasta que tenga `total` (volumen: el diff tiene la forma de un guardado de verdad). Las copias llevan el mismo autor, sin intento ni huella.
export function sembrarRevisiones(cotizacionId: string, total: number): void {
  sql(`
    insert into public.cotizaciones_revisiones (cotizacion_id, usuario_id, diff)
    select r.cotizacion_id, r.usuario_id, r.diff
      from (select cotizacion_id, usuario_id, diff from public.cotizaciones_revisiones
             where cotizacion_id = ${literal(cotizacionId)}::uuid order by id desc limit 1) r
     cross join generate_series(1, ${String(total)}::int - (select count(*) from public.cotizaciones_revisiones where cotizacion_id = ${literal(cotizacionId)}::uuid)::int)`)
}

// Cuántas revisiones tiene la cotización.
export const cuantasRevisiones = (cotizacionId: string): number =>
  Number(
    sql(
      `select count(*) from public.cotizaciones_revisiones where cotizacion_id = ${literal(cotizacionId)}::uuid`,
    ),
  )
