// El route handler `/auth/callback` recibe tres cosas distintas por la misma puerta: el código
// de Google (PKCE), el enlace de un correo (`token_hash`) y los errores que Auth devuelve por
// redirección. Acá se lee la URL y se decide a dónde va la persona; canjear es de `infra`.
import { RUTAS, destinoTrasIngresar } from '@/shared/lib/rutas'
import type { ClaveAviso } from './avisos'
import { esRechazoDeRegistro } from './errores-acceso'
import type { EstadoCuenta } from './sesion'

// Los tipos de enlace que Supabase manda por correo.
export const TIPOS_ENLACE = [
  'signup',
  'recovery',
  'invite',
  'email',
  'magiclink',
  'email_change',
] as const
export type TipoEnlace = (typeof TIPOS_ENLACE)[number]

export type PedidoDeCanje =
  | { tipo: 'codigo'; codigo: string }
  | { tipo: 'enlace'; tokenHash: string; tipoEnlace: TipoEnlace }
  // Auth ya falló antes de volver: no hay nada que canjear.
  | { tipo: 'rechazo'; error: string; descripcion: string }
  | { tipo: 'vacio' }

function esTipoEnlace(valor: string | null): valor is TipoEnlace {
  return TIPOS_ENLACE.some((tipo) => tipo === valor)
}

export function leerCanje(parametros: URLSearchParams): PedidoDeCanje {
  const error = parametros.get('error')
  if (error) {
    return { tipo: 'rechazo', error, descripcion: parametros.get('error_description') ?? '' }
  }
  const tokenHash = parametros.get('token_hash')
  const tipoEnlace = parametros.get('type')
  if (tokenHash && esTipoEnlace(tipoEnlace)) {
    return { tipo: 'enlace', tokenHash, tipoEnlace }
  }
  const codigo = parametros.get('code')
  return codigo ? { tipo: 'codigo', codigo } : { tipo: 'vacio' }
}

function conAviso(ruta: string, aviso: ClaveAviso): string {
  return `${ruta}?aviso=${aviso}`
}

// Con la sesión ya creada. Quien recupera la contraseña o llega invitado todavía tiene que
// elegirla; el resto va a donde iba.
export function destinoTrasCanje(pedido: PedidoDeCanje, siguiente: string | null): string {
  if (
    pedido.tipo === 'enlace' &&
    (pedido.tipoEnlace === 'recovery' || pedido.tipoEnlace === 'invite')
  ) {
    return RUTAS.nuevaContrasena
  }
  return destinoTrasIngresar(siguiente)
}

const AVISO_POR_ENLACE: Partial<Record<TipoEnlace, ClaveAviso>> = {
  signup: 'confirmacion_vencida',
  email: 'confirmacion_vencida',
  invite: 'invitacion_vencida',
}

// Cuando no se pudo canjear. Cada caso vuelve a la pantalla desde la que se puede reintentar.
// `registroCerrado`: la base rechaza las cuentas nuevas al cerrar la transacción y Auth vuelve con
// un `server_error` sin detalle; con el registro cerrado, ese es el motivo más probable y el
// único que la persona puede resolver (pedir una invitación).
export function destinoDeFallo(pedido: PedidoDeCanje, registroCerrado = false): string {
  switch (pedido.tipo) {
    case 'vacio':
      return RUTAS.ingreso
    case 'rechazo':
      if (
        esRechazoDeRegistro(pedido.descripcion) ||
        (registroCerrado && pedido.error === 'server_error')
      ) {
        return conAviso(RUTAS.ingreso, 'registro_cerrado')
      }
      return conAviso(
        RUTAS.ingreso,
        pedido.error === 'access_denied' ? 'google_cancelado' : 'google',
      )
    case 'codigo':
      return conAviso(RUTAS.ingreso, 'google')
    case 'enlace':
      if (pedido.tipoEnlace === 'recovery') {
        return conAviso(RUTAS.recuperar, 'enlace_vencido')
      }
      return conAviso(RUTAS.ingreso, AVISO_POR_ENLACE[pedido.tipoEnlace] ?? 'enlace_vencido')
  }
}

// La sesión se creó pero la cuenta no puede operar: se cierra y se le dice por qué.
export function destinoDeCuentaInactiva(estado: Exclude<EstadoCuenta, 'activa'>): string {
  return conAviso(RUTAS.ingreso, estado)
}
