// Rutas del acceso y la regla que decide quién pasa. Son nombres de rutas, no reglas del negocio:
// las usan `src/proxy.ts`, las actions de ingreso y el route handler que canjea los enlaces.

export const RUTAS = {
  inicio: '/',
  ingreso: '/ingreso',
  registro: '/registro',
  recuperar: '/recuperar',
  canje: '/auth/callback',
  nuevaContrasena: '/auth/nueva-contrasena',
  cierre: '/auth/cerrar',
  perfil: '/perfil',
  notificaciones: '/notificaciones',
  configuracion: '/configuracion',
  equipo: '/configuracion/equipo',
  roles: '/configuracion/roles',
  empresa: '/configuracion/empresa',
  origenes: '/configuracion/origenes',
  configuracionDeLeads: '/configuracion/leads',
  configuracionDeCotizacion: '/configuracion/cotizacion',
  configuracionDeFlujos: '/configuracion/flujos',
  configuracionDeLogistica: '/configuracion/logistica',
  configuracionDeRepuestos: '/configuracion/repuestos',
  configuracionDeWeb: '/configuracion/web',
  configuracionDeColaWeb: '/configuracion/cola-web',
  leads: '/leads',
  papeleraDeLeads: '/leads/papelera',
  importarLeads: '/leads/importar',
  vehiculos: '/vehiculos',
  nuevoVehiculo: '/vehiculos?panel=nuevo',
  papeleraDeVehiculos: '/vehiculos/papelera',
  logistica: '/logistica',
  embarques: '/logistica/embarques',
  aduana: '/logistica/aduana',
  gastosDeLogistica: '/logistica/gastos',
  repuestos: '/repuestos',
  cotizaciones: '/cotizaciones',
  nuevaCotizacion: '/cotizaciones/nuevo',
} as const

// El valor de `?panel=` que abre el alta de un vehículo (`RUTAS.nuevoVehiculo`). Vive acá porque lo leen el módulo `vehiculos` y la paleta del buscador (que no puede importarlo).
export const PANEL_NUEVO_DE_VEHICULOS = 'nuevo'

// La unidad de logística (6.01) tiene su propia página: a ella apuntan las notificaciones de demora. `RUTAS` es un objeto fijo; la que lleva un id es una función.
export function unidadDeLogistica(id: string): string {
  return `${RUTAS.logistica}/vehiculo/${encodeURIComponent(id)}`
}

// Quien ya tiene sesión no tiene nada que hacer acá.
const SOLO_SIN_SESION: readonly string[] = [RUTAS.ingreso, RUTAS.registro]

// Se ven sin sesión. `/auth/*` incluye el canje de enlaces y la pantalla de contraseña nueva,
// que decide por su cuenta qué mostrar si la sesión de recuperación no llegó.
const PUBLICAS: readonly string[] = [RUTAS.ingreso, RUTAS.registro, RUTAS.recuperar]
const PREFIJO_PUBLICO = '/auth/'
// El portal del cliente no tiene sesión de Supabase: su cookie firmada la valida cada handler de `api/portal/*`.
const PREFIJO_DEL_PORTAL = '/api/portal/'

export function esRutaPublica(ruta: string): boolean {
  return (
    PUBLICAS.includes(ruta) ||
    ruta.startsWith(PREFIJO_PUBLICO) ||
    ruta.startsWith(PREFIJO_DEL_PORTAL)
  )
}

// Un `returnTo` viene de la URL: lo puede escribir cualquiera. Sólo vale una ruta interna
// (`/algo`), nunca otro sitio (`//otro.com`, `/\otro.com`) ni una pantalla de acceso, que
// devolvería a la persona al punto de partida.
export function returnToSeguro(valor: string | null | undefined): string | null {
  if (!valor?.startsWith('/') || valor.startsWith('//') || valor.includes('\\')) {
    return null
  }
  // Caracteres de control: un salto de línea en una cabecera `Location` es una inyección.
  if ([...valor].some((caracter) => caracter.charCodeAt(0) < 32)) {
    return null
  }
  const ruta = valor.split(/[?#]/)[0] ?? valor
  return esRutaPublica(ruta) ? null : valor
}

// A dónde va alguien después de ingresar.
export function destinoTrasIngresar(returnTo: string | null | undefined): string {
  return returnToSeguro(returnTo) ?? RUTAS.inicio
}

export function rutaDeIngreso(returnTo?: string | null): string {
  const seguro = returnToSeguro(returnTo)
  if (!seguro || seguro === RUTAS.inicio) {
    return RUTAS.ingreso
  }
  return `${RUTAS.ingreso}?returnTo=${encodeURIComponent(seguro)}`
}

export type PeticionDeAcceso = {
  ruta: string
  // La query tal cual llega, con su `?` (o vacía).
  busqueda: string
  haySesion: boolean
  // Una Server Action no se redirige: tiene que poder responder «tu sesión venció» sin que la
  // persona pierda el formulario que tiene abierto.
  esAccion: boolean
}

export type DecisionDeAcceso = { tipo: 'seguir' } | { tipo: 'redirigir'; destino: string }

export function decidirAcceso(peticion: PeticionDeAcceso): DecisionDeAcceso {
  const { ruta, busqueda, haySesion, esAccion } = peticion
  if (esAccion) {
    return { tipo: 'seguir' }
  }
  if (haySesion) {
    if (!SOLO_SIN_SESION.includes(ruta)) {
      return { tipo: 'seguir' }
    }
    const returnTo = new URLSearchParams(busqueda).get('returnTo')
    return { tipo: 'redirigir', destino: destinoTrasIngresar(returnTo) }
  }
  if (esRutaPublica(ruta)) {
    return { tipo: 'seguir' }
  }
  return { tipo: 'redirigir', destino: rutaDeIngreso(`${ruta}${busqueda}`) }
}

// Un parámetro de `searchParams` puede venir repetido (`?a=1&a=2`): vale el primero.
export function unParametro(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor
}
