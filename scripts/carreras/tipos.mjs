// Las carreras de los tipos de lead (parte 9j): apagar a la vez los dos últimos activos de una clase (con la RPC y escribiendo
// la tabla directo), desactivar uno mientras otra persona crea o edita un lead con él, reordenar a la vez, eliminar uno que un alta
// está usando y el tope de 100. Cada una abre una transacción de A y deja a B esperando un lock (el arnés de
// `scripts/carreras.mjs`): si B no espera, la carrera no se probó.
import { PERSONAS, PREFIJO, leadDeLaDuena } from './terreno.mjs'

const { duena, configura } = PERSONAS

// Como texto: un `Date` de JavaScript pierde los microsegundos y la versión ya no coincide.
const version = async (db, tabla, id) =>
  (await db.query(`select actualizado_en::text as v from public.${tabla} where id = $1`, [id]))
    .rows[0].v

let numero = 0
async function tipoNuevo(db, etiqueta, clase = 'cliente') {
  numero += 1
  const {
    rows: [fila],
  } = await db.query(
    `insert into public.tipos_lead (clave, nombre, clase, orden)
     values ($1, $2, $3, coalesce((select max(orden) + 10 from public.tipos_lead), 10)) returning id`,
    [`carreras_${etiqueta}_${numero}`, `${PREFIJO} ${etiqueta} ${numero}`, clase],
  )
  return fila.id
}

const apagar = (id, ver) => ({
  persona: configura,
  sql: `public.tipo_lead_guardar($1, $2, '{"activo": false}')`,
  args: [id, ver],
})

const altaCon = (origen, tipo, telefono, nombre) => ({
  persona: duena,
  sql: 'public.crear_lead($1, $2::jsonb, null)',
  args: [
    crypto.randomUUID(),
    JSON.stringify({
      nombre,
      telefono_principal: telefono,
      origen_lead_id: origen,
      tipo_lead_id: tipo,
    }),
  ],
})

const cuentaLeads = async (db, nombre) =>
  Number(
    (await db.query(`select count(*) as n from public.leads where nombre = $1`, [nombre])).rows[0]
      .n,
  )
const estaActivo = async (db, id) =>
  (await db.query(`select activo from public.tipos_lead where id = $1`, [id])).rows[0].activo
const activosDeLaClase = async (db, clase) =>
  Number(
    (
      await db.query(`select count(*) as n from public.tipos_lead where clase = $1 and activo`, [
        clase,
      ])
    ).rows[0].n,
  )

export async function carrerasDeTipos({ orquesta, carrera, espero }) {
  const {
    rows: [{ id: origen }],
  } = await orquesta.query(
    `select id from public.origenes_lead where activo order by orden, nombre limit 1`,
  )

  console.log('Apagar a la vez los dos últimos tipos activos de una clase')
  {
    // Para que sean los dos últimos, se apagan los demás de la clase cliente mientras dura la prueba (como postgres, que puede: quedan
    // los dos nuevos). Se vuelven a encender al terminar, pase lo que pase.
    const a = await tipoNuevo(orquesta, 'ultimo a')
    const b = await tipoNuevo(orquesta, 'ultimo b')
    const { rows: otros } = await orquesta.query(
      `select id from public.tipos_lead where clase = 'cliente' and activo and id <> all ($1::uuid[])`,
      [[a, b]],
    )
    try {
      await orquesta.query(
        `update public.tipos_lead set activo = false where id = any ($1::uuid[])`,
        [otros.map((f) => f.id)],
      )
      espero(
        'el terreno: quedan exactamente dos activos en la clase',
        (await activosDeLaClase(orquesta, 'cliente')) === 2,
        {},
      )
      // Por la RPC: la segunda espera el candado de la tabla, y cuando entra ya no queda otro.
      const r = await carrera(orquesta, {
        a: apagar(a, await version(orquesta, 'tipos_lead', a)),
        b: apagar(b, await version(orquesta, 'tipos_lead', b)),
      })
      espero(
        'por la RPC: la primera apaga y la segunda dice que es el único activo de su clase (22023)',
        r.a.ok &&
          r.b.codigo === '22023' &&
          /único tipo activo de la clase «cliente»/.test(r.b.mensaje) &&
          !(await estaActivo(orquesta, a)) &&
          (await estaActivo(orquesta, b)) &&
          (await activosDeLaClase(orquesta, 'cliente')) === 1,
        r,
      )
      // Escribiendo la tabla directo (como service_role: sin RPC ni su candado de tabla): lo decide el trigger, con su candado por
      // clase. Se enciende a de nuevo para volver a tener dos.
      await orquesta.query(`update public.tipos_lead set activo = true where id = $1`, [a])
      const directo = (id) => ({
        rol: 'service_role',
        consulta: `with u as (update public.tipos_lead set activo = false where id = $1 returning id) select count(*) as r from u`,
        args: [id],
      })
      const d = await carrera(orquesta, { a: directo(a), b: directo(b) })
      espero(
        'sin la RPC: el trigger pone a las dos en fila y la segunda falla con el mismo mensaje (22023)',
        d.a.ok &&
          d.b.codigo === '22023' &&
          /único tipo activo de la clase «cliente»/.test(d.b.mensaje) &&
          (await activosDeLaClase(orquesta, 'cliente')) === 1,
        d,
      )
    } finally {
      await orquesta.query(
        `update public.tipos_lead set activo = true where id = any ($1::uuid[])`,
        [otros.map((f) => f.id)],
      )
    }
  }

  console.log('Desactivar un tipo mientras se crea un lead con él')
  {
    const t = await tipoNuevo(orquesta, 'apaga')
    const nombre = `${PREFIJO} alta con tipo apagado`
    const r = await carrera(orquesta, {
      a: apagar(t, await version(orquesta, 'tipos_lead', t)),
      b: altaCon(origen, t, '79200001', nombre),
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
    const t = await tipoNuevo(orquesta, 'crea')
    const nombre = `${PREFIJO} alta antes de apagar el tipo`
    const r = await carrera(orquesta, {
      a: altaCon(origen, t, '79200002', nombre),
      b: apagar(t, await version(orquesta, 'tipos_lead', t)),
    })
    espero(
      'crea primero: el lead queda con su tipo y la desactivación entra después',
      r.a.ok &&
        r.b.ok &&
        (await cuentaLeads(orquesta, nombre)) === 1 &&
        !(await estaActivo(orquesta, t)),
      r,
    )
  }

  console.log('Pasar un lead a un tipo que se está desactivando')
  {
    const t = await tipoNuevo(orquesta, 'edita')
    const lead = await leadDeLaDuena(orquesta, 'tipo nuevo')
    const antes = (
      await orquesta.query(`select tipo_lead_id from public.leads where id = $1`, [lead])
    ).rows[0].tipo_lead_id
    const r = await carrera(orquesta, {
      a: apagar(t, await version(orquesta, 'tipos_lead', t)),
      b: {
        persona: duena,
        sql: 'public.lead_guardar($1, $2, $3::jsonb)',
        args: [lead, await version(orquesta, 'leads', lead), JSON.stringify({ tipo_lead_id: t })],
      },
    })
    const despues = (
      await orquesta.query(`select tipo_lead_id from public.leads where id = $1`, [lead])
    ).rows[0].tipo_lead_id
    espero(
      'desactiva primero: la edición falla diciendo que se desactivó (22023) y el lead conserva el suyo',
      r.a.ok && r.b.codigo === '22023' && /se desactivó/.test(r.b.mensaje) && despues === antes,
      r,
    )
  }

  console.log('Dos personas reordenan a la vez')
  {
    const x = await tipoNuevo(orquesta, 'mover x')
    const y = await tipoNuevo(orquesta, 'mover y')
    const mover = async (id) => ({
      persona: configura,
      sql: 'public.tipo_lead_mover($1, $2, null)',
      args: [id, await version(orquesta, 'tipos_lead', id)],
    })
    const r = await carrera(orquesta, { a: await mover(x), b: await mover(y) })
    const { rows } = await orquesta.query(
      `select id, orden from public.tipos_lead order by orden, nombre`,
    )
    const distintos = new Set(rows.map((f) => f.orden)).size === rows.length
    espero(
      'las dos se aplican en fila: la segunda queda primera, la primera segunda y nadie comparte lugar',
      r.a.ok && r.b.ok && rows[0].id === y && rows[1].id === x && distintos,
      { r, primeros: rows.slice(0, 3).map((f) => f.id), distintos },
    )
  }

  console.log('Eliminar un tipo mientras se crea un lead con él')
  {
    const t = await tipoNuevo(orquesta, 'elimina')
    const nombre = `${PREFIJO} alta contra eliminar tipo`
    const r = await carrera(orquesta, {
      a: altaCon(origen, t, '79200003', nombre),
      b: {
        persona: configura,
        sql: 'public.tipo_lead_eliminar($1, $2)',
        args: [t, await version(orquesta, 'tipos_lead', t)],
      },
    })
    const sigue = Number(
      (await orquesta.query(`select count(*) as n from public.tipos_lead where id = $1`, [t]))
        .rows[0].n,
    )
    espero(
      'el alta entra primero: eliminar dice que ya tiene leads (23503) y el tipo sigue',
      r.a.ok &&
        r.b.codigo === '23503' &&
        /ya tiene leads/.test(r.b.mensaje) &&
        sigue === 1 &&
        (await cuentaLeads(orquesta, nombre)) === 1,
      r,
    )
  }

  console.log('El tipo número 100 y el 101 a la vez')
  {
    const { rows } = await orquesta.query(`select count(*)::int as n from public.tipos_lead`)
    for (let i = 0; i < 99 - rows[0].n; i += 1) await tipoNuevo(orquesta, 'relleno')
    const crear = (nombre) => ({
      persona: configura,
      sql: `public.tipo_lead_crear($1, $2, 'cliente')`,
      args: [crypto.randomUUID(), `${PREFIJO} ${nombre}`],
    })
    const r = await carrera(orquesta, { a: crear('tope cien'), b: crear('tope ciento uno') })
    const { rows: total } = await orquesta.query(`select count(*)::int as n from public.tipos_lead`)
    espero(
      'entra uno solo: el otro dice que ya hay 100 (22023) y quedan 100',
      r.a.ok && r.b.codigo === '22023' && /máximo/.test(r.b.mensaje) && total[0].n === 100,
      { r, total: total[0].n },
    )
  }
}
