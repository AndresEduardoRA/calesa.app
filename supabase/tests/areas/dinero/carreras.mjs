// Las carreras de gastos y pagos (paso 6.10-1), con dos conexiones reales a la base del Supabase LOCAL. A abre su transacción y actúa, B lanza, se espera
// a que B quede esperando un candado y A confirma. Ninguna termina en 40P01.
//   K1. Dos confirman el mismo pago con la misma versión: B espera la fila, da PT409 y queda un solo sello (el de A) y una sola fila `pago.confirmado`.
//   K2. Dos prorratean el mismo lote: B espera el candado del lote y devuelve lo ya repartido; quedan las filas de un solo reparto.
//   K3. Dos eliminan, a la vez, los dos únicos gastos de tributos de un vehículo cuya fase los pide: uno pasa, el otro da 23514 y queda un tributo.
// Las corre `scripts/carreras.mjs` (`pnpm db:carreras`) y, solas, `correr-carreras.mjs`. Terreno con el prefijo «Carreras», como las demás.
import { PERSONAS, PREFIJO, comoPersona } from '../../../../scripts/carreras/terreno.mjs'

const { duena, supervision } = PERSONAS
const ROL = 'carreras_dinero'

const comoValor = (promesa) =>
  promesa.then(
    (r) => ({ ok: true, valor: r.rows[0]?.r ?? null }),
    (e) => ({ ok: false, codigo: e.code, mensaje: e.message }),
  )
const fila = async (db, sql, args) => (await db.query(sql, args)).rows[0]
const sinInterbloqueo = (...rs) => rs.every((r) => r?.codigo !== '40P01')

// Lo que deja una corrida (también una rota). Va antes de `limpiar()` del terreno: un gasto frena el borrado de su categoría (`restrict`).
export async function limpiarDinero(db) {
  await db.query(
    `delete from public.gastos where vehiculo_id in (select id from public.vehiculos where titulo like $1)`,
    [`${PREFIJO}%`],
  )
  await db.query(
    `delete from public.pagos where vehiculo_id in (select id from public.vehiculos where titulo like $1)`,
    [`${PREFIJO}%`],
  )
  await db.query(`delete from public.categorias_gasto where nombre like $1`, [`${PREFIJO}%`])
}

// A y B, cada una con su persona.
function armarCarrera({ orquesta, conectar, esperarBloqueo }) {
  return async function carrera({ a, b, quienA = duena, quienB = supervision }) {
    const [ca, cb] = [await conectar(), await conectar()]
    try {
      await comoPersona(ca, quienA)
      await comoPersona(cb, quienB)
      await ca.query('begin')
      const primero = await comoValor(ca.query(`select ${a.sql} as r`, a.args))
      if (!primero.ok) throw new Error(`A falló antes de la carrera: ${primero.mensaje}`)
      const pidB = (await cb.query('select pg_backend_pid() as pid')).rows[0].pid
      const segundo = comoValor(cb.query(`select ${b.sql} as r`, b.args))
      await esperarBloqueo(orquesta, pidB)
      await ca.query('commit')
      return { a: primero, b: await segundo }
    } finally {
      await ca.end()
      await cb.end()
    }
  }
}

// Un origen con su flujo (lo crea el trigger), una fase que pide los tributos y tres vehículos en ella; las categorías de tributos y de flete.
async function terrenoDinero(db) {
  const { id: origen } = await fila(
    db,
    `insert into public.origenes (clave, nombre) values ('carreras_dinero', $1) returning id`,
    [`${PREFIJO} dinero`],
  )
  const { id: fase } = await fila(
    db,
    `insert into public.fases (flujo_id, nombre, orden) values ((select id from public.flujos where origen_id = $1), 'Carreras aduana', 90) returning id`,
    [origen],
  )
  await db.query(
    `insert into public.fases_requisitos (fase_id, tipo, clave_dato, bloqueante) values ($1, 'dato', 'aduana.tributos_pagados', false)`,
    [fase],
  )
  const vehiculos = []
  for (const n of [1, 2, 3]) {
    const { id } = await fila(
      db,
      `insert into public.vehiculos (origen_id, titulo, creado_por, fase_id) values ($1, $2, $3, $4) returning id`,
      [origen, `${PREFIJO} dinero ${n}`, duena, fase],
    )
    vehiculos.push(id)
  }
  const { id: tributos } = await fila(
    db,
    `insert into public.categorias_gasto (nombre, proposito) values ($1, 'tributos') returning id`,
    [`${PREFIJO} tributos`],
  )
  const { id: flete } = await fila(
    db,
    `insert into public.categorias_gasto (nombre, proposito) values ($1, 'flete') returning id`,
    [`${PREFIJO} flete`],
  )
  const { base } = await fila(
    db,
    `select moneda_base::text as base from public.ajustes_empresa where id = 1`,
  )
  return { origen, vehiculos, tributos, flete, base }
}

export async function carrerasDeDinero({ orquesta, espero, conectar, esperarBloqueo }) {
  const carrera = armarCarrera({ orquesta, conectar, esperarBloqueo })
  await limpiarDinero(orquesta)
  // Las dos personas de las carreras suman las claves de gastos y pagos (el rol se borra con los `carreras_%`).
  const { id: rol } = await fila(
    orquesta,
    `insert into public.roles (clave, nombre) values ($1, 'Carreras dinero') returning id`,
    [ROL],
  )
  await orquesta.query(
    `insert into public.roles_permisos (rol_id, permiso_clave, alcance)
     select $1, k, 'todos' from unnest(array['logistica.gastos.ver', 'logistica.gastos.editar', 'logistica.pagos.ver', 'logistica.pagos.editar',
                                             'logistica.pagos.confirmar']) k`,
    [rol],
  )
  await orquesta.query(
    `insert into public.usuarios_roles (usuario_id, rol_id) values ($1, $3), ($2, $3)`,
    [duena, supervision, rol],
  )
  const t = await terrenoDinero(orquesta)

  // K2 · el mismo lote dos veces a la vez.
  {
    const lote = '00000000-0000-4000-8000-0000000d0001'
    const prorratear = {
      sql: `public.gastos_prorratear($1, $2::uuid[], $3, $4, 100, null, null, null, null, null)`,
      args: [lote, t.vehiculos, t.flete, t.base],
    }
    const { a, b } = await carrera({ a: prorratear, b: prorratear })
    const { n } = await fila(
      orquesta,
      `select count(*)::int as n from public.gastos where lote_id = $1`,
      [lote],
    )
    espero(
      'K2: dos prorratean el mismo lote a la vez y queda un solo reparto',
      a.ok && b.ok && b.valor?.ya_existia === true && n === 3 && sinInterbloqueo(a, b),
      { a, b, n },
    )
  }

  // K3 · dos eliminan los dos únicos tributos de un vehículo cuya fase los pide.
  {
    const v = t.vehiculos[0]
    const ids = []
    for (const id of [
      '00000000-0000-4000-8000-0000000d0011',
      '00000000-0000-4000-8000-0000000d0012',
    ]) {
      await orquesta.query(
        `insert into public.gastos (id, vehiculo_id, categoria_id, moneda, monto, monto_base, creado_por) values ($1, $2, $3, $4, 10, 10, $5)`,
        [id, v, t.tributos, t.base, duena],
      )
      ids.push(id)
    }
    const eliminar = (id) => ({
      sql: `public.gasto_eliminar($1, (select actualizado_en from public.gastos where id = $1))`,
      args: [id],
    })
    // B elimina el de id menor: con los tributos tomados en orden de id, B espera a A en el primero.
    const { a, b } = await carrera({ a: eliminar(ids[1]), b: eliminar(ids[0]) })
    const { n } = await fila(
      orquesta,
      `select count(*)::int as n from public.gastos where id = any ($1::uuid[]) and eliminado_en is null`,
      [ids],
    )
    espero(
      'K3: dos eliminan los dos últimos tributos a la vez: uno pasa, el otro da 23514 y queda uno',
      a.ok && !b.ok && b.codigo === '23514' && n === 1 && sinInterbloqueo(a, b),
      { a, b, n },
    )
  }

  // K1 · dos confirman el mismo pago a la vez.
  {
    const id = '00000000-0000-4000-8000-0000000d0021'
    await orquesta.query(
      `insert into public.pagos (id, vehiculo_id, concepto, moneda, monto, monto_base) values ($1, $2, 'Carreras seña', $3, 10, 10)`,
      [id, t.vehiculos[1], t.base],
    )
    const confirmar = {
      sql: `public.pago_confirmar($1, (select actualizado_en from public.pagos where id = $1))`,
      args: [id],
    }
    const { a, b } = await carrera({ a: confirmar, b: confirmar })
    const sello = await fila(
      orquesta,
      `select p.confirmado, p.confirmado_por, (select count(*)::int from public.actividad x where x.accion = 'pago.confirmado' and x.registro_id = $1::text) as n
         from public.pagos p where p.id = $1::uuid`,
      [id],
    )
    espero(
      'K1: dos confirman el mismo pago a la vez: B da PT409 y queda un solo sello, el de A',
      a.ok &&
        !b.ok &&
        b.codigo === 'PT409' &&
        sello.confirmado &&
        sello.confirmado_por === duena &&
        sello.n === 1 &&
        sinInterbloqueo(a, b),
      { a, b, sello },
    )
  }
}
