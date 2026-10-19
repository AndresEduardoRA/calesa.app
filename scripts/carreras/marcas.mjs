// Las carreras de las etiquetas de un lead (parte 8b): los dos topes que cuentan etiquetas —20 de una persona en un lead y 50 por
// persona— con dos pedidos a la vez. Todo lo que las cuenta toma el mismo candado por persona (`_etiquetas_candado()`,
// `pg_advisory_xact_lock`): A lo retiene dentro de su transacción y B espera; al confirmar A, B ve la cuenta ya completa y se
// rechaza. Sin el candado, las dos cuentas darían 19 y 49 y entrarían las dos. Lo probaba `leads-marcas-acceso.spec.ts` con dos
// sesiones de la API; aquí es el arnés de `scripts/carreras.mjs` (B tiene que esperar un lock: si no, la carrera no se probó).
import { PERSONAS, PREFIJO, leadDeLaDuena } from './terreno.mjs'

const { duena } = PERSONAS

const TOPE_POR_LEAD = 'Un lead admite hasta 20 de tus etiquetas. Quita una para poner otra.'
const TOPE_POR_PERSONA = 'Puedes tener hasta 50 etiquetas. Elimina una para crear otra.'

// `n` etiquetas de la persona, escritas como `postgres` (por encima de la RLS y de la RPC).
async function etiquetasDe(db, persona, n, prefijo) {
  const { rows } = await db.query(
    `insert into public.etiquetas (id, usuario_id, nombre, color)
     select gen_random_uuid(), $1, $2 || ' ' || g, 'gris' from generate_series(1, $3::int) g
     returning id`,
    [persona, `${PREFIJO} ${prefijo}`, n],
  )
  return rows.map((fila) => fila.id)
}

const cuentaEnElLead = async (db, lead) =>
  Number(
    (await db.query(`select count(*) as n from public.leads_etiquetas where lead_id = $1`, [lead]))
      .rows[0].n,
  )

const cuentaDe = async (db, persona) =>
  Number(
    (await db.query(`select count(*) as n from public.etiquetas where usuario_id = $1`, [persona]))
      .rows[0].n,
  )

export async function carrerasDeMarcas({ orquesta, carrera, espero }) {
  console.log('Dos etiquetas a la vez en un lead que tiene 19: entra una')
  {
    const lead = await leadDeLaDuena(orquesta, 'etiquetas tope por lead')
    const ids = await etiquetasDe(orquesta, duena, 21, 'Tope')
    await orquesta.query(
      `insert into public.leads_etiquetas (lead_id, etiqueta_id) select $1, unnest($2::uuid[])`,
      [lead, ids.slice(0, 19)],
    )
    const poner = (etiqueta) => ({
      persona: duena,
      sql: 'public.lead_etiquetas_poner($1, array[$2]::uuid[], true)',
      args: [lead, etiqueta],
    })
    const r = await carrera(orquesta, { a: poner(ids[19]), b: poner(ids[20]) })
    espero('la primera entra y la segunda se rechaza con el tope', r.a.ok && !r.b.ok, r)
    espero(`el motivo dice el tope de 20: ${r.b.mensaje}`, r.b.mensaje === TOPE_POR_LEAD, r.b)
    espero('el lead queda con 20 etiquetas, no 21', (await cuentaEnElLead(orquesta, lead)) === 20, {
      lead,
    })
  }

  console.log('Dos altas de etiqueta a la vez con 49: entra una')
  {
    const propias = await cuentaDe(orquesta, duena)
    if (propias < 49) await etiquetasDe(orquesta, duena, 49 - propias, 'Relleno')
    const crear = (nombre) => ({
      persona: duena,
      sql: 'public.etiqueta_crear($1, $2)',
      args: [crypto.randomUUID(), `${PREFIJO} ${nombre}`],
    })
    const r = await carrera(orquesta, { a: crear('Carrera A'), b: crear('Carrera B') })
    espero('la primera se crea y la segunda se rechaza con el tope', r.a.ok && !r.b.ok, r)
    espero(`el motivo dice el tope de 50: ${r.b.mensaje}`, r.b.mensaje === TOPE_POR_PERSONA, r.b)
    espero('la persona queda con 50 etiquetas, no 51', (await cuentaDe(orquesta, duena)) === 50, {
      n: await cuentaDe(orquesta, duena),
    })
  }
}
