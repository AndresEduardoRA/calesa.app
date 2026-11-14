// El orden de candados lead → vehículo → cotización (docs/DECISIONES.md) entre la papelera y lo que la cruza: cotizar encima contra mandar su vehículo a
// la papelera, y restaurar cotizaciones contra vincular su vehículo a su lead. Con tres conexiones a la base del Supabase LOCAL: C (postgres) retiene un
// candado; A lanza y queda esperando a C a mitad de su llamada; B lanza y termina o queda esperando; C confirma y se mira cómo terminaron A y B. Con el
// orden invertido en una de las dos llamadas, A y B se esperan en círculo y una recibe 40P01. Y con dos: purgar un lead contra mandar su cotización a la
// papelera, que la purga ve si toma las cotizaciones del lead antes de mirar.
import { PERSONAS, comoPersona } from './terreno.mjs'
import { insertaCotizacion, terreno } from './cotizaciones.mjs'

const { duena } = PERSONAS

let contador = 0
const nuevoId = () => `00000000-0000-4000-8000-0000000e7${String(++contador).padStart(3, '0')}`

const comoValor = (promesa) =>
  promesa.then(
    (r) => ({ ok: true, valor: r.rows[0]?.r ?? null }),
    (e) => ({ ok: false, codigo: e.code, mensaje: e.message }),
  )
// También el de un elemento de un lote: la papelera de vehículos lo atrapa y lo devuelve entre sus rechazados.
const sinInterbloqueo = (...rs) =>
  rs.every(
    (r) => r.codigo !== '40P01' && !(r.valor?.rechazados ?? []).some((x) => x.codigo === '40P01'),
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

async function lanzar(orquesta, c, lado) {
  await comoPersona(c, lado.persona)
  const pid = (await c.query('select pg_backend_pid() as pid')).rows[0].pid
  let termino = false
  const llamada = comoValor(c.query(`select ${lado.sql} as r`, lado.args)).finally(() => {
    termino = true
  })
  return { llamada, comoFue: await esperaOTermina(orquesta, pid, () => termino) }
}

function armarEnTres({ orquesta, conectar }) {
  return async function enTres({ retener, a, b }) {
    const [cc, ca, cb] = [await conectar(), await conectar(), await conectar()]
    try {
      await cc.query('begin')
      await retener(cc)
      const la = await lanzar(orquesta, ca, a)
      if (la.comoFue !== 'esperó')
        throw new Error('A no esperó el candado de C: la carrera no se probó')
      const lb = await lanzar(orquesta, cb, b)
      await cc.query('commit')
      return { a: await la.llamada, b: await lb.llamada, b_espero: lb.comoFue === 'esperó' }
    } finally {
      await cc.end()
      await ca.end()
      await cb.end()
    }
  }
}

const version = async (db, tabla, id) =>
  (await fila(db, `select actualizado_en::text as v from public.${tabla} where id = $1`, [id])).v

export async function carrerasDeCandadosDePapelera({ orquesta, espero, conectar }) {
  const enTres = armarEnTres({ orquesta, conectar })

  console.log('Cotizar encima mientras su vehículo va a la papelera')
  {
    // C retiene el lead: cotizar encima queda esperándolo. Mandar el vehículo a la papelera toma el vehículo y quiere las cotizaciones del vehículo.
    // Si cotizar encima tomó la anterior antes que el lead y el vehículo, la papelera la espera, y al soltar C cotizar encima espera el vehículo: 40P01.
    const t = await terreno(orquesta, 'cp1')
    const c = nuevoId()
    await insertaCotizacion(orquesta, t, c)
    const r = await enTres({
      retener: (cc) => cc.query('select 1 from public.leads where id = $1 for update', [t.lead]),
      a: { persona: duena, sql: 'public.cotizacion_encima($1, $2)', args: [nuevoId(), c] },
      b: {
        persona: duena,
        sql: 'public.vehiculos_papelera_enviar($1::jsonb)',
        args: [
          JSON.stringify([
            { id: t.vehiculo, actualizado_en: await version(orquesta, 'vehiculos', t.vehiculo) },
          ]),
        ],
      },
    })
    const quedan = await fila(
      orquesta,
      `select count(*)::int as n from public.cotizaciones where vehiculo_id = $1 and eliminado_en is null`,
      [t.vehiculo],
    )
    espero(
      'sin interbloqueo: la papelera se lleva el vehículo y su cotización, y cotizar encima ya no ve la anterior (42501)',
      sinInterbloqueo(r.a, r.b) &&
        r.b.ok &&
        r.b.valor?.enviados?.length === 1 &&
        r.a.codigo === '42501' &&
        quedan.n === 0,
      { r, quedan },
    )
  }

  console.log('Restaurar una cotización mientras su vehículo se vincula a su lead')
  {
    // C retiene el vehículo `for key share`: vincular toma el lead y queda esperando el vehículo. Restaurar toma el vehículo (no choca con C) y quiere
    // el lead: si toma el vehículo antes que el lead, al soltar C vincular espera a restaurar y restaurar a vincular: 40P01.
    const t = await terreno(orquesta, 'cp2')
    const c = nuevoId()
    await insertaCotizacion(orquesta, t, c)
    await comoPersona(orquesta, duena)
    const { lote } = await fila(
      orquesta,
      `select public.papelera_enviar('cotizaciones', array[$1::uuid]) as lote`,
      [c],
    )
    await orquesta.query('reset role')
    const r = await enTres({
      retener: (cc) =>
        cc.query('select 1 from public.vehiculos where id = $1 for key share', [t.vehiculo]),
      a: {
        persona: duena,
        sql: 'public.vehiculo_vincular($1, $2::timestamptz, $3)',
        args: [t.vehiculo, await version(orquesta, 'vehiculos', t.vehiculo), t.lead],
      },
      b: {
        persona: duena,
        sql: 'public.cotizaciones_papelera_restaurar($1, $2::timestamptz)',
        args: [lote, await version(orquesta, 'lotes_papelera', lote)],
      },
    })
    const final = await fila(
      orquesta,
      `select (select lead_id from public.vehiculos where id = $1) as lead, (select eliminado_en is null from public.cotizaciones where id = $2) as viva`,
      [t.vehiculo, c],
    )
    espero(
      'sin interbloqueo: el vehículo queda vinculado al lead y la cotización vuelve',
      sinInterbloqueo(r.a, r.b) &&
        r.a.ok &&
        r.b.ok &&
        r.b.valor?.restaurados?.length === 1 &&
        final.lead === t.lead &&
        final.viva === true,
      { r, final },
    )
  }

  console.log('Purgar un lead mientras su cotización va a la papelera')
  {
    // A manda la cotización a la papelera sin confirmar; B (el job, sin sesión) purga el lote del lead y queda esperando la cotización. Si B mira antes de
    // tomarla, no la ve en la papelera, borra el lead y el `set null` le quita el cliente a una cotización que ya está en la papelera.
    const t = await terreno(orquesta, 'cp3')
    const c = nuevoId()
    await insertaCotizacion(orquesta, t, c)
    const { lote } = await fila(
      orquesta,
      `insert into public.lotes_papelera (tipo, creado_por) values ('leads', $1) returning id as lote`,
      [duena],
    )
    await orquesta.query(
      `update public.leads set eliminado_en = now(), eliminado_por = $2, lote_papelera_id = $3 where id = $1`,
      [t.lead, duena, lote],
    )
    const [ca, cb] = [await conectar(), await conectar()]
    let r
    try {
      await comoPersona(ca, duena)
      await ca.query('begin')
      const a = await comoValor(
        ca.query(`select public.papelera_enviar('cotizaciones', array[$1::uuid]) as r`, [c]),
      )
      if (!a.ok) throw new Error(`A falló antes de la carrera: ${a.mensaje}`)
      const pid = (await cb.query('select pg_backend_pid() as pid')).rows[0].pid
      let termino = false
      const b = comoValor(
        cb.query('select public._papelera_purgar_leads($1, null) as r', [lote]),
      ).finally(() => {
        termino = true
      })
      if ((await esperaOTermina(orquesta, pid, () => termino)) !== 'esperó')
        throw new Error('B no esperó la cotización de A: la carrera no se probó')
      await ca.query('commit')
      r = { a, b: await b }
    } finally {
      await ca.end()
      await cb.end()
    }
    const despues = await fila(
      orquesta,
      `select (select lead_id from public.cotizaciones where id = $1) as lead, exists (select 1 from public.leads where id = $2) as sigue`,
      [c, t.lead],
    )
    espero(
      'el lead queda bloqueado por la cotización que llegó a la papelera, y ella sigue con su lead',
      r.b.ok &&
        r.b.valor?.purgados?.length === 0 &&
        r.b.valor?.bloqueados?.[0]?.motivo ===
          'Tiene una cotización en la papelera. Púrgala antes.' &&
        despues.lead === t.lead &&
        despues.sigue === true,
      { r, despues },
    )
  }
}
