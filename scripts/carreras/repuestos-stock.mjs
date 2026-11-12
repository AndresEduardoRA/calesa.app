// Las carreras del stock de repuestos (paso 8.10-1, C6), con conexiones reales a la base del Supabase LOCAL.
// K1: dos salidas del mismo stock con el mismo stock esperado; B espera el `for update` del ítem y, cuando A confirma, recibe PT409 (nunca un negativo,
//     ni 23514 crudo ni 40001). K2: dos reasignaciones del último en stock con ids distintos; B recibe 23514 «Sólo hay 0 en stock.» y queda un solo
//     ítem nuevo. K2b: dos reasignaciones con el mismo id (un doble clic); B espera el candado del origen y recibe la respuesta idempotente, sin
//     descontar dos veces. K3 (D10 de 8.08-1): crear un ítem en un proyecto vacío mientras otro lo elimina; el `for update` de eliminar espera el
//     `for share` de crear y recibe 23514 «Tiene ítems…»: el proyecto sigue vivo.
// Terreno con el prefijo «Carreras» (proyectos externos por su etiqueta y un rol con repuestos.ver y repuestos.editar para la dueña de las
// carreras); lo borra `limpiarStock()`. Las corre `scripts/carreras.mjs` (`pnpm db:carreras`).
import { randomUUID } from 'node:crypto'
import { PERSONAS, PREFIJO } from './terreno.mjs'

const { duena } = PERSONAS
const ETIQUETA = `${PREFIJO} stock`

export async function limpiarStock(db) {
  const items = `select i.id from public.repuestos_items i join public.repuestos_proyectos p on p.id = i.proyecto_id where p.vehiculo_etiqueta like $1`
  await db.query(`delete from public.historial_fases where repuesto_id in (${items})`, [
    `${ETIQUETA}%`,
  ])
  await db.query(`delete from public.repuestos_items where id in (${items})`, [`${ETIQUETA}%`])
  await db.query(`delete from public.repuestos_proyectos where vehiculo_etiqueta like $1`, [
    `${ETIQUETA}%`,
  ])
  const rol = `(select id from public.roles where clave = 'carreras_repuestos')`
  await db.query(`delete from public.usuarios_roles where rol_id in ${rol}`)
  await db.query(`delete from public.roles_permisos where rol_id in ${rol}`)
  await db.query(`delete from public.roles where clave = 'carreras_repuestos'`)
}

async function terreno(db) {
  const {
    rows: [rol],
  } = await db.query(
    `insert into public.roles (clave, nombre) values ('carreras_repuestos', $1) returning id`,
    [`${PREFIJO} repuestos`],
  )
  await db.query(
    `insert into public.roles_permisos (rol_id, permiso_clave) values ($1, 'repuestos.ver'), ($1, 'repuestos.editar')`,
    [rol.id],
  )
  await db.query(
    `insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values ($1, $2, false)`,
    [duena, rol.id],
  )
}

const proyecto = async (db, nombre) =>
  (
    await db.query(
      `insert into public.repuestos_proyectos (vehiculo_etiqueta) values ($1) returning id`,
      [`${ETIQUETA} ${nombre}`],
    )
  ).rows[0].id

// Un ítem con stock, escrito como postgres (el terreno no es lo que se prueba).
const itemConStock = async (db, proyectoId, stock) =>
  (
    await db.query(
      `insert into public.repuestos_items (proyecto_id, descripcion, cantidad, stock_cantidad, en_stock_desde)
       values ($1, $2, $3, $3, now()) returning id`,
      [proyectoId, `${PREFIJO} ítem`, stock],
    )
  ).rows[0].id

const stockDe = async (db, item) =>
  (await db.query(`select stock_cantidad from public.repuestos_items where id = $1`, [item]))
    .rows[0].stock_cantidad

const movimientos = async (db, item) =>
  (
    await db.query(
      `select count(*)::int as n from public.repuestos_stock_movimientos where item_id = $1`,
      [item],
    )
  ).rows[0].n

const itemsDe = async (db, proyectoId) =>
  (
    await db.query(`select count(*)::int as n from public.repuestos_items where proyecto_id = $1`, [
      proyectoId,
    ])
  ).rows[0].n

const mover = (item, motivo) => ({
  persona: duena,
  sql: 'public.repuesto_stock_mover($1, 1, $2, 1)::text',
  args: [item, motivo],
})

const reasignar = (item, destino, id) => ({
  persona: duena,
  sql: 'public.repuesto_stock_reasignar($1, $2, 1, $3)::text',
  args: [item, destino, id],
})

export async function carrerasDeStock({ orquesta, carrera, espero }) {
  await limpiarStock(orquesta)
  await terreno(orquesta)
  const origen = await proyecto(orquesta, 'origen')

  console.log('Dos salidas del mismo stock a la vez')
  {
    const item = await itemConStock(orquesta, origen, 1)
    const r = await carrera(orquesta, { a: mover(item, 'vendido'), b: mover(item, 'devuelto') })
    const stock = await stockDe(orquesta, item)
    const n = await movimientos(orquesta, item)
    espero(
      'K1: A vende; B esperó el candado del ítem y recibe PT409; stock 0 y un solo movimiento',
      r.a.ok && r.b.codigo === 'PT409' && stock === 0 && n === 1,
      { r, stock, n },
    )
  }

  console.log('Dos reasignaciones del último en stock')
  {
    const item = await itemConStock(orquesta, origen, 1)
    const destino = await proyecto(orquesta, 'destino K2')
    const r = await carrera(orquesta, {
      a: reasignar(item, destino, randomUUID()),
      b: reasignar(item, destino, randomUUID()),
    })
    const stock = await stockDe(orquesta, item)
    const nuevos = await itemsDe(orquesta, destino)
    espero(
      'K2: A reasigna; B recibe 23514 «Sólo hay 0 en stock.»; un solo ítem nuevo y stock 0',
      r.a.ok &&
        r.b.codigo === '23514' &&
        r.b.mensaje === 'Sólo hay 0 en stock.' &&
        stock === 0 &&
        nuevos === 1,
      { r, stock, nuevos },
    )
  }

  console.log('Dos reasignaciones con el mismo id (doble clic)')
  {
    const item = await itemConStock(orquesta, origen, 2)
    const destino = await proyecto(orquesta, 'destino K2b')
    const id = randomUUID()
    const r = await carrera(orquesta, {
      a: reasignar(item, destino, id),
      b: reasignar(item, destino, id),
    })
    const stock = await stockDe(orquesta, item)
    const nuevos = await itemsDe(orquesta, destino)
    const n = await movimientos(orquesta, item)
    espero(
      'K2b: B esperó el candado del origen y recibe la respuesta idempotente; stock 1, un ítem y un movimiento',
      r.a.ok && r.b.ok && JSON.parse(r.b.valor).id === id && stock === 1 && nuevos === 1 && n === 1,
      { r, stock, nuevos, n },
    )
  }

  console.log('Crear un ítem mientras se elimina su proyecto')
  {
    const vacio = await proyecto(orquesta, 'vacío K3')
    const {
      rows: [{ v }],
    } = await orquesta.query(
      `select actualizado_en::text as v from public.repuestos_proyectos where id = $1`,
      [vacio],
    )
    const r = await carrera(orquesta, {
      a: {
        persona: duena,
        sql: 'public.repuesto_item_crear($1, $2, $3::jsonb)::text',
        args: [randomUUID(), vacio, JSON.stringify({ descripcion: `${PREFIJO} K3` })],
      },
      b: {
        persona: duena,
        sql: 'public.repuesto_proyecto_eliminar($1, $2)::text',
        args: [vacio, v],
      },
    })
    const {
      rows: [p],
    } = await orquesta.query(`select eliminado_en from public.repuestos_proyectos where id = $1`, [
      vacio,
    ])
    espero(
      'K3: A crea el ítem; eliminar esperó el for share y recibe 23514 «Tiene ítems…»; el proyecto sigue vivo',
      r.a.ok &&
        r.b.codigo === '23514' &&
        r.b.mensaje === 'Tiene ítems: ciérralo en vez de eliminarlo.' &&
        p.eliminado_en === null,
      { r, p },
    )
  }
}
