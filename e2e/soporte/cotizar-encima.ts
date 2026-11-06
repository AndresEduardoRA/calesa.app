// Lo que los e2e de las revisiones y de cotizar encima (paso 4.15-3b) preparan por SQL, como la siembra: sin pasar por la hoja y sin los triggers de la base.
import { clienteComo } from './cotizar-guardada'
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

// Reparte las revisiones de la cotización en el tiempo: una cada `horas`, la más nueva de ahora y las demás hacia atrás (el id crece con `creado_en`, como supone la base: 4-95).
export function fecharRevisiones(cotizacionId: string, horas: number): void {
  sql(`
    update public.cotizaciones_revisiones r
       set creado_en = now() - (t.rango - 1) * ${String(horas)}::int * interval '1 hour'
      from (select id, row_number() over (order by id desc) as rango
              from public.cotizaciones_revisiones
             where cotizacion_id = ${literal(cotizacionId)}::uuid) t
     where r.id = t.id`)
}

// El borde exclusivo de «Ir a una fecha» para `dia` (`YYYY-MM-DD`): el inicio del día siguiente en la zona de la empresa, como instante UTC.
export const bordeDeUnDia = (dia: string): string =>
  sql(`
    select to_char(((${literal(dia)}::date + 1)::timestamp
                    at time zone (select zona_horaria from public.ajustes_empresa limit 1)) at time zone 'UTC',
                   'YYYY-MM-DD"T"HH24:MI:SS"Z"')`)

// El id de la revisión con la que tiene que empezar el salto a `dia`: la más nueva de esa cotización anterior al borde (0 si no hay ninguna).
export const primeraRevisionHasta = (cotizacionId: string, dia: string): number =>
  Number(
    sql(`
      select coalesce(max(id), 0) from public.cotizaciones_revisiones
       where cotizacion_id = ${literal(cotizacionId)}::uuid
         and creado_en < ${literal(bordeDeUnDia(dia))}::timestamptz`),
  )

// Cuántas revisiones tiene la cotización.
export const cuantasRevisiones = (cotizacionId: string): number =>
  Number(
    sql(
      `select count(*) from public.cotizaciones_revisiones where cotizacion_id = ${literal(cotizacionId)}::uuid`,
    ),
  )

// Otra persona cotiza encima de una cotización por la RPC con su propia sesión (mientras quien mira la tiene abierta): devuelve la id de la nueva.
export async function cotizarEncimaComo(
  persona: { email: string; contrasena: string },
  anterior: string,
): Promise<string> {
  const cliente = await clienteComo(persona)
  const nueva = crypto.randomUUID()
  const { error } = await cliente.rpc('cotizacion_encima', { p_id: nueva, p_anterior: anterior })
  if (error) {
    throw new Error(`${persona.email} no pudo cotizar encima: ${error.message}`)
  }
  return nueva
}

// La id de la versión nueva viva de una cotización (nulo si no tiene), y cuántas hijas tiene en total.
export const encimaDe = (anterior: string): string =>
  sql(
    `select coalesce((select id::text from public.cotizaciones where cotizacion_padre_id = ${literal(anterior)}::uuid and eliminado_en is null limit 1), '')`,
  )
export const hijasDe = (anterior: string): number =>
  Number(
    sql(
      `select count(*) from public.cotizaciones where cotizacion_padre_id = ${literal(anterior)}::uuid`,
    ),
  )
