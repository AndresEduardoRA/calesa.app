// Las carreras de la dominancia (9-1, paso 9.03-1): nadie bloquea a quien tiene permisos que él no cubre ni edita un rol que no
// domina. La comprobación mira los roles de la persona y los de quien llama, así que un cambio de roles o de permisos que corre a la
// vez —también el que le quita a quien llama lo que le daba la dominancia— tiene que esperar o ser esperado: gane quien gane, nada
// queda hecho por alguien que no dominaba al confirmar. Cada carrera con dos conexiones reales (el arnés de `scripts/carreras.mjs`:
// A actúa y retiene, B espera un lock).
import { PREFIJO } from './terreno.mjs'

const ID = (n) => `00000000-0000-4000-8000-0000000c00${n}`
const DUENO = ID('30')
const ADMIN = ID('31')
const B1 = ID('32')
const B2 = ID('33')
const B3 = ID('34')
const ADMIN2 = ID('35')
const TOTAL = ID('36')
const ROLES_A = ID('37')
const ROLES_B = ID('38')
const BAJA_A = ID('39')
const BAJA_B = ID('40')
const TODAS = [DUENO, ADMIN, B1, B2, B3, ADMIN2, TOTAL, ROLES_A, ROLES_B, BAJA_A, BAJA_B]
const NIVEL = `${PREFIJO} dom nivel`
const MENSAJE = (nombre) =>
  `No puedes bloquear a ${PREFIJO} ${nombre}: tiene permisos que tú no tienes.`

// Va antes que `limpiar()` del terreno: sus cuentas tienen el correo `carreras-` y el dueño figura en `asignado_por`. El nivel que
// crea el dueño se va con sus permisos en una transacción (el trigger diferido pide los dos al cerrar) y deja lugar bajo el tope
// de niveles a las carreras de niveles, que corren después.
export async function limpiarDominancia(db) {
  await db.query('begin')
  try {
    await db.query(
      `delete from public.permisos where nivel_clave in (select clave from public.cotizaciones_niveles where nombre = $1)`,
      [NIVEL],
    )
    await db.query(`delete from public.cotizaciones_niveles where nombre = $1`, [NIVEL])
    await db.query('commit')
  } catch (e) {
    await db.query('rollback')
    throw e
  }
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
// rol propio de la carrera que el dueño amplía mientras A bloquea. Para lo que cambia en quien llama: A2 (el mismo rol que A), TOTAL
// (todos los permisos que hay al sembrar: domina al dueño), dos personas con roles gemelos que editan roles y dos más con el rol de A
// que se dan de baja.
async function sembrarDominancia(db) {
  const personas = [
    [DUENO, 'dom-dueno', 'dueno'],
    [ADMIN, 'dom-admin', 'carreras_dom_equipo'],
    [B1, 'dom-b1', null],
    [B2, 'dom-b2', null],
    [B3, 'dom-b3', 'carreras_dom_ver'],
    [ADMIN2, 'dom-admin2', 'carreras_dom_equipo'],
    [TOTAL, 'dom-total', 'carreras_dom_total'],
    [ROLES_A, 'dom-roles-a', 'carreras_dom_roles_a'],
    [ROLES_B, 'dom-roles-b', 'carreras_dom_roles_b'],
    [BAJA_A, 'dom-baja-a', 'carreras_dom_equipo'],
    [BAJA_B, 'dom-baja-b', 'carreras_dom_equipo'],
  ]
  await db.query(`insert into public.roles (clave, nombre) values
    ('carreras_dom_equipo', '${PREFIJO} dom equipo'), ('carreras_dom_numero', '${PREFIJO} dom número'), ('carreras_dom_ver', '${PREFIJO} dom ver'),
    ('carreras_dom_total', '${PREFIJO} dom total'), ('carreras_dom_roles_a', '${PREFIJO} dom roles a'), ('carreras_dom_roles_b', '${PREFIJO} dom roles b')`)
  await db.query(`insert into public.roles_permisos (rol_id, permiso_clave)
    select r.id, x.clave from (values ('carreras_dom_equipo', 'equipo.usuarios.gestionar'), ('carreras_dom_equipo', 'equipo.usuarios.ver'),
      ('carreras_dom_numero', 'leads.numero_global.ver'), ('carreras_dom_ver', 'equipo.usuarios.ver'),
      ('carreras_dom_roles_a', 'equipo.roles.gestionar'), ('carreras_dom_roles_a', 'equipo.usuarios.ver'), ('carreras_dom_roles_a', 'leads.numero_global.ver'),
      ('carreras_dom_roles_b', 'equipo.roles.gestionar'), ('carreras_dom_roles_b', 'equipo.usuarios.ver'), ('carreras_dom_roles_b', 'leads.numero_global.ver')) x (rol, clave)
    join public.roles r on r.clave = x.rol`)
  await db.query(`insert into public.roles_permisos (rol_id, permiso_clave)
    select r.id, p.clave from public.roles r cross join public.permisos p where r.clave = 'carreras_dom_total'`)
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
const version = async (db, id) =>
  (await db.query('select actualizado_en::text as v from public.roles where id = $1', [id])).rows[0]
    .v
const tiene = async (db, id, clave) =>
  (
    await db.query('select 1 from public.roles_permisos where rol_id = $1 and permiso_clave = $2', [
      id,
      clave,
    ])
  ).rowCount > 0

export async function carrerasDeDominancia({ orquesta, carrera, espero }) {
  await limpiarDominancia(orquesta)
  await sembrarDominancia(orquesta)
  try {
    await sobreLaPersona({ orquesta, carrera, espero })
    await sobreQuienLlama({ orquesta, carrera, espero })
  } finally {
    await limpiarDominancia(orquesta)
  }
}

async function sobreLaPersona({ orquesta, carrera, espero }) {
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
  r = await carrera(orquesta, {
    a: {
      persona: DUENO,
      sql: 'public.rbac_otorgar($1, $2, $3)',
      args: [ver, 'leads.numero_global.ver', await version(orquesta, ver)],
    },
    b: { persona: ADMIN, sql: 'public.equipo_bloquear($1, true)', args: [B3] },
  })
  fila = await bloqueo(orquesta, B3)
  espero(
    'otorgar primero: A ya no domina a B3 (42501 con su mensaje) y B3 no queda bloqueada',
    r.b.codigo === '42501' && r.b.mensaje === MENSAJE('dom-b3') && !fila.bloqueado,
    { b: r.b, fila },
  )

  // El dueño crea un nivel: su rol suma los dos permisos del nivel, que TOTAL no tiene. TOTAL espera y ya no domina al dueño.
  r = await carrera(orquesta, {
    a: {
      persona: DUENO,
      sql: 'public.nivel_crear(gen_random_uuid(), $1)',
      args: [NIVEL],
    },
    b: { persona: TOTAL, sql: 'public.equipo_bloquear($1, true)', args: [DUENO] },
  })
  fila = await bloqueo(orquesta, DUENO)
  espero(
    'crear un nivel primero: TOTAL ya no domina al dueño (42501 con su mensaje) y el dueño no queda bloqueado',
    r.b.codigo === '42501' && r.b.mensaje === MENSAJE('dom-dueno') && !fila.bloqueado,
    { b: r.b, fila },
  )
}

async function sobreQuienLlama({ orquesta, carrera, espero }) {
  console.log('Lo que le da la dominancia a quien llama cambia mientras actúa')

  // A y A2 se bloquean a la vez: A primero; A2 espera y ya está bloqueada.
  let r = await carrera(orquesta, {
    a: { persona: ADMIN, sql: 'public.equipo_bloquear($1, true)', args: [ADMIN2] },
    b: { persona: ADMIN2, sql: 'public.equipo_bloquear($1, true)', args: [ADMIN] },
  })
  const fila = await bloqueo(orquesta, ADMIN)
  espero(
    'bloquearse a la vez: A2 ya está bloqueada (42501) y A no queda bloqueada',
    r.b.codigo === '42501' &&
      r.b.mensaje === 'Tu cuenta está bloqueada o dada de baja.' &&
      !fila.bloqueado,
    { b: r.b, fila },
  )

  // Dos que se dan de baja a la vez (las bajas no se esperan entre sí por el candado de la dominancia, sino por las dos cuentas).
  r = await carrera(orquesta, {
    a: { persona: BAJA_A, sql: 'public.equipo_dar_de_baja($1)', args: [BAJA_B] },
    b: { persona: BAJA_B, sql: 'public.equipo_dar_de_baja($1)', args: [BAJA_A] },
  })
  const activa = (
    await orquesta.query('select activo from public.perfiles where id = $1', [BAJA_A])
  ).rows[0].activo
  espero(
    'darse de baja a la vez: la segunda ya no forma parte del equipo (42501) y la primera sigue activa',
    r.b.codigo === '42501' && r.b.mensaje === 'Tu cuenta está bloqueada o dada de baja.' && activa,
    { b: r.b, activa },
  )

  // Dos roles gemelos: cada persona le quita al rol de la otra un permiso. Después del primero, B ya no tiene el número global que
  // tiene el rol de A: espera y no lo domina.
  const [rolA, rolB] = [
    await rol(orquesta, 'carreras_dom_roles_a'),
    await rol(orquesta, 'carreras_dom_roles_b'),
  ]
  r = await carrera(orquesta, {
    a: {
      persona: ROLES_A,
      sql: 'public.rbac_revocar($1, $2, $3)',
      args: [rolB, 'leads.numero_global.ver', await version(orquesta, rolB)],
    },
    b: {
      persona: ROLES_B,
      sql: 'public.rbac_revocar($1, $2, $3)',
      args: [rolA, 'equipo.usuarios.ver', await version(orquesta, rolA)],
    },
  })
  espero(
    'recortarse los roles a la vez: el segundo ya no domina (42501) y el rol de A conserva el permiso',
    r.b.codigo === '42501' &&
      r.b.mensaje === 'No puedes editar un rol con permisos que no tienes.' &&
      (await tiene(orquesta, rolA, 'equipo.usuarios.ver')),
    { b: r.b },
  )
}
