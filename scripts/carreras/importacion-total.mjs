// Las carreras de la importación total (9.06-3): dos invocaciones de `importar-csv` sobre la misma importación. Lo que las forma en fila es
// el candado de la fila de `importaciones` que toma `importacion_procesar_lote` (`for update`); la segunda ve la marca `procesadas` ya movida.
// Se prueban las dos llamadas a la RPC, como `service_role`, que es lo que hace la función: lo que la función hace con la respuesta (irse si
// todo vino saltado) lo cubre su prueba de contrato (`supabase/tests/importar-csv-funcion.test.ts`).
import { PERSONAS, PREFIJO, comoPersona } from './terreno.mjs'

const { duena } = PERSONAS
const PROCESAR = 'public.importacion_procesar_lote($1, $2, $3::jsonb)'

// Una importación total de la dueña para sí misma, creada con su sesión y empezada como `service_role` con `total` filas.
async function importacionEmpezada(db, total) {
  const id = crypto.randomUUID()
  await comoPersona(db, duena)
  try {
    await db.query('select public.importacion_crear($1, $2, $3, $4::jsonb, null, null)', [
      id,
      'leads',
      `${duena}/${id}.csv`,
      JSON.stringify({ Nombre: 'nombre', Teléfono: 'telefono_principal' }),
    ])
  } finally {
    await db.query('reset role')
    await db.query(
      `select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claims', '', false)`,
    )
  }
  await db.query('set role service_role')
  try {
    await db.query('select public.importacion_empezar($1, $2)', [id, total])
  } finally {
    await db.query('reset role')
  }
  return id
}

async function origen(db) {
  return (
    await db.query(`select id from public.origenes_lead where activo order by orden, id limit 1`)
  ).rows[0].id
}

// Las filas `desde … desde + n - 1`, con teléfonos propios de esta carrera (`base` los separa entre casos).
function lote(desde, n, base, origenId) {
  return JSON.stringify(
    Array.from({ length: n }, (_, k) => ({
      fila: desde + k,
      datos: {
        nombre: `${PREFIJO} total ${String(base + desde + k)}`,
        telefono_principal: `7${String(3000000 + base + desde + k)}`,
        origen_lead_id: origenId,
      },
    })),
  )
}

async function estado(db, id) {
  const { rows } = await db.query(
    `select i.procesadas, (select count(*)::int from public.importaciones_leads v where v.importacion_id = i.id) as vinculos,
            (select count(distinct v.lead_id)::int from public.importaciones_leads v join public.leads l on l.id = v.lead_id
              where v.importacion_id = i.id) as leads
       from public.importaciones i where i.id = $1`,
    [id],
  )
  return rows[0]
}

// Lo que dejó cada caso: los leads por sus vínculos y la importación (el terreno también borra por `PREFIJO` y por persona).
async function limpiarCaso(db, id) {
  await db.query(
    `delete from public.leads where id in (select lead_id from public.importaciones_leads where importacion_id = $1)`,
    [id],
  )
  await db.query('delete from public.importaciones where id = $1', [id])
}

export async function carrerasDeImportacionTotal({ orquesta, carrera, espero }) {
  const web = await origen(orquesta)

  console.log('Importación total: el mismo lote desde dos invocaciones a la vez')
  {
    const id = await importacionEmpezada(orquesta, 100)
    const filas = lote(1, 50, 0, web)
    const r = await carrera(orquesta, {
      a: { rol: 'service_role', sql: PROCESAR, args: [id, 1, filas] },
      b: { rol: 'service_role', sql: PROCESAR, args: [id, 1, filas] },
    })
    const e = await estado(orquesta, id)
    espero(
      'B espera a A y vuelve con las 50 saltadas, sin crear nada: 50 vínculos, 50 leads y la marca en 50',
      r.a.ok &&
        r.b.ok &&
        r.a.valor.creadas === 50 &&
        r.b.valor.saltadas === 50 &&
        r.b.valor.creadas === 0 &&
        e.procesadas === 50 &&
        e.vinculos === 50 &&
        e.leads === 50,
      { a: r.a, b: r.b, e },
    )
    await limpiarCaso(orquesta, id)
  }

  console.log('Importación total: dos lotes seguidos desde dos invocaciones a la vez')
  {
    const id = await importacionEmpezada(orquesta, 100)
    const r = await carrera(orquesta, {
      a: { rol: 'service_role', sql: PROCESAR, args: [id, 1, lote(1, 50, 1000, web)] },
      b: { rol: 'service_role', sql: PROCESAR, args: [id, 51, lote(51, 50, 1000, web)] },
    })
    const e = await estado(orquesta, id)
    espero(
      'B espera a A y entra sin el «Falta procesar»: 100 vínculos distintos y la marca en 100',
      r.a.ok &&
        r.b.ok &&
        r.a.valor.creadas === 50 &&
        r.b.valor.creadas === 50 &&
        r.b.valor.saltadas === 0 &&
        e.procesadas === 100 &&
        e.vinculos === 100 &&
        e.leads === 100,
      { a: r.a, b: r.b, e },
    )
    await limpiarCaso(orquesta, id)
  }
}
