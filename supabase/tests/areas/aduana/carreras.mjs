// Las carreras de aduana (paso 6.07-2, C21), con conexiones reales a la base del Supabase LOCAL. Ninguna termina en 40P01.
//   K5. A quita el vehículo de su declaración sin confirmar; B lo mueve a «pide» (exige aduana.declaracion): espera la unidad y, cuando A confirma, no
//       entra. Al revés: B mueve primero sin confirmar; A, al quitar, espera y recibe 23514 hint aduana.declaracion; la fila sigue viva.
//   K6. A quita X de la declaración 1 sin confirmar; B agrega X a la 2: espera el índice único y, cuando A confirma, entra. X queda vivo sólo en la 2.
//   K6b. El intercambio: A, en la 1, quita X y agrega Y; B, en la 2, quita Y y agrega X, a la vez (las dos esperan a X, que tiene una unidad tomada, y
//       salen juntas). Ninguna da 40P01, al menos una da 23514 hint vehiculos y ningún vehículo queda vivo en dos declaraciones. Con todos los quitar
//       antes que todos los agregar se trancaban (auditoría del plan, obj. 1).
// Las corre `scripts/carreras.mjs` (`pnpm db:carreras`) y, solas, `correr-carreras.mjs`. El rol, el origen y los vehículos los borra `limpiar()` de
// `scripts/carreras/terreno.mjs`; las declaraciones, el historial y las notas, `limpiarAduana()`.
import { PERSONAS, PREFIJO } from '../../../../scripts/carreras/terreno.mjs'
import { armarCarrera, armarTrabada, fila, sinInterbloqueo } from '../transporte/carreras-comun.mjs'

const { duena, supervision } = PERSONAS
const ROL = 'carreras_aduana'
const VEHICULOS = `${PREFIJO} aduana%`

// Lo que deja una corrida (también una rota). Va antes de `limpiar()`: el historial frena el borrado de las fases y una cabecera con un vehículo en
// «pide» no se borra (lo exige la fase); por eso primero los vehículos (su purga en cascada no la frena nada) y después las cabeceras.
export async function limpiarAduana(db) {
  const deLasCarreras = `(select id from public.vehiculos where titulo like $1)`
  await db.query(`delete from public.notas where vehiculo_id in ${deLasCarreras}`, [VEHICULOS])
  await db.query(`delete from public.historial_fases where vehiculo_id in ${deLasCarreras}`, [
    VEHICULOS,
  ])
  await db.query(`delete from public.vehiculos where titulo like $1`, [VEHICULOS])
  await db.query(`delete from public.declaraciones_aduana where numero like $1`, [VEHICULOS])
}

async function terrenoAduana(db) {
  const { id: rol } = await fila(
    db,
    `insert into public.roles (clave, nombre) values ($1, 'Carreras aduana') returning id`,
    [ROL],
  )
  await db.query(
    `insert into public.roles_permisos (rol_id, permiso_clave, alcance)
     select $1, k, 'todos' from unnest(array['logistica.ver', 'logistica.aduana.gestionar', 'flujos.mover']) k`,
    [rol],
  )
  await db.query(
    `insert into public.usuarios_roles (usuario_id, rol_id) values ($1, $3), ($2, $3) on conflict do nothing`,
    [duena, supervision, rol],
  )
  const { id: origen } = await fila(
    db,
    `insert into public.origenes (clave, nombre) values ($1, $2) returning id`,
    [ROL, `${PREFIJO} aduana`],
  )
  const { id: flujo } = await fila(db, `select id from public.flujos where origen_id = $1`, [
    origen,
  ])
  await db.query(
    `insert into public.flujos_reglas (flujo_id, regla, activa) values ($1, 'aduana', true)
     on conflict (flujo_id, regla) do update set activa = true`,
    [flujo],
  )
  const fase = async (nombre, orden, inicial) =>
    (
      await fila(
        db,
        `insert into public.fases (flujo_id, nombre, orden, es_inicial, permite_aduana) values ($1, $2, $3, $4, true) returning id`,
        [flujo, `${PREFIJO} aduana ${nombre}`, orden, inicial],
      )
    ).id
  const uno = await fase('uno', 10, true)
  const pide = await fase('pide', 20, false)
  await db.query(
    `insert into public.fases_requisitos (fase_id, tipo, clave_dato, bloqueante) values ($1, 'dato', 'aduana.declaracion', true)`,
    [pide],
  )
  await db.query(
    `insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id) values ($1, $2, $3)`,
    [flujo, uno, pide],
  )
  return { origen, uno, pide }
}

export async function carrerasDeAduana({ orquesta, espero, conectar, esperarBloqueo }) {
  const carrera = armarCarrera({ orquesta, conectar, esperarBloqueo })
  const trabada = armarTrabada({ orquesta, conectar, esperarBloqueo })
  await limpiarAduana(orquesta)
  const t = await terrenoAduana(orquesta)
  const vehiculo = async (n, id = null) =>
    (
      await fila(
        orquesta,
        `insert into public.vehiculos (id, origen_id, titulo, fase_id, creado_por) values (coalesce($1, gen_random_uuid()), $2, $3, $4, $5) returning id`,
        [id, t.origen, `${PREFIJO} aduana ${n}`, t.uno, duena],
      )
    ).id
  // Una declaración con sus vehículos, escrita como superusuario (el trigger deja: sin canal).
  const declaracion = async (numero, vs) => {
    const { id } = await fila(
      orquesta,
      `insert into public.declaraciones_aduana (numero) values ($1) returning id`,
      [`${PREFIJO} aduana ${numero}`],
    )
    for (const v of vs)
      await orquesta.query(
        `insert into public.declaraciones_vehiculos (declaracion_id, vehiculo_id) values ($1, $2)`,
        [id, v],
      )
    return id
  }
  const version = async (d) =>
    (
      await fila(
        orquesta,
        `select to_jsonb(actualizado_en) #>> '{}' as e from public.declaraciones_aduana where id = $1`,
        [d],
      )
    ).e
  const poner = async (d, agregar, quitar) => ({
    sql: `public.declaracion_vehiculos_poner($1, $2::timestamptz, $3::uuid[], $4::uuid[])::text`,
    args: [d, await version(d), agregar, quitar],
  })
  const mover = (v) => ({
    sql: `public.cambiar_fase($1, null, $2, null, $3)::text`,
    args: [v, t.pide, t.uno],
  })
  const vivoEn = async (v) =>
    (
      await orquesta.query(
        `select declaracion_id from public.declaraciones_vehiculos where vehiculo_id = $1 and removido_en is null`,
        [v],
      )
    ).rows.map((r) => r.declaracion_id)
  const faseDe = async (v) =>
    (await fila(orquesta, `select fase_id from public.vehiculos where id = $1`, [v])).fase_id

  console.log('Quitar un vehículo declarado contra moverlo a una fase que exige la declaración')
  {
    const v = await vehiculo('k5 a')
    const d = await declaracion('K5-A', [v])
    const { a, b } = await carrera({ a: await poner(d, [], [v]), b: mover(v) })
    const fase = await faseDe(v)
    espero(
      'K5 (quitar primero): A quita; B espera la unidad y, sin la declaración, no entra; sin 40P01',
      a.ok && fase === t.uno && sinInterbloqueo(a, b),
      { a, b, fase },
    )
  }
  {
    const v = await vehiculo('k5 b')
    const d = await declaracion('K5-B', [v])
    const quitar = await poner(d, [], [v])
    const { a, b } = await carrera({ a: mover(v), b: quitar })
    const vivo = await vivoEn(v)
    espero(
      'K5 (mover primero): A mueve; B espera la unidad y, al quitar lo que la fase ahora exige, da 23514; sin 40P01',
      a.ok &&
        b.codigo === '23514' &&
        b.mensaje?.includes('exige') &&
        vivo.length === 1 &&
        sinInterbloqueo(a, b),
      { a, b, vivo },
    )
  }

  console.log('Pasar un vehículo de una declaración a otra en dos sesiones')
  {
    const x = await vehiculo('k6 x')
    const d1 = await declaracion('K6-1', [x])
    const d2 = await declaracion('K6-2', [])
    const { a, b } = await carrera({ a: await poner(d1, [], [x]), b: await poner(d2, [x], []) })
    const vivo = await vivoEn(x)
    espero(
      'K6: A quita X de la 1; B lo agrega a la 2, espera el índice único y entra; X vivo sólo en la 2; sin 40P01',
      a.ok &&
        b.ok &&
        JSON.parse(b.valor).sin_cambios === false &&
        vivo.length === 1 &&
        vivo[0] === d2 &&
        sinInterbloqueo(a, b),
      { a, b, vivo },
    )
  }
  {
    const x = await vehiculo('k6b x', '00000000-0000-4000-8000-0000000e0721')
    const y = await vehiculo('k6b y', '00000000-0000-4000-8000-0000000e0722')
    const d1 = await declaracion('K6B-1', [x])
    const d2 = await declaracion('K6B-2', [y])
    const r = await trabada({
      bloqueada: x,
      a: await poner(d1, [y], [x]),
      b: await poner(d2, [x], [y]),
    })
    const enX = await vivoEn(x)
    const enY = await vivoEn(y)
    const rechazos = [r.a, r.b].filter(
      (s) => s.codigo === '23514' && s.mensaje?.includes('ya está en la declaración'),
    )
    espero(
      'K6b (intercambio): sin 40P01, al menos una da 23514 vehiculos y ningún vehículo vivo en dos declaraciones',
      sinInterbloqueo(r.a, r.b) && rechazos.length >= 1 && enX.length <= 1 && enY.length <= 1,
      { r, enX, enY },
    )
  }
  await limpiarAduana(orquesta)
}
