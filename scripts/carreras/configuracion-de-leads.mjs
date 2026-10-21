// Las carreras de la configuración de leads: los tipos de seguimiento (desactivar uno mientras se anota un seguimiento con él,
// eliminarlo mientras se usa, reordenar a la vez y el tipo número 100 contra el 101) y el origen «por defecto» (marcar dos a la vez,
// marcar contra desactivar y escribir la tabla sin las RPC). Cada una abre una transacción de A y deja a B esperando un lock (el
// arnés de `scripts/carreras.mjs`): si B no espera, la carrera no se probó.
import { PERSONAS, PREFIJO, leadDeLaDuena } from './terreno.mjs'

const { duena, configura } = PERSONAS

// Como texto: un `Date` de JavaScript pierde los microsegundos y la versión ya no coincide.
const version = async (db, tabla, id) =>
  (await db.query(`select actualizado_en::text as v from public.${tabla} where id = $1`, [id]))
    .rows[0].v

let numero = 0
async function tipoNuevo(db, etiqueta) {
  numero += 1
  const {
    rows: [fila],
  } = await db.query(
    `insert into public.tipos_seguimiento (clave, nombre, orden)
     values ($1, $2, coalesce((select max(orden) + 10 from public.tipos_seguimiento), 10)) returning id`,
    [`carreras_${etiqueta}_${numero}`, `${PREFIJO} ${etiqueta} ${numero}`],
  )
  return fila.id
}

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

const apagarTipo = (id, ver) => ({
  persona: configura,
  sql: `public.tipo_seguimiento_guardar($1, $2, '{"activo": false}')`,
  args: [id, ver],
})

const anotarCon = (lead, tipo, titulo) => ({
  persona: duena,
  sql: `public.seguimiento_crear(gen_random_uuid(), $1, jsonb_build_object('tipo_id', $2::uuid, 'titulo', $3::text))`,
  args: [lead, tipo, titulo],
})

const cuentaSeguimientos = async (db, titulo) =>
  Number(
    (await db.query(`select count(*) as n from public.seguimientos where titulo = $1`, [titulo]))
      .rows[0].n,
  )
const tipoActivo = async (db, id) =>
  (await db.query(`select activo from public.tipos_seguimiento where id = $1`, [id])).rows[0].activo

const marcarOrigen = (id, ver) => ({
  persona: configura,
  sql: `public.origen_lead_guardar($1, $2, '{"por_defecto": true}')`,
  args: [id, ver],
})
const porDefecto = async (db) =>
  (
    await db.query(`select id from public.origenes_lead where por_defecto order by nombre`)
  ).rows.map((f) => f.id)

export async function carrerasDeConfiguracionDeLeads({ orquesta, carrera, espero }) {
  console.log('Desactivar un tipo de seguimiento mientras se anota un seguimiento con él')
  {
    const t = await tipoNuevo(orquesta, 'apaga')
    const lead = await leadDeLaDuena(orquesta, 'tipo seguimiento apaga')
    const titulo = `${PREFIJO} anotar con tipo apagado`
    const r = await carrera(orquesta, {
      a: apagarTipo(t, await version(orquesta, 'tipos_seguimiento', t)),
      b: anotarCon(lead, t, titulo),
    })
    espero(
      'desactiva primero: anotar falla diciendo que se desactivó (22023) y no queda el seguimiento',
      r.a.ok &&
        r.b.codigo === '22023' &&
        /se desactivó/.test(r.b.mensaje) &&
        (await cuentaSeguimientos(orquesta, titulo)) === 0,
      r,
    )
  }
  {
    const t = await tipoNuevo(orquesta, 'crea')
    const lead = await leadDeLaDuena(orquesta, 'tipo seguimiento crea')
    const titulo = `${PREFIJO} anotar antes de apagar el tipo`
    const r = await carrera(orquesta, {
      a: anotarCon(lead, t, titulo),
      b: apagarTipo(t, await version(orquesta, 'tipos_seguimiento', t)),
    })
    espero(
      'anota primero: el seguimiento queda con su tipo y la desactivación entra después',
      r.a.ok &&
        r.b.ok &&
        (await cuentaSeguimientos(orquesta, titulo)) === 1 &&
        !(await tipoActivo(orquesta, t)),
      r,
    )
  }

  console.log('Eliminar un tipo de seguimiento mientras se anota con él')
  {
    const t = await tipoNuevo(orquesta, 'elimina')
    const lead = await leadDeLaDuena(orquesta, 'tipo seguimiento elimina')
    const titulo = `${PREFIJO} anotar contra eliminar tipo`
    const r = await carrera(orquesta, {
      a: anotarCon(lead, t, titulo),
      b: {
        persona: configura,
        sql: 'public.tipo_seguimiento_eliminar($1, $2)',
        args: [t, await version(orquesta, 'tipos_seguimiento', t)],
      },
    })
    const sigue = Number(
      (
        await orquesta.query(`select count(*) as n from public.tipos_seguimiento where id = $1`, [
          t,
        ])
      ).rows[0].n,
    )
    espero(
      'anota primero: eliminar dice que ya tiene seguimientos (23503) y el tipo sigue',
      r.a.ok &&
        r.b.codigo === '23503' &&
        /ya tiene seguimientos/.test(r.b.mensaje) &&
        sigue === 1 &&
        (await cuentaSeguimientos(orquesta, titulo)) === 1,
      r,
    )
  }

  console.log('Dos personas reordenan los tipos de seguimiento a la vez')
  {
    const x = await tipoNuevo(orquesta, 'mover x')
    const y = await tipoNuevo(orquesta, 'mover y')
    const w = await tipoNuevo(orquesta, 'mover w')
    // Cada una pide «después de» la otra tarjeta: sin que se pongan en fila, las dos calculan el lugar con la lista de antes.
    const mover = async (id, despuesDe) => ({
      persona: configura,
      sql: 'public.tipo_seguimiento_mover($1, $2, $3)',
      args: [id, await version(orquesta, 'tipos_seguimiento', id), despuesDe],
    })
    const r = await carrera(orquesta, { a: await mover(x, w), b: await mover(y, x) })
    const { rows } = await orquesta.query(
      `select id, orden from public.tipos_seguimiento order by orden, nombre`,
    )
    const distintos = new Set(rows.map((f) => f.orden)).size === rows.length
    const lugar = (id) => rows.findIndex((f) => f.id === id)
    espero(
      'las dos se aplican en fila: w, x, y en ese orden y nadie comparte lugar',
      r.a.ok && r.b.ok && lugar(w) + 1 === lugar(x) && lugar(x) + 1 === lugar(y) && distintos,
      { r, orden: rows.slice(-4).map((f) => f.id), distintos },
    )
  }

  console.log('El tipo de seguimiento número 100 y el 101 a la vez')
  {
    const { rows } = await orquesta.query(`select count(*)::int as n from public.tipos_seguimiento`)
    for (let i = 0; i < 99 - rows[0].n; i += 1) await tipoNuevo(orquesta, 'relleno')
    const crear = (nombre) => ({
      persona: configura,
      sql: 'public.tipo_seguimiento_crear($1, $2)',
      args: [crypto.randomUUID(), `${PREFIJO} ${nombre}`],
    })
    const r = await carrera(orquesta, { a: crear('tope cien'), b: crear('tope ciento uno') })
    const { rows: total } = await orquesta.query(
      `select count(*)::int as n from public.tipos_seguimiento`,
    )
    espero(
      'entra uno solo: el otro dice que ya hay 100 (22023) y quedan 100',
      r.a.ok && r.b.codigo === '22023' && /máximo/.test(r.b.mensaje) && total[0].n === 100,
      { r, total: total[0].n },
    )
  }

  console.log('Dos orígenes «por defecto» a la vez')
  {
    const x = await origenNuevo(orquesta, 'defecto x')
    const y = await origenNuevo(orquesta, 'defecto y')
    const r = await carrera(orquesta, {
      a: marcarOrigen(x, await version(orquesta, 'origenes_lead', x)),
      b: marcarOrigen(y, await version(orquesta, 'origenes_lead', y)),
    })
    const marcados = await porDefecto(orquesta)
    espero(
      'por la RPC: las dos entran en fila y queda uno solo, el de la segunda',
      r.a.ok && r.b.ok && marcados.length === 1 && marcados[0] === y,
      { r, marcados },
    )
    // Escribiendo la tabla directo (como service_role: sin RPC ni su candado de tabla): lo decide el índice único.
    await orquesta.query(`update public.origenes_lead set por_defecto = false where por_defecto`)
    const directo = (id) => ({
      rol: 'service_role',
      consulta: `with u as (update public.origenes_lead set por_defecto = true where id = $1 returning id) select count(*) as r from u`,
      args: [id],
    })
    const d = await carrera(orquesta, { a: directo(x), b: directo(y) })
    espero(
      'sin la RPC: el índice único deja entrar uno y rechaza al otro (23505), y queda uno solo',
      d.a.ok &&
        d.b.codigo === '23505' &&
        /origenes_lead_por_defecto_unico/.test(d.b.mensaje) &&
        (await porDefecto(orquesta)).length === 1,
      d,
    )
    await orquesta.query(`update public.origenes_lead set por_defecto = false where por_defecto`)
  }

  console.log('Marcar un origen «por defecto» mientras otra persona lo desactiva')
  {
    const o = await origenNuevo(orquesta, 'defecto contra apagar')
    const ver = await version(orquesta, 'origenes_lead', o)
    const r = await carrera(orquesta, {
      a: marcarOrigen(o, ver),
      b: {
        persona: configura,
        sql: `public.origen_lead_guardar($1, $2, '{"activo": false}')`,
        args: [o, ver],
      },
    })
    const { rows } = await orquesta.query(
      `select activo, por_defecto from public.origenes_lead where id = $1`,
      [o],
    )
    espero(
      'marca primero: apagarlo dice que es el origen por defecto (22023) y queda activo y por defecto',
      r.a.ok &&
        r.b.codigo === '22023' &&
        /es el origen por defecto/.test(r.b.mensaje) &&
        rows[0].activo &&
        rows[0].por_defecto,
      { r, fila: rows[0] },
    )
    await orquesta.query(`update public.origenes_lead set por_defecto = false where por_defecto`)
  }
  {
    const o = await origenNuevo(orquesta, 'apagar contra defecto')
    const ver = await version(orquesta, 'origenes_lead', o)
    const r = await carrera(orquesta, {
      a: {
        persona: configura,
        sql: `public.origen_lead_guardar($1, $2, '{"activo": false}')`,
        args: [o, ver],
      },
      b: marcarOrigen(o, ver),
    })
    const { rows } = await orquesta.query(
      `select activo, por_defecto from public.origenes_lead where id = $1`,
      [o],
    )
    espero(
      'apaga primero: marcarlo con la versión de antes es un conflicto (PT409) y no queda por defecto',
      r.a.ok &&
        r.b.codigo === 'PT409' &&
        /Otra persona cambió este origen/.test(r.b.mensaje) &&
        !rows[0].activo &&
        !rows[0].por_defecto,
      { r, fila: rows[0] },
    )
  }
}
