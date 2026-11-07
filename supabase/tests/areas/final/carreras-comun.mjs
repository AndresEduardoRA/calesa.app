// Lo común de las carreras de marcar final (paso 4.25-1): los textos que se esperan, los ayudantes y la carrera en dos pasos. La usan `carreras.mjs`
// y `carreras-de-candados.mjs`.
import { comoPersona } from '../../../../scripts/carreras/terreno.mjs'

export const ACCESO = 'No tienes acceso a esta cotización.'
export const OTRO_LEAD =
  'Este vehículo está vinculado a otro lead. Desvincúlalo antes de marcar la final.'
export const LEAD_EN_PAPELERA =
  'El lead de esta cotización está en la papelera. Restáuralo antes de marcarla final.'
export const NO_PUEDE =
  'Este vehículo tiene preventas que no puedes mandar a la papelera. Pídeselo a quien las cotizó o a quien modera.'

// Ids propios de cada archivo de carreras (base distinta), para que no choquen.
export const idsDesde = (base) => {
  let n = 0
  return () => `00000000-0000-4000-8000-0000000f${String(base + ++n).padStart(4, '0')}`
}
export const comoValor = (promesa) =>
  promesa.then(
    (r) => ({ ok: true, valor: r.rows[0]?.r ?? null }),
    (e) => ({ ok: false, codigo: e.code, mensaje: e.message }),
  )
export const marcar = (persona, c) => ({
  persona,
  sql: 'public.cotizacion_marcar_final($1)',
  args: [c],
})
export const sinInterbloqueo = (...rs) => rs.every((r) => r?.codigo !== '40P01')
export const fila = async (db, sql, args) => (await db.query(sql, args)).rows[0]
export const cot = (db, id) =>
  fila(
    db,
    'select clase, eliminado_en is null as viva, lote_papelera_id from public.cotizaciones where id = $1',
    [id],
  )
export const leadDe = async (db, v) =>
  (await fila(db, 'select lead_id from public.vehiculos where id = $1', [v])).lead_id

// B termina o queda esperando un candado; lo que pase primero.
async function bloqueadoOTermino(orquesta, pid, termino) {
  const hasta = Date.now() + 10_000
  while (Date.now() < hasta) {
    if (termino()) return 'terminó'
    const { rows } = await orquesta.query(
      'select wait_event_type from pg_stat_activity where pid = $1',
      [pid],
    )
    if (rows[0]?.wait_event_type === 'Lock') return 'esperó'
    await new Promise((listo) => setImmediate(listo))
  }
  throw new Error('B ni terminó ni esperó un candado: la carrera no se probó')
}

// La carrera en dos pasos: A, como postgres (con el `sub` de quien actúa si hace falta), hace `a1` en su transacción; B lanza; se espera a que B termine o
// quede esperando un candado; A hace `a2` y confirma (o se deshace si falló). Devuelve los dos resultados y si B esperó.
export function armarEnDosPasos({ orquesta, conectar }) {
  return async function enDosPasos({ a1, b, a2, sub = null }) {
    const [ca, cb] = [await conectar(), await conectar()]
    try {
      await comoPersona(cb, b.persona)
      await ca.query('begin')
      if (sub) await ca.query(`select set_config('request.jwt.claim.sub', $1, true)`, [sub])
      await a1(ca)
      const pid = (await cb.query('select pg_backend_pid() as pid')).rows[0].pid
      let termino = false
      const llamada = comoValor(cb.query(`select ${b.sql} as r`, b.args)).finally(() => {
        termino = true
      })
      const comoFue = await bloqueadoOTermino(orquesta, pid, () => termino)
      let ra = { ok: true }
      try {
        await a2(ca)
      } catch (e) {
        ra = { ok: false, codigo: e.code, mensaje: e.message }
      }
      await ca.query(ra.ok ? 'commit' : 'rollback')
      return { a: ra, b: await llamada, comoFue }
    } finally {
      await ca.end()
      await cb.end()
    }
  }
}
