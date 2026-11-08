// Las carreras de crear una cotización final con `cotizacion_crear` (paso 4.25-1b), con dos conexiones reales a la base del Supabase LOCAL. El orden que
// prueban es el de marcar: el lead `for no key update`, el vehículo `for key share`, después del cálculo las vivas del vehículo en una pasada por id y, con
// todo tomado, otra mirada al vínculo; los efectos, en `_final_aplicar` (`…_final_crear.sql`). Ninguna termina en 40P01. Q1–Q5 aquí; Q6–Q11 en
// `carreras-crear-candados.mjs`. Las llama `carrerasDeFinal()` de `carreras.mjs`, con el mismo contrato.
import { PERSONAS, leadDeLaDuena } from '../../../../scripts/carreras/terreno.mjs'
import { crear, insertaCotizacion, terreno } from '../../../../scripts/carreras/cotizaciones.mjs'
import {
  OTRO_LEAD_CREAR,
  SIN_VEHICULO,
  YA_FINAL,
  armarEnDosPasos,
  claseDelLead,
  cot,
  fila,
  idsDesde,
  leadDe,
  sinInterbloqueo,
} from './carreras-comun.mjs'
import { carrerasDeCrearCandados } from './carreras-crear-candados.mjs'

const { duena } = PERSONAS
const nuevoId = idsDesde(7000)
const finales = async (db, v) =>
  (
    await fila(
      db,
      `select count(*)::int as n from public.cotizaciones where vehiculo_id = $1 and clase = 'final' and eliminado_en is null`,
      [v],
    )
  ).n

export async function carrerasDeCrear({ orquesta, carrera, espero, conectar }) {
  const enDosPasos = armarEnDosPasos({ orquesta, conectar })

  console.log('Crear una final mientras otro vincula el vehículo al mismo lead (Q1)')
  {
    const t = await terreno(orquesta, 'q1')
    const id = nuevoId()
    const r = await enDosPasos({
      a1: (a) => a.query('select 1 from public.leads where id = $1 for update', [t.lead]),
      b: crear(duena, t, id, { clase: 'final' }),
      a2: async (a) => {
        await a.query('select 1 from public.vehiculos where id = $1 for update', [t.vehiculo])
        await a.query('update public.vehiculos set lead_id = $2 where id = $1', [
          t.vehiculo,
          t.lead,
        ])
      },
    })
    const fc = await cot(orquesta, id)
    espero(
      'B espera el lead y los dos terminan: la final queda, el vehículo con el lead y el lead de clase cliente',
      r.comoFue === 'esperó' &&
        r.a.ok &&
        r.b.ok &&
        sinInterbloqueo(r.a, r.b) &&
        fc?.clase === 'final' &&
        (await leadDe(orquesta, t.vehiculo)) === t.lead &&
        (await claseDelLead(orquesta, t.lead)) === 'cliente',
      { r, fc },
    )
  }

  console.log('Crear una final mientras otro vincula el vehículo a otro lead (Q2)')
  {
    const t = await terreno(orquesta, 'q2')
    const otro = await leadDeLaDuena(orquesta, 'q2 otro lead')
    const id = nuevoId()
    const antes = await claseDelLead(orquesta, t.lead)
    const r = await enDosPasos({
      a1: async (a) => {
        await a.query('select 1 from public.leads where id = $1 for update', [otro])
        await a.query('select 1 from public.vehiculos where id = $1 for update', [t.vehiculo])
      },
      b: crear(duena, t, id, { clase: 'final' }),
      a2: (a) =>
        a.query('update public.vehiculos set lead_id = $2 where id = $1', [t.vehiculo, otro]),
    })
    espero(
      'B espera el vehículo, relee el vínculo y responde el 23514 del otro lead; no queda la cotización',
      r.comoFue === 'esperó' &&
        r.a.ok &&
        r.b.codigo === '23514' &&
        r.b.mensaje === OTRO_LEAD_CREAR &&
        (await cot(orquesta, id)) === undefined &&
        (await leadDe(orquesta, t.vehiculo)) === otro &&
        (await claseDelLead(orquesta, t.lead)) === antes,
      r,
    )
  }

  console.log(
    'Crear una final mientras el vehículo va a la papelera (Q3: vehículo → sus cotizaciones)',
  )
  {
    const t = await terreno(orquesta, 'q3')
    const [id, p] = [nuevoId(), nuevoId()]
    await insertaCotizacion(orquesta, t, p)
    let lote = null
    const r = await enDosPasos({
      a1: (a) => a.query('select 1 from public.vehiculos where id = $1 for update', [t.vehiculo]),
      b: crear(duena, t, id, { clase: 'final' }),
      a2: async (a) => {
        const {
          rows: [l],
        } = await a.query(
          `insert into public.lotes_papelera (tipo, creado_por) values ('vehiculos', $1) returning id`,
          [duena],
        )
        lote = l.id
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
    const fp = await cot(orquesta, p)
    espero(
      'la papelera gana sin interbloqueo y B responde que no ve el vehículo (42501); la preventa, en el lote de A',
      r.comoFue === 'esperó' &&
        r.a.ok &&
        r.b.codigo === '42501' &&
        r.b.mensaje === SIN_VEHICULO &&
        (await cot(orquesta, id)) === undefined &&
        fp.lote_papelera_id === lote,
      { r, fp },
    )
  }

  console.log('Dos finales creadas a la vez, mismo vehículo y mismo lead, con una preventa (Q4)')
  {
    const t = await terreno(orquesta, 'q4')
    const [id1, id2, p] = [nuevoId(), nuevoId(), nuevoId()]
    await insertaCotizacion(orquesta, t, p)
    const r = await carrera(orquesta, {
      a: crear(duena, t, id1, { clase: 'final' }),
      b: crear(duena, t, id2, { clase: 'final' }),
    })
    const [f1, fp] = [await cot(orquesta, id1), await cot(orquesta, p)]
    espero(
      'gana la primera; B espera el lead y responde el 23505 de otra final; la preventa en un lote y el vehículo con el lead',
      r.a.ok &&
        r.b.codigo === '23505' &&
        r.b.mensaje === YA_FINAL &&
        f1.clase === 'final' &&
        !fp.viva &&
        fp.lote_papelera_id !== null &&
        (await leadDe(orquesta, t.vehiculo)) === t.lead &&
        (await finales(orquesta, t.vehiculo)) === 1,
      { r, f1, fp },
    )
  }

  console.log('Dos finales creadas a la vez, mismo vehículo y otro lead, con una preventa (Q5)')
  {
    const t = await terreno(orquesta, 'q5')
    const otro = await leadDeLaDuena(orquesta, 'q5 otro lead')
    const [id1, id2, p] = [nuevoId(), nuevoId(), nuevoId()]
    await insertaCotizacion(orquesta, t, p)
    const antes = await claseDelLead(orquesta, otro)
    const r = await carrera(orquesta, {
      a: crear(duena, t, id1, { clase: 'final' }),
      b: crear(duena, { ...t, lead: otro }, id2, { clase: 'final' }),
    })
    espero(
      'B espera en la pasada, relee el vínculo y responde el 23514 del otro lead; la primera queda y el otro lead no cambia',
      r.a.ok &&
        r.b.codigo === '23514' &&
        r.b.mensaje === OTRO_LEAD_CREAR &&
        (await cot(orquesta, id1)).clase === 'final' &&
        (await cot(orquesta, id2)) === undefined &&
        (await leadDe(orquesta, t.vehiculo)) === t.lead &&
        (await claseDelLead(orquesta, otro)) === antes,
      r,
    )
  }

  await carrerasDeCrearCandados({ orquesta, carrera, espero, conectar })
}
