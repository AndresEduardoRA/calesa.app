// Acceso de los e2e a la base y al correo del Supabase LOCAL. Los tests entran por el navegador;
// esto es sólo para preparar el terreno, mirar lo que el navegador no muestra y limpiar.
import { createClient } from '@supabase/supabase-js'

// Toda persona que crea un e2e usa este dominio: es lo único que la limpieza borra.
export const DOMINIO_E2E = 'e2e.importadora.test'

const MAILPIT = process.env['E2E_MAILPIT_URL'] ?? 'http://127.0.0.1:54624'

export function entorno(nombre: string): string {
  // Next carga `.env.local` para la app; el proceso de Playwright no, así que se carga acá.
  if (!process.env[nombre]) {
    process.loadEnvFile('.env.local')
  }
  const valor = process.env[nombre]
  if (!valor) {
    throw new Error(`Falta ${nombre} en .env.local (lo imprime \`npx supabase status\`).`)
  }
  return valor
}

// El cliente de servicio: salta la RLS. Sólo para preparar, mirar y limpiar.
export function admin() {
  const url = entorno('NEXT_PUBLIC_SUPABASE_URL')
  if (!/127\.0\.0\.1|localhost/.test(url)) {
    // La limpieza borra cuentas: nunca contra un proyecto que no sea el local.
    throw new Error(`Los e2e sólo corren contra el Supabase local, no contra ${url}.`)
  }
  return createClient(url, entorno('SUPABASE_SECRET_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function correoDePrueba(etiqueta: string): string {
  return `${etiqueta}-${String(Date.now())}@${DOMINIO_E2E}`
}

async function cuentas() {
  const { data, error } = await admin().auth.admin.listUsers({ perPage: 1000 })
  if (error) {
    throw new Error(`No se pudo listar las cuentas: ${error.message}`)
  }
  return data.users
}

// Cuántas personas hay que NO creó un e2e.
export async function personasAjenas(): Promise<number> {
  return (await cuentas()).filter((cuenta) => !cuenta.email?.endsWith(`@${DOMINIO_E2E}`)).length
}

// Borra las cuentas de prueba, de la más nueva a la más vieja: la primera que se creó es la
// dueña y el guardián de la base no deja que el equipo quede sin quien lo administre mientras
// haya más gente.
export async function borrarPersonasDePrueba(): Promise<void> {
  const dePrueba = (await cuentas())
    .filter((cuenta) => cuenta.email?.endsWith(`@${DOMINIO_E2E}`))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  for (const cuenta of dePrueba) {
    const { error } = await admin().auth.admin.deleteUser(cuenta.id)
    if (error) {
      throw new Error(`No se pudo borrar ${cuenta.email ?? cuenta.id}: ${error.message}`)
    }
  }
}

// «La primera persona nace dueña» y «el guardián cuida a la última que administra» sólo se
// pueden probar sin nadie más en el equipo. No se borra a nadie que no haya creado un e2e: si hay
// gente, se avisa y se frena.
export async function exigirEquipoSinAjenos(): Promise<void> {
  const ajenas = await personasAjenas()
  if (ajenas > 0) {
    throw new Error(
      `La base local tiene ${String(ajenas)} persona(s) que no son de prueba. ` +
        'Este e2e necesita el equipo vacío: ejecuta `pnpm test:e2e:completo` (o `pnpm db:reset`).',
    )
  }
}

// Una cuenta lista para ingresar (correo confirmado y contraseña puesta), sin pasar por el
// registro ni por la pantalla de invitar. Con el equipo vacío es la primera: nace dueña. Las
// siguientes necesitan `invitada` (el registro está cerrado) y nacen sin rol.
export async function crearPersona(datos: {
  email: string
  contrasena: string
  nombre: string
  invitada?: boolean
}): Promise<void> {
  const { error } = await admin().auth.admin.createUser({
    email: datos.email,
    password: datos.contrasena,
    email_confirm: true,
    user_metadata: { nombre: datos.nombre },
    ...(datos.invitada ? { app_metadata: { invitado: true } } : {}),
  })
  if (error) {
    throw new Error(`No se pudo crear a ${datos.email}: ${error.message}`)
  }
}

type ConcesionEnLaBase = { permiso_clave: string; origen_id: string | null; alcance: string }

// Lo que un rol tiene otorgado, leído de la base (lo que la pantalla dice no alcanza).
export async function concesionesDelRol(nombre: string): Promise<ConcesionEnLaBase[]> {
  const { data, error } = await admin()
    .from('roles')
    .select('roles_permisos(permiso_clave, origen_id, alcance)')
    .eq('nombre', nombre)
    .single<{ roles_permisos: ConcesionEnLaBase[] }>()
  if (error) {
    throw new Error(`No se pudo leer el rol ${nombre}: ${error.message}`)
  }
  return data.roles_permisos
}

// Todo rol que crea un e2e se llama «E2E …»: es lo único que esta limpieza borra. Va después de
// borrar a las personas, porque un rol con alguien adentro no se elimina.
export const PREFIJO_ROL_E2E = 'E2E '

export async function borrarRolesDePrueba(): Promise<void> {
  const { error } = await admin().from('roles').delete().like('nombre', `${PREFIJO_ROL_E2E}%`)
  if (error) {
    throw new Error(`No se pudo borrar los roles de prueba: ${error.message}`)
  }
}

// Las claves de los roles de una persona, leídas de la base.
export async function rolesDe(email: string): Promise<string[]> {
  const cliente = admin()
  const { data: perfil, error } = await cliente
    .from('perfiles')
    .select('id')
    .eq('email', email)
    .single<{ id: string }>()
  if (error) {
    throw new Error(`No se pudo leer el perfil de ${email}: ${error.message}`)
  }
  const { data: filas, error: errorDeRoles } = await cliente
    .from('usuarios_roles')
    .select('roles(clave)')
    .eq('usuario_id', perfil.id)
    .returns<{ roles: { clave: string } | null }[]>()
  if (errorDeRoles) {
    throw new Error(`No se pudo leer los roles de ${email}: ${errorDeRoles.message}`)
  }
  return filas.flatMap((fila) => (fila.roles ? [fila.roles.clave] : []))
}

type Busqueda = { messages: { ID: string }[] }
type Mensaje = { HTML: string }

// El enlace del último correo que Auth le mandó a esa dirección, como ruta de ESTA app. La
// plantilla lo arma con la URL del sitio (el puerto de desarrollo); acá sólo importa la ruta.
export async function enlaceDelCorreo(email: string): Promise<string> {
  const consulta = encodeURIComponent(`to:"${email}"`)
  for (let intento = 0; intento < 40; intento++) {
    const respuesta = await fetch(`${MAILPIT}/api/v1/search?query=${consulta}`)
    const busqueda = (await respuesta.json()) as Busqueda
    const ultimo = busqueda.messages[0]
    if (ultimo) {
      const detalle = await fetch(`${MAILPIT}/api/v1/message/${ultimo.ID}`)
      const { HTML } = (await detalle.json()) as Mensaje
      const enlace = /href="[^"]*(\/auth\/callback\?[^"]+)"/.exec(HTML)?.[1]
      if (!enlace) {
        throw new Error(`El correo a ${email} no trae un enlace a /auth/callback.`)
      }
      return enlace.replaceAll('&amp;', '&')
    }
    await new Promise((resolver) => setTimeout(resolver, 250))
  }
  throw new Error(`No llegó ningún correo a ${email} (¿está corriendo \`npx supabase start\`?).`)
}

// Un permiso de un rol de prueba: la clave sola vale en todos los orígenes y para todo; con
// `origenId` se acota a ese origen, y con `alcance` a lo propio.
export type PermisoDePrueba =
  string | { clave: string; origenId?: string; alcance?: 'propios' | 'todos' }

// Un rol de prueba con los permisos dados y una persona que lo tiene, sin pasar por la matriz ni
// por la pantalla de invitar. El nombre lleva `PREFIJO_ROL_E2E`.
export async function darRolDePrueba(datos: {
  email: string
  rol: { nombre: string; clave: string }
  permisos: PermisoDePrueba[]
}): Promise<void> {
  const cliente = admin()
  const { data: rol, error } = await cliente
    .from('roles')
    .insert(datos.rol)
    .select('id')
    .single<{ id: string }>()
  if (error) {
    throw new Error(`No se pudo crear el rol ${datos.rol.nombre}: ${error.message}`)
  }
  const concesiones = datos.permisos.map((permiso) => {
    const { clave, origenId, alcance } = typeof permiso === 'string' ? { clave: permiso } : permiso
    return {
      rol_id: rol.id,
      permiso_clave: clave,
      origen_id: origenId ?? null,
      alcance: alcance ?? 'todos',
    }
  })
  const { error: errorDePermisos } = await cliente.from('roles_permisos').insert(concesiones)
  if (errorDePermisos) {
    throw new Error(`No se pudo dar permisos a ${datos.rol.nombre}: ${errorDePermisos.message}`)
  }
  const { data: perfil, error: errorDePerfil } = await cliente
    .from('perfiles')
    .select('id')
    .eq('email', datos.email)
    .single<{ id: string }>()
  if (errorDePerfil) {
    throw new Error(`No se pudo leer el perfil de ${datos.email}: ${errorDePerfil.message}`)
  }
  const { error: errorDeRol } = await cliente
    .from('usuarios_roles')
    .insert({ usuario_id: perfil.id, rol_id: rol.id, es_principal: true })
  if (errorDeRol) {
    throw new Error(`No se pudo asignar el rol a ${datos.email}: ${errorDeRol.message}`)
  }
}

// Una persona que administra todo, para los e2e que necesitan «la dueña». Con el equipo vacío es la
// primera cuenta y nace dueña. Con gente en el equipo (quien usa la app local) la primera ya no
// puede nacer así: entra invitada y se le da el rol de dueño, con los mismos permisos.
export async function crearDuenaDePrueba(datos: {
  email: string
  contrasena: string
  nombre: string
}): Promise<void> {
  const hayEquipo = (await personasAjenas()) > 0
  await crearPersona({ ...datos, ...(hayEquipo ? { invitada: true } : {}) })
  if (!hayEquipo) {
    return
  }
  const cliente = admin()
  const { data: perfil, error: errorDePerfil } = await cliente
    .from('perfiles')
    .select('id')
    .eq('email', datos.email)
    .single<{ id: string }>()
  const { data: rol, error: errorDeRol } = await cliente
    .from('roles')
    .select('id')
    .eq('clave', 'dueno')
    .single<{ id: string }>()
  if (errorDePerfil || errorDeRol) {
    throw new Error(
      `No se pudo preparar a ${datos.email}: ${(errorDePerfil ?? errorDeRol)?.message ?? ''}`,
    )
  }
  const { error } = await cliente
    .from('usuarios_roles')
    .insert({ usuario_id: perfil.id, rol_id: rol.id, es_principal: true })
  if (error) {
    throw new Error(`No se pudo darle el rol de dueño a ${datos.email}: ${error.message}`)
  }
  // Entró por la puerta de atrás, pero no es una invitación a medias: la dueña ya está adentro.
  const aceptada = await cliente
    .from('perfiles')
    .update({ invitacion_aceptada_en: new Date().toISOString() })
    .eq('id', perfil.id)
  if (aceptada.error) {
    throw new Error(`No se pudo aceptar la invitación de ${datos.email}: ${aceptada.error.message}`)
  }
}

// Los tests que sólo se pueden probar con el equipo vacío («la primera persona nace dueña», «el
// guardián cuida a la última que administra»). `pnpm test:e2e:completo` resetea la base antes y pone
// `E2E_COMPLETO=1`: ahí, que haya gente es un error del entorno, no algo que saltar. Un spec suelto
// sobre una base con cuentas (`pnpm test:e2e <spec>`) se salta con un aviso. También es un error en CI.
export async function hayEquipoQueImpide(): Promise<{ saltar: boolean; motivo: string }> {
  const ajenas = await personasAjenas()
  if (ajenas === 0) {
    return { saltar: false, motivo: '' }
  }
  if (process.env['CI'] || process.env['E2E_COMPLETO']) {
    await exigirEquipoSinAjenos()
  }
  return {
    saltar: true,
    motivo:
      `AVISO: la base local tiene ${String(ajenas)} persona(s) que no son de prueba; este test ` +
      'necesita el equipo vacío. Se salta: para correrlo, `pnpm test:e2e:completo` (resetea la base).',
  }
}
