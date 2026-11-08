// Las carreras de publicar una tabla compartida mientras un origen cambia su publicada (4.23-1, C7 y C8): la publicada se relee dentro del candado del
// origen. Si mientras se esperaba empezó a usar la tabla, se pide el permiso de ese origen (R4: quien configura sólo otro origen da 42501 y nada
// cambia); si dejó de usarla, ese origen se salta (R5). Una compartida (origen nulo) no la borra `limpiar()`: se borra aquí al empezar y al terminar,
// y la persona propia (correo `carreras-…`, rol `carreras_…`) la borra `limpiar()`.
import { PERSONAS, PREFIJO } from './terreno.mjs'

const { configura } = PERSONAS
const UNO = '00000000-0000-4000-8000-0000000c0101' // configura sólo el origen «uno»
const CLAVE = 'carreras_compartida'

const borrarCompartida = (db) =>
  db.query(`delete from public.tablas_referencia where origen_id is null and clave = $1`, [CLAVE])

let numero = 0
// El origen «uno» (Uno lo configura) y el origen «dos» con dos versiones de la publicada de la semilla que usa la comisión por variante: la archivada
// (v1) y la publicada (v2). Con `v1Usa`, la v1 nombra la compartida y la v2 otra tabla; sin él, al revés. La compartida, en la versión 1.
async function terreno(db, etiqueta, { v1Usa }) {
  numero += 1
  await borrarCompartida(db)
  const origen = async (sufijo) =>
    (
      await db.query(`insert into public.origenes (clave, nombre) values ($1, $2) returning id`, [
        `carreras_${etiqueta.replaceAll(' ', '_')}_${sufijo}_${numero}`,
        `${PREFIJO} ${etiqueta} ${sufijo} ${numero}`,
      ])
    ).rows[0].id
  const uno = await origen('uno')
  const dos = await origen('dos')
  const version = async (n, estado, clave) =>
    (
      await db.query(
        `with s as (
           select replace(f.definicion::text, '"comision_por_variante"', '"' || $4 || '"')::jsonb as def,
                  replace(f.params::text, '"comision_por_variante"', '"' || $4 || '"')::jsonb as par,
                  replace(f.diseno::text, '"comision_por_variante"', '"' || $4 || '"')::jsonb as dis
             from public.formulas f
            where f.estado = 'publicada' and f.diseno is not null and f.params -> 'tablas' ? 'comision_por_variante'
            order by f.creado_en, f.id limit 1
         )
         insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_en)
         select $1, $2::int, $3, def, par, dis, public._preparar_publicacion(def, par, dis, true), 'v' || $2::int, now() from s
         returning id`,
        [dos, n, estado, clave],
      )
    ).rows[0].id
  const v1 = await version(1, 'archivada', v1Usa ? CLAVE : 'carreras_otra')
  const v2 = await version(2, 'publicada', v1Usa ? 'carreras_otra' : CLAVE)
  const {
    rows: [{ id: tabla }],
  } = await db.query(
    `with t as (
       insert into public.tablas_referencia (origen_id, clave, nombre, columnas)
       values (null, $1, 'Compartida', '[{"clave":"variante","etiqueta":"Variante","tipo":"texto"},{"clave":"monto","etiqueta":"Monto","tipo":"numero"}]')
       returning id
     ), f as (
       insert into public.tablas_referencia_filas (tabla_id, valores, orden)
       select t.id, '{"variante":"moto","monto":400}', 0 from t
     )
     select id from t`,
    [CLAVE],
  )
  // Uno: una cuenta con un rol propio que sólo configura el origen «uno».
  await db.query(`delete from auth.users where id = $1`, [UNO])
  await db.query(
    `insert into auth.users (id, email, raw_app_meta_data) values ($1, 'carreras-tablas-uno@ejemplo.com', '{"invitado": true}')`,
    [UNO],
  )
  await db.query(
    `update public.perfiles set nombre = $2, invitacion_aceptada_en = now() where id = $1`,
    [UNO, `${PREFIJO} tablas uno`],
  )
  await db.query(`delete from public.usuarios_roles where usuario_id = $1`, [UNO])
  await db.query(
    `with r as (insert into public.roles (clave, nombre) values ($1, $2) returning id),
          p as (insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
                select r.id, 'cotizaciones.configurar', $3, 'todos' from r)
     insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select $4, r.id, true from r`,
    [`carreras_tablas_uno_${numero}`, `${PREFIJO} tablas uno ${numero}`, uno, UNO],
  )
  return { dos, v1, v2, tabla }
}

const revertir = (t) => ({
  persona: configura,
  sql: `public.formula_revertir($1, $2, 'Vuelve a la v1', $3)`,
  args: [t.dos, t.v1, t.v2],
})
const publicar = (persona, t) => ({
  persona,
  sql: `public.tabla_referencia_publicar($1, '[{"variante":"moto","monto":777}]'::jsonb, 'Compartida nueva', 1)`,
  args: [t.tabla],
})
const estado = async (db, t) =>
  (
    await db.query(
      `select (select version from public.tablas_referencia where id = $2) as tabla,
              (select version from public.formulas where origen_id = $1 and estado = 'publicada') as formula`,
      [t.dos, t.tabla],
    )
  ).rows[0]

export async function carrerasDeTablasCompartidas({ orquesta, carrera, espero }) {
  console.log('Un origen empieza a usar la compartida mientras otra persona la publica')
  {
    const t = await terreno(orquesta, 'comp a', { v1Usa: true })
    const r = await carrera(orquesta, { a: revertir(t), b: publicar(UNO, t) })
    const e = await estado(orquesta, t)
    espero(
      'tras el candado del origen la publicada la usa: sin su permiso, 42501 y nada cambia (ni la tabla ni la fórmula)',
      r.a.ok &&
        r.b.codigo === '42501' &&
        /cotizaciones\.configurar/.test(r.b.mensaje) &&
        e.tabla === 1 &&
        e.formula === 3,
      { a: r.a, b: r.b, e },
    )
    // Su publicada ahora usa la compartida: fuera, para que la carrera siguiente sólo vea su propio origen.
    await orquesta.query(`delete from public.origenes where id = $1`, [t.dos])
  }

  console.log('Un origen deja de usar la compartida mientras otra persona la publica')
  {
    const t = await terreno(orquesta, 'comp b', { v1Usa: false })
    const r = await carrera(orquesta, { a: revertir(t), b: publicar(configura, t) })
    const e = await estado(orquesta, t)
    espero(
      'tras el candado del origen la publicada ya no la usa: se salta, sin N+1 en ese origen',
      r.a.ok &&
        r.b.ok &&
        r.b.valor?.version === 2 &&
        Array.isArray(r.b.valor?.formulas) &&
        r.b.valor.formulas.length === 0 &&
        e.tabla === 2 &&
        e.formula === 3,
      { a: r.a, b: r.b, e },
    )
  }
  await borrarCompartida(orquesta)
}
