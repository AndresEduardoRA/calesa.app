// Las carreras de la plantilla de la tarjeta (paso 4.19-1): dos publicar a la vez, dos crear el borrador, guardar mientras se publica, dos guardar con la misma
// versión y descartar mientras se publica. Cada una abre una transacción de A y deja a B esperando el candado del origen (el arnés de `scripts/carreras.mjs`): si B no
// espera, la carrera no se probó. Trabaja en un origen propio por carrera (prefijo «Carreras»): `limpiar()` lo borra y las plantillas caen con él.
import { readFileSync } from 'node:fs'
import { PERSONAS, PREFIJO } from './terreno.mjs'

const { configura: duena } = PERSONAS

const juego = JSON.parse(
  readFileSync('src/modules/cotizaciones/entities/plantilla/casos-de-plantilla.json', 'utf8'),
)
const MINI = juego.formulas.mini
// La plantilla de un caso válido sin tonos (no hace falta ninguno del catálogo), con una nota que distingue una definición de otra.
const BASE = juego.casos.find(
  (c) => c.valida && c.formula === 'mini' && c.nombre.startsWith('mínima'),
).plantilla
const definicion = (marca) => ({ ...BASE, nota: `Nota ${marca}` })

let numero = 0
async function terreno(db, etiqueta, { publicada = false, borrador = false } = {}) {
  numero += 1
  const {
    rows: [origen],
  } = await db.query(`insert into public.origenes (clave, nombre) values ($1, $2) returning id`, [
    `carreras_pla_${etiqueta}_${numero}`,
    `${PREFIJO} pla ${etiqueta} ${numero}`,
  ])
  await db.query(
    `insert into public.formulas (origen_id, estado, version, definicion, params, diseno, visibilidad, nota)
     values ($1, 'publicada', 1, $2::jsonb, '{}'::jsonb, $3::jsonb, $4::jsonb, 'v1')`,
    [
      origen.id,
      JSON.stringify(MINI.definicion),
      JSON.stringify(MINI.diseno),
      JSON.stringify(MINI.visibilidad),
    ],
  )
  if (publicada) {
    await db.query(
      `insert into public.plantillas_tarjeta (origen_id, estado, version, definicion, nota, publicado_en) values ($1, 'publicada', 1, $2::jsonb, 'v1', now())`,
      [origen.id, JSON.stringify(definicion('v1'))],
    )
  }
  let v = null
  if (borrador) {
    v = (
      await db.query(
        `insert into public.plantillas_tarjeta (origen_id, estado, definicion, nota) values ($1, 'borrador', $2::jsonb, 'borrador') returning actualizado_en::text as v`,
        [origen.id, JSON.stringify(definicion('inicial'))],
      )
    ).rows[0].v
  }
  return { origen: origen.id, v }
}

// Como texto: un `Date` de JavaScript pierde los microsegundos y la versión ya no coincide.
const filas = async (db, origen) =>
  (
    await db.query(
      `select estado, version, nota, definicion ->> 'nota' as marca, actualizado_en::text as v from public.plantillas_tarjeta where origen_id = $1 order by estado, version`,
      [origen],
    )
  ).rows
const deEstado = (rows, estado) => rows.filter((f) => f.estado === estado)

const guardar = `public.plantilla_guardar_borrador($1, $2::timestamptz, $3::jsonb)`

export async function carrerasDePlantillas({ orquesta, carrera, espero }) {
  console.log('Dos publicar de la plantilla a la vez')
  {
    const t = await terreno(orquesta, 'publica', { publicada: true, borrador: true })
    const r = await carrera(orquesta, {
      a: {
        persona: duena,
        sql: `public.plantilla_publicar($1, $2::timestamptz, 'Gana A')`,
        args: [t.origen, t.v],
      },
      b: {
        persona: duena,
        sql: `public.plantilla_publicar($1, $2::timestamptz, 'Pierde B')`,
        args: [t.origen, t.v],
      },
    })
    const rows = await filas(orquesta, t.origen)
    espero(
      'gana la primera: la segunda da conflicto (PT409) y la versión 2 lleva la nota de A, sola',
      r.a.ok &&
        r.b.codigo === 'PT409' &&
        deEstado(rows, 'publicada').length === 1 &&
        deEstado(rows, 'publicada')[0].version === 2 &&
        deEstado(rows, 'publicada')[0].nota === 'Gana A',
      { a: r.a, b: r.b, rows },
    )
  }

  console.log('Dos crear el borrador de la plantilla a la vez')
  {
    const t = await terreno(orquesta, 'crea', { publicada: true })
    const r = await carrera(orquesta, {
      a: { persona: duena, sql: guardar, args: [t.origen, null, JSON.stringify(definicion('A'))] },
      b: { persona: duena, sql: guardar, args: [t.origen, null, JSON.stringify(definicion('B'))] },
    })
    const rows = await filas(orquesta, t.origen)
    espero(
      'gana el primero que crea: el segundo da conflicto (PT409) y el borrador es el de A',
      r.a.ok &&
        r.b.codigo === 'PT409' &&
        deEstado(rows, 'borrador').length === 1 &&
        deEstado(rows, 'borrador')[0].marca === 'Nota A',
      { a: r.a, b: r.b, rows },
    )
  }

  console.log('Guardar el borrador de la plantilla mientras se publica')
  {
    const t = await terreno(orquesta, 'guardaypublica', { publicada: true, borrador: true })
    const r = await carrera(orquesta, {
      a: {
        persona: duena,
        sql: `public.plantilla_publicar($1, $2::timestamptz, 'Publica A')`,
        args: [t.origen, t.v],
      },
      b: { persona: duena, sql: guardar, args: [t.origen, t.v, JSON.stringify(definicion('B'))] },
    })
    const rows = await filas(orquesta, t.origen)
    espero(
      'publica primero: guardar da conflicto (PT409, «se publicó»), la publicada lleva lo de A y no queda borrador',
      r.a.ok &&
        r.b.codigo === 'PT409' &&
        r.b.mensaje.includes('se publicó') &&
        deEstado(rows, 'publicada')[0]?.marca === 'Nota inicial' &&
        deEstado(rows, 'publicada')[0]?.version === 2 &&
        deEstado(rows, 'borrador').length === 0,
      { a: r.a, b: r.b, rows },
    )
  }

  console.log('Dos guardar el borrador de la plantilla con la misma versión')
  {
    const t = await terreno(orquesta, 'guarda', { publicada: true, borrador: true })
    const r = await carrera(orquesta, {
      a: { persona: duena, sql: guardar, args: [t.origen, t.v, JSON.stringify(definicion('A'))] },
      b: { persona: duena, sql: guardar, args: [t.origen, t.v, JSON.stringify(definicion('B'))] },
    })
    const rows = await filas(orquesta, t.origen)
    espero(
      'gana el primero que guarda: el segundo da conflicto (PT409) y el borrador es el de A',
      r.a.ok && r.b.codigo === 'PT409' && deEstado(rows, 'borrador')[0]?.marca === 'Nota A',
      { a: r.a, b: r.b, rows },
    )
  }

  console.log('Descartar el borrador de la plantilla mientras se publica')
  {
    const t = await terreno(orquesta, 'descartaypublica', { publicada: true, borrador: true })
    const r = await carrera(orquesta, {
      a: {
        persona: duena,
        sql: `public.plantilla_publicar($1, $2::timestamptz, 'Publica A')`,
        args: [t.origen, t.v],
      },
      b: {
        persona: duena,
        sql: `public.plantilla_descartar_borrador($1, $2::timestamptz)`,
        args: [t.origen, t.v],
      },
    })
    const rows = await filas(orquesta, t.origen)
    espero(
      'publica primero: descartar da conflicto (PT409, «se publicó») y la publicada de A sigue publicada',
      r.a.ok &&
        r.b.codigo === 'PT409' &&
        r.b.mensaje.includes('se publicó') &&
        deEstado(rows, 'publicada').length === 1 &&
        deEstado(rows, 'publicada')[0].version === 2 &&
        deEstado(rows, 'publicada')[0].nota === 'Publica A' &&
        deEstado(rows, 'borrador').length === 0,
      { a: r.a, b: r.b, rows },
    )
  }
}
