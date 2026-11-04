// Las carreras de `cotizacion_encima` (paso 4.15-2), con dos conexiones reales a la base del Supabase LOCAL (el arnés de `scripts/carreras.mjs`: A abre una transacción y actúa,
// B lanza su llamada, el orquestador espera a que B esté esperando un lock y A confirma; si B no espera, la carrera no se probó y el script falla). En todas, ningún interbloqueo
// (40P01). El orden que prueban está en `…_cotizacion_encima.sql`: el intento (advisory), la anterior `for share`, el lead `for key share`, el vehículo, la publicada `for share`,
// y el índice `cotizaciones_encima_unica` en el insert.
import { PERSONAS } from './terreno.mjs'
import { insertaCotizacion, publica, terreno } from './cotizaciones.mjs'

const { duena } = PERSONAS

let contador = 0
const nuevoId = () =>
  `00000000-0000-4000-8000-0000000e${String(3000 + ++contador).padStart(4, '0')}`

const encima = (id, anterior) => ({
  persona: duena,
  sql: 'public.cotizacion_encima($1, $2)',
  args: [id, anterior],
})
const nuevas = async (db, anterior) =>
  (
    await db.query(
      `select id, formula_id, valores ->> 'a' as a from public.cotizaciones where cotizacion_padre_id = $1 order by creado_en`,
      [anterior],
    )
  ).rows

export async function carrerasDeEncima({ orquesta, carrera, espero }) {
  const sinInterbloqueo = (r) => r.a.codigo !== '40P01' && r.b.codigo !== '40P01'

  console.log('Dos «cotizar encima» de la misma anterior a la vez (k1)')
  {
    const t = await terreno(orquesta, 'e1')
    const c = nuevoId()
    await insertaCotizacion(orquesta, t, c)
    const r = await carrera(orquesta, { a: encima(nuevoId(), c), b: encima(nuevoId(), c) })
    const n = await nuevas(orquesta, c)
    espero(
      'A crea; B espera el índice y recibe PT409 ya_tiene_encima (no el 23505); una sola versión nueva',
      r.a.ok &&
        r.b.codigo === 'PT409' &&
        /versión nueva/.test(r.b.mensaje) &&
        n.length === 1 &&
        sinInterbloqueo(r),
      { a: r.a, b: r.b, n },
    )
  }

  console.log('El mismo intento de cotizar encima a la vez (k2)')
  {
    const t = await terreno(orquesta, 'e2')
    const c = nuevoId()
    await insertaCotizacion(orquesta, t, c)
    const id = nuevoId()
    const r = await carrera(orquesta, { a: encima(id, c), b: encima(id, c) })
    const n = await nuevas(orquesta, c)
    espero(
      'B espera el candado del intento y recibe la misma, repetida; una sola versión nueva',
      r.a.ok &&
        r.b.ok &&
        r.b.valor?.repetido === true &&
        r.b.valor?.cotizacion?.id === id &&
        n.length === 1 &&
        sinInterbloqueo(r),
      { a: r.a, b: r.b, n },
    )
  }

  console.log('Cotizar encima contra mandar la anterior a la papelera (k3)')
  {
    const t = await terreno(orquesta, 'e3')
    const c = nuevoId()
    await insertaCotizacion(orquesta, t, c)
    const r = await carrera(orquesta, {
      a: { persona: duena, sql: `public.papelera_enviar('cotizaciones', $1::uuid[])`, args: [[c]] },
      b: encima(nuevoId(), c),
    })
    const n = await nuevas(orquesta, c)
    espero(
      'B espera el for share de la anterior; A la manda a la papelera y B recibe el 42501 de lo inexistente, sin versión nueva',
      r.a.ok &&
        r.b.codigo === '42501' &&
        /No tienes acceso a esta cotización/.test(r.b.mensaje) &&
        n.length === 0 &&
        sinInterbloqueo(r),
      { a: r.a, b: r.b, n },
    )
  }

  console.log('Cotizar encima contra guardar la anterior (k4)')
  {
    const t = await terreno(orquesta, 'e4')
    const c = nuevoId()
    await insertaCotizacion(orquesta, t, c)
    const {
      rows: [{ v }],
    } = await orquesta.query(
      `select actualizado_en::text as v from public.cotizaciones where id = $1`,
      [c],
    )
    const r = await carrera(orquesta, {
      a: {
        persona: duena,
        sql: 'public.cotizacion_guardar($1, $2, $3::timestamptz, $4::jsonb, null, null, null, $5, false)',
        args: [c, nuevoId(), v, JSON.stringify({ inputs: { a: 77 } }), t.vehiculo],
      },
      b: encima(nuevoId(), c),
    })
    const n = await nuevas(orquesta, c)
    espero(
      'B espera a que A guarde y la versión nueva lleva lo que A guardó',
      r.a.ok && r.b.ok && n.length === 1 && n[0].a === '77' && sinInterbloqueo(r),
      { a: r.a, b: r.b, n },
    )
  }

  console.log('Cotizar encima contra publicar una versión de la fórmula (k5)')
  {
    const t = await terreno(orquesta, 'e5')
    const c = nuevoId()
    await insertaCotizacion(orquesta, t, c)
    const r = await carrera(orquesta, { a: publica(t, 'v2 encima'), b: encima(nuevoId(), c) })
    const n = await nuevas(orquesta, c)
    const {
      rows: [pub],
    } = await orquesta.query(
      `select id from public.formulas where origen_id = $1 and estado = 'publicada'`,
      [t.origen],
    )
    espero(
      'B espera el for share de la publicada y la versión nueva usa la que A publicó',
      r.a.ok &&
        r.b.ok &&
        n.length === 1 &&
        n[0].formula_id === pub.id &&
        pub.id !== t.v1 &&
        sinInterbloqueo(r),
      { a: r.a, b: r.b, n, pub },
    )
  }
}
