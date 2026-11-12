// Las carreras del cotizador de repuestos (paso 8.12-4, C19; el pendiente de 8.12-1), con conexiones reales a la base del Supabase LOCAL.
// K1: dos `aceptar` de dos cotizaciones del mismo proyecto a la vez. A acepta la suya; B no ve la de A (sin confirmar) al anular «la aceptada
//     anterior», espera en el índice parcial `repuestos_cotizaciones_una_aceptada` y, cuando A confirma, recibe PT409 «Otra cotización de este
//     proyecto se aceptó recién…» (nunca un 23505 crudo ni dos aceptadas).
// K2: dos tramos activos de logística de una misma moneda que se cruzan, a la vez. El trigger toma la moneda `for no key update` antes de buscar el
//     cruce: B espera a A y, cuando A confirma, ve su tramo y recibe 23P01. Queda un solo tramo nuevo.
// Terreno con el prefijo «Carreras» (un proyecto externo, una configuración y un rol `carreras_cotizador` con repuestos.ver, .cotizar, .editar y
// .configurar para la dueña de las carreras); lo borra `limpiarCotizador()`. Las corre `scripts/carreras.mjs` (`pnpm db:carreras`).
import { randomUUID } from 'node:crypto'
import { PERSONAS, PREFIJO, comoPersona } from './terreno.mjs'

const { duena } = PERSONAS
const ETIQUETA = `${PREFIJO} cotizador`
const CLAVE = 'carreras_cotizador'
const MONEDA = 'USD'
// Lejos de los tramos de la semilla y de los e2e (`configuracion-repuestos-cotizador` borra desde 900000; `repuestos-cotizar`, el [0, 100)).
const DESDE = 700000
const HASTA = 720000

export async function limpiarCotizador(db) {
  // Las cotizaciones caen con el proyecto (cascada); el proyecto no tiene ítems.
  await db.query(`delete from public.repuestos_proyectos where vehiculo_etiqueta like $1`, [
    `${ETIQUETA}%`,
  ])
  await db.query(
    `delete from public.repuestos_tramos_logistica where moneda = $1 and costo_min >= $2 and costo_min < $3`,
    [MONEDA, DESDE, HASTA],
  )
  await db.query(`delete from public.repuestos_cotizador_config where creado_por = $1`, [duena])
  const rol = `(select id from public.roles where clave = '${CLAVE}')`
  await db.query(`delete from public.usuarios_roles where rol_id in ${rol}`)
  await db.query(`delete from public.roles_permisos where rol_id in ${rol}`)
  await db.query(`delete from public.roles where clave = $1`, [CLAVE])
}

async function terreno(db) {
  const {
    rows: [rol],
  } = await db.query(`insert into public.roles (clave, nombre) values ($1, $2) returning id`, [
    CLAVE,
    `${PREFIJO} cotizador`,
  ])
  await db.query(
    `insert into public.roles_permisos (rol_id, permiso_clave)
       select $1, p from unnest(array['repuestos.ver', 'repuestos.cotizar', 'repuestos.editar', 'repuestos.configurar']) p`,
    [rol.id],
  )
  await db.query(
    `insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values ($1, $2, false)`,
    [duena, rol.id],
  )
  // La vigente es la de id más alto: ésta, mientras dure la carrera.
  await db.query(
    `insert into public.repuestos_cotizador_config (factor_importado, recargo_local, redondeo, creado_por) values (1.35, 0.10, 1, $1)`,
    [duena],
  )
  return (
    await db.query(
      `insert into public.repuestos_proyectos (vehiculo_etiqueta) values ($1) returning id`,
      [ETIQUETA],
    )
  ).rows[0].id
}

// Una cotización borrador con una línea con total, creada y guardada por las RPC como la dueña (lo que se prueba es aceptar). Devuelve id y versión.
async function cotizacionConTotal(conectar, proyectoId) {
  const c = await conectar()
  try {
    await comoPersona(c, duena)
    const id = randomUUID()
    await c.query(`select public.repuestos_cotizacion_crear($1, $2, $3)`, [id, proyectoId, MONEDA])
    const version = (
      await c.query(
        `select actualizado_en::text as v from public.repuestos_cotizaciones where id = $1`,
        [id],
      )
    ).rows[0].v
    const linea = {
      id: randomUUID(),
      descripcion: `${PREFIJO} línea`,
      bloque: 'local',
      cantidad: 1,
      costo: '10',
      logistica: '0',
      caja: '0',
    }
    const r = await c.query(
      `select (public.repuestos_cotizacion_guardar($1, $2::jsonb, '', $3)) ->> 'actualizado_en' as v`,
      [id, JSON.stringify([linea]), version],
    )
    return { id, version: r.rows[0].v }
  } finally {
    await c.end()
  }
}

const aceptar = ({ id, version }) => ({
  persona: duena,
  sql: 'public.repuestos_cotizacion_aceptar($1, $2)::text',
  args: [id, version],
})

const tramo = (desde, hasta) => ({
  persona: duena,
  consulta: `insert into public.repuestos_tramos_logistica (moneda, costo_min, costo_max, monto, activo)
               values ($1, $2, $3, 1, true) returning id::text as r`,
  args: [MONEDA, desde, hasta],
})

export async function carrerasDelCotizador({ orquesta, carrera, espero, conectar }) {
  await limpiarCotizador(orquesta)
  const proyectoId = await terreno(orquesta)

  console.log('Dos aceptar del mismo proyecto a la vez')
  {
    const a = await cotizacionConTotal(conectar, proyectoId)
    const b = await cotizacionConTotal(conectar, proyectoId)
    const r = await carrera(orquesta, { a: aceptar(a), b: aceptar(b) })
    const { rows } = await orquesta.query(
      `select id from public.repuestos_cotizaciones where proyecto_id = $1 and estado = 'aceptada'`,
      [proyectoId],
    )
    espero(
      'K1: A acepta; B esperó el índice de una sola aceptada y recibe PT409; una sola aceptada (la de A)',
      r.a.ok &&
        r.b.codigo === 'PT409' &&
        r.b.mensaje === 'Otra cotización de este proyecto se aceptó recién. Recarga para verla.' &&
        rows.length === 1 &&
        rows[0].id === a.id,
      { r, rows },
    )
  }

  console.log('Dos tramos cruzados de la misma moneda a la vez')
  {
    const r = await carrera(orquesta, {
      a: tramo(DESDE, DESDE + 1000),
      b: tramo(DESDE + 500, DESDE + 1500),
    })
    const { rows } = await orquesta.query(
      `select count(*)::int as n from public.repuestos_tramos_logistica where moneda = $1 and costo_min >= $2 and costo_min < $3`,
      [MONEDA, DESDE, HASTA],
    )
    espero(
      'K2: A entra; B esperó el candado de la moneda, ve el tramo de A y recibe 23P01; un solo tramo nuevo',
      r.a.ok && r.b.codigo === '23P01' && rows[0].n === 1,
      { r, rows },
    )
  }
}
