// Las carreras de la versión del flujo (paso 5.01-1), con conexiones reales a la base del Supabase LOCAL. K1: dos `fase_guardar` con la misma versión;
// B espera el candado de la fila de `flujos` que tomó A y, cuando A confirma, recibe PT409 sin escribir. K2: mientras A tiene el candado, quien no puede
// configurar el flujo recibe 42501 sin esperar (el permiso va antes del candado, `_flujo_para_editar`). K3: ese candado (`for no key update`)
// no frena el key share de las FK de un cambio de fase. K4 (5.01-2): `fase_eliminar` toma la fase `for update` y espera a un cambio de fase que
// entra en ella; cuenta lo que dejó y jubila (sin el candado contaría cero y caería con el 23503 crudo de la FK). Terreno con el prefijo «Carreras»: el origen
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

  console.log('Guardar una fase no frena el key share de las FK de un cambio de fase')
  {
    // Lo que toma `cambiar_fase` por sus FK: key share sobre la fase (`vehiculos.fase_id`) y sobre el flujo (`historial_fases.flujo_id`). Con
    // `for update` en el contrato, esto esperaba a A (y en el orden de `cambiar_fase`, 40P01).
    const v = await versionDelFlujo(orquesta, flujo)
    const [ca, cb] = [await conectar(), await conectar()]
    try {
      await comoPersona(ca, duena)
      await cb.query(`set lock_timeout = '2s'`)
      await ca.query('begin')
      await ca.query('select public.fase_guardar($1, $2, $3::jsonb)', [
        fase,
        v,
        JSON.stringify({ color: '#123456' }),
      ])
      const r = await cb
        .query(
          `select (select 1 from public.fases where id = $1 for key share) as fase,
                  (select 1 from public.flujos where id = $2 for key share) as flujo`,
          [fase, flujo],
        )
        .then(
          () => ({ ok: true }),
          (e) => ({ ok: false, codigo: e.code, mensaje: e.message }),
        )
      await ca.query('rollback')
      espero(
        'K3: con la fase y el flujo tomados por fase_guardar, el key share de la fase y del flujo pasa al instante (sin 55P03)',
        r.ok,
        r,
      )
    } finally {
      await ca.end()
      await cb.end()
    }
  }

  console.log('Eliminar una fase mientras un cambio de fase entra en ella')
  {
    // A hace lo que escribe `cambiar_fase` (el vehículo a la fase y su historial: key share sobre la fase y el flujo) y no confirma; B elimina
    // la fase con la versión vigente, espera el key share de A y, cuando A confirma, ve el vehículo y el historial: jubila.
    const {
      rows: [f],
    } = await orquesta.query(
      `insert into public.fases (flujo_id, nombre) values ($1, $2) returning id`,
      [flujo, `${PREFIJO} fase k4`],
    )
    const {
      rows: [veh],
    } = await orquesta.query(
      `insert into public.vehiculos (origen_id, titulo)
       select origen_id, $2 from public.flujos where id = $1 returning id`,
      [flujo, `${PREFIJO} flujos k4`],
    )
    try {
      const v = await versionDelFlujo(orquesta, flujo)
      const r = await carrera(orquesta, {
        a: {
          rol: 'postgres',
          consulta: `with v as (update public.vehiculos set fase_id = $1 where id = $2 returning id)
                     insert into public.historial_fases (flujo_id, vehiculo_id, a_fase_id)
                     select $3, v.id, $1 from v returning 1 as r`,
          args: [f.id, veh.id, flujo],
        },
        b: { persona: duena, sql: 'public.fase_eliminar($1, $2)::text', args: [f.id, v] },
      })
      const resultado = r.b.ok ? JSON.parse(r.b.valor) : null
      const {
        rows: [fase],
      } = await orquesta.query(`select activa from public.fases where id = $1`, [f.id])
      const despues = await versionDelFlujo(orquesta, flujo)
      espero(
        'K4: B esperó al cambio de fase de A y jubila (ni 23503 ni 40P01); la fase queda inactiva y la versión es la que devolvió B',
        r.a.ok &&
          resultado?.accion === 'jubilada' &&
          fase?.activa === false &&
          resultado?.version !== undefined &&
          (
            await orquesta.query(`select $1::timestamptz = $2::timestamptz as igual`, [
              resultado.version,
              despues,
            ])
          ).rows[0].igual,
        { r, fase, despues },
      )
    } finally {
      // Las FK `restrict` de `historial_fases` y `vehiculos` hacia `fases` frenarían a `limpiar()` al borrar el origen.
      await orquesta.query(`delete from public.historial_fases where vehiculo_id = $1`, [veh.id])
      await orquesta.query(`delete from public.vehiculos where id = $1`, [veh.id])
    }
  }
}
