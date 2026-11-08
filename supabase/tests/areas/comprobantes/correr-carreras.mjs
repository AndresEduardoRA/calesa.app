// Corre sólo las carreras de la numeración de comprobantes (`carreras.mjs`) contra la base del Supabase LOCAL de este worktree, con el arnés de
// `scripts/carreras.mjs` (que también las corre, en `pnpm db:carreras`). Para iterar sobre ellas, con el candado:
// `bash scripts/candado.sh db:carreras -- node supabase/tests/areas/comprobantes/correr-carreras.mjs`. Sale con 1 si alguna falla.
import pg from 'pg'
import { limpiar, sembrar } from '../../../../scripts/carreras/terreno.mjs'
import { stackLocal } from '../../../../scripts/lib/stack-local.mjs'
import { carrerasDeComprobantes, limpiarComprobantes } from './carreras.mjs'

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

const fallas = []
function espero(nombre, condicion, detalle) {
  console.log(`  ${condicion ? '✓' : '✗'} ${nombre}`)
  if (!condicion) fallas.push(`${nombre}: ${JSON.stringify(detalle)}`)
}

const orquesta = await conectar()
const inicio = Date.now()
try {
  await limpiarComprobantes(orquesta)
  await limpiar(orquesta)
  await sembrar(orquesta)
  await carrerasDeComprobantes({ orquesta, espero, conectar, esperarBloqueo })
} catch (e) {
  fallas.push(`la corrida se cortó: ${e.message}`)
} finally {
  await limpiarComprobantes(orquesta).catch((e) =>
    fallas.push(`limpiar los comprobantes: ${e.message}`),
  )
  await limpiar(orquesta).catch((e) => fallas.push(`limpiar: ${e.message}`))
  await orquesta.end()
}

console.log(
  `\n${fallas.length === 0 ? 'Todas las carreras de comprobantes en verde' : 'Fallaron'} (${((Date.now() - inicio) / 1000).toFixed(1)} s).`,
)
if (fallas.length > 0) {
  for (const falla of fallas) console.error(`  ${falla}`)
  process.exit(1)
}
