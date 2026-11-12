// Las carreras del transporte (paso 6.07-1, C20), con conexiones reales a la base del Supabase LOCAL. Ninguna termina en 40P01 ni deja un grupo a medias.
//   K1. A guarda una unidad del grupo de 3 sin confirmar; B aplica al grupo con las versiones de antes: espera la fila y, cuando A confirma, PT409; las
//       otras dos no cambian.
//   K2. B aplica primero sin confirmar; A guarda una unidad con la versión de antes: espera y PT409; las 3 quedan con lo de B.
//   K3. Dos unidades Ua < Ub por id de vehículo con sus transportes al revés (Tb < Ta). X tiene Ub tomada; aplicar al grupo y `cambiar_fase_lote` de
//       las dos esperan, en los dos órdenes, y al soltar X pasan los dos. Con las unidades tomadas en el orden de `transportes.id` el segundo orden
//       (aplicar primero) se trancaba: aplicar tenía Ub y esperaba Ua, el lote tenía Ua y esperaba Ub.
//   K4. A vacía el contenedor sin confirmar y B mueve la unidad a una fase que lo exige: B espera y, cuando A confirma, no entra (23514). Al revés: B
//       mueve primero y A, al vaciar, espera y recibe 23514; el contenedor sigue.
// Las corre `scripts/carreras.mjs` (`pnpm db:carreras`) y, solas, `correr-carreras.mjs`. Terreno con el prefijo «Carreras»: el rol, los vehículos (con
// sus transportes) y el origen los borra `limpiar()` de `scripts/carreras/terreno.mjs`; el historial y las notas de los movimientos, `limpiarTransporte()`.
import {
  armarCarrera,
  armarTrabada,
  esperadasDe,
  fila,
  limpiarTransporte,
  sinInterbloqueo,
  terrenoTransporte,
  unidad,
  versionDe,
} from './carreras-comun.mjs'

export { limpiarTransporte }

export async function carrerasDeTransporte({ orquesta, espero, conectar, esperarBloqueo }) {
  const carrera = armarCarrera({ orquesta, conectar, esperarBloqueo })
  const trabada = armarTrabada({ orquesta, conectar, esperarBloqueo })
  await limpiarTransporte(orquesta)
  const t = await terrenoTransporte(orquesta)
  const aplicar = (booking, esperadas, cambios) => ({
    sql: `public.transporte_grupo_aplicar('booking', $1, $2::jsonb, $3::jsonb)::text`,
    args: [booking, esperadas, JSON.stringify(cambios)],
  })
  const guardar = (v, version, cambios) => ({
    sql: `public.transporte_guardar($1, null, $2::timestamptz, $3::jsonb)::text`,
    args: [v, version, JSON.stringify(cambios)],
  })
  const etas = async (booking) =>
    (
      await orquesta.query(
        `select coalesce(eta_el::text, '-') as e from public.transportes where booking = $1 order by id`,
        [booking],
      )
    ).rows.map((r) => r.e)

  console.log('Aplicar al grupo contra guardar una unidad')
  {
    const vs = []
    for (const n of [1, 2, 3])
      vs.push(await unidad(orquesta, t, { n: `k1 ${n}`, booking: 'CARR-K1' }))
    const esperadas = await esperadasDe(orquesta, 'CARR-K1')
    const { a, b } = await carrera({
      a: guardar(vs[1], await versionDe(orquesta, vs[1]), { eta_el: '2026-12-01' }),
      b: aplicar('CARR-K1', esperadas, { eta_el: '2026-12-24' }),
    })
    const e = await etas('CARR-K1')
    espero(
      'K1: A guarda una unidad; B aplica al grupo, espera la fila y da PT409; sólo cambió la de A; sin 40P01',
      a.ok &&
        b.codigo === 'PT409' &&
        e.filter((x) => x === '2026-12-01').length === 1 &&
        e.filter((x) => x === '-').length === 2 &&
        sinInterbloqueo(a, b),
      { a, b, e },
    )
  }
  {
    const vs = []
    for (const n of [1, 2, 3])
      vs.push(await unidad(orquesta, t, { n: `k2 ${n}`, booking: 'CARR-K2' }))
    const esperadas = await esperadasDe(orquesta, 'CARR-K2')
    const vieja = await versionDe(orquesta, vs[2])
    const { a, b } = await carrera({
      a: aplicar('CARR-K2', esperadas, { eta_el: '2026-12-24' }),
      b: guardar(vs[2], vieja, { eta_el: '2026-12-01' }),
    })
    const e = await etas('CARR-K2')
    espero(
      'K2: A aplica al grupo; B guarda una unidad, espera la fila y da PT409; las 3 con lo de A; sin 40P01',
      a.ok && b.codigo === 'PT409' && e.every((x) => x === '2026-12-24') && sinInterbloqueo(a, b),
      { a, b, e },
    )
  }

  console.log(
    'Aplicar al grupo contra mover un lote, con las unidades y sus transportes en órdenes opuestos',
  )
  {
    const ua = '00000000-0000-4000-8000-0000000e0701'
    const ub = '00000000-0000-4000-8000-0000000e0702'
    await unidad(orquesta, t, {
      n: 'k3 a',
      booking: 'CARR-K3',
      id: ua,
      transporte: '00000000-0000-4000-8000-0000000f0702',
    })
    await unidad(orquesta, t, {
      n: 'k3 b',
      booking: 'CARR-K3',
      id: ub,
      transporte: '00000000-0000-4000-8000-0000000f0701',
    })
    const lote = (de, a) => ({
      sql: `public.cambiar_fase_lote($1::jsonb, $2, null)::text`,
      args: [JSON.stringify([ua, ub].map((vehiculo) => ({ vehiculo, fase_esperada: de }))), a],
    })
    const r1 = await trabada({
      bloqueada: ub,
      a: lote(t.uno, t.tres),
      b: aplicar('CARR-K3', await esperadasDe(orquesta, 'CARR-K3'), { eta_el: '2026-12-01' }),
    })
    const movidos1 = r1.a.ok && JSON.parse(r1.a.valor).every((u) => u.ok === true)
    espero(
      'K3 (lote primero): el lote y aplicar esperan a X y pasan los dos; sin 40P01',
      movidos1 && r1.b.ok && sinInterbloqueo(r1.a, r1.b),
      r1,
    )
    const r2 = await trabada({
      bloqueada: ub,
      a: aplicar('CARR-K3', await esperadasDe(orquesta, 'CARR-K3'), { eta_el: '2026-12-24' }),
      b: lote(t.tres, t.uno),
    })
    const movidos2 = r2.b.ok && JSON.parse(r2.b.valor).every((u) => u.ok === true)
    espero(
      'K3 (aplicar primero): aplicar y el lote esperan a X y pasan los dos; sin 40P01',
      r2.a.ok && movidos2 && sinInterbloqueo(r2.a, r2.b),
      r2,
    )
  }

  console.log('Vaciar el contenedor contra mover a una fase que lo exige')
  {
    const v = await unidad(orquesta, t, { n: 'k4 a', contenedor: 'CARRK4' })
    const mover = {
      sql: `public.cambiar_fase($1, null, $2, null, $3)::text`,
      args: [v, t.pide, t.uno],
    }
    const { a, b } = await carrera({
      a: guardar(v, await versionDe(orquesta, v), { contenedor: null }),
      b: mover,
    })
    const { fase_id } = await fila(orquesta, `select fase_id from public.vehiculos where id = $1`, [
      v,
    ])
    espero(
      'K4 (vaciar primero): A vacía; B espera la unidad y, con el contenedor vacío, no entra (23514); sin 40P01',
      a.ok && b.codigo === '23514' && fase_id === t.uno && sinInterbloqueo(a, b),
      { a, b, fase_id },
    )
  }
  {
    const v = await unidad(orquesta, t, { n: 'k4 b', contenedor: 'CARRK4' })
    const vieja = await versionDe(orquesta, v)
    const { a, b } = await carrera({
      a: { sql: `public.cambiar_fase($1, null, $2, null, $3)::text`, args: [v, t.pide, t.uno] },
      b: guardar(v, vieja, { contenedor: null }),
    })
    const { contenedor } = await fila(
      orquesta,
      `select contenedor from public.transportes where vehiculo_id = $1`,
      [v],
    )
    espero(
      'K4 (mover primero): A mueve; B espera la unidad y, al vaciar lo que la fase ahora exige, da 23514; sin 40P01',
      a.ok &&
        b.codigo === '23514' &&
        b.mensaje?.includes('exige') &&
        contenedor === 'CARRK4' &&
        sinInterbloqueo(a, b),
      { a, b, contenedor },
    )
  }
  await limpiarTransporte(orquesta)
}
