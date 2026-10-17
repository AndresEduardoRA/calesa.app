// El terreno de las carreras: personas, un rol por alcance, leads y vehículos con un prefijo propio,
// escritos como `postgres` (por encima de la RLS) y confirmados, para que las dos conexiones los vean.
// `limpiar()` borra todo lo que lleve el prefijo, también lo que haya dejado una corrida rota.

export const PREFIJO = 'Carreras'
const CORREO = 'carreras-'

// Si el equipo está vacío (justo después de un reset), la primera cuenta nace dueña, como en la app: sin
// alguien que gestione el equipo, el guardián de roles no deja tocar a nadie. Borrar todas las cuentas
// del prefijo deja el equipo vacío otra vez.
const ADMINISTRA = '00000000-0000-4000-8000-0000000c0000'

export const PERSONAS = {
  duena: '00000000-0000-4000-8000-0000000c0001',
  compartido: '00000000-0000-4000-8000-0000000c0002',
  supervision: '00000000-0000-4000-8000-0000000c0003',
  destino: '00000000-0000-4000-8000-0000000c0004',
  // Quien configura los leads (los orígenes): leads.configurar, y crea y edita los suyos.
  configura: '00000000-0000-4000-8000-0000000c0005',
}

export async function limpiar(db) {
  const personas = [ADMINISTRA, ...Object.values(PERSONAS)]
  await db.query(`update public.vehiculos set lead_id = null where titulo like $1`, [`${PREFIJO}%`])
  await db.query(`delete from public.vehiculos where titulo like $1`, [`${PREFIJO}%`])
  await db.query(`delete from public.importaciones where usuario_id = any ($1::uuid[])`, [personas])
  await db.query(`delete from public.seguimientos where usuario_id = any ($1::uuid[])`, [personas])
  await db.query(`delete from public.leads where nombre like $1`, [`${PREFIJO}%`])
  // Los campos de las carreras de privacidad (9h), después de sus leads.
  await db.query(`delete from public.leads_campos where clave like 'carreras_%'`)
  // Los orígenes del lead que crearon las carreras (después de los leads: la FK es restrict).
  await db.query(`delete from public.origenes_lead where nombre like $1`, [`${PREFIJO}%`])
  await db.query(`delete from public.lotes_papelera where creado_por = any ($1::uuid[])`, [
    personas,
  ])
  await db.query(`delete from public.actividad where actor_id = any ($1::uuid[])`, [personas])
  // La cuenta arrastra su perfil y sus roles en la misma sentencia: el guardián mira el resultado.
  await db.query(`delete from auth.users where email like $1`, [`${CORREO}%`])
  await db.query(`delete from public.roles where clave like 'carreras_%'`)
}

// Dos roles: «propios» (asesoras) y «todos» (supervisión). Los dos ven y editan los vehículos de todo
// origen: lo que se prueba es el lead.
const ACCIONES = [
  'leads.ver',
  'leads.editar',
  'leads.compartir',
  'leads.transferir',
  'leads.eliminar',
  'leads.portal.gestionar',
]

export async function sembrar(db) {
  const { rows } = await db.query('select count(*)::int as n from public.perfiles')
  if (rows[0].n === 0) {
    await db.query(`insert into auth.users (id, email) values ($1, $2)`, [
      ADMINISTRA,
      `${CORREO}administra@ejemplo.com`,
    ])
  }
  const personas = Object.entries(PERSONAS)
  for (const [nombre, id] of personas) {
    await db.query(
      `insert into auth.users (id, email, raw_app_meta_data) values ($1, $2, '{"invitado": true}')`,
      [id, `${CORREO}${nombre}@ejemplo.com`],
    )
    await db.query(
      `update public.perfiles set nombre = $2, invitacion_aceptada_en = now() where id = $1`,
      [id, `${PREFIJO} ${nombre}`],
    )
  }
  for (const alcance of ['propios', 'todos']) {
    const {
      rows: [rol],
    } = await db.query(`insert into public.roles (clave, nombre) values ($1, $2) returning id`, [
      `carreras_${alcance}`,
      `${PREFIJO} ${alcance}`,
    ])
    for (const clave of ACCIONES) {
      await db.query(
        `insert into public.roles_permisos (rol_id, permiso_clave, alcance) values ($1, $2, $3)`,
        [rol.id, clave, alcance],
      )
    }
    for (const clave of ['leads.crear', 'vehiculos.ver', 'vehiculos.editar']) {
      await db.query(
        `insert into public.roles_permisos (rol_id, permiso_clave, alcance) values ($1, $2, 'todos')`,
        [rol.id, clave],
      )
    }
  }
  const {
    rows: [configura],
  } = await db.query(
    `insert into public.roles (clave, nombre) values ('carreras_configura', $1) returning id`,
    [`${PREFIJO} configura`],
  )
  for (const clave of ['leads.configurar', 'leads.ver', 'leads.crear', 'leads.editar']) {
    await db.query(
      `insert into public.roles_permisos (rol_id, permiso_clave, alcance) values ($1, $2, 'todos')`,
      [configura.id, clave],
    )
  }
  await db.query(
    `insert into public.usuarios_roles (usuario_id, rol_id)
     select p.id, r.id from (values ($1::uuid, 'carreras_propios'), ($2::uuid, 'carreras_propios'),
       ($3::uuid, 'carreras_todos'), ($4::uuid, 'carreras_propios'), ($5::uuid, 'carreras_configura')) p (id, clave)
     join public.roles r on r.clave = p.clave`,
    [
      PERSONAS.duena,
      PERSONAS.compartido,
      PERSONAS.supervision,
      PERSONAS.destino,
      PERSONAS.configura,
    ],
  )
}

// Un lead nuevo de la dueña (por su RPC, como en la app), opcionalmente compartido.
let telefono = 79000000
export async function leadDeLaDuena(db, nombre, { compartidoCon } = {}) {
  telefono += 1
  await comoPersona(db, PERSONAS.duena)
  const {
    rows: [fila],
  } = await db.query(
    `select public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', $1::text, 'telefono_principal', $2::text,
       'origen_lead_id', (select id from public.origenes_lead where activo order by orden, id limit 1))) as r`,
    [`${PREFIJO} ${nombre}`, String(telefono)],
  )
  await db.query('reset role')
  const id = fila.r?.lead?.id ?? fila.r?.id
  if (fila.r?.resultado !== 'creado' || !id)
    throw new Error(`alta de ${nombre}: ${JSON.stringify(fila.r)}`)
  if (compartidoCon) {
    await db.query(
      `insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por) values ($1, $2, 'compartido', $3)`,
      [id, compartidoCon, PERSONAS.duena],
    )
  }
  return id
}

export async function vehiculo(db, titulo) {
  const {
    rows: [fila],
  } = await db.query(
    `insert into public.vehiculos (origen_id, titulo, creado_por)
     values ((select id from public.origenes where clave = 'oficina'), $1, $2) returning id`,
    [`${PREFIJO} ${titulo}`, PERSONAS.duena],
  )
  return fila.id
}

// La sesión de una persona, como la arma PostgREST: rol `authenticated` y su `sub` en los claims.
export async function comoPersona(db, id) {
  await db.query(
    `select set_config('request.jwt.claim.sub', $1, false),
                         set_config('request.jwt.claims', json_build_object('sub', $1::text, 'role', 'authenticated')::text, false)`,
    [id],
  )
  await db.query('set role authenticated')
}
