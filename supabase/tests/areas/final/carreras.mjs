// Las carreras de marcar una cotización como final (paso 4.25-1), con dos conexiones reales a la base del Supabase LOCAL. El orden que prueban: el lead
// `for no key update`, el vehículo `for key share`, las cotizaciones del vehículo en una pasada por id y, recién con todo tomado, el vínculo
// (`…_final_marcar.sql`). Ninguna termina en 40P01. Las de una sola llamada usan `carrera()` del arnés (B tiene que esperar); las de dos pasos, `enDosPasos()`:
// A hace su primer paso en una transacción, B lanza, se espera a que B termine o quede bloqueado, A hace el segundo y confirma. R6–R8 están en `carreras-de-candados.mjs`; las de crear una final (Q1–Q11), en `carreras-crear.mjs`. Las corre
// `correr-carreras.mjs` (`scripts/carreras.mjs` todavía no las importa). Terreno con el prefijo «Carreras», como las demás.
import { PERSONAS, leadDeLaDuena } from '../../../../scripts/carreras/terreno.mjs'
import { insertaCotizacion, terreno } from '../../../../scripts/carreras/cotizaciones.mjs'
import {
  ACCESO,
  LEAD_EN_PAPELERA,
  OTRO_LEAD,
  armarEnDosPasos,
  cot,
  fila,
  idsDesde,
  leadDe,
  marcar,
  sinInterbloqueo,
} from './carreras-comun.mjs'
import { carrerasDeCandados } from './carreras-de-candados.mjs'
import { carrerasDeCrear } from './carreras-crear.mjs'

export { limpiarFinal } from './carreras-de-candados.mjs'

const { duena } = PERSONAS
const nuevoId = idsDesde(4000)

export async function carrerasDeFinal({ orquesta, carrera, espero, conectar }) {
  const enDosPasos = armarEnDosPasos({ orquesta, conectar })

  console.log(
    'Marcar final mientras otro vincula el vehículo al mismo lead (R1: lead → vehículo, como vincular)',
  )
  {
    const t = await terreno(orquesta, 'f1')
    const c = nuevoId()
    await insertaCotizacion(orquesta, t, c)
    const r = await enDosPasos({
      a1: (a) => a.query('select 1 from public.leads where id = $1 for update', [t.lead]),
      b: marcar(duena, c),
      a2: async (a) => {
        await a.query('select 1 from public.vehiculos where id = $1 for update', [t.vehiculo])
        await a.query('update public.vehiculos set lead_id = $2 where id = $1', [
          t.vehiculo,
          t.lead,
        ])
      },
    })
    const fc = await cot(orquesta, c)
    espero(
      'A y B terminan sin interbloqueo: la final queda y el vehículo con el lead',
      r.a.ok &&
        r.b.ok &&
        sinInterbloqueo(r.a, r.b) &&
        fc.clase === 'final' &&
        (await leadDe(orquesta, t.vehiculo)) === t.lead,
      { r, fc },
    )
  }

  console.log(
    'Marcar final mientras el vehículo va a la papelera (R2: vehículo → sus cotizaciones)',
  )
  {
    const t = await terreno(orquesta, 'f2')
    const c = nuevoId()
    await insertaCotizacion(orquesta, t, c)
    const r = await enDosPasos({
      a1: (a) => a.query('select 1 from public.vehiculos where id = $1 for update', [t.vehiculo]),
      b: marcar(duena, c),
      a2: async (a) => {
        const {
          rows: [l],
        } = await a.query(
          `insert into public.lotes_papelera (tipo, creado_por) values ('vehiculos', $1) returning id`,
          [duena],
        )
        await a.query(
          'update public.vehiculos set eliminado_en = now(), eliminado_por = $2, lote_papelera_id = $3 where id = $1',
          [t.vehiculo, duena, l.id],
        )
        await a.query(
          'update public.cotizaciones set eliminado_en = now(), eliminado_por = $2, lote_papelera_id = $3 where vehiculo_id = $1 and eliminado_en is null',
          [t.vehiculo, duena, l.id],
        )
      },
    })
    const fc = await cot(orquesta, c)
    espero(
      'la papelera gana sin interbloqueo y B responde que la cotización ya no está (42501)',
      r.a.ok && r.b.codigo === '42501' && r.b.mensaje === ACCESO && fc.clase !== 'final',
      { r, fc },
    )
  }

  console.log('Marcar final mientras el lead va a la papelera (R3)')
  {
    const t = await terreno(orquesta, 'f3')
    const c = nuevoId()
    await insertaCotizacion(orquesta, t, c)
    const r = await carrera(orquesta, {
      a: {
        persona: duena,
        sql: 'public.leads_papelera_enviar(gen_random_uuid(), array[$1::uuid])',
        args: [t.lead],
      },
      b: marcar(duena, c),
    })
    espero(
      'el lead se va a la papelera y B responde 23514 sin vincular el vehículo',
      r.a.ok &&
        r.b.codigo === '23514' &&
        r.b.mensaje === LEAD_EN_PAPELERA &&
        (await leadDe(orquesta, t.vehiculo)) === null,
      r,
    )
  }

  console.log('Marcar final mientras otro vincula el vehículo a otro lead (R4)')
  {
    const t = await terreno(orquesta, 'f4')
    const otro = await leadDeLaDuena(orquesta, 'f4 otro lead')
    const c = nuevoId()
    await insertaCotizacion(orquesta, t, c)
    const { v } = await fila(
      orquesta,
      'select actualizado_en::text as v from public.vehiculos where id = $1',
      [t.vehiculo],
    )
    const r = await carrera(orquesta, {
      a: {
        persona: duena,
        sql: 'public.vehiculo_vincular($1, $2, $3)',
        args: [t.vehiculo, v, otro],
      },
      b: marcar(duena, c),
    })
    const fc = await cot(orquesta, c)
    espero(
      'vincula primero: B responde el 23514 del otro lead y la cotización sigue preventa',
      r.a.ok &&
        r.b.codigo === '23514' &&
        r.b.mensaje === OTRO_LEAD &&
        fc.clase === 'preventa' &&
        (await leadDe(orquesta, t.vehiculo)) === otro,
      { r, fc },
    )
  }

  console.log('Dos finales del mismo vehículo y el mismo lead a la vez (R5)')
  {
    const t = await terreno(orquesta, 'f5')
    const [c1, c2] = [nuevoId(), nuevoId()]
    await insertaCotizacion(orquesta, t, c1)
    await insertaCotizacion(orquesta, t, c2)
    const r = await carrera(orquesta, { a: marcar(duena, c1), b: marcar(duena, c2) })
    const [f1, f2] = [await cot(orquesta, c1), await cot(orquesta, c2)]
    espero(
      'gana la primera; B responde 42501 y su cotización quedó en la papelera',
      r.a.ok &&
        r.b.codigo === '42501' &&
        r.b.mensaje === ACCESO &&
        f1.clase === 'final' &&
        !f2.viva,
      { r, f1, f2 },
    )
  }

  console.log('Dos finales del mismo vehículo con leads distintos a la vez (R5b)')
  {
    const t = await terreno(orquesta, 'f5b')
    const otro = await leadDeLaDuena(orquesta, 'f5b otro lead')
    const [c1, c2] = [nuevoId(), nuevoId()]
    await insertaCotizacion(orquesta, t, c1)
    await insertaCotizacion(orquesta, { ...t, lead: otro }, c2)
    const r = await carrera(orquesta, { a: marcar(duena, c1), b: marcar(duena, c2) })
    const [f1, f2] = [await cot(orquesta, c1), await cot(orquesta, c2)]
    const { n } = await fila(
      orquesta,
      `select count(*)::int as n from public.cotizaciones where vehiculo_id = $1 and clase = 'final' and eliminado_en is null`,
      [t.vehiculo],
    )
    espero(
      'gana la primera; B responde 42501, una sola final y el vehículo con el lead de la primera',
      r.a.ok &&
        r.b.codigo === '42501' &&
        f1.clase === 'final' &&
        !f2.viva &&
        n === 1 &&
        (await leadDe(orquesta, t.vehiculo)) === t.lead,
      { r, f1, f2, n },
    )
  }

  console.log('Marcar final mientras otra final del mismo vehículo, de otro lead, se aplica (R5c)')
  {
    const t = await terreno(orquesta, 'f5c')
    const otro = await leadDeLaDuena(orquesta, 'f5c otro lead')
    const [c1, c2] = [nuevoId(), nuevoId()]
    await insertaCotizacion(orquesta, t, c1)
    const r = await enDosPasos({
      a1: async (a) => {
        await a.query('select 1 from public.leads where id = $1 for no key update', [t.lead])
        await a.query('select 1 from public.vehiculos where id = $1 for key share', [t.vehiculo])
        await a.query(
          'select id from public.cotizaciones where vehiculo_id = $1 and eliminado_en is null order by id for no key update',
          [t.vehiculo],
        )
        await insertaCotizacion(orquesta, { ...t, lead: otro }, c2)
      },
      b: marcar(duena, c2),
      a2: async (a) => {
        await a.query(
          'update public.vehiculos set lead_id = $2 where id = $1 and lead_id is null',
          [t.vehiculo, t.lead],
        )
        await a.query(`update public.cotizaciones set clase = 'final' where id = $1`, [c1])
      },
    })
    const [f1, f2] = [await cot(orquesta, c1), await cot(orquesta, c2)]
    espero(
      'B espera la primera, relee el vínculo y responde el 23514 del otro lead; nada cambia',
      r.comoFue === 'esperó' &&
        r.a.ok &&
        r.b.codigo === '23514' &&
        r.b.mensaje === OTRO_LEAD &&
        f1.clase === 'final' &&
        f2.clase === 'preventa' &&
        f2.viva &&
        (await leadDe(orquesta, t.vehiculo)) === t.lead,
      { r, f1, f2 },
    )
  }

  await carrerasDeCandados({ orquesta, espero, conectar })
  // Crear una final (4.25-1b, Q1–Q11): mismo contrato; así `scripts/carreras.mjs` las corre sin otra línea.
  await carrerasDeCrear({ orquesta, carrera, espero, conectar })
}
