// Las carreras entre quitar el dinero que pide una fase y mover el vehículo a esa fase, con dos conexiones reales a la base del Supabase LOCAL.
// Anular un pago confirmado y quitar un gasto de tributos (eliminarlo o cambiarle la categoría) toman el vehículo `for share` antes que sus pagos o
// sus tributos: esperan y hacen esperar a `cambiar_fase` (`for no key update`), como quitar un documento o una declaración exigidos.
//   K7. A anula el único pago confirmado sin confirmar; B mueve el vehículo a «pide» (exige pagos.confirmado): espera la unidad y, cuando A confirma,
//       no entra. Al revés: B anula mientras A mueve: espera y da 23514; el pago sigue vivo.
//   K8. Lo mismo con eliminar el único gasto de tributos (aduana.tributos_pagados).
// Ninguna termina en 40P01. Terreno con el prefijo «Carreras»: un rol, un origen y sus vehículos; el historial, las notas y el dinero los borra
// `limpiarDineroDeFase()`, el resto `limpiar()` de `scripts/carreras/terreno.mjs`. Las corre `scripts/carreras.mjs` (`pnpm db:carreras`).
import { PERSONAS, PREFIJO } from '../../../../scripts/carreras/terreno.mjs'
import { armarCarrera } from './carreras.mjs'

const { duena, supervision } = PERSONAS
const ROL = 'carreras_dinero_fase'
const VEHICULOS = `${PREFIJO} dinero fase%`

const fila = async (db, sql, args) => (await db.query(sql, args)).rows[0]
const sinInterbloqueo = (...rs) => rs.every((r) => r?.codigo !== '40P01')

// Lo que deja una corrida (también una rota). Va antes de `limpiarDinero()` y de `limpiar()`: el historial frena el borrado de las fases y un gasto el
// de su categoría.
export async function limpiarDineroDeFase(db) {
  const deLasCarreras = `(select id from public.vehiculos where titulo like $1)`
  for (const tabla of ['notas', 'historial_fases', 'gastos', 'pagos']) {
    await db.query(`delete from public.${tabla} where vehiculo_id in ${deLasCarreras}`, [VEHICULOS])
  }
  await db.query(`delete from public.vehiculos where titulo like $1`, [VEHICULOS])
}

// Un origen con su flujo (lo crea el trigger): «uno», la inicial, y «pide», que exige un pago confirmado y los tributos; la transición entre las dos.
async function terrenoDeFase(db) {
  const { id: rol } = await fila(
    db,
    `insert into public.roles (clave, nombre) values ($1, 'Carreras dinero y fase') returning id`,
    [ROL],
  )
  await db.query(
    `insert into public.roles_permisos (rol_id, permiso_clave, alcance)
     select $1, k, 'todos' from unnest(array['logistica.ver', 'flujos.mover', 'logistica.gastos.ver', 'logistica.gastos.editar',
                                             'logistica.pagos.ver', 'logistica.pagos.editar', 'logistica.pagos.confirmar']) k`,
    [rol],
  )
  await db.query(
    `insert into public.usuarios_roles (usuario_id, rol_id) values ($1, $3), ($2, $3) on conflict do nothing`,
    [duena, supervision, rol],
  )
  const { id: origen } = await fila(
    db,
    `insert into public.origenes (clave, nombre) values ($1, $2) returning id`,
    [ROL, `${PREFIJO} dinero fase`],
  )
  const { id: flujo } = await fila(db, `select id from public.flujos where origen_id = $1`, [
    origen,
  ])
  const fase = async (nombre, orden, inicial) =>
    (
      await fila(
        db,
        `insert into public.fases (flujo_id, nombre, orden, es_inicial) values ($1, $2, $3, $4) returning id`,
        [flujo, `${PREFIJO} dinero fase ${nombre}`, orden, inicial],
      )
    ).id
  const uno = await fase('uno', 10, true)
  const pide = await fase('pide', 20, false)
  await db.query(
    `insert into public.fases_requisitos (fase_id, tipo, clave_dato, bloqueante)
     values ($1, 'dato', 'pagos.confirmado', true), ($1, 'dato', 'aduana.tributos_pagados', true)`,
    [pide],
  )
  await db.query(
    `insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id) values ($1, $2, $3)`,
    [flujo, uno, pide],
  )
  const { id: tributos } = await fila(
    db,
    `insert into public.categorias_gasto (nombre, proposito) values ($1, 'tributos') returning id`,
    [`${PREFIJO} dinero fase tributos`],
  )
  const { base } = await fila(
    db,
    `select moneda_base::text as base from public.ajustes_empresa where id = 1`,
  )
  return { origen, uno, pide, tributos, base }
}

export async function carrerasDeDineroYFase({ orquesta, espero, conectar, esperarBloqueo }) {
  const carrera = armarCarrera({ orquesta, conectar, esperarBloqueo })
  await limpiarDineroDeFase(orquesta)
  const t = await terrenoDeFase(orquesta)

  // Un vehículo en «uno» con lo que pide «pide»: un pago confirmado (sellado por la dueña) y un gasto de tributos.
  const vehiculo = async (nombre) => {
    const { id } = await fila(
      orquesta,
      `insert into public.vehiculos (origen_id, titulo, fase_id, creado_por) values ($1, $2, $3, $4) returning id`,
      [t.origen, `${PREFIJO} dinero fase ${nombre}`, t.uno, duena],
    )
    await orquesta.query('begin')
    await orquesta.query(`select set_config('request.jwt.claim.sub', $1, true)`, [duena])
    const { id: pago } = await fila(
      orquesta,
      `insert into public.pagos (vehiculo_id, concepto, moneda, monto, monto_base) values ($1, 'Carreras seña', $2, 10, 10) returning id`,
      [id, t.base],
    )
    await orquesta.query(`update public.pagos set confirmado = true where id = $1`, [pago])
    await orquesta.query('commit')
    const { id: gasto } = await fila(
      orquesta,
      `insert into public.gastos (vehiculo_id, categoria_id, moneda, monto, monto_base, creado_por) values ($1, $2, $3, 10, 10, $4) returning id`,
      [id, t.tributos, t.base, duena],
    )
    return { id, pago, gasto }
  }
  const mover = (v) => ({
    sql: `public.cambiar_fase($1, null, $2, null, $3)::text`,
    args: [v, t.pide, t.uno],
  })
  const anular = (pago) => ({
    sql: `public.pago_anular($1, (select actualizado_en from public.pagos where id = $1), 'Carreras')`,
    args: [pago],
  })
  const eliminar = (gasto) => ({
    sql: `public.gasto_eliminar($1, (select actualizado_en from public.gastos where id = $1))`,
    args: [gasto],
  })
  const estado = (v, tabla, id) =>
    fila(
      orquesta,
      `select (select fase_id from public.vehiculos where id = $1) as fase,
              (select eliminado_en is null from public.${tabla} where id = $2) as vivo`,
      [v, id],
    )
  // Una carrera que no llega a esperar (sin el candado) corta sólo su caso.
  const correr = (lados) =>
    carrera(lados).catch((e) => ({ a: { ok: false, mensaje: e.message }, b: {} }))

  for (const [k, quitar, tabla, que] of [
    ['K7', (v) => anular(v.pago), 'pagos', 'anular el único pago confirmado'],
    ['K8', (v) => eliminar(v.gasto), 'gastos', 'eliminar el único gasto de tributos'],
  ]) {
    console.log(`Quitar lo que pide una fase contra mover el vehículo a ella: ${que}`)
    {
      const v = await vehiculo(`${k} quitar`)
      const id = tabla === 'pagos' ? v.pago : v.gasto
      const { a, b } = await correr({ a: quitar(v), b: mover(v.id) })
      const e = await estado(v.id, tabla, id)
      espero(
        `${k} (quitar primero): A quita; B espera la unidad y no entra (23514); sin 40P01`,
        a.ok &&
          b.codigo === '23514' &&
          e.fase === t.uno &&
          e.vivo === false &&
          sinInterbloqueo(a, b),
        { a, b, e },
      )
    }
    {
      const v = await vehiculo(`${k} mover`)
      const id = tabla === 'pagos' ? v.pago : v.gasto
      const { a, b } = await correr({ a: mover(v.id), b: quitar(v) })
      const e = await estado(v.id, tabla, id)
      espero(
        `${k} (mover primero): A mueve; B espera la unidad y da 23514; lo quitado sigue vivo; sin 40P01`,
        a.ok &&
          b.codigo === '23514' &&
          e.fase === t.pide &&
          e.vivo === true &&
          sinInterbloqueo(a, b),
        { a, b, e },
      )
    }
  }
  await limpiarDineroDeFase(orquesta)
}
