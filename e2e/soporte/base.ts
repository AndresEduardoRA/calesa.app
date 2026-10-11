// Acceso de los e2e a la base y al correo del Supabase LOCAL. Los tests entran por el navegador;
// esto es sólo para preparar el terreno, mirar lo que el navegador no muestra y limpiar.
import { createClient } from '@supabase/supabase-js'

// Toda persona que crea un e2e usa este dominio: es lo único que la limpieza borra.
export const DOMINIO_E2E = 'e2e.importadora.test'

const MAILPIT = process.env['E2E_MAILPIT_URL'] ?? 'http://127.0.0.1:54624'

function entorno(nombre: string): string {
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

function admin() {
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
