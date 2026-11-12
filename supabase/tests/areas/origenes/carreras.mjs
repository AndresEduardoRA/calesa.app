// Las carreras del campo «principal» de un origen (paso 6.13), con conexiones reales a la base del Supabase LOCAL. K1: A marca «b» y B marca
// «c» del mismo origen a la vez; B espera el candado del origen que tomó A (`origen_campo_guardar` lo toma antes que el campo) y, cuando A
// confirma, desmarca «b» y marca «c»: los dos ok, un solo principal, sin 23505 ni 40P01. K2: una sesión `postgres` marca «a» sin confirmar
// (no toma el origen); `guardar(b, principal)` no ve a quién desmarcar, espera en el índice único y, cuando A confirma, sale PT409 con
// mensaje humano (nunca el 23505 crudo). Terreno con el prefijo «Carreras»: el origen (sus campos caen en cascada) y el rol los borra
// `limpiar()` de `scripts/carreras/terreno.mjs`. Las corre `scripts/carreras.mjs` (`pnpm db:carreras`).
import { PERSONAS, PREFIJO } from '../../../../scripts/carreras/terreno.mjs'

const { duena } = PERSONAS
const CONFLICTO = 'Otra persona marcó otro campo como principal mientras editabas.'

// Como texto: un `Date` de JavaScript pierde los microsegundos y la versión ya no coincide.
const versionDe = async (db, campo) =>
  (
    await db.query(`select actualizado_en::text as v from public.origenes_campos where id = $1`, [
      campo,
    ])
  ).rows[0].v

const marcar = (campo, version) => ({
  persona: duena,
  sql: `public.origen_campo_guardar($1, $2, '{"principal": true}'::jsonb)::text`,
  args: [campo, version],
})

const principales = async (db, origen) =>
  (
    await db.query(
      `select coalesce(string_agg(clave, ',' order by clave), '') as p from public.origenes_campos where origen_id = $1 and principal`,
      [origen],
    )
  ).rows[0].p

// Un origen de las carreras con tres campos de texto, como postgres; la dueña de las carreras gestiona los orígenes.
async function terrenoDelPrincipal(db) {
  const {
    rows: [rol],
  } = await db.query(
    `insert into public.roles (clave, nombre) values ('carreras_origenes_campos', $1) returning id`,
    [`${PREFIJO} campos`],
  )
  await db.query(
    `insert into public.roles_permisos (rol_id, permiso_clave) values ($1, 'origenes.gestionar')`,
    [rol.id],
  )
  await db.query(
    `insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values ($1, $2, false)`,
    [duena, rol.id],
  )
  const {
    rows: [origen],
  } = await db.query(
    `insert into public.origenes (clave, nombre) values ('carreras_campos', $1) returning id`,
    [`${PREFIJO} campos`],
  )
  const campos = {}
  for (const [i, clave] of ['a', 'b', 'c'].entries()) {
    const {
      rows: [fila],
    } = await db.query(
      `insert into public.origenes_campos (origen_id, clave, etiqueta, tipo, orden) values ($1, $2, $3, 'texto', $4) returning id`,
      [origen.id, `carreras_${clave}`, `${PREFIJO} ${clave}`, 1000 + i],
    )
    campos[clave] = fila.id
  }
  return { origen: origen.id, ...campos }
}

export async function carrerasDelPrincipal({ orquesta, carrera, espero }) {
  const { origen, a, b, c } = await terrenoDelPrincipal(orquesta)

  console.log('Dos personas marcan principales distintos del mismo origen a la vez')
  {
    const r = await carrera(orquesta, {
      a: marcar(b, await versionDe(orquesta, b)),
      b: marcar(c, await versionDe(orquesta, c)),
    })
    const quedan = await principales(orquesta, origen)
    espero(
      'K1: A marca «b»; B esperó el candado del origen, desmarca «b» y marca «c»; un solo principal; sin 23505 ni 40P01',
      r.a.ok && r.b.ok && quedan === 'carreras_c',
      { r, quedan },
    )
  }

  console.log('Un principal sin confirmar fuera de la RPC y un guardar que marca otro')
  {
    await orquesta.query(
      `update public.origenes_campos set principal = false where origen_id = $1`,
      [origen],
    )
    const r = await carrera(orquesta, {
      a: {
        rol: 'postgres',
        consulta: `update public.origenes_campos set principal = true where id = $1 returning id::text as r`,
        args: [a],
      },
      b: marcar(b, await versionDe(orquesta, b)),
    })
    const quedan = await principales(orquesta, origen)
    espero(
      'K2: B espera en el índice único y, al confirmar A, recibe PT409 con mensaje humano; queda «a»',
      r.a.ok && r.b.codigo === 'PT409' && r.b.mensaje === CONFLICTO && quedan === 'carreras_a',
      { r, quedan },
    )
  }
}
