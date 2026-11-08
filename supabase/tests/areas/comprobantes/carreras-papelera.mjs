// Las carreras de emitir contra los dos caminos a la papelera (paso 4.26-1): mandar la misma final a la papelera (K6, P3 a) y marcar otra final del mismo
// vehículo, que baja la vieja (K7, P7 a). Los tres toman la fila de la cotización (`for no key update`), así que nunca queda un comprobante sobre una
// cotización en la papelera y el que pierde no consume número. Las llama `carreras.mjs` con su `carrera()`, después de K1–K5.
import { insertaCotizacion, terreno } from '../../../../scripts/carreras/cotizaciones.mjs'
import { emitir, fila, nuevoId, sinHuecos, sinInterbloqueo, SERIE } from './carreras-comun.mjs'

const ACCESO = 'No tienes acceso a esta cotización.'
const CON_COMPROBANTE = 'Tiene un comprobante emitido.'
const VIGENTE = 'La final actual tiene un comprobante vigente: anúlalo antes de marcar otra final.'

const enviar = (c) => ({
  sql: `public.cotizaciones_papelera_enviar(jsonb_build_array(jsonb_build_object('id', $1::uuid, 'actualizado_en', (select actualizado_en from public.cotizaciones where id = $1))))`,
  args: [c],
})
const marcar = (c) => ({ sql: 'public.cotizacion_marcar_final($1)', args: [c] })

const estado = (db, c) =>
  fila(
    db,
    `select clase::text as clase, eliminado_en is null as viva, (select count(*)::int from public.comprobantes where cotizacion_id = $1) as comprobantes
       from public.cotizaciones where id = $1`,
    [c],
  )
const ultimo = async (db) =>
  Number(
    (await fila(db, 'select ultimo from public.comprobantes_contadores where serie = $1', [SERIE]))
      .ultimo,
  )

export async function carrerasDePapelera({ orquesta, espero, carrera }) {
  // Una final y una preventa del mismo vehículo y lead (el de la dueña, en su cartera: marcar lo pide).
  async function finalYPreventa(etiqueta) {
    const t = await terreno(orquesta, etiqueta)
    const [f, p] = [nuevoId(), nuevoId()]
    await insertaCotizacion(orquesta, t, f, { clase: 'final' })
    await insertaCotizacion(orquesta, t, p)
    return [f, p]
  }

  console.log('Emitir contra mandar la misma final a la papelera (K6, en los dos órdenes)')
  {
    const [f1] = await finalYPreventa('k6a')
    const r1 = await carrera({ a: emitir(f1), b: enviar(f1) })
    const e1 = await estado(orquesta, f1)
    espero(
      'emite primero: la papelera la deja en rechazados con 23514 y sigue viva con su comprobante',
      r1.a.ok &&
        r1.b.ok &&
        r1.b.valor.rechazados?.[0]?.codigo === '23514' &&
        r1.b.valor.rechazados[0].motivo === CON_COMPROBANTE &&
        e1.viva &&
        e1.comprobantes === 1,
      { r1, e1 },
    )
    const [f2] = await finalYPreventa('k6b')
    const antes = await ultimo(orquesta)
    const r2 = await carrera({ a: enviar(f2), b: emitir(f2) })
    const e2 = await estado(orquesta, f2)
    espero(
      'envía primero: emitir da el 42501 de lo inexistente, sin comprobante ni número',
      r2.a.ok &&
        r2.a.valor.enviados?.length === 1 &&
        r2.b.codigo === '42501' &&
        r2.b.mensaje === ACCESO &&
        !e2.viva &&
        e2.comprobantes === 0 &&
        (await ultimo(orquesta)) === antes &&
        sinInterbloqueo(r1.a, r1.b, r2.a, r2.b) &&
        (await sinHuecos(orquesta)),
      { r2, e2 },
    )
  }

  console.log('Emitir contra marcar otra final del mismo vehículo (K7, en los dos órdenes)')
  {
    const [f1, p1] = await finalYPreventa('k7a')
    const r1 = await carrera({ a: emitir(f1), b: marcar(p1) })
    const [e1, q1] = [await estado(orquesta, f1), await estado(orquesta, p1)]
    espero(
      'emite primero: marcar da 23514 y la final sigue final, viva y con su comprobante',
      r1.a.ok &&
        r1.b.codigo === '23514' &&
        r1.b.mensaje === VIGENTE &&
        e1.clase === 'final' &&
        e1.viva &&
        e1.comprobantes === 1 &&
        q1.clase === 'preventa',
      { r1, e1, q1 },
    )
    const [f2, p2] = await finalYPreventa('k7b')
    const antes = await ultimo(orquesta)
    const r2 = await carrera({ a: marcar(p2), b: emitir(f2) })
    const [e2, q2] = [await estado(orquesta, f2), await estado(orquesta, p2)]
    espero(
      'marca primero: la vieja baja y va a la papelera, y emitir falla sin comprobante ni número',
      r2.a.ok &&
        ['42501', '23514'].includes(r2.b.codigo) &&
        q2.clase === 'final' &&
        !e2.viva &&
        e2.comprobantes === 0 &&
        (await ultimo(orquesta)) === antes &&
        sinInterbloqueo(r1.a, r1.b, r2.a, r2.b) &&
        (await sinHuecos(orquesta)),
      { r2, e2, q2 },
    )
  }
}
