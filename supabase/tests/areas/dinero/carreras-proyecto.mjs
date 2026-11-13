// Las carreras de los pagos de un proyecto de repuestos (paso 8.13-5, C6), con dos conexiones reales a la base del Supabase LOCAL.
//   K5. Dos registran a la vez el mismo id de pago (un doble clic): B espera la fila de A y devuelve `ya_existia: true`; queda una sola fila.
//   K6. A registra un pago en un proyecto vacío mientras B lo elimina: el `for update` de eliminar espera el `for share` de registrar y, cuando A
//       confirma, B da 23514 `en_uso`. Nunca queda un pago vivo en un proyecto eliminado.
// Ninguna termina en 40P01. Terreno con el prefijo «Carreras» (proyectos por su etiqueta y un rol propio); lo borra `limpiarPagosDeProyecto()`.
// Las corre `scripts/carreras.mjs` (`pnpm db:carreras`).
import { PERSONAS, PREFIJO } from '../../../../scripts/carreras/terreno.mjs'
import { armarCarrera } from './carreras.mjs'

const { duena, supervision } = PERSONAS
const ROL = 'carreras_pagos_proyecto'
const ETIQUETA = `${PREFIJO} pagos`

const fila = async (db, sql, args) => (await db.query(sql, args)).rows[0]
const sinInterbloqueo = (...rs) => rs.every((r) => r?.codigo !== '40P01')

export async function limpiarPagosDeProyecto(db) {
  const proyectos = `select id from public.repuestos_proyectos where vehiculo_etiqueta like $1`
  await db.query(`delete from public.pagos where proyecto_repuestos_id in (${proyectos})`, [
    `${ETIQUETA}%`,
  ])
  await db.query(`delete from public.repuestos_proyectos where vehiculo_etiqueta like $1`, [
    `${ETIQUETA}%`,
  ])
  const rol = `(select id from public.roles where clave = $1)`
  await db.query(`delete from public.usuarios_roles where rol_id in ${rol}`, [ROL])
  await db.query(`delete from public.roles_permisos where rol_id in ${rol}`, [ROL])
  await db.query(`delete from public.roles where clave = $1`, [ROL])
}

const proyecto = async (db, nombre) =>
  (
    await fila(
      db,
      `insert into public.repuestos_proyectos (vehiculo_etiqueta) values ($1) returning id`,
      [`${ETIQUETA} ${nombre}`],
    )
  ).id

export async function carrerasDePagosDeProyecto({ orquesta, espero, conectar, esperarBloqueo }) {
  const carrera = armarCarrera({ orquesta, conectar, esperarBloqueo })
  await limpiarPagosDeProyecto(orquesta)
  const { id: rol } = await fila(
    orquesta,
    `insert into public.roles (clave, nombre) values ($1, 'Carreras pagos de proyecto') returning id`,
    [ROL],
  )
  await orquesta.query(
    `insert into public.roles_permisos (rol_id, permiso_clave, alcance)
     select $1, k, 'todos' from unnest(array['repuestos.ver', 'repuestos.editar', 'repuestos.costos.ver', 'repuestos.costos.editar']) k`,
    [rol],
  )
  await orquesta.query(
    `insert into public.usuarios_roles (usuario_id, rol_id) values ($1, $3), ($2, $3)`,
    [duena, supervision, rol],
  )
  const { base } = await fila(
    orquesta,
    `select moneda_base::text as base from public.ajustes_empresa where id = 1`,
  )
  const registrar = (id, p) => ({
    sql: `public.pago_registrar_proyecto($1, $2, 'Carreras anticipo', $3, 10, null, null, null, null, null)`,
    args: [id, p, base],
  })

  // K5 · el mismo id dos veces a la vez.
  {
    const p = await proyecto(orquesta, 'K5')
    const id = '00000000-0000-4000-8000-0000000d0051'
    const { a, b } = await carrera({ a: registrar(id, p), b: registrar(id, p) })
    const { n } = await fila(
      orquesta,
      `select count(*)::int as n from public.pagos where proyecto_repuestos_id = $1`,
      [p],
    )
    espero(
      'K5: dos registran el mismo pago de proyecto a la vez: B devuelve lo de A y queda una fila',
      a.ok &&
        a.valor?.ya_existia === false &&
        b.ok &&
        b.valor?.ya_existia === true &&
        n === 1 &&
        sinInterbloqueo(a, b),
      { a, b, n },
    )
  }

  // K6 · registrar en un proyecto vacío mientras otro lo elimina.
  {
    const p = await proyecto(orquesta, 'K6')
    const id = '00000000-0000-4000-8000-0000000d0061'
    const eliminar = {
      sql: `public.repuesto_proyecto_eliminar($1, (select actualizado_en from public.repuestos_proyectos where id = $1))`,
      args: [p],
    }
    const { a, b } = await carrera({ a: registrar(id, p), b: eliminar })
    const estado = await fila(
      orquesta,
      `select (select eliminado_en from public.repuestos_proyectos where id = $1) is null as vivo,
              (select count(*)::int from public.pagos where proyecto_repuestos_id = $1 and eliminado_en is null) as n`,
      [p],
    )
    espero(
      'K6: registrar un pago mientras otro elimina el proyecto: eliminar espera y da 23514; el proyecto sigue vivo con su pago',
      a.ok &&
        !b.ok &&
        b.codigo === '23514' &&
        estado.vivo &&
        estado.n === 1 &&
        sinInterbloqueo(a, b),
      { a, b, estado },
    )
  }
}
