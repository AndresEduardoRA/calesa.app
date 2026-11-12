// La carrera del documento que exige la fase (paso 6.05, C15), con conexiones reales a la base del Supabase LOCAL. K1: un vehículo en una fase que
// exige un documento (min 1) con dos aprobados; A y B eliminan cada uno el suyo a la vez. B espera el candado por unidad y tipo que tomó A y, cuando
// A confirma, recibe 23514 sin escribir: queda uno vivo. Sin el candado, los dos contarían dos y la unidad quedaría sin el documento. Terreno con el
// prefijo «Carreras»: el origen (con su flujo, su fase y su tipo en cascada) y el vehículo; `limpiarDocumentos()` borra lo de esta carrera (también lo
// de una corrida rota) y `limpiar()` de `scripts/carreras/terreno.mjs` el rol. Las corre `scripts/carreras.mjs` (`pnpm db:carreras`).
import { PERSONAS, PREFIJO } from '../../../../scripts/carreras/terreno.mjs'

const { duena } = PERSONAS
const ORIGEN = 'carreras_documentos'

// Primero el requisito y los documentos (restrict sobre el tipo), después el origen: su flujo, su fase y su tipo caen en cascada.
export async function limpiarDocumentos(db) {
  const origen = `(select id from public.origenes where clave = '${ORIGEN}')`
  const flujo = `(select id from public.flujos where origen_id = ${origen})`
  await db.query(`delete from public.vehiculos where origen_id = ${origen}`)
  await db.query(
    `delete from public.fases_requisitos where fase_id in (select id from public.fases where flujo_id = ${flujo})`,
  )
  await db.query(`delete from public.origenes where clave = '${ORIGEN}'`)
}

// Como texto: un `Date` de JavaScript pierde los microsegundos y la versión ya no coincide.
const versionDe = async (db, id) =>
  (await db.query(`select actualizado_en::text as v from public.documentos where id = $1`, [id]))
    .rows[0].v

const eliminar = (persona, id, version) => ({
  persona,
  sql: 'public.documento_eliminar($1, $2)::text',
  args: [id, version],
})

// Un aprobado vivo del tipo en el vehículo, como postgres (nace subido y se aprueba).
async function aprobado(db, vehiculo, tipo) {
  const {
    rows: [d],
  } = await db.query(
    `insert into public.documentos (vehiculo_id, tipo_documento_id, mime) values ($1, $2, 'application/pdf') returning id`,
    [vehiculo, tipo],
  )
  await db.query(`update public.documentos set estado = 'aprobado' where id = $1`, [d.id])
  return d.id
}

// El origen de las carreras con una fase que exige un tipo (min 1) y un vehículo en ella; la dueña de las carreras aprueba documentos.
async function terrenoDeDocumentos(db) {
  await limpiarDocumentos(db)
  const {
    rows: [rol],
  } = await db.query(
    `insert into public.roles (clave, nombre) values ('carreras_documentos', $1) returning id`,
    [`${PREFIJO} documentos`],
  )
  await db.query(
    `insert into public.roles_permisos (rol_id, permiso_clave) values ($1, 'logistica.documentos.aprobar'), ($1, 'logistica.ver')`,
    [rol.id],
  )
  await db.query(
    `insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values ($1, $2, false)`,
    [duena, rol.id],
  )
  const {
    rows: [origen],
  } = await db.query(`insert into public.origenes (clave, nombre) values ($1, $2) returning id`, [
    ORIGEN,
    `${PREFIJO} documentos`,
  ])
  const {
    rows: [flujo],
  } = await db.query(`select id from public.flujos where origen_id = $1`, [origen.id])
  const {
    rows: [fase],
  } = await db.query(`insert into public.fases (flujo_id, nombre) values ($1, $2) returning id`, [
    flujo.id,
    `${PREFIJO} exige`,
  ])
  const {
    rows: [tipo],
  } = await db.query(
    `insert into public.tipos_documento (flujo_id, nombre) values ($1, $2) returning id`,
    [flujo.id, `${PREFIJO} exigido`],
  )
  await db.query(
    `insert into public.fases_requisitos (fase_id, tipo, tipo_documento_id, min_archivos, bloqueante) values ($1, 'documento', $2, 1, true)`,
    [fase.id, tipo.id],
  )
  const {
    rows: [vehiculo],
  } = await db.query(
    `insert into public.vehiculos (origen_id, titulo, fase_id) values ($1, $2, $3) returning id`,
    [origen.id, `${PREFIJO} documentos`, fase.id],
  )
  return { vehiculo: vehiculo.id, tipo: tipo.id }
}

const vivos = async (db, vehiculo) =>
  Number(
    (
      await db.query(
        `select count(*) as n from public.documentos where vehiculo_id = $1 and estado = 'aprobado' and eliminado_en is null`,
        [vehiculo],
      )
    ).rows[0].n,
  )

export async function carrerasDeDocumentos({ orquesta, carrera, espero }) {
  try {
    const { vehiculo, tipo } = await terrenoDeDocumentos(orquesta)

    console.log('Dos quitas del documento que exige la fase, a la vez')
    {
      const [d1, d2] = [
        await aprobado(orquesta, vehiculo, tipo),
        await aprobado(orquesta, vehiculo, tipo),
      ]
      const r = await carrera(orquesta, {
        a: eliminar(duena, d1, await versionDe(orquesta, d1)),
        b: eliminar(duena, d2, await versionDe(orquesta, d2)),
      })
      const quedan = await vivos(orquesta, vehiculo)
      espero(
        'K1: A elimina el suyo; B esperó el candado por unidad y tipo y recibe 23514 sin escribir; queda uno vivo; sin 40P01',
        r.a.ok &&
          r.b.codigo === '23514' &&
          /exige este documento/.test(r.b.mensaje) &&
          quedan === 1,
        { r, quedan },
      )
    }
  } finally {
    await limpiarDocumentos(orquesta)
  }
}
