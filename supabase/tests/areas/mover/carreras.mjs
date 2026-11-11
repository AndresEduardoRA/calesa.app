// Las carreras de mover de fase (paso 6.02-1), con conexiones reales a la base del Supabase LOCAL. K1: dos `cambiar_fase` con la misma fase esperada;
// B espera el candado de la unidad que tomó A (`for no key update`, antes de leer) y, cuando A confirma, recibe PT409 con quién y cuándo, sin mover ni
// escribir historial. Antes de 6.02-1 los dos leían sin candado y podían pasar los dos.
// Terreno con el prefijo «Carreras»: el rol lo borra `limpiar()` de
// `scripts/carreras/terreno.mjs`; el vehículo, su historial y su actividad los borra esta misma prueba (las FK `restrict` de `historial_fases` hacia
// `fases` frenarían el borrado del origen), y el origen (con su flujo y sus fases en cascada), `limpiar()`. Las corre `scripts/carreras.mjs` (`pnpm db:carreras`).
import { PERSONAS, PREFIJO } from '../../../../scripts/carreras/terreno.mjs'

const { duena, supervision } = PERSONAS

// Un origen con dos fases (la primera inicial) y su transición; la dueña y la supervisión de las carreras ven la logística y mueven.
async function terrenoDeMover(db) {
  const {
    rows: [rol],
  } = await db.query(
    `insert into public.roles (clave, nombre) values ('carreras_mover', $1) returning id`,
    [`${PREFIJO} mover`],
  )
  await db.query(
    `insert into public.roles_permisos (rol_id, permiso_clave) values ($1, 'logistica.ver'), ($1, 'flujos.mover')`,
    [rol.id],
  )
  await db.query(
    `insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values ($1, $3, false), ($2, $3, false)`,
    [duena, supervision, rol.id],
  )
  const {
    rows: [origen],
  } = await db.query(
    `insert into public.origenes (clave, nombre) values ('carreras_mover', $1) returning id`,
    [`${PREFIJO} mover`],
  )
  const {
    rows: [flujo],
  } = await db.query(`select id from public.flujos where origen_id = $1`, [origen.id])
  const {
    rows: [uno, dos],
  } = await db.query(
    `insert into public.fases (flujo_id, nombre, orden, es_inicial)
     values ($1, $2, 10, true), ($1, $3, 20, false) returning id`,
    [flujo.id, `${PREFIJO} uno`, `${PREFIJO} dos`],
  )
  await db.query(
    `insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id) values ($1, $2, $3)`,
    [flujo.id, uno.id, dos.id],
  )
  return { origen: origen.id, uno: uno.id, dos: dos.id }
}

const vehiculoEn = async (db, origen, fase, titulo) =>
  (
    await db.query(
      `insert into public.vehiculos (origen_id, titulo, fase_id) values ($1, $2, $3) returning id`,
      [origen, `${PREFIJO} ${titulo}`, fase],
    )
  ).rows[0].id

const historialDe = async (db, vehiculos) =>
  Number(
    (
      await db.query(
        `select count(*)::int as n from public.historial_fases where vehiculo_id = any ($1::uuid[])`,
        [vehiculos],
      )
    ).rows[0].n,
  )

async function borrarVehiculos(db, vehiculos) {
  await db.query(`delete from public.notas where vehiculo_id = any ($1::uuid[])`, [vehiculos])
  await db.query(`delete from public.historial_fases where vehiculo_id = any ($1::uuid[])`, [
    vehiculos,
  ])
  await db.query(`delete from public.vehiculos where id = any ($1::uuid[])`, [vehiculos])
}

export async function carrerasDeMover({ orquesta, carrera, espero }) {
  const { origen, uno, dos } = await terrenoDeMover(orquesta)
  const vehiculos = []
  try {
    console.log('Dos cambios de fase de la misma unidad con la misma fase esperada')
    {
      const v = await vehiculoEn(orquesta, origen, uno, 'mover k1')
      vehiculos.push(v)
      const mover = (persona) => ({
        persona,
        sql: 'public.cambiar_fase($1, null, $2, null, $3)::text',
        args: [v, dos, uno],
      })
      const r = await carrera(orquesta, { a: mover(duena), b: mover(supervision) })
      const {
        rows: [fila],
      } = await orquesta.query(`select fase_id from public.vehiculos where id = $1`, [v])
      espero(
        'K1: A mueve; B esperó el candado de la unidad y recibe PT409 con quién y cuándo; un solo historial; sin 40P01',
        r.a.ok &&
          r.b.codigo === 'PT409' &&
          / la movió a «Carreras dos» hace un momento\.$/.test(r.b.mensaje) &&
          fila?.fase_id === dos &&
          (await historialDe(orquesta, [v])) === 1,
        { r, fila },
      )
    }
  } finally {
    await borrarVehiculos(orquesta, vehiculos)
  }
}
