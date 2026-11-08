// Las carreras de la numeración de comprobantes (paso 4.26-1), con dos conexiones reales a la base del Supabase LOCAL. El orden que prueban: la cotización
// `for no key update` → `comprobantes_ajustes` (la serie vigente) `for update` → el contador (`update … returning`), y `comprobantes_serie_cambiar`, que toma
// ajustes → contador (`…_comprobantes_emitir_y_serie.sql`). Después de cada una, los números de cada serie usada son 1..último, sin huecos ni repetidos, y
// ninguna termina en 40P01 (K6 y K7, contra la papelera y marcar final, en `carreras-papelera.mjs`). A abre su transacción y actúa, B lanza, se espera a que B quede esperando un candado y A confirma (o revierte, K2). La serie
// `CARRERAS` se fija como vigente al empezar y `limpiarComprobantes()` deja «A». Las corre `scripts/carreras.mjs` (`pnpm db:carreras`) y, solas,
// `correr-carreras.mjs`. Terreno con el prefijo «Carreras», como las demás.
import { comoPersona } from '../../../../scripts/carreras/terreno.mjs'
import {
  insertaCotizacion,
  nuevoVehiculo,
  terreno,
} from '../../../../scripts/carreras/cotizaciones.mjs'
import {
  SERIE,
  YA_ANULADO,
  armarCarrera,
  duena,
  emitir,
  fila,
  nuevoId,
  sinHuecos,
  sinInterbloqueo,
} from './carreras-comun.mjs'
import { carrerasDePapelera } from './carreras-papelera.mjs'

const cambiarSerie = (serie) => ({
  sql: 'public.comprobantes_serie_cambiar($1, (select actualizado_en from public.comprobantes_ajustes))',
  args: [serie],
})
const anular = (id) => ({ sql: 'public.comprobante_anular($1, $2)', args: [id, 'Carreras'] })

// Lo que deja una corrida (también una rota): los comprobantes y contadores de las series `CARRERAS…`, la serie vigente de vuelta en «A» y sin autor (la
// cuenta se borra después). Va antes de `limpiar()` del terreno: un comprobante frena el borrado de su cotización (`restrict`).
export async function limpiarComprobantes(db) {
  await db.query(`delete from public.comprobantes where serie like $1`, [`${SERIE}%`])
  await db.query(
    `insert into public.comprobantes_contadores (serie, ultimo) values ('A', 0) on conflict do nothing`,
  )
  await db.query(
    `update public.comprobantes_ajustes set serie = case when serie like $1 then 'A' else serie end, actualizado_por = null`,
    [`${SERIE}%`],
  )
  await db.query(`delete from public.comprobantes_contadores where serie like $1`, [`${SERIE}%`])
}

// La serie vigente de las carreras, con su contador en cero, como postgres.
async function fijarSerie(db, serie = SERIE) {
  await db.query(
    `insert into public.comprobantes_contadores (serie, ultimo) values ($1, 0) on conflict do nothing`,
    [serie],
  )
  await db.query(`update public.comprobantes_ajustes set serie = $1`, [serie])
}

export async function carrerasDeComprobantes({ orquesta, espero, conectar, esperarBloqueo }) {
  const carrera = armarCarrera({ orquesta, conectar, esperarBloqueo })

  // Quien emite y cambia la serie: la dueña de las carreras suma las dos claves (el rol se borra con los `carreras_%`).
  await limpiarComprobantes(orquesta)
  const {
    rows: [rol],
  } = await orquesta.query(
    `insert into public.roles (clave, nombre) values ('carreras_comprobantes', 'Carreras comprobantes') returning id`,
  )
  await orquesta.query(
    `insert into public.roles_permisos (rol_id, permiso_clave, alcance) values ($1, 'cotizaciones.comprobantes.emitir', 'todos'), ($1, 'empresa.ajustes.gestionar', 'todos')`,
    [rol.id],
  )
  await orquesta.query(`insert into public.usuarios_roles (usuario_id, rol_id) values ($1, $2)`, [
    duena,
    rol.id,
  ])
  await fijarSerie(orquesta)

  // Dos finales de un mismo origen, cada una con su vehículo.
  async function dosFinales(etiqueta) {
    const t = await terreno(orquesta, etiqueta)
    const [c1, c2] = [nuevoId(), nuevoId()]
    await insertaCotizacion(orquesta, t, c1, { clase: 'final' })
    const v2 = await nuevoVehiculo(orquesta, t.origen, `comprobantes ${etiqueta} 2`)
    await insertaCotizacion(orquesta, t, c2, { vehiculo: v2, clase: 'final' })
    return [c1, c2]
  }
  const numero = (r) => Number(r.valor?.numero)

  try {
    console.log('Dos emisiones a la vez sobre dos finales (K1: B espera la serie)')
    {
      const [c1, c2] = await dosFinales('k1')
      const r = await carrera({ a: emitir(c1), b: emitir(c2) })
      espero(
        'A recibe 1 y B 2, sin 23505 ni hueco',
        r.a.ok && r.b.ok && numero(r.a) === 1 && numero(r.b) === 2 && (await sinHuecos(orquesta)),
        r,
      )
    }

    console.log('Una emisión que se revierte mientras otra espera (K2)')
    {
      const [c1, c2] = await dosFinales('k2')
      const r = await carrera({ a: emitir(c1), b: emitir(c2), revierte: true })
      const { ultimo } = await fila(
        orquesta,
        'select ultimo from public.comprobantes_contadores where serie = $1',
        [SERIE],
      )
      espero(
        'B recibe el número que A devolvió y no queda hueco',
        r.b.ok &&
          numero(r.b) === numero(r.a) &&
          Number(ultimo) === numero(r.b) &&
          (await sinHuecos(orquesta)),
        { r, ultimo },
      )
    }

    console.log('Dos emisiones sobre la misma final (K3: B espera la cotización)')
    {
      const [c] = await dosFinales('k3')
      const antes = Number(
        (
          await fila(
            orquesta,
            'select ultimo from public.comprobantes_contadores where serie = $1',
            [SERIE],
          )
        ).ultimo,
      )
      const r = await carrera({ a: emitir(c), b: emitir(c) })
      const { ultimo } = await fila(
        orquesta,
        'select ultimo from public.comprobantes_contadores where serie = $1',
        [SERIE],
      )
      espero(
        'B da PT409 y el contador sube una sola vez',
        r.a.ok &&
          r.b.codigo === 'PT409' &&
          Number(ultimo) === antes + 1 &&
          (await sinHuecos(orquesta)),
        { r, antes, ultimo },
      )
    }

    console.log(
      'Cambiar la serie mientras alguien emite (K4: ajustes → contador, en los dos órdenes)',
    )
    {
      const [c1, c2] = await dosFinales('k4')
      const r1 = await carrera({ a: cambiarSerie(`${SERIE}2`), b: emitir(c1) })
      espero(
        'cambia primero: B emite en la serie nueva con el 1',
        r1.a.ok && r1.b.ok && r1.b.valor.serie === `${SERIE}2` && numero(r1.b) === 1,
        r1,
      )
      const r2 = await carrera({ a: emitir(c2), b: cambiarSerie(`${SERIE}3`) })
      const vigente = (await fila(orquesta, 'select serie from public.comprobantes_ajustes')).serie
      espero(
        'emite primero: el comprobante de A queda en la serie vieja y B cambia la serie',
        r2.a.ok &&
          r2.b.ok &&
          r2.a.valor.serie === `${SERIE}2` &&
          numero(r2.a) === 2 &&
          vigente === `${SERIE}3` &&
          sinInterbloqueo(r1.a, r1.b, r2.a, r2.b) &&
          (await sinHuecos(orquesta)),
        { r2, vigente },
      )
      await fijarSerie(orquesta)
    }

    console.log('Dos anulaciones del mismo comprobante (K5)')
    {
      const [c] = await dosFinales('k5')
      await comoPersona(orquesta, duena)
      const { r: emitido } = await fila(orquesta, `select ${emitir(c).sql} as r`, emitir(c).args)
      await orquesta.query('reset role')
      const r = await carrera({ a: anular(emitido.id), b: anular(emitido.id) })
      espero(
        'B espera, A anula y B da PT409',
        r.a.ok && r.b.codigo === 'PT409' && r.b.mensaje === YA_ANULADO,
        r,
      )
    }

    await carrerasDePapelera({ orquesta, espero, carrera })
  } finally {
    await orquesta.query('reset role')
    await limpiarComprobantes(orquesta)
  }
}
