// Las carreras de publicar una tabla de referencia (4.23-1): dos personas publican la misma tabla, el ⚙ contra publicar una tabla del mismo origen y
// dos tablas del mismo origen a la vez. Candados: la fila de la tabla (`for update`) y después `formulas:<origen>`, como el ⚙ y revertir. Cada una
// abre una transacción de A y deja a B esperando un lock (el arnés de `scripts/carreras.mjs`): si B no espera, la carrera no se probó. Trabaja en un
// origen propio (prefijo «Carreras»): `limpiar()` lo borra, y con él sus fórmulas y sus tablas.
import { PERSONAS, PREFIJO } from './terreno.mjs'

const { configura } = PERSONAS

let numero = 0
// Un origen con la publicada de la semilla que usa la comisión por variante (esa tabla renombrada `carreras_comision`, congelada) y además
// `carreras_suelta` congelada; sus dos tablas, en la versión 1 y con las mismas filas que la copia.
async function terreno(db, etiqueta) {
  numero += 1
  const {
    rows: [{ origen }],
  } = await db.query(
    `with s as (
       select replace(f.definicion::text, '"comision_por_variante"', '"carreras_comision"')::jsonb as def,
              replace(f.params::text, '"comision_por_variante"', '"carreras_comision"')::jsonb as par,
              replace(f.diseno::text, '"comision_por_variante"', '"carreras_comision"')::jsonb as dis
         from public.formulas f
        where f.estado = 'publicada' and f.diseno is not null and f.params -> 'tablas' ? 'comision_por_variante'
        order by f.creado_en, f.id limit 1
     ), p as (select def, par || jsonb_build_object('tablas', (par -> 'tablas') || '{"carreras_suelta": [{"k": 1}]}') as par, dis from s),
     o as (insert into public.origenes (clave, nombre) values ($1, $2) returning id),
     f as (
       insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_en)
       select o.id, 1, 'publicada', p.def, p.par, p.dis, public._preparar_publicacion(p.def, p.par, p.dis, true), 'v1', now() from o, p
       returning origen_id, params
     ), t as (
       insert into public.tablas_referencia (origen_id, clave, nombre, columnas)
       select o.id, 'carreras_comision', 'Comisión', '[{"clave":"variante","etiqueta":"Variante","tipo":"texto"},{"clave":"monto","etiqueta":"Monto","tipo":"numero"}]'::jsonb from o
       union all
       select o.id, 'carreras_suelta', 'Suelta', '[{"clave":"k","etiqueta":"K","tipo":"numero"}]'::jsonb from o
       returning id, clave
     )
     insert into public.tablas_referencia_filas (tabla_id, valores, orden)
     select t.id, e.valor, (e.n - 1)::smallint
       from t, f cross join lateral jsonb_array_elements(f.params -> 'tablas' -> t.clave) with ordinality e (valor, n)
     returning (select id from o) as origen`,
    [`carreras_${etiqueta.replaceAll(' ', '_')}_${numero}`, `${PREFIJO} ${etiqueta} ${numero}`],
  )
  const tabla = async (clave) =>
    (
      await db.query(
        `select id from public.tablas_referencia where origen_id = $1 and clave = $2`,
        [origen, clave],
      )
    ).rows[0].id
  return {
    origen,
    comision: await tabla('carreras_comision'),
    suelta: await tabla('carreras_suelta'),
  }
}

// Las filas vivas de la comisión con el monto de la moto cambiado.
const filasCon = async (db, tabla, monto) =>
  (
    await db.query(
      `select jsonb_agg(case when valores ->> 'variante' = 'moto' then valores || jsonb_build_object('monto', $2::numeric) else valores end
                        order by orden, id) as filas
         from public.tablas_referencia_filas where tabla_id = $1`,
      [tabla, monto],
    )
  ).rows[0].filas

const publicar = (tabla, filas, nota, version) => ({
  persona: configura,
  sql: 'public.tabla_referencia_publicar($1, $2::jsonb, $3, $4)',
  args: [tabla, JSON.stringify(filas), nota, version],
})

const publicada = async (db, origen) =>
  (
    await db.query(
      `select version, params from public.formulas where origen_id = $1 and estado = 'publicada'`,
      [origen],
    )
  ).rows[0]
const versionDe = async (db, tabla) =>
  (await db.query(`select version from public.tablas_referencia where id = $1`, [tabla])).rows[0]
    .version
const igual = (x, y) => JSON.stringify(x) === JSON.stringify(y)

export async function carrerasDeTablas({ orquesta, carrera, espero }) {
  console.log('Dos personas publican la misma tabla de referencia')
  {
    const t = await terreno(orquesta, 'tabla misma')
    const filasA = await filasCon(orquesta, t.comision, 601)
    const r = await carrera(orquesta, {
      a: publicar(t.comision, filasA, 'Gana A', 1),
      b: publicar(t.comision, await filasCon(orquesta, t.comision, 602), 'Pierde B', 1),
    })
    const pub = await publicada(orquesta, t.origen)
    espero(
      'entra una: la otra espera el candado de la tabla y da conflicto (PT409) con la versión 2; quedan las filas y la N+1 de A',
      r.a.ok &&
        r.b.codigo === 'PT409' &&
        /publicaste la versión 2 de esta tabla/i.test(r.b.mensaje) &&
        (await versionDe(orquesta, t.comision)) === 2 &&
        pub.version === 2 &&
        igual(pub.params.tablas.carreras_comision, filasA),
      { a: r.a, b: r.b, version: pub.version },
    )
  }

  console.log('El ⚙ de una constante mientras se publica una tabla del mismo origen')
  {
    const t = await terreno(orquesta, 'tabla engranaje')
    const filas = await filasCon(orquesta, t.comision, 603)
    const r = await carrera(orquesta, {
      a: {
        persona: configura,
        sql: `public.formula_cambiar_constante($1, 'flete', 1777)`,
        args: [t.origen],
      },
      b: publicar(t.comision, filas, 'Tras el ⚙', 1),
    })
    const pub = await publicada(orquesta, t.origen)
    espero(
      'la tabla espera el candado del origen y su N+1 (v3) lleva la constante del ⚙ y la tabla nueva, sin 23505 ni 40P01',
      r.a.ok &&
        r.b.ok &&
        pub.version === 3 &&
        Number(pub.params.flete) === 1777 &&
        igual(pub.params.tablas.carreras_comision, filas),
      { a: r.a, b: r.b, version: pub.version, flete: pub.params.flete },
    )
  }

  console.log('Dos tablas del mismo origen a la vez')
  {
    const t = await terreno(orquesta, 'tabla dos')
    const filasA = await filasCon(orquesta, t.comision, 604)
    const filasB = [{ k: 2 }, { k: 3 }]
    const r = await carrera(orquesta, {
      a: publicar(t.comision, filasA, 'La comisión', 1),
      b: publicar(t.suelta, filasB, 'La suelta', 1),
    })
    const pub = await publicada(orquesta, t.origen)
    espero(
      'van en fila por el candado del origen: dos N+1 seguidas y la última lleva las dos copias nuevas',
      r.a.ok &&
        r.b.ok &&
        pub.version === 3 &&
        igual(pub.params.tablas.carreras_comision, filasA) &&
        igual(pub.params.tablas.carreras_suelta, filasB),
      { a: r.a, b: r.b, version: pub.version },
    )
  }
}
