// Las carreras de los tonos y de publicar una fórmula con su diseño (paso 4.08, prompt 2): eliminar un tono mientras otra persona publica una
// versión que lo nombra, dos publicar a la vez y dos ⚙ a la vez. Cada una abre una transacción de A y deja a B esperando un lock (el arnés de
// `scripts/carreras.mjs`): si B no espera, la carrera no se probó. Trabaja en un origen y unos tonos propios (prefijo «Carreras»).
import { readFileSync } from 'node:fs'
import { PERSONAS, PREFIJO } from './terreno.mjs'

const { configura: duena } = PERSONAS

const juego = JSON.parse(
  readFileSync('src/modules/cotizaciones/entities/casos-de-diseno.json', 'utf8'),
)
const CAPTURAS = juego.formulas.capturas
const DISENO = juego.casos[0].diseno
const TONOS = ['compra', 'logistica', 'aduana']

// La fórmula de las capturas con los tonos propios de las carreras (`carreras_compra`…) en vez de los del juego.
const definicion = {
  ...CAPTURAS.definicion,
  grupos: CAPTURAS.definicion.grupos.map((g) => ({ ...g, tono: `carreras_${g.tono}` })),
}

let numero = 0
async function terreno(db, etiqueta, { publicada = false, borrador = false } = {}) {
  numero += 1
  const {
    rows: [origen],
  } = await db.query(`insert into public.origenes (clave, nombre) values ($1, $2) returning id`, [
    `carreras_${etiqueta}_${numero}`,
    `${PREFIJO} ${etiqueta} ${numero}`,
  ])
  const ids = {}
  for (const t of TONOS) {
    const {
      rows: [fila],
    } = await db.query(
      `insert into public.tonos (clave, nombre, claro_fondo, claro_borde, claro_tinta, oscuro_fondo, oscuro_borde, oscuro_tinta)
       values ($1, $2, '#fff7d6', '#e9d27a', '#1b2130', '#3e3f3c', '#797251', '#f2f4f8')
       on conflict (clave) do update set nombre = excluded.nombre returning id, actualizado_en::text as v`,
      [`carreras_${t}`, `${PREFIJO} ${t}`],
    )
    ids[t] = fila
  }
  const insertar = (estado, version, nota) =>
    db
      .query(
        `insert into public.formulas (origen_id, estado, version, definicion, params, diseno, visibilidad, nota)
         values ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8) returning id`,
        [
          origen.id,
          estado,
          version,
          JSON.stringify(definicion),
          JSON.stringify(CAPTURAS.params),
          JSON.stringify(DISENO),
          estado === 'borrador' ? null : '{}',
          nota,
        ],
      )
      .then((r) => r.rows[0].id)
  const v1 = publicada ? await insertar('publicada', 1, 'v1') : null
  if (borrador) await insertar('borrador', null, 'borrador')
  return { origen: origen.id, ids, v1 }
}

const publicadas = async (db, origen) =>
  (
    await db.query(
      `select version, nota, (params ->> 'flete')::numeric as flete from public.formulas where origen_id = $1 and estado = 'publicada'`,
      [origen],
    )
  ).rows
const borradores = async (db, origen) =>
  Number(
    (
      await db.query(
        `select count(*) as n from public.formulas where origen_id = $1 and estado = 'borrador'`,
        [origen],
      )
    ).rows[0].n,
  )

export async function carrerasDeTonos({ orquesta, carrera, espero }) {
  console.log('Eliminar un tono mientras se publica una versión que lo nombra')
  {
    const t = await terreno(orquesta, 'elimina')
    const r = await carrera(orquesta, {
      a: {
        persona: duena,
        sql: 'public.tono_eliminar($1, $2::timestamptz)',
        args: [t.ids.compra.id, t.ids.compra.v],
      },
      b: {
        persona: duena,
        consulta: `with g as (select public.formula_guardar_borrador($1, $2::jsonb, $3::jsonb, $4::jsonb) as id)
                   select public.formula_publicar($1, 'Con el tono') as r from g`,
        args: [
          t.origen,
          JSON.stringify(definicion),
          JSON.stringify(CAPTURAS.params),
          JSON.stringify(DISENO),
        ],
      },
    })
    // Como el tono no lo nombraba nadie cuando A miró, A lo elimina; B esperaba la fila y, al llegar, el tono ya no existe.
    const hay = await orquesta.query(`select 1 from public.tonos where clave = 'carreras_compra'`)
    espero(
      'elimina primero: publicar da tono_inexistente (22023) y no queda versión ni borrador',
      r.a.ok &&
        r.b.codigo === '22023' &&
        hay.rowCount === 0 &&
        (await publicadas(orquesta, t.origen)).length === 0 &&
        (await borradores(orquesta, t.origen)) === 0,
      { a: r.a, b: r.b },
    )
  }

  console.log('Publicar una versión que nombra un tono mientras se lo elimina')
  {
    const t = await terreno(orquesta, 'publicaelimina')
    const r = await carrera(orquesta, {
      a: {
        persona: duena,
        consulta: `with g as (select public.formula_guardar_borrador($1, $2::jsonb, $3::jsonb, $4::jsonb) as id)
                   select public.formula_publicar($1, 'Primero publica') as r from g`,
        args: [
          t.origen,
          JSON.stringify(definicion),
          JSON.stringify(CAPTURAS.params),
          JSON.stringify(DISENO),
        ],
      },
      b: {
        persona: duena,
        sql: 'public.tono_eliminar($1, $2::timestamptz)',
        args: [t.ids.compra.id, t.ids.compra.v],
      },
    })
    // A tomó el tono y publicó; B esperaba su fila, y al llegar mira el uso con la versión ya confirmada: no se elimina.
    const hay = await orquesta.query(`select 1 from public.tonos where clave = 'carreras_compra'`)
    const [pub] = await publicadas(orquesta, t.origen)
    espero(
      'publica primero: eliminar el tono falla diciendo que lo usa una fórmula (23503) y el tono sigue',
      r.a.ok && r.b.codigo === '23503' && hay.rowCount === 1 && pub?.version === 1,
      { a: r.a, b: r.b, pub },
    )
  }

  console.log('Dos publicar a la vez')
  {
    const t = await terreno(orquesta, 'publica', { publicada: true, borrador: true })
    const r = await carrera(orquesta, {
      a: {
        persona: duena,
        sql: `public.formula_publicar($1, 'Gana A', $2)`,
        args: [t.origen, t.v1],
      },
      b: {
        persona: duena,
        sql: `public.formula_publicar($1, 'Pierde B', $2)`,
        args: [t.origen, t.v1],
      },
    })
    const [pub] = await publicadas(orquesta, t.origen)
    espero(
      'gana la primera: la segunda da conflicto (PT409) y la versión 2 es la de A',
      r.a.ok && r.b.codigo === 'PT409' && pub?.version === 2 && pub?.nota === 'Gana A',
      { a: r.a, b: r.b, pub },
    )
  }

  console.log('Dos ⚙ a la vez')
  {
    const t = await terreno(orquesta, 'engranaje', { publicada: true })
    const r = await carrera(orquesta, {
      a: {
        persona: duena,
        sql: `public.formula_cambiar_constante($1, 'flete', 1500)`,
        args: [t.origen],
      },
      b: {
        persona: duena,
        sql: `public.formula_cambiar_constante($1, 'flete', 1600)`,
        args: [t.origen],
      },
    })
    const [pub] = await publicadas(orquesta, t.origen)
    espero(
      'gana el primero: el segundo da conflicto (PT409), la v2 lleva 1500 y no queda borrador',
      r.a.ok &&
        r.b.codigo === 'PT409' &&
        pub?.version === 2 &&
        Number(pub?.flete) === 1500 &&
        (await borradores(orquesta, t.origen)) === 0,
      { a: r.a, b: r.b, pub },
    )
  }
}
