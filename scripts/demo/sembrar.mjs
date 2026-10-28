// Deja la demo (o la base local) lista para mostrar, después de un reset: el dueño, una persona de demo por cada rol que no es
// el dueño, el registro cerrado y datos de ejemplo (leads, vehículos y cotizaciones). Lo llama `scripts/demo/restaurar.sh`
// después de `db reset`; no lee archivos `.env*`.
//
//   SEMBRAR_URL=… SEMBRAR_CLAVE_PUBLICA=… SEMBRAR_CLAVE_SECRETA=… DUENO_EMAIL=… DUENO_CLAVE=… CLAVE_USUARIOS=… node scripts/demo/sembrar.mjs
//
// Opcionales: `DUENO_NOMBRE` (el nombre del dueño; si no, «Dueño de la demo»), `SEMBRAR_URL_APP` (la dirección de la app, para
// el aviso final) y `APIBARA_CLAVE` (se guarda en la integración de apibara, como en «Integraciones» de la empresa).
//
// Todo entra como lo haría la app: las cuentas por la API de admin de Auth (la secret key sólo toca `auth.admin`, nunca una
// tabla), y lo demás con la sesión de quien corresponde y las RPC de cada pantalla (`rbac_asignar_rol`, `empresa_guardar_ajustes`,
// `integracion_guardar_secreto`, `crear_lead`, `vehiculo_crear`, `cotizacion_crear`…), así valen la RLS, los permisos, las
// versiones y los triggers. Correrlo dos veces no duplica nada: las cuentas se buscan por correo y cada dato lleva un id fijo.
// Nunca imprime una clave ni un token. Sale con 64 si falta una variable y con 1 si algo no se pudo sembrar.
import { pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { correoDeDemo, nombreDePersona } from './datos-de-demo.mjs'
import { FalloDeSiembra, exigir, sembrarDatos } from './siembra-de-datos.mjs'

export const OBLIGATORIAS = [
  'SEMBRAR_URL',
  'SEMBRAR_CLAVE_PUBLICA',
  'SEMBRAR_CLAVE_SECRETA',
  'DUENO_EMAIL',
  'DUENO_CLAVE',
  'CLAVE_USUARIOS',
]
export const SALIDA_DE_USO = 64
const CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const CUENTAS_POR_PAGINA = 1000
const SIN_SESION_GUARDADA = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
}

/**
 * @typedef {{ url: string, publica: string, secreta: string, duenoEmail: string, duenoClave: string, claveUsuarios: string,
 *   duenoNombre: string, urlApp: string | null, apibara: string | null }} Variables
 */

// Las variables, validadas. Los mensajes nombran la variable, nunca su valor.
/**
 * @param {Record<string, string | undefined>} env
 * @returns {{ ok: true, valores: Variables } | { ok: false, motivo: string }}
 */
export function leerVariables(env) {
  const faltan = OBLIGATORIAS.filter((nombre) => !(env[nombre] ?? '').trim())
  if (faltan.length) {
    return {
      ok: false,
      motivo: `Faltan variables: ${faltan.join(', ')}. Las pasa scripts/demo/restaurar.sh.`,
    }
  }
  const url = env.SEMBRAR_URL.trim().replace(/\/+$/, '')
  if (!/^https?:\/\/[^\s/]+$/.test(url)) {
    return {
      ok: false,
      motivo:
        'SEMBRAR_URL tiene que ser la dirección de la API (http(s)://servidor[:puerto]), sin ruta.',
    }
  }
  const duenoEmail = env.DUENO_EMAIL.trim().toLowerCase()
  if (!CORREO.test(duenoEmail)) {
    return { ok: false, motivo: 'DUENO_EMAIL no tiene forma de correo.' }
  }
  const apibara = (env.APIBARA_CLAVE ?? '').trim()
  if (apibara && (apibara.length < 8 || apibara.length > 500)) {
    return {
      ok: false,
      motivo: 'APIBARA_CLAVE tiene que tener entre 8 y 500 caracteres (como pide «Integraciones»).',
    }
  }
  return {
    ok: true,
    valores: {
      url,
      publica: env.SEMBRAR_CLAVE_PUBLICA.trim(),
      secreta: env.SEMBRAR_CLAVE_SECRETA.trim(),
      duenoEmail,
      duenoClave: env.DUENO_CLAVE,
      claveUsuarios: env.CLAVE_USUARIOS,
      duenoNombre: (env.DUENO_NOMBRE ?? '').trim() || 'Dueño de la demo',
      urlApp: (env.SEMBRAR_URL_APP ?? '').trim().replace(/\/+$/, '') || null,
      apibara: apibara || null,
    },
  }
}

async function entrar(v, email, clave) {
  const cliente = createClient(v.url, v.publica, SIN_SESION_GUARDADA)
  const sesion = exigir(
    await cliente.auth.signInWithPassword({ email, password: clave }),
    `entrar como ${email}`,
  )
  return { cliente, id: sesion.user.id, email }
}

// Las cuentas de Auth por correo, página por página (`listUsers` entrega a lo sumo 1.000 por vez).
async function cuentasPorCorreo(admin) {
  const cuentas = new Map()
  for (let pagina = 1; ; pagina++) {
    const { users } = exigir(
      await admin.listUsers({ page: pagina, perPage: CUENTAS_POR_PAGINA }),
      'listar las cuentas',
    )
    for (const u of users) if (u.email) cuentas.set(u.email.toLowerCase(), u.id)
    if (users.length < CUENTAS_POR_PAGINA) return cuentas
  }
}

async function tieneRol(dueno, usuario, rol) {
  const filas = exigir(
    await dueno.cliente
      .from('usuarios_roles')
      .select('rol_id')
      .eq('usuario_id', usuario)
      .eq('rol_id', rol)
      .limit(1),
    'leer los roles del equipo',
  )
  return filas.length > 0
}

// 1. El dueño: la primera cuenta nace dueña por el trigger `auth_crear_perfil()`. Si ya existe, no se toca.
async function prepararDueno(v, admin, cuentas) {
  const nuevo = !cuentas.has(v.duenoEmail)
  if (nuevo) {
    const datos = {
      email: v.duenoEmail,
      password: v.duenoClave,
      email_confirm: true,
      user_metadata: { nombre: v.duenoNombre },
    }
    exigir(await admin.createUser(datos), 'crear la cuenta del dueño')
  }
  const dueno = await entrar(v, v.duenoEmail, v.duenoClave)
  const roles = exigir(
    await dueno.cliente
      .from('roles')
      .select('id, clave, nombre')
      .order('orden')
      .order('nombre')
      .limit(100),
    'leer los roles',
  )
  const rolDueno = roles.find((r) => r.clave === 'dueno')
  if (!rolDueno || !(await tieneRol(dueno, dueno.id, rolDueno.id))) {
    throw new FalloDeSiembra(
      `${v.duenoEmail} no es dueño: otra cuenta se creó antes. Resetea la base y vuelve a sembrar.`,
    )
  }
  return { dueno, nuevo, roles: roles.filter((r) => r.id !== rolDueno.id) }
}

// 2. Una persona de demo por rol: la cuenta por admin, marcada como invitada (el registro está cerrado), y el rol con la sesión
// del dueño por `rbac_asignar_rol`, como «Invitar». Después entra ella y acepta la invitación, como al elegir su contraseña.
async function prepararPersona(v, admin, cuentas, dueno, rol, i) {
  const email = correoDeDemo(rol.clave)
  let id = cuentas.get(email)
  const nueva = !id
  if (nueva) {
    const datos = {
      email,
      password: v.claveUsuarios,
      email_confirm: true,
      user_metadata: { nombre: nombreDePersona(i) },
      app_metadata: { invitado: true },
    }
    id = exigir(await admin.createUser(datos), `crear la cuenta de ${email}`).user.id
  }
  if (!(await tieneRol(dueno, id, rol.id))) {
    const asignar = { p_usuario: id, p_rol: rol.id, p_principal: true }
    exigir(
      await dueno.cliente.rpc('rbac_asignar_rol', asignar),
      `darle el rol ${rol.nombre} a ${email}`,
    )
  }
  const sesion = await entrar(v, email, v.claveUsuarios)
  exigir(await sesion.cliente.rpc('equipo_aceptar_invitacion'), `aceptar la invitación de ${email}`)
  return { ...sesion, rol: rol.nombre, nueva }
}

// 3. El registro cerrado: nace cerrado; si alguien lo abrió, se cierra con la versión de los ajustes.
async function cerrarRegistro(dueno) {
  const [ajustes] = exigir(
    await dueno.cliente
      .from('ajustes_empresa')
      .select('registro_abierto, actualizado_en')
      .eq('id', 1)
      .limit(1),
    'leer los ajustes de la empresa',
  )
  if (!ajustes) throw new FalloDeSiembra('La empresa no tiene ajustes: ¿corrió el seed?')
  if (!ajustes.registro_abierto) return 'ya estaba cerrado'
  const cambio = {
    p_cambios: { registro_abierto: false },
    p_actualizado_en_esperado: ajustes.actualizado_en,
  }
  exigir(await dueno.cliente.rpc('empresa_guardar_ajustes', cambio), 'cerrar el registro')
  return 'cerrado ahora'
}

// La clave de apibara, si vino: por la RPC de «Integraciones», con la versión de la integración. Nunca se imprime.
async function guardarClaveDeApibara(dueno, clave) {
  const [integracion] = exigir(
    await dueno.cliente
      .from('integraciones')
      .select('actualizado_en')
      .eq('clave', 'apibara')
      .limit(1),
    'leer la integración de apibara',
  )
  if (!integracion) throw new FalloDeSiembra('La integración apibara no existe: ¿corrió el seed?')
  const pedido = {
    p_clave: 'apibara',
    p_secreto: clave,
    p_actualizado_en_esperado: integracion.actualizado_en,
  }
  exigir(
    await dueno.cliente.rpc('integracion_guardar_secreto', pedido),
    'guardar la clave de apibara',
  )
}

export async function sembrar(v, ahora = new Date()) {
  const admin = createClient(v.url, v.secreta, SIN_SESION_GUARDADA).auth.admin
  const cuentas = await cuentasPorCorreo(admin)
  const { dueno, nuevo, roles } = await prepararDueno(v, admin, cuentas)
  let apibara = 'sin clave de apibara'
  if (v.apibara) {
    await guardarClaveDeApibara(dueno, v.apibara)
    apibara = 'clave de apibara: guardada'
  }
  const personas = []
  for (const [i, rol] of roles.entries())
    personas.push(await prepararPersona(v, admin, cuentas, dueno, rol, i))
  const registro = await cerrarRegistro(dueno)
  const datos = await sembrarDatos({ dueno, personas, ahora })
  return {
    dueno: { email: v.duenoEmail, nuevo },
    personas,
    registro,
    apibara,
    datos,
    entrada: v.urlApp ?? v.url,
  }
}

const cuenta = (c) =>
  `${String(c.creados)} nuevos, ${String(c.yaEstaban)} ya estaban${c.omitidos.length ? `, ${String(c.omitidos.length)} sin sembrar` : ''}`

// El resumen para la terminal: cuántos de cada cosa, los correos (nunca las claves) y por dónde entrar.
export function textoDelResumen(r) {
  const d = r.datos
  const lineas = [
    `✓ dueño: ${r.dueno.email} (${r.dueno.nuevo ? 'creado' : 'ya existía'})`,
    `✓ personas de demo (${String(r.personas.length)}):`,
    ...r.personas.map((p) => `    ${p.email} — ${p.rol}${p.nueva ? '' : ' (ya existía)'}`),
    `✓ registro: ${r.registro}`,
    `✓ ${r.apibara}`,
  ]
  if (d.salteado) lineas.push(`· datos de ejemplo: no se siembran (${d.salteado})`)
  else {
    lineas.push(
      `✓ leads: ${cuenta(d.leads)} (con ${String(d.seguimientos)} seguimientos y ${String(d.recordatorios)} recordatorios nuevos)`,
      `✓ vehículos: ${cuenta(d.vehiculos)}`,
      `✓ cotizaciones: ${cuenta(d.cotizaciones)}`,
    )
    for (const [que, c] of [
      ['lead', d.leads],
      ['vehículo', d.vehiculos],
      ['cotización', d.cotizaciones],
    ]) {
      for (const o of c.omitidos) lineas.push(`· ${que} sin sembrar, ${o.que}: ${o.motivo}`)
    }
    for (const a of d.avisos) lineas.push(`· ${a}`)
    for (const f of d.fallos) lineas.push(`✗ ${f}`)
  }
  lineas.push(`Entra en ${r.entrada} con ${r.dueno.email}.`)
  return lineas.join('\n')
}

async function principal() {
  const leido = leerVariables(process.env)
  if (!leido.ok) {
    console.error(`✗ ${leido.motivo}`)
    process.exitCode = SALIDA_DE_USO
    return
  }
  try {
    const resumen = await sembrar(leido.valores)
    console.log(textoDelResumen(resumen))
    if (resumen.datos.fallos.length) process.exitCode = 1
  } catch (e) {
    console.error(
      `✗ ${e instanceof FalloDeSiembra ? e.message : e instanceof Error ? e.message : String(e)}`,
    )
    process.exitCode = 1
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await principal()
