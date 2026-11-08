// Las carreras de crear una final contra marcar, cotizar encima, restaurar, otra final del mismo lead y quien la crea sin ver o sin cartera (paso 4.25-1b,
// Q6–Q11). Las llama `carrerasDeCrear()` de `carreras-crear.mjs`, con el mismo contrato.
import { PERSONAS, comoPersona, leadDeLaDuena } from '../../../../scripts/carreras/terreno.mjs'
import {
  crear,
  insertaCotizacion,
  nuevoVehiculo,
  terreno,
} from '../../../../scripts/carreras/cotizaciones.mjs'
import {
  ACCESO,
  LEAD_AJENO,
  NO_PUEDE,
  armarEnDosPasos,
  cot,
  fila,
  idsDesde,
  leadDe,
  marcar,
  sinInterbloqueo,
} from './carreras-comun.mjs'
import { MARCA_PROPIOS, limpiarFinal } from './carreras-de-candados.mjs'

const { duena } = PERSONAS
const nuevoId = idsDesde(8000)
const aCliente = async (db, id) =>
  (
    await fila(
      db,
      `select despues -> 'lead_a_cliente' as x from public.actividad where accion = 'cotizacion.final' and registro_id = $1::text`,
      [id],
    )
  )?.x
// La hoja abierta de esa persona en ese terreno, firmada ahora como postgres con su `sub` (lo que `cotizacion_hoja()` le daría).
async function conHoja(db, t, persona) {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [persona])
  const { a } = await fila(db, 'select public._cotizacion_abierta_firmar($1, $2, now()) as a', [
    t.origen,
    t.v1,
  ])
  await db.query(`select set_config('request.jwt.claim.sub', '', false)`)
  return { ...t, abiertas: { ...t.abiertas, [persona]: a } }
}
// Un terreno con un lead de la dueña compartido con quien sólo ve lo suyo (en su cartera) y su hoja firmada.
async function terrenoPropio(db, etiqueta) {
  const t = await terreno(db, etiqueta)
  const suyo = await leadDeLaDuena(db, `${etiqueta} lead de quien crea`)
  await db.query(
    `insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por) values ($1, $2, 'compartido', $3)`,
    [suyo, MARCA_PROPIOS, duena],
  )
  return { t, suyo, propio: await conHoja(db, { ...t, lead: suyo }, MARCA_PROPIOS) }
}

export async function carrerasDeCrearCandados({ orquesta, carrera, espero, conectar }) {
  const enDosPasos = armarEnDosPasos({ orquesta, conectar })

  console.log('Crear una final y, a la vez, marcar una preventa del mismo vehículo (Q6)')
  {
    const t = await terreno(orquesta, 'q6')
    const [id, p] = [nuevoId(), nuevoId()]
    await insertaCotizacion(orquesta, t, p)
    const r = await carrera(orquesta, {
      a: crear(duena, t, id, { clase: 'final' }),
      b: marcar(duena, p),
    })
    const [fc, fp] = [await cot(orquesta, id), await cot(orquesta, p)]
    espero(
      'B espera el lead, su preventa ya está en la papelera y responde 42501; la final de A queda y el vehículo con el lead',
      r.a.ok &&
        r.b.codigo === '42501' &&
        r.b.mensaje === ACCESO &&
        fc.clase === 'final' &&
        !fp.viva &&
        fp.lote_papelera_id !== null &&
        (await leadDe(orquesta, t.vehiculo)) === t.lead,
      { r, fc, fp },
    )
  }

  console.log('Crear una final mientras se cotiza encima de una preventa del vehículo (Q7)')
  {
    const t = await terreno(orquesta, 'q7')
    const [id, p, nueva] = [nuevoId(), nuevoId(), nuevoId()]
    await insertaCotizacion(orquesta, t, p)
    const r = await enDosPasos({
      sub: duena,
      a1: (a) => a.query('select 1 from public.cotizaciones where id = $1 for share', [p]),
      b: crear(duena, t, id, { clase: 'final' }),
      a2: (a) => a.query('select public.cotizacion_encima($1, $2)', [nueva, p]),
    })
    const [fc, fp, fn] = [
      await cot(orquesta, id),
      await cot(orquesta, p),
      await cot(orquesta, nueva),
    ]
    espero(
      'B espera en la pasada y los dos terminan sin interbloqueo: la final queda, la preventa en la papelera y la versión nueva vive como preventa',
      r.comoFue === 'esperó' &&
        r.a.ok &&
        r.b.ok &&
        sinInterbloqueo(r.a, r.b) &&
        fc?.clase === 'final' &&
        !fp.viva &&
        fn?.viva &&
        fn.clase === 'preventa',
      { r, fc, fp, fn },
    )
  }

  console.log('Crear una final mientras se restaura una preventa del mismo vehículo (Q8)')
  {
    const t = await terreno(orquesta, 'q8')
    const [id, p] = [nuevoId(), nuevoId()]
    await insertaCotizacion(orquesta, t, p)
    await comoPersona(orquesta, duena)
    const { lote } = await fila(
      orquesta,
      `select public.papelera_enviar('cotizaciones', array[$1::uuid]) as lote`,
      [p],
    )
    await orquesta.query('reset role')
    const { v } = await fila(
      orquesta,
      'select actualizado_en::text as v from public.lotes_papelera where id = $1',
      [lote],
    )
    const r = await enDosPasos({
      sub: duena,
      a1: (a) =>
        a.query(
          `select 1 from public.vehiculos v where v.id in (select x.vehiculo_id from public.cotizaciones x where x.lote_papelera_id = $1 and x.eliminado_en is not null) order by v.id for key share`,
          [lote],
        ),
      b: crear(duena, t, id, { clase: 'final' }),
      a2: (a) =>
        a.query('select public.cotizaciones_papelera_restaurar($1, $2::timestamptz)', [lote, v]),
    })
    const [fc, fp] = [await cot(orquesta, id), await cot(orquesta, p)]
    espero(
      'B no espera a restaurar: la final queda con el vehículo vinculado y la restaurada vive a su lado',
      r.comoFue === 'terminó' &&
        r.a.ok &&
        r.b.ok &&
        sinInterbloqueo(r.a, r.b) &&
        fc?.clase === 'final' &&
        fp.viva &&
        (await leadDe(orquesta, t.vehiculo)) === t.lead,
      { r, fc, fp },
    )
  }

  console.log('Dos finales del mismo lead en vehículos distintos, a la vez (Q9)')
  {
    const t = await terreno(orquesta, 'q9')
    const v2 = await nuevoVehiculo(orquesta, t.origen, 'q9 otro vehículo')
    const [id1, id2] = [nuevoId(), nuevoId()]
    const primera = crear(duena, t, id1, { clase: 'final' })
    const r = await enDosPasos({
      sub: duena,
      a1: (a) => a.query(`select ${primera.sql}`, primera.args),
      b: crear(duena, t, id2, { clase: 'final', vehiculo: v2 }),
      a2: async () => {},
    })
    espero(
      'B espera el lead; los dos vehículos quedan con el lead, que pasó a cliente una sola vez',
      r.comoFue === 'esperó' &&
        r.a.ok &&
        r.b.ok &&
        (await leadDe(orquesta, t.vehiculo)) === t.lead &&
        (await leadDe(orquesta, v2)) === t.lead &&
        (await aCliente(orquesta, id1)) === true &&
        (await aCliente(orquesta, id2)) === false,
      r,
    )
  }

  // La persona propia ya la sembró `carrerasDeCandados()` (corre antes, en `carrerasDeFinal()`); aquí sólo se limpian sus lotes y su actividad.
  await limpiarFinal(orquesta)

  console.log('Crear una final mientras otra persona suma una preventa que quien crea no ve (Q10)')
  try {
    const { t, suyo, propio } = await terrenoPropio(orquesta, 'q10')
    const [id, p] = [nuevoId(), nuevoId()]
    const r = await enDosPasos({
      a1: (a) => a.query('select 1 from public.leads where id = $1 for no key update', [suyo]),
      b: crear(MARCA_PROPIOS, propio, id, { clase: 'final' }),
      // En la transacción de A (no en otra conexión): si B tomara algo que A necesita, sería un 40P01 y no una espera que nadie ve.
      a2: (a) => insertaCotizacion(a, t, p),
    })
    const fp = await cot(orquesta, p)
    espero(
      'B espera el lead, encuentra la preventa que no ve y responde 42501; nada cambia',
      r.comoFue === 'esperó' &&
        r.a.ok &&
        r.b.codigo === '42501' &&
        r.b.mensaje === NO_PUEDE &&
        (await cot(orquesta, id)) === undefined &&
        fp.viva &&
        fp.lote_papelera_id === null &&
        (await leadDe(orquesta, t.vehiculo)) === null,
      { r, fp },
    )
  } finally {
    await limpiarFinal(orquesta)
  }

  console.log('Crear una final mientras le quitan el lead de la cartera (Q11)')
  try {
    const { suyo, propio } = await terrenoPropio(orquesta, 'q11')
    const id = nuevoId()
    const r = await enDosPasos({
      a1: async (a) => {
        await a.query('select 1 from public.leads where id = $1 for update', [suyo])
        await a.query(
          'update public.leads_asesores set revocado_en = now() where lead_id = $1 and usuario_id = $2 and revocado_en is null',
          [suyo, MARCA_PROPIOS],
        )
      },
      b: crear(MARCA_PROPIOS, propio, id, { clase: 'final' }),
      a2: async () => {},
    })
    espero(
      'B espera el lead, vuelve a mirar la cartera y responde el 42501 del lead; no queda la cotización',
      r.comoFue === 'esperó' &&
        r.a.ok &&
        r.b.codigo === '42501' &&
        r.b.mensaje === LEAD_AJENO &&
        (await cot(orquesta, id)) === undefined,
      r,
    )
  } finally {
    await limpiarFinal(orquesta)
  }
}
