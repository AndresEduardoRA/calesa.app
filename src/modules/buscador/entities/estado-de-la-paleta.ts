// Lo que la paleta (7.13-3) dibuja de su búsqueda y de «Últimos abiertos» (7.13-2). Puro: los hooks guardan estos valores y la pantalla los pinta.
import { MENSAJE_SIN_CONEXION, type ErrorApp } from '@/shared/lib/errores'
import type { Abierto, Seccion } from './ranking'

export type EstadoDeLaBusqueda =
  // Paleta cerrada o texto bajo el mínimo: se ven «Últimos abiertos» y las acciones.
  | { tipo: 'reposo' }
  // Hay un texto que alcanza y corre la espera de la escritura.
  | { tipo: 'esperando' }
  | { tipo: 'buscando' }
  // `secciones` vacío = «Sin resultados»; `parcial`: alguna sección no respondió; `porTelefono`: no se pidió leads (D4).
  | { tipo: 'listo'; secciones: Seccion[]; parcial: boolean; porTelefono: boolean }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'sin_conexion'; mensaje: string }

export type EstadoDeLosUltimos =
  | { tipo: 'cargando' }
  | { tipo: 'listo'; abiertos: Abierto[] }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'sin_conexion'; mensaje: string }

// «Sin conexión» no es un código de `ErrorApp`: `errorDePostgrest` da `inesperado` y cambia sólo el mensaje. Se decide por el navegador o por ese mensaje.
export function estadoDeError(
  error: ErrorApp,
  enLinea: boolean,
): { tipo: 'error' | 'sin_conexion'; mensaje: string } {
  return !enLinea || error.mensaje === MENSAJE_SIN_CONEXION
    ? { tipo: 'sin_conexion', mensaje: error.mensaje }
    : { tipo: 'error', mensaje: error.mensaje }
}
