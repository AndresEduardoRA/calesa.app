import 'server-only'
import { redirigir } from '@/shared/lib/navegacion'
import { fallo, type Resultado } from '@/shared/lib/errores'
import type { Permisos } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { leerSesion, servicioAcceso } from '../../composicion'
import { AVISOS } from '../../entities/avisos'
import { destinoDeCuentaInactiva } from '../../entities/canje'
import type { EstadoCuenta, Sesion } from '../../entities/sesion'

// Para toda pantalla de la app: devuelve la sesión o saca a la persona. Sin sesión va al ingreso
// (el proxy ya lo hizo antes, con `returnTo`; esto es la segunda barrera). Con la cuenta
// bloqueada o dada de baja va a `/auth/cerrar`, que es quien puede borrar las cookies.
export async function requerirSesion(): Promise<Sesion> {
  const sesion = await leerSesion()
  if (!sesion) {
    redirigir(RUTAS.ingreso)
  }
  if (sesion.estado !== 'activa') {
    redirigir(RUTAS.cierre)
  }
  return sesion
}

// Para la pantalla de contraseña nueva: se llega con la sesión que dejó el enlace del correo
// (recuperación o invitación). Sin ella, el enlace venció o se abrió la pantalla a mano.
export async function requerirSesionDeEnlace(): Promise<void> {
  const sesion = await leerSesion()
  if (!sesion) {
    redirigir(`${RUTAS.recuperar}?aviso=enlace_vencido`)
  }
  if (sesion.estado !== 'activa') {
    redirigir(RUTAS.cierre)
  }
}

// Las concesiones de quien llama; vacío si no hay sesión o la cuenta no está activa.
export async function getPermisos(): Promise<Permisos> {
  const sesion = await leerSesion()
  return sesion?.permisos ?? []
}

// Después de crear una sesión: si la cuenta no puede operar, se cierra ahí mismo y se devuelve
// el motivo. `null` = puede seguir.
export async function rechazarSiInactiva(
  estado: EstadoCuenta,
): Promise<{ resultado: Resultado<never>; destino: string } | null> {
  if (estado === 'activa') {
    return null
  }
  await servicioAcceso.cerrarSesion()
  return {
    resultado: fallo('sin_permiso', AVISOS[estado].mensaje),
    destino: destinoDeCuentaInactiva(estado),
  }
}

// Para `/auth/cerrar`: sólo cierra la sesión de una cuenta que no puede operar (así un enlace a
// esa ruta no sirve para desloguear a nadie) y dice a dónde ir.
export async function cerrarSiInactiva(): Promise<string> {
  const sesion = await leerSesion()
  if (!sesion) {
    return RUTAS.ingreso
  }
  const rechazo = await rechazarSiInactiva(sesion.estado)
  return rechazo?.destino ?? RUTAS.inicio
}
