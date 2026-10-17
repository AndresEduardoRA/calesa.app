// Las carreras de los orígenes del lead (parte 9f-1): desactivar uno mientras otra persona crea o edita un
// lead con él, reordenar a la vez, eliminar uno que un alta está usando y el tope de 100. Cada una abre una
// transacción de A y deja a B esperando un lock (el arnés de `scripts/carreras.mjs`): si B no espera, la
// carrera no se probó.
import { PERSONAS, PREFIJO, leadDeLaDuena } from './terreno.mjs'

const { duena, configura } = PERSONAS

// Como texto: un `Date` de JavaScript pierde los microsegundos y la versión ya no coincide.
const version = async (db, tabla, id) =>
  (await db.query(`select actualizado_en::text as v from public.${tabla} where id = $1`, [id]))
    .rows[0].v

let numero = 0
async function origenNuevo(db, etiqueta) {
  numero += 1
  const {
    rows: [fila],
  } = await db.query(
    `insert into public.origenes_lead (clave, nombre, orden)
     values ($1, $2, coalesce((select max(orden) + 10 from public.origenes_lead), 10)) returning id`,
    [`carreras_${etiqueta}_${numero}`, `${PREFIJO} ${etiqueta} ${numero}`],
  )
  return fila.id
}

const altaCon = (origen, telefono, nombre) => ({
  persona: duena,
  sql: 'public.crear_lead($1, $2::jsonb, null)',
  args: [
    crypto.randomUUID(),
    JSON.stringify({ nombre, telefono_principal: telefono, origen_lead_id: origen }),
  ],
})

const cuentaLeads = async (db, nombre) =>
  Number(
    (await db.query(`select count(*) as n from public.leads where nombre = $1`, [nombre])).rows[0]
      .n,
  )
const estaActivo = async (db, id) =>
  (await db.query(`select activo from public.origenes_lead where id = $1`, [id])).rows[0].activo

export async function carrerasDeOrigenes({ orquesta, carrera, espero }) {
  console.log('Desactivar un origen mientras se crea un lead con él')
  {
    const o = await origenNuevo(orquesta, 'apaga')
    const nombre = `${PREFIJO} alta con origen apagado`
    const r = await carrera(orquesta, {
      a: {
        persona: configura,
        sql: `public.origen_lead_guardar($1, $2, '{"activo": false}')`,
        args: [o, await version(orquesta, 'origenes_lead', o)],
      },
      b: altaCon(o, '79100001', nombre),
    })
    espero(
      'desactiva primero: el alta falla diciendo que se desactivó (22023) y no queda el lead',
      r.a.ok &&
        r.b.codigo === '22023' &&
        /se desactivó/.test(r.b.mensaje) &&
        (await cuentaLeads(orquesta, nombre)) === 0,
      r,
    )
  }
  {
    const o = await origenNuevo(orquesta, 'crea')
    const nombre = `${PREFIJO} alta antes de apagar`
    const r = await carrera(orquesta, {
      a: altaCon(o, '79100002', nombre),
      b: {
        persona: configura,
        sql: `public.origen_lead_guardar($1, $2, '{"activo": false}')`,
        args: [o, await version(orquesta, 'origenes_lead', o)],
      },
    })
    espero(
      'crea primero: el lead queda con su origen y la desactivación entra después',
      r.a.ok &&
        r.b.ok &&
        (await cuentaLeads(orquesta, nombre)) === 1 &&
        !(await estaActivo(orquesta, o)),
      r,
    )
  }

  console.log('Pasar un lead a un origen que se está desactivando')
  {
    const o = await origenNuevo(orquesta, 'edita')
    const lead = await leadDeLaDuena(orquesta, 'origen nuevo')
    const antes = (
      await orquesta.query(`select origen_lead_id from public.leads where id = $1`, [lead])
    ).rows[0].origen_lead_id
    const r = await carrera(orquesta, {
      a: {
        persona: configura,
        sql: `public.origen_lead_guardar($1, $2, '{"activo": false}')`,
        args: [o, await version(orquesta, 'origenes_lead', o)],
      },
      b: {
        persona: duena,
        sql: 'public.lead_guardar($1, $2, $3::jsonb)',
        args: [lead, await version(orquesta, 'leads', lead), JSON.stringify({ origen_lead_id: o })],
      },
    })
    const despues = (
      await orquesta.query(`select origen_lead_id from public.leads where id = $1`, [lead])
    ).rows[0].origen_lead_id
    espero(
      'desactiva primero: la edición falla diciendo que se desactivó (22023) y el lead conserva el suyo',
      r.a.ok && r.b.codigo === '22023' && /se desactivó/.test(r.b.mensaje) && despues === antes,
      r,
    )
  }

  console.log('Dos personas reordenan a la vez')
  {
    const x = await origenNuevo(orquesta, 'mover x')
    const y = await origenNuevo(orquesta, 'mover y')
    const mover = (id, persona) => ({
      persona,
      sql: 'public.origen_lead_mover($1, $2, null)',
      args: [id, null],
    })
    const a = mover(x, configura)
    a.args[1] = await version(orquesta, 'origenes_lead', x)
    const b = mover(y, configura)
    b.args[1] = await version(orquesta, 'origenes_lead', y)
    const r = await carrera(orquesta, { a, b })
    const { rows } = await orquesta.query(
      `select id, orden from public.origenes_lead order by orden, nombre`,
    )
    const distintos = new Set(rows.map((f) => f.orden)).size === rows.length
    espero(
      'las dos se aplican en fila: la segunda queda primera, la primera segunda y nadie comparte lugar',
      r.a.ok && r.b.ok && rows[0].id === y && rows[1].id === x && distintos,
      { r, primeros: rows.slice(0, 3).map((f) => f.id), distintos },
    )
  }

  console.log('Eliminar un origen mientras se crea un lead con él')
  {
    const o = await origenNuevo(orquesta, 'elimina')
    const nombre = `${PREFIJO} alta contra eliminar`
    const r = await carrera(orquesta, {
      a: altaCon(o, '79100003', nombre),
      b: {
        persona: configura,
        sql: 'public.origen_lead_eliminar($1, $2)',
        args: [o, await version(orquesta, 'origenes_lead', o)],
      },
    })
    const sigue = Number(
      (await orquesta.query(`select count(*) as n from public.origenes_lead where id = $1`, [o]))
        .rows[0].n,
    )
    espero(
      'el alta entra primero: eliminar dice que ya tiene leads (23503) y el origen sigue',
      r.a.ok &&
        r.b.codigo === '23503' &&
        /ya tiene leads/.test(r.b.mensaje) &&
        sigue === 1 &&
        (await cuentaLeads(orquesta, nombre)) === 1,
      r,
    )
  }

  console.log('El origen número 100 y el 101 a la vez')
  {
    const { rows } = await orquesta.query(`select count(*)::int as n from public.origenes_lead`)
    for (let i = 0; i < 99 - rows[0].n; i += 1) await origenNuevo(orquesta, 'relleno')
    const crear = (nombre) => ({
      persona: configura,
      sql: 'public.origen_lead_crear($1, $2)',
      args: [crypto.randomUUID(), `${PREFIJO} ${nombre}`],
    })
    const r = await carrera(orquesta, { a: crear('tope cien'), b: crear('tope ciento uno') })
    const { rows: total } = await orquesta.query(
      `select count(*)::int as n from public.origenes_lead`,
    )
    espero(
      'entra uno solo: el otro dice que ya hay 100 (22023) y quedan 100',
      r.a.ok && r.b.codigo === '22023' && /máximo/.test(r.b.mensaje) && total[0].n === 100,
      { r, total: total[0].n },
    )
  }
}
