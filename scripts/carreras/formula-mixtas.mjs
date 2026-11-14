// Las carreras mixtas de las versiones de la fórmula (docs/COTIZADOR.md › «Versiones»): el ⚙ contra publicar el borrador y revertir contra
// el ⚙, en los dos órdenes. Las tres publican la N+1 tras el candado del origen y comparan la publicada que tenían: la segunda da PT409 y
// nada se pisa. B va con las esperadas que manda la app y sin ellas (la base las acepta nulas): sin esperada, el ⚙ compara la publicada que
// leyó antes del candado y publicar compara la versión de origen del borrador. Mismo arnés y terreno que `tonos.mjs`.
import { PERSONAS } from './terreno.mjs'
import { borradores, publicadas, terreno } from './tonos.mjs'

const { configura } = PERSONAS
const FLETE = 900 // el de la fórmula de las capturas (`casos-de-diseno.json`)

const engranaje = (t, valor, esperada) => ({
  persona: configura,
  sql: `public.formula_cambiar_constante($1, 'flete', $2, $3)`,
  args: [t.origen, valor, esperada],
})
const publicarBorrador = (t, esperadas) => ({
  persona: configura,
  sql: `public.formula_publicar($1, 'Publica el borrador', $2, $3::timestamptz)`,
  args: [t.origen, esperadas ? t.v1 : null, esperadas ? t.borradorEn : null],
})
const revertir = (t, esperada) => ({
  persona: configura,
  sql: `public.formula_revertir($1, $2, 'Vuelve a la v1', $3)`,
  args: [t.origen, t.v1, esperada],
})

// La v1 publicada y un borrador empezado sobre ella, con la hora que la app tendría al abrirlo.
async function conBorrador(db, etiqueta) {
  const t = await terreno(db, etiqueta, { publicada: true, borrador: true })
  const { rows } = await db.query(
    `select actualizado_en::text as v from public.formulas where id = $1`,
    [t.borrador],
  )
  return { ...t, borradorEn: rows[0].v }
}

// La v1 archivada (flete 900) y la v2 publicada con otro flete: lo que se revierte.
async function conArchivada(db, etiqueta) {
  const t = await terreno(db, etiqueta, { publicada: true })
  await db.query(`update public.formulas set estado = 'archivada' where id = $1`, [t.v1])
  const { rows } = await db.query(
    `insert into public.formulas (origen_id, estado, version, definicion, params, diseno, visibilidad, nota, version_origen_id)
     select origen_id, 'publicada', 2, definicion, params || '{"flete": 1100}'::jsonb, diseno, visibilidad, 'v2', id
       from public.formulas where id = $1
     returning id`,
    [t.v1],
  )
  return { ...t, v2: rows[0].id }
}

export async function carrerasMixtasDeLaFormula({ orquesta, carrera, espero }) {
  for (const esperadas of [true, false]) {
    const con = esperadas ? 'con sus esperadas' : 'sin esperadas'
    const sufijo = esperadas ? 'con' : 'sin'

    console.log(`El ⚙ mientras se publica el borrador (el ⚙ primero; publicar ${con})`)
    {
      const t = await conBorrador(orquesta, `eng_pub_${sufijo}`)
      const r = await carrera(orquesta, {
        a: engranaje(t, 1500, esperadas ? t.v1 : null),
        b: publicarBorrador(t, esperadas),
      })
      const [pub] = await publicadas(orquesta, t.origen)
      espero(
        `publicar da conflicto (PT409), la v2 es la del ⚙ y el borrador sigue: ${r.b.mensaje}`,
        r.a.ok &&
          r.b.codigo === 'PT409' &&
          pub?.id === r.a.valor &&
          pub.version === 2 &&
          Number(pub.flete) === 1500 &&
          (await borradores(orquesta, t.origen)) === 1,
        { a: r.a, b: r.b, pub },
      )
    }

    console.log(`Publicar el borrador mientras se usa el ⚙ (publicar primero; el ⚙ ${con})`)
    {
      const t = await conBorrador(orquesta, `pub_eng_${sufijo}`)
      const r = await carrera(orquesta, {
        a: publicarBorrador(t, true),
        b: engranaje(t, 1500, esperadas ? t.v1 : null),
      })
      const [pub] = await publicadas(orquesta, t.origen)
      espero(
        `el ⚙ da conflicto (PT409) y la v2 es el borrador, con el flete de antes: ${r.b.mensaje}`,
        r.a.ok &&
          r.b.codigo === 'PT409' &&
          pub?.id === t.borrador &&
          pub.version === 2 &&
          Number(pub.flete) === FLETE &&
          (await borradores(orquesta, t.origen)) === 0,
        { a: r.a, b: r.b, pub },
      )
    }

    console.log(`Revertir mientras se usa el ⚙ (revertir primero; el ⚙ ${con})`)
    {
      const t = await conArchivada(orquesta, `rev_eng_${sufijo}`)
      const r = await carrera(orquesta, {
        a: revertir(t, t.v2),
        b: engranaje(t, 1500, esperadas ? t.v2 : null),
      })
      const [pub] = await publicadas(orquesta, t.origen)
      espero(
        `el ⚙ da conflicto (PT409) y la v3 es la copia de la v1: ${r.b.mensaje}`,
        r.a.ok &&
          r.b.codigo === 'PT409' &&
          pub?.id === r.a.valor &&
          pub.version === 3 &&
          Number(pub.flete) === FLETE,
        { a: r.a, b: r.b, pub },
      )
    }
  }

  console.log('El ⚙ mientras se revierte (el ⚙ primero)')
  {
    const t = await conArchivada(orquesta, 'eng_rev')
    const r = await carrera(orquesta, {
      a: engranaje(t, 1500, t.v2),
      b: revertir(t, t.v2),
    })
    const [pub] = await publicadas(orquesta, t.origen)
    espero(
      `revertir da conflicto (PT409) y la v3 es la del ⚙: ${r.b.mensaje}`,
      r.a.ok &&
        r.b.codigo === 'PT409' &&
        pub?.id === r.a.valor &&
        pub.version === 3 &&
        Number(pub.flete) === 1500,
      { a: r.a, b: r.b, pub },
    )
  }
}
