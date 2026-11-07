// Las carreras de marcar final contra lo que toma el vehículo `for key share` o escribe el vehículo después de su cotización (paso 4.25-1): restaurar la
// papelera de cotizaciones (R6), cotizar encima de la misma o de una hermana (R7, R7b; su trigger escribe el vehículo) y una preventa que aparece mientras
// se espera el lead (R8). Las llama `carrerasDeFinal()` de `carreras.mjs`, con el mismo contrato.
import {
  PERSONAS,
  PREFIJO,
  comoPersona,
  leadDeLaDuena,
} from '../../../../scripts/carreras/terreno.mjs'
import { insertaCotizacion, terreno } from '../../../../scripts/carreras/cotizaciones.mjs'
import {
  NO_PUEDE,
  armarEnDosPasos,
  cot,
  fila,
  idsDesde,
  marcar,
  sinInterbloqueo,
} from './carreras-comun.mjs'

const { duena } = PERSONAS
const nuevoId = idsDesde(6000)
// Quien marca y sólo ve (y edita) las cotizaciones suyas y las de su cartera (R8). El arnés la borra con las demás («carreras-», «carreras_»).
export const MARCA_PROPIOS = '00000000-0000-4000-8000-0000000c0f01'

export async function sembrarFinal(db) {
  await db.query(
    `insert into auth.users (id, email, raw_app_meta_data) values ($1, 'carreras-final-propios@ejemplo.com', '{"invitado": true}')`,
    [MARCA_PROPIOS],
  )
  await db.query(
    `update public.perfiles set nombre = $2, invitacion_aceptada_en = now() where id = $1`,
    [MARCA_PROPIOS, `${PREFIJO} final propios`],
  )
  const {
    rows: [rol],
  } = await db.query(
    `insert into public.roles (clave, nombre) values ('carreras_final_propios', $1) returning id`,
    [`${PREFIJO} final propios`],
  )
  for (const [clave, alcance] of [
    ['cotizaciones.ver', 'propios'],
    ['cotizaciones.editar', 'propios'],
    ['cotizaciones.final.gestionar', 'todos'],
    ['leads.ver', 'propios'],
    ['leads.editar', 'propios'],
  ]) {
    await db.query(
      `insert into public.roles_permisos (rol_id, permiso_clave, alcance) values ($1, $2, $3)`,
      [rol.id, clave, alcance],
    )
  }
  await db.query(`insert into public.usuarios_roles (usuario_id, rol_id) values ($1, $2)`, [
    MARCA_PROPIOS,
    rol.id,
  ])
}

// Lo que el arnés no borra de esta persona (lo que frena borrar su cuenta): sus lotes (con lo que tengan adentro, todo del terreno) y su actividad.
export async function limpiarFinal(db) {
  await db.query(
    `delete from public.cotizaciones where lote_papelera_id in (select id from public.lotes_papelera where creado_por = $1)`,
    [MARCA_PROPIOS],
  )
  await db.query(`delete from public.lotes_papelera where creado_por = $1`, [MARCA_PROPIOS])
  await db.query(`delete from public.actividad where actor_id = $1`, [MARCA_PROPIOS])
}

export async function carrerasDeCandados({ orquesta, espero, conectar }) {
  const enDosPasos = armarEnDosPasos({ orquesta, conectar })
  // La persona propia: limpia lo que haya dejado una corrida rota y nace de nuevo (el arnés la borra al terminar, por su correo y su rol).
  await limpiarFinal(orquesta)
  await orquesta.query(`delete from auth.users where id = $1`, [MARCA_PROPIOS])
  await orquesta.query(`delete from public.roles where clave = 'carreras_final_propios'`)
  await sembrarFinal(orquesta)

  console.log('Marcar final mientras se restaura una preventa del mismo vehículo (R6)')
  {
    const t = await terreno(orquesta, 'f6')
    const [c, p] = [nuevoId(), nuevoId()]
    await insertaCotizacion(orquesta, t, c)
    await insertaCotizacion(orquesta, t, p)
    await comoPersona(orquesta, duena)
    const { lote } = await fila(
      orquesta,
      `select public.papelera_enviar('cotizaciones', array[$1::uuid]) as lote`,
      [p],
    )
    await orquesta.query('reset role')
    const { v } = await fila(
      orquesta,
      'select actualizado_en::text as v from public.lotes_papelera where id = $1',
      [lote],
    )
    const r = await enDosPasos({
      sub: duena,
      a1: (a) =>
        a.query(
          `select 1 from public.vehiculos v where v.id in (select x.vehiculo_id from public.cotizaciones x where x.lote_papelera_id = $1 and x.eliminado_en is not null) order by v.id for key share`,
          [lote],
        ),
      b: marcar(duena, c),
      a2: (a) =>
        a.query('select public.cotizaciones_papelera_restaurar($1, $2::timestamptz)', [lote, v]),
    })
    const [fc, fp] = [await cot(orquesta, c), await cot(orquesta, p)]
    espero(
      'B no espera a restaurar y los dos terminan sin interbloqueo: la final queda y la preventa restaurada vive a su lado',
      r.comoFue === 'terminó' &&
        r.a.ok &&
        r.b.ok &&
        sinInterbloqueo(r.a, r.b) &&
        fc.clase === 'final' &&
        fp.viva,
      { r, fc, fp },
    )
  }

  for (const [nombre, hermana] of [
    ['R7', false],
    ['R7b', true],
  ]) {
    console.log(
      `Marcar final mientras se cotiza encima de ${hermana ? 'una preventa hermana' : 'la misma'} (${nombre})`,
    )
    const t = await terreno(orquesta, nombre.toLowerCase())
    const [c, h, nueva] = [nuevoId(), nuevoId(), nuevoId()]
    await insertaCotizacion(orquesta, t, c)
    await insertaCotizacion(orquesta, t, h)
    const sobre = hermana ? h : c
    const antes = (
      await fila(orquesta, 'select cotizado_en::text as x from public.vehiculos where id = $1', [
        t.vehiculo,
      ])
    ).x
    const r = await enDosPasos({
      sub: duena,
      a1: (a) => a.query('select 1 from public.cotizaciones where id = $1 for share', [sobre]),
      b: marcar(duena, c),
      a2: (a) => a.query('select public.cotizacion_encima($1, $2)', [nueva, sobre]),
    })
    const [fc, fh, fn] = [
      await cot(orquesta, c),
      await cot(orquesta, h),
      await cot(orquesta, nueva),
    ]
    const despues = (
      await fila(orquesta, 'select cotizado_en::text as x from public.vehiculos where id = $1', [
        t.vehiculo,
      ])
    ).x
    espero(
      `B espera en la pasada y los dos terminan sin interbloqueo: la final queda${hermana ? ', la hermana en la papelera' : ''} y la versión nueva vive como preventa`,
      r.comoFue === 'esperó' &&
        r.a.ok &&
        r.b.ok &&
        sinInterbloqueo(r.a, r.b) &&
        fc.clase === 'final' &&
        fn?.viva &&
        fn.clase === 'preventa' &&
        (!hermana || !fh.viva) &&
        despues !== antes,
      { r, fc, fh, fn, antes, despues },
    )
  }

  console.log('Marcar final mientras otra persona suma una preventa que quien marca no ve (R8)')
  try {
    const t = await terreno(orquesta, 'f8')
    const suyo = await leadDeLaDuena(orquesta, 'f8 lead de quien marca')
    await orquesta.query(
      `insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por) values ($1, $2, 'compartido', $3)`,
      [suyo, MARCA_PROPIOS, duena],
    )
    const [c, p] = [nuevoId(), nuevoId()]
    await insertaCotizacion(orquesta, { ...t, lead: suyo }, c)
    await orquesta.query('update public.cotizaciones set creado_por = $2 where id = $1', [
      c,
      MARCA_PROPIOS,
    ])
    const r = await enDosPasos({
      a1: (a) => a.query('select 1 from public.leads where id = $1 for no key update', [suyo]),
      b: marcar(MARCA_PROPIOS, c),
      a2: () => insertaCotizacion(orquesta, t, p),
    })
    const [fc, fp] = [await cot(orquesta, c), await cot(orquesta, p)]
    espero(
      'B espera el lead, encuentra la preventa que no ve y responde el 42501 de C1.8; nada cambia',
      r.comoFue === 'esperó' &&
        r.a.ok &&
        r.b.codigo === '42501' &&
        r.b.mensaje === NO_PUEDE &&
        fc.clase === 'preventa' &&
        fp.viva &&
        fp.lote_papelera_id === null,
      { r, fc, fp },
    )
  } finally {
    await limpiarFinal(orquesta)
  }
}
