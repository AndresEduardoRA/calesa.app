// Las carreras de resolver una subasta, con conexiones reales a la base del Supabase LOCAL. Las dos RPC toman el vehículo `for no key update` después de
// mirar el permiso: la segunda espera a la primera y, cuando confirma, ve el resultado nuevo. K1: dos «No la ganamos» del mismo vehículo; B recibe
// PT409 con el nombre de A. K2: «No la ganamos» contra «La ganamos»: gana la primera y la segunda recibe PT409 sin mover, sin historial y sin nota.
// Terreno con el prefijo «Carreras»: el rol y el origen (con su flujo y sus fases en cascada) los borra `limpiar()` de `scripts/carreras/terreno.mjs`;
// los vehículos, su historial y sus notas los borra esta prueba, al empezar y al terminar (las FK `restrict` de `historial_fases` hacia `fases`
// frenarían el borrado del origen). Las corre `scripts/carreras.mjs` (`pnpm db:carreras`).
import { PERSONAS, PREFIJO } from '../../../../scripts/carreras/terreno.mjs'

const { duena, supervision } = PERSONAS
const CLAVE = 'carreras_situacion'

async function borrarVehiculos(db) {
  const deLaPrueba = `select v.id from public.vehiculos v join public.origenes o on o.id = v.origen_id where o.clave = $1`
  await db.query(`delete from public.notas where vehiculo_id in (${deLaPrueba})`, [CLAVE])
  await db.query(`delete from public.historial_fases where vehiculo_id in (${deLaPrueba})`, [CLAVE])
  await db.query(`delete from public.vehiculos where id in (${deLaPrueba})`, [CLAVE])
}

// Un origen de subasta con «Subasta» (inicial, la subasta) → «Comprado»; la dueña y la supervisión de las carreras ven la logística y mueven.
async function terrenoDeSituacion(db) {
  await borrarVehiculos(db)
  await db.query(`delete from public.origenes where clave = $1`, [CLAVE])
  await db.query(`delete from public.roles where clave = $1`, [CLAVE])
  const {
    rows: [rol],
  } = await db.query(`insert into public.roles (clave, nombre) values ($1, $2) returning id`, [
    CLAVE,
    `${PREFIJO} situación`,
  ])
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
    `insert into public.origenes (clave, nombre, tipo) values ($1, $2, 'subasta') returning id`,
    [CLAVE, `${PREFIJO} situación`],
  )
  const {
    rows: [flujo],
  } = await db.query(`select id from public.flujos where origen_id = $1`, [origen.id])
  const {
    rows: [subasta, comprado],
  } = await db.query(
    `insert into public.fases (flujo_id, nombre, orden, es_inicial, es_subasta)
     values ($1, $2, 10, true, true), ($1, $3, 20, false, false) returning id`,
    [flujo.id, `${PREFIJO} subasta`, `${PREFIJO} comprado`],
  )
  await db.query(
    `insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id) values ($1, $2, $3)`,
    [flujo.id, subasta.id, comprado.id],
  )
  return { origen: origen.id, subasta: subasta.id, comprado: comprado.id }
}

const sinResolver = async (db, origen, fase, titulo) =>
  (
    await db.query(
      `insert into public.vehiculos (origen_id, titulo, fase_id, estado_subasta, subasta_fin_en)
       values ($1, $2, $3, 'terminada', now() - interval '1 day') returning id`,
      [origen, `${PREFIJO} ${titulo}`, fase],
    )
  ).rows[0].id

const estadoDe = async (db, v) =>
  (
    await db.query(
      `select v.situacion, v.subasta_resultado, v.fase_id,
              (select count(*)::int from public.historial_fases h where h.vehiculo_id = v.id) as historial,
              (select count(*)::int from public.notas n where n.vehiculo_id = v.id) as notas
         from public.vehiculos v where v.id = $1`,
      [v],
    )
  ).rows[0]

const nombreDe = async (db, persona) =>
  (await db.query(`select nombre from public.perfiles where id = $1`, [persona])).rows[0]?.nombre ??
  'Otra persona'

export async function carrerasDeSituacion({ orquesta, carrera, espero }) {
  const { origen, subasta, comprado } = await terrenoDeSituacion(orquesta)
  const deA = await nombreDe(orquesta, duena)
  try {
    console.log('Dos «No la ganamos» del mismo vehículo')
    {
      const v = await sinResolver(orquesta, origen, subasta, 'situación k1')
      const noGanada = (persona) => ({
        persona,
        sql: 'public.vehiculo_subasta_no_ganada($1, true)::text',
        args: [v],
      })
      const r = await carrera(orquesta, { a: noGanada(duena), b: noGanada(supervision) })
      const fila = await estadoDe(orquesta, v)
      espero(
        'K1: A marca no ganada; B esperó el candado y recibe PT409 con el nombre de A; sin 40P01',
        r.a.ok &&
          r.b.codigo === 'PT409' &&
          r.b.mensaje === `${deA} la marcó como no ganada hace un momento.` &&
          fila?.situacion === 'no_ganada',
        { r, fila },
      )
    }

    console.log('«No la ganamos» contra «La ganamos»')
    {
      const v = await sinResolver(orquesta, origen, subasta, 'situación k2')
      const r = await carrera(orquesta, {
        a: { persona: duena, sql: 'public.vehiculo_subasta_no_ganada($1, true)::text', args: [v] },
        b: {
          persona: supervision,
          sql: `public.vehiculo_subasta_ganada($1, $2, 'la ganamos', $3)::text`,
          args: [v, comprado, subasta],
        },
      })
      const fila = await estadoDe(orquesta, v)
      espero(
        'K2: gana la primera (no ganada); «La ganamos» recibe PT409 sin mover, sin historial ni nota',
        r.a.ok &&
          r.b.codigo === 'PT409' &&
          r.b.mensaje.startsWith(`${deA} la marcó como no ganada`) &&
          fila?.situacion === 'no_ganada' &&
          fila?.fase_id === subasta &&
          fila?.historial === 0 &&
          fila?.notas === 0,
        { r, fila },
      )
    }
  } finally {
    await borrarVehiculos(orquesta)
  }
}
