// Las carreras de la dominancia sobre la persona (9-1, paso 9.03-1): nadie bloquea a quien tiene permisos que él no cubre. La
// comprobación mira los roles de la persona, así que un cambio de roles o de permisos que corre a la vez tiene que esperar o ser
// esperado: gane quien gane, la persona no queda bloqueada por alguien que no la dominaba al confirmar. Cada carrera con dos conexiones
// reales (el arnés de `scripts/carreras.mjs`: A actúa y retiene, B espera un lock).
import { PREFIJO } from './terreno.mjs'

const ID = (n) => `00000000-0000-4000-8000-0000000c00${n}`
const DUENO = ID('30')
const ADMIN = ID('31')
const B1 = ID('32')
const B2 = ID('33')
const B3 = ID('34')
const TODAS = [DUENO, ADMIN, B1, B2, B3]
const MENSAJE = (nombre) =>
  `No puedes bloquear a ${PREFIJO} ${nombre}: tiene permisos que tú no tienes.`

// Va antes que `limpiar()` del terreno: sus cuentas tienen el correo `carreras-` y el dueño figura en `asignado_por`.
export async function limpiarDominancia(db) {
  await db.query(`delete from public.actividad where actor_id = any ($1::uuid[])`, [TODAS])
  // El dueño asignó roles (`asignado_por`): esas filas se van antes que las cuentas.
  await db.query(
    `delete from public.usuarios_roles where usuario_id = any ($1::uuid[]) or asignado_por = any ($1::uuid[])`,
    [TODAS],
  )
  await db.query(`delete from auth.users where id = any ($1::uuid[])`, [TODAS])
  await db.query(`delete from public.roles where clave like 'carreras_dom_%'`)
}

const rol = async (db, clave) =>
  (await db.query('select id from public.roles where clave = $1', [clave])).rows[0].id

// Como `postgres`: el dueño (rol `dueno`), A (gestiona el equipo y no ve el número global) y tres personas a bloquear; B3 con un
// rol propio de la carrera que el dueño amplía mientras A bloquea.
async function sembrarDominancia(db) {
  const personas = [
    [DUENO, 'dom-dueno', 'dueno'],
    [ADMIN, 'dom-admin', 'carreras_dom_equipo'],
    [B1, 'dom-b1', null],
    [B2, 'dom-b2', null],
    [B3, 'dom-b3', 'carreras_dom_ver'],
  ]
  await db.query(`insert into public.roles (clave, nombre) values
    ('carreras_dom_equipo', '${PREFIJO} dom equipo'), ('carreras_dom_numero', '${PREFIJO} dom número'), ('carreras_dom_ver', '${PREFIJO} dom ver')`)
  await db.query(`insert into public.roles_permisos (rol_id, permiso_clave)
    select r.id, x.clave from (values ('carreras_dom_equipo', 'equipo.usuarios.gestionar'), ('carreras_dom_equipo', 'equipo.usuarios.ver'),
      ('carreras_dom_numero', 'leads.numero_global.ver'), ('carreras_dom_ver', 'equipo.usuarios.ver')) x (rol, clave)
    join public.roles r on r.clave = x.rol`)
  for (const [id, nombre, clave] of personas) {
    await db.query(
      `insert into auth.users (id, email, raw_app_meta_data) values ($1, $2, '{"invitado": true}')`,
      [id, `carreras-${nombre}@ejemplo.com`],
    )
    await db.query(
      `update public.perfiles set nombre = $2, invitacion_aceptada_en = now() where id = $1`,
      [id, `${PREFIJO} ${nombre}`],
    )
    if (clave)
      await db.query(
        `insert into public.usuarios_roles (usuario_id, rol_id) select $1, id from public.roles where clave = $2 on conflict do nothing`,
        [id, clave],
      )
  }
}

const bloqueo = async (db, id) =>
  (await db.query('select bloqueado, bloqueado_por from public.perfiles where id = $1', [id]))
    .rows[0]

export async function carrerasDeDominancia({ orquesta, carrera, espero }) {
  await limpiarDominancia(orquesta)
  await sembrarDominancia(orquesta)
  try {
    const numero = await rol(orquesta, 'carreras_dom_numero')
    console.log('Bloquear a quien le cambian los roles a la vez (9-1)')

    // El dueño le asigna a B1 un rol que A no cubre; A, que intenta bloquearla, espera la fila de la persona y ve el rol nuevo.
    let r = await carrera(orquesta, {
      a: { persona: DUENO, sql: 'public.rbac_asignar_rol($1, $2)', args: [B1, numero] },
      b: { persona: ADMIN, sql: 'public.equipo_bloquear($1, true)', args: [B1] },
    })
    let fila = await bloqueo(orquesta, B1)
    espero(
      'asignar primero: A ya no domina a B1 (42501 con su mensaje) y B1 no queda bloqueada',
      r.b.codigo === '42501' && r.b.mensaje === MENSAJE('dom-b1') && !fila.bloqueado,
      { b: r.b, fila },
    )

    // A bloquea primero, cuando todavía la domina; el dueño le asigna el rol después.
    r = await carrera(orquesta, {
      a: { persona: ADMIN, sql: 'public.equipo_bloquear($1, true)', args: [B2] },
      b: { persona: DUENO, sql: 'public.rbac_asignar_rol($1, $2)', args: [B2, numero] },
    })
    fila = await bloqueo(orquesta, B2)
    espero(
      'bloquear primero: los dos confirman y B2 queda bloqueada por A, que la dominaba',
      r.b.ok && fila.bloqueado && fila.bloqueado_por === ADMIN,
      { b: r.b, fila },
    )

    // El dueño amplía por la matriz de Roles un rol que B3 ya tiene; A espera ese rol (`for share`) y ve el permiso nuevo.
    const ver = await rol(orquesta, 'carreras_dom_ver')
    const versionVer = (
      await orquesta.query('select actualizado_en::text as v from public.roles where id = $1', [
        ver,
      ])
    ).rows[0].v
    r = await carrera(orquesta, {
      a: {
        persona: DUENO,
        sql: 'public.rbac_otorgar($1, $2, $3)',
        args: [ver, 'leads.numero_global.ver', versionVer],
      },
      b: { persona: ADMIN, sql: 'public.equipo_bloquear($1, true)', args: [B3] },
    })
    fila = await bloqueo(orquesta, B3)
    espero(
      'otorgar primero: A ya no domina a B3 (42501 con su mensaje) y B3 no queda bloqueada',
      r.b.codigo === '42501' && r.b.mensaje === MENSAJE('dom-b3') && !fila.bloqueado,
      { b: r.b, fila },
    )
  } finally {
    await limpiarDominancia(orquesta)
  }
}
