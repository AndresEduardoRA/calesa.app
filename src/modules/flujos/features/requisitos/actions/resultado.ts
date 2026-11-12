import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'
import type { AmbitoDeFlujo } from '../../../entities/flujo'
import type { ResultadoDeRequisito } from '../../../entities/requisitos/repositorios'

export const MOTIVO_SIN_PERMISO_DE_REQUISITOS = 'No puedes configurar los requisitos de este flujo.'

// Quién cambia los requisitos de un flujo: quien lo configura (`flujos.configurar`, o `repuestos.configurar` para el de repuestos; el permiso por origen lo
// decide la base). Es la primera llave: la base vuelve a exigirlo.
export function motivoSinPermisoDeRequisitos(
  permisos: Permisos,
  ambito: AmbitoDeFlujo,
): string | null {
  const clave = ambito === 'repuestos' ? 'repuestos.configurar' : 'flujos.configurar'
  return puede(permisos, clave) ? null : MOTIVO_SIN_PERMISO_DE_REQUISITOS
}

export function sinPermisoDeRequisitos(motivo: string) {
  return fallo('sin_permiso', motivo)
}

// Lo que vuelve del repositorio, dicho como resultado de una action: el motivo junto a su campo.
export function comoResultado<T>(resultado: ResultadoDeRequisito<T>): ResultadoDeAccion<T> {
  if (resultado.ok) {
    return resultado
  }
  const { campo, error } = resultado
  return { ok: false, error, ...(campo ? { porCampo: { [campo]: error.mensaje } } : {}) }
}
