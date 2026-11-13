// Las carreras de emitir contra los caminos a la papelera (paso 4.26-1): mandar la misma final a la papelera (K6, P3 a), marcar otra final del mismo
// vehículo, que baja la vieja (K7, P7 a), y mandar su vehículo a la papelera, que se lleva sus cotizaciones (K8). Los tres primeros toman la fila de la
// cotización (`for no key update`); contra el vehículo, emitir lo toma `for key share` antes que la cotización (el orden lead → vehículo → cotización), y
// así la papelera, que toma el vehículo `for update` y mira sus comprobantes, ve el que se acaba de emitir. Nunca queda un comprobante sobre una
// cotización en la papelera y el que pierde no consume número. Las llama `carreras.mjs` con su `carrera()`, después de K1–K5.
import { insertaCotizacion, terreno } from '../../../../scripts/carreras/cotizaciones.mjs'
import { comoPersona } from '../../../../scripts/carreras/terreno.mjs'
import {
  comoValor,
  duena,
  emitir,
  fila,
  nuevoId,
  sinHuecos,
  sinInterbloqueo,
  SERIE,
} from './carreras-comun.mjs'

const ACCESO = 'No tienes acceso a esta cotización.'
const CON_COMPROBANTE = 'Tiene un comprobante emitido.'
const CON_FINAL = 'Tiene una cotización final. Mándala a la papelera antes.'
const VIGENTE = 'La final actual tiene un comprobante vigente: anúlalo antes de marcar otra final.'

const enviar = (c) => ({
  sql: `public.cotizaciones_papelera_enviar(jsonb_build_array(jsonb_build_object('id', $1::uuid, 'actualizado_en', (select actualizado_en from public.cotizaciones where id = $1))))`,
  args: [c],
})
const marcar = (c) => ({ sql: 'public.cotizacion_marcar_final($1)', args: [c] })
const enviarVehiculo = (v) => ({
  sql: `public.vehiculos_papelera_enviar(jsonb_build_array(jsonb_build_object('id', $1::uuid, 'actualizado_en', (select actualizado_en from public.vehiculos where id = $1))))`,
  args: [v],
})
const vehiculoVivo = async (db, v) =>
  (await fila(db, 'select eliminado_en is null as viva from public.vehiculos where id = $1', [v]))
    .viva

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
    return [f, p, t.vehiculo]
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

  console.log(
    'Emitir contra mandar su vehículo a la papelera (K8: emitir primero; enviar primero, sin carrera)',
  )
  {
    // Emitir no toca el vehículo: si no lo toma antes que la cotización, la papelera toma el vehículo, no ve el comprobante sin confirmar, espera la
    // cotización y, al confirmar emitir, se la lleva a la papelera con su comprobante.
    const [f1, , v1] = await finalYPreventa('k8a')
    const r1 = await carrera({ a: emitir(f1), b: enviarVehiculo(v1) })
    const e1 = await estado(orquesta, f1)
    const vivo1 = await vehiculoVivo(orquesta, v1)
    espero(
      'emite primero: la papelera deja el vehículo en rechazados con 23514, y el vehículo y la final siguen vivos con su comprobante',
      r1.a.ok &&
        r1.b.ok &&
        r1.b.valor.enviados?.length === 0 &&
        r1.b.valor.rechazados?.[0]?.codigo === '23514' &&
        r1.b.valor.rechazados[0].motivo === CON_COMPROBANTE &&
        vivo1 &&
        e1.viva &&
        e1.comprobantes === 1,
      { r1, e1, vivo1 },
    )
    // Enviar primero no llega a carrera: la final activa frena el vehículo en el acto (`_vehiculo_motivo_de_bloqueo`) y su candado se suelta con el
    // rechazo, así que emitir no lo espera.
    const [f2, , v2] = await finalYPreventa('k8b')
    const antes = await ultimo(orquesta)
    const env = enviarVehiculo(v2)
    await comoPersona(orquesta, duena)
    const r2 = await comoValor(orquesta.query(`select ${env.sql} as r`, env.args))
    await orquesta.query('reset role')
    const e2 = await estado(orquesta, f2)
    const vivo2 = await vehiculoVivo(orquesta, v2)
    espero(
      'envía primero: la final frena el vehículo (23514) y el vehículo y la final siguen vivos, sin comprobante ni número',
      r2.ok &&
        r2.valor.enviados?.length === 0 &&
        r2.valor.rechazados?.[0]?.codigo === '23514' &&
        r2.valor.rechazados[0].motivo === CON_FINAL &&
        vivo2 &&
        e2.viva &&
        e2.comprobantes === 0 &&
        (await ultimo(orquesta)) === antes &&
        sinInterbloqueo(r1.a, r1.b) &&
        (await sinHuecos(orquesta)),
      { r2, e2, vivo2 },
    )
  }
}
