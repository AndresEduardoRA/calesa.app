// Corre sólo las carreras de marcar final (`carreras.mjs`) contra la base del Supabase LOCAL de este worktree, con el arnés de `scripts/carreras.mjs`: A abre
// una transacción y actúa, B lanza, el orquestador espera a que B espere un candado y A confirma. Hasta que el carril A sume dos líneas a
// `scripts/carreras.mjs` (lo pide la bitácora del paso 4.25), `db:carreras` no las corre: se corren con el candado,
// `bash scripts/candado.sh db:carreras -- node supabase/tests/areas/final/correr-carreras.mjs`. Sale con 1 si alguna falla.
import pg from 'pg'
import { comoPersona, limpiar, sembrar } from '../../../../scripts/carreras/terreno.mjs'
import { stackLocal } from '../../../../scripts/lib/stack-local.mjs'
import { carrerasDeFinal, limpiarFinal } from './carreras.mjs'

const url = process.env.CARRERAS_DB_URL ?? stackLocal().urlDb
if (!/@(127\.0\.0\.1|localhost)[:/]/.test(url)) {
  console.error('Las carreras escriben y borran datos: sólo contra la base local.')
  process.exit(1)
}

const conectar = async () => {
  const c = new pg.Client({ connectionString: url })
  await c.connect()
  return c
}

const comoValor = (promesa) =>
  promesa.then(
    (r) => ({ ok: true, valor: r.rows[0]?.r ?? null }),
    (e) => ({ ok: false, codigo: e.code, mensaje: e.message }),
  )

async function esperarBloqueo(orquesta, pid) {
  const hasta = Date.now() + 10_000
  while (Date.now() < hasta) {
    const { rows } = await orquesta.query(
      'select wait_event_type from pg_stat_activity where pid = $1',
      [pid],
    )
    if (rows[0]?.wait_event_type === 'Lock') return
    await new Promise((listo) => setImmediate(listo))
  }
  throw new Error('B nunca esperó el lock de A: la carrera no se probó')
}

const consultaDe = (lado) => lado.consulta ?? `select ${lado.sql} as r`

// La de `scripts/carreras.mjs`: A actúa dentro de una transacción; B intenta mientras A no confirma.
async function carrera(orquesta, { a, b }) {
  const [ca, cb] = [await conectar(), await conectar()]
  try {
    for (const [c, lado] of [
      [ca, a],
      [cb, b],
    ]) {
      if (lado.rol) await c.query(`set role ${lado.rol}`)
      else await comoPersona(c, lado.persona)
    }
    await ca.query('begin')
    const primero = await comoValor(ca.query(consultaDe(a), a.args))
    if (!primero.ok) throw new Error(`A falló antes de la carrera: ${primero.mensaje}`)
    const pidB = (await cb.query('select pg_backend_pid() as pid')).rows[0].pid
    const segundo = comoValor(cb.query(consultaDe(b), b.args))
    await esperarBloqueo(orquesta, pidB)
    await ca.query('commit')
    return { a: primero, b: await segundo }
  } finally {
    await ca.end()
    await cb.end()
  }
}

const fallas = []
function espero(nombre, condicion, detalle) {
  console.log(`  ${condicion ? '✓' : '✗'} ${nombre}`)
  if (!condicion) fallas.push(`${nombre}: ${JSON.stringify(detalle)}`)
}

const orquesta = await conectar()
const inicio = Date.now()
try {
  await limpiarFinal(orquesta)
  await limpiar(orquesta)
  await sembrar(orquesta)
  await carrerasDeFinal({ orquesta, carrera, espero, conectar, esperarBloqueo })
} catch (e) {
  fallas.push(`la corrida se cortó: ${e.message}`)
} finally {
  await limpiarFinal(orquesta).catch((e) => fallas.push(`limpiar lo de final: ${e.message}`))
  await limpiar(orquesta).catch((e) => fallas.push(`limpiar: ${e.message}`))
  await orquesta.end()
}

console.log(
  `\n${fallas.length === 0 ? 'Todas las carreras de marcar final en verde' : 'Fallaron'} (${((Date.now() - inicio) / 1000).toFixed(1)} s).`,
)
if (fallas.length > 0) {
  for (const falla of fallas) console.error(`  ${falla}`)
  process.exit(1)
}
