// Lo común de las carreras de comprobantes (paso 4.26-1): la serie de las carreras, los ayudantes y la carrera de dos conexiones. Lo usan `carreras.mjs`
// (K1–K5) y `carreras-papelera.mjs` (K6, K7).
import { PERSONAS, comoPersona } from '../../../../scripts/carreras/terreno.mjs'

export const { duena } = PERSONAS
export const SERIE = 'CARRERAS'
export const YA_ANULADO = 'Este comprobante ya estaba anulado.'

let n = 0
export const nuevoId = () =>
  `00000000-0000-4000-8000-0000000e${String(6000 + ++n).padStart(4, '0')}`

export const comoValor = (promesa) =>
  promesa.then(
    (r) => ({ ok: true, valor: r.rows[0]?.r ?? null }),
    (e) => ({ ok: false, codigo: e.code, mensaje: e.message }),
  )
export const fila = async (db, sql, args) => (await db.query(sql, args)).rows[0]

export const emitir = (c) => ({
  sql: 'public.comprobante_emitir($1, (select actualizado_en from public.cotizaciones where id = $1))',
  args: [c],
})
// Sin huecos: en cada serie de las carreras, los números son exactamente 1..último.
export async function sinHuecos(db) {
  const { rows } = await db.query(
    `select k.serie, k.ultimo, coalesce(array_agg(cp.numero order by cp.numero) filter (where cp.numero is not null), '{}') as numeros
       from public.comprobantes_contadores k left join public.comprobantes cp on cp.serie = k.serie
      where k.serie like $1 group by k.serie, k.ultimo`,
    [`${SERIE}%`],
  )
  return rows.every(
    (r) =>
      r.numeros.length === Number(r.ultimo) &&
      r.numeros.every((numero, i) => Number(numero) === i + 1),
  )
}

export const sinInterbloqueo = (...rs) => rs.every((r) => r?.codigo !== '40P01')

// A actúa en su transacción, B lanza y se espera a que B espere un candado; A confirma o, con `revierte`, se deshace. Las dos, como la dueña de las carreras.
export function armarCarrera({ orquesta, conectar, esperarBloqueo }) {
  return async function carrera({ a, b, revierte = false }) {
    const [ca, cb] = [await conectar(), await conectar()]
    try {
      await comoPersona(ca, duena)
      await comoPersona(cb, duena)
      await ca.query('begin')
      const primero = await comoValor(ca.query(`select ${a.sql} as r`, a.args))
      if (!primero.ok) throw new Error(`A falló antes de la carrera: ${primero.mensaje}`)
      const pidB = (await cb.query('select pg_backend_pid() as pid')).rows[0].pid
      const segundo = comoValor(cb.query(`select ${b.sql} as r`, b.args))
      await esperarBloqueo(orquesta, pidB)
      await ca.query(revierte ? 'rollback' : 'commit')
      return { a: primero, b: await segundo }
    } finally {
      await ca.end()
      await cb.end()
    }
  }
}
