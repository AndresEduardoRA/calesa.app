// El job de purga (`papelera_purgar_vencidos`: hasta 50 lotes vencidos por `creado_en`, en una sola transacción) contra restaurar un lote de
// cotizaciones, que toma sus leads y después sus vehículos, cada clase por id. El job retiene lo de cada lote hasta el final: si tomara las filas
// lote a lote, un vehículo de un lote viejo antes que el lead de uno nuevo (o dos vehículos al revés de su id) cerraría un círculo con restaurar y
// una de las dos recibiría 40P01 (el job lo atrapa por lote y lo deja en un aviso). Con tres conexiones a la base del Supabase LOCAL: C (postgres)
// retiene un lote del job; A (el job, sin sesión) lanza y queda esperándolo; B (restaurar) lanza y termina o queda esperando; C confirma.
import { PERSONAS, comoPersona } from './terreno.mjs'
import { insertaCotizacion, nuevoVehiculo, terreno } from './cotizaciones.mjs'

const { duena } = PERSONAS

let contador = 0
const nuevoId = () => `00000000-0000-4000-8000-0000000e8${String(++contador).padStart(3, '0')}`

const comoValor = (promesa) =>
  promesa.then(
    (r) => ({ ok: true, valor: r.rows[0]?.r ?? null }),
    (e) => ({ ok: false, codigo: e.code, mensaje: e.message }),
  )
const fila = async (db, sql, args) => (await db.query(sql, args)).rows[0]

// Una llamada que termina o queda esperando un candado; lo que pase primero.
async function esperaOTermina(orquesta, pid, termino) {
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
  throw new Error('La llamada ni terminó ni esperó un candado: la carrera no se probó')
}

async function lanzar(orquesta, c, sql, args) {
  const pid = (await c.query('select pg_backend_pid() as pid')).rows[0].pid
  let termino = false
  const llamada = comoValor(c.query(`select ${sql} as r`, args)).finally(() => {
    termino = true
  })
  return { llamada, comoFue: await esperaOTermina(orquesta, pid, () => termino) }
}

// Un lote de la papelera vencido hace `dias` días (el job los toma del más viejo al más nuevo) con esas filas adentro.
async function loteVencido(db, tabla, ids, dias) {
  const { lote } = await fila(
    db,
    `insert into public.lotes_papelera (tipo, creado_por, creado_en)
     values ($1::public.tipo_lote_papelera, $2, now() - make_interval(days => $3)) returning id as lote`,
    [tabla, duena, dias],
  )
  await db.query(
    `update public.${tabla} set eliminado_en = now(), eliminado_por = $2, lote_papelera_id = $3 where id = any ($1::uuid[])`,
    [ids, duena, lote],
  )
  return lote
}

// Las cotizaciones en un lote de la papelera de cotizaciones, enviadas por la dueña como desde la pantalla.
async function enLaPapelera(db, ids) {
  await comoPersona(db, duena)
  const { lote } = await fila(
    db,
    `select public.papelera_enviar('cotizaciones', $1::uuid[]) as lote`,
    [ids],
  )
  await db.query('reset role')
  return lote
}

function armarCarrera({ orquesta, conectar }) {
  // C retiene `retenido` (un lote del job); A corre el job hasta esperarlo; B restaura `lote`; C confirma.
  return async function purgaContraRestaurar({ retenido, lote }) {
    const [cc, ca, cb] = [await conectar(), await conectar(), await conectar()]
    const avisos = []
    ca.on('notice', (n) => avisos.push(n.message))
    try {
      await cc.query('begin')
      await cc.query('select 1 from public.lotes_papelera where id = $1 for update', [retenido])
      const la = await lanzar(orquesta, ca, 'public.papelera_purgar_vencidos()', [])
      if (la.comoFue !== 'esperó')
        throw new Error('El job no esperó el lote que retiene C: la carrera no se probó')
      await comoPersona(cb, duena)
      const version = (
        await fila(
          orquesta,
          'select actualizado_en::text as v from public.lotes_papelera where id = $1',
          [lote],
        )
      ).v
      const lb = await lanzar(
        orquesta,
        cb,
        'public.cotizaciones_papelera_restaurar($1, $2::timestamptz)',
        [lote, version],
      )
      await cc.query('commit')
      return { job: await la.llamada, restaurar: await lb.llamada, avisos }
    } finally {
      await cc.end()
      await ca.end()
      await cb.end()
    }
  }
}

// Restaurar vuelve sin error y deja cada cotización pendiente porque su vehículo sigue en la papelera; el job termina sin avisos (un 40P01 suyo
// queda en un aviso «papelera: no se pudo purgar el lote»).
const sinInterbloqueo = (r, pendientes) =>
  r.job.ok &&
  r.avisos.length === 0 &&
  r.restaurar.ok &&
  r.restaurar.valor?.restaurados?.length === 0 &&
  r.restaurar.valor?.pendientes?.length === pendientes &&
  r.restaurar.valor.pendientes.every((p) => p.motivo === 'Su vehículo está en la papelera.')

export async function carrerasDePurgaContraRestaurar({ orquesta, espero, conectar }) {
  const purgaContraRestaurar = armarCarrera({ orquesta, conectar })

  console.log('El job purga un vehículo y después su lead mientras se restaura su cotización')
  {
    // El lote del vehículo es más viejo que el del lead: el job toma el vehículo y espera el lote del lead (C). Restaurar toma el lead y espera el
    // vehículo. Al soltar C, si el job no tomó el lead antes que el vehículo, lo espera de restaurar: 40P01.
    const t = await terreno(orquesta, 'pr1')
    const c = nuevoId()
    await insertaCotizacion(orquesta, t, c)
    const lote = await enLaPapelera(orquesta, [c])
    await loteVencido(orquesta, 'vehiculos', [t.vehiculo], 3002)
    const deLeads = await loteVencido(orquesta, 'leads', [t.lead], 3001)
    const r = await purgaContraRestaurar({ retenido: deLeads, lote })
    espero(
      'sin interbloqueo: restaurar deja la cotización pendiente y el job bloquea el vehículo y el lead sin avisos',
      sinInterbloqueo(r, 1),
      r,
    )
  }

  console.log('El job purga dos vehículos al revés de su id mientras se restauran sus cotizaciones')
  {
    // El vehículo de id mayor está en el lote más viejo: el job lo toma y espera el lote del otro (C). Restaurar toma el de id menor y espera el de id
    // mayor. Al soltar C, si el job no tomó los vehículos por id, espera el de id menor de restaurar: 40P01.
    const t = await terreno(orquesta, 'pr2')
    const otro = await nuevoVehiculo(orquesta, t.origen, 'cot veh pr2 otro')
    const [menor, mayor] = [t.vehiculo, otro].sort()
    const [c1, c2] = [nuevoId(), nuevoId()]
    await insertaCotizacion(orquesta, t, c1, { vehiculo: menor })
    await insertaCotizacion(orquesta, t, c2, { vehiculo: mayor })
    const lote = await enLaPapelera(orquesta, [c1, c2])
    await loteVencido(orquesta, 'vehiculos', [mayor], 3004)
    const delMenor = await loteVencido(orquesta, 'vehiculos', [menor], 3003)
    const r = await purgaContraRestaurar({ retenido: delMenor, lote })
    espero(
      'sin interbloqueo: restaurar deja las dos cotizaciones pendientes y el job bloquea los dos vehículos sin avisos',
      sinInterbloqueo(r, 2),
      r,
    )
  }
}
