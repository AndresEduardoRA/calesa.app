// Las carreras de la versión del flujo (paso 5.01-1), con conexiones reales a la base del Supabase LOCAL. K1: dos `fase_guardar` con la misma versión;
// B espera el candado de la fila de `flujos` que tomó A y, cuando A confirma, recibe PT409 sin escribir. K2: mientras A tiene el candado, quien no puede
// configurar el flujo recibe 42501 sin esperar (el permiso va antes del candado, `_flujo_para_editar`). Terreno con el prefijo «Carreras»: el origen
// (con su flujo y sus fases en cascada) y el rol los borra `limpiar()` de `scripts/carreras/terreno.mjs`. Las corre `scripts/carreras.mjs` (`pnpm db:carreras`).
import { PERSONAS, PREFIJO, comoPersona } from '../../../../scripts/carreras/terreno.mjs'

const { duena, supervision } = PERSONAS
const CONFLICTO = 'Otra persona cambió este flujo mientras lo editabas.'

// Como texto: un `Date` de JavaScript pierde los microsegundos y la versión ya no coincide.
const versionDelFlujo = async (db, flujo) =>
  (await db.query(`select actualizado_en::text as v from public.flujos where id = $1`, [flujo]))
    .rows[0].v

const guardar = (persona, fase, version, nombre) => ({
  persona,
  sql: 'public.fase_guardar($1, $2, $3::jsonb)::text',
  args: [fase, version, JSON.stringify({ nombre })],
})

// Un origen de las carreras con una fase, como postgres; la dueña de las carreras configura todos los flujos.
async function terrenoDeFases(db) {
  const {
    rows: [rol],
  } = await db.query(
    `insert into public.roles (clave, nombre) values ('carreras_flujos', $1) returning id`,
    [`${PREFIJO} flujos`],
  )
  await db.query(
    `insert into public.roles_permisos (rol_id, permiso_clave) values ($1, 'flujos.configurar')`,
    [rol.id],
  )
  await db.query(
    `insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values ($1, $2, false)`,
    [duena, rol.id],
  )
  const {
    rows: [origen],
  } = await db.query(
    `insert into public.origenes (clave, nombre) values ('carreras_flujos', $1) returning id`,
    [`${PREFIJO} flujos`],
  )
  const {
    rows: [flujo],
  } = await db.query(`select id from public.flujos where origen_id = $1`, [origen.id])
  const {
    rows: [fase],
  } = await db.query(`insert into public.fases (flujo_id, nombre) values ($1, $2) returning id`, [
    flujo.id,
    `${PREFIJO} fase`,
  ])
  return { flujo: flujo.id, fase: fase.id }
}

const nombreDe = async (db, fase) =>
  (await db.query(`select nombre from public.fases where id = $1`, [fase])).rows[0].nombre

export async function carrerasDeFases({ orquesta, carrera, espero, conectar }) {
  const { flujo, fase } = await terrenoDeFases(orquesta)

  console.log('Dos guardados de la misma fase con la misma versión del flujo')
  {
    const v = await versionDelFlujo(orquesta, flujo)
    const r = await carrera(orquesta, {
      a: guardar(duena, fase, v, `${PREFIJO} A`),
      b: guardar(duena, fase, v, `${PREFIJO} B`),
    })
    const despues = await versionDelFlujo(orquesta, flujo)
    espero(
      'K1: A guarda; B esperó el candado del flujo y recibe PT409 sin escribir; la versión es la de A; sin 40P01',
      r.a.ok &&
        r.b.codigo === 'PT409' &&
        r.b.mensaje === CONFLICTO &&
        (await nombreDe(orquesta, fase)) === `${PREFIJO} A` &&
        despues === r.a.valor,
      { r, despues },
    )
  }

  console.log('Quien no puede configurar no espera el candado del flujo')
  {
    const v = await versionDelFlujo(orquesta, flujo)
    const [ca, cc] = [await conectar(), await conectar()]
    try {
      await comoPersona(ca, duena)
      await comoPersona(cc, supervision)
      await cc.query(`set lock_timeout = '2s'`)
      await ca.query('begin')
      await ca.query('select public.fase_guardar($1, $2, $3::jsonb)', [
        fase,
        v,
        JSON.stringify({ nombre: `${PREFIJO} con candado` }),
      ])
      const r = await cc
        .query('select public.fase_guardar($1, $2, $3::jsonb)', [
          fase,
          v,
          JSON.stringify({ nombre: `${PREFIJO} sin permiso` }),
        ])
        .then(
          () => ({ ok: true }),
          (e) => ({ ok: false, codigo: e.code, mensaje: e.message }),
        )
      await ca.query('rollback')
      espero(
        'K2: con el flujo tomado por A, quien no tiene flujos.configurar recibe 42501 al instante, no 55P03',
        r.codigo === '42501' && r.mensaje === 'No tienes permiso para configurar este flujo.',
        r,
      )
    } finally {
      await ca.end()
      await cc.end()
    }
  }
}
