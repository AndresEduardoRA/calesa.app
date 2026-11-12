import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'
import type { ResultadoDeFase } from '../../../entities/fases/repositorios'

export const MOTIVO_SIN_PERMISO_DE_FASES =
  'No tienes permiso para configurar las fases de este flujo.'

// Quién cambia las fases de un flujo: quien lo configura (`flujos.configurar` en su origen, o `repuestos.configurar` para el de repuestos, que no
// tiene origen: `origenId` nulo). Es la primera llave: la base vuelve a exigirlo (`puede_configurar_flujo`) y manda.
export function motivoSinPermisoDeFases(
  permisos: Permisos,
  origenId: string | null,
): string | null {
  const permitido =
    origenId === null
      ? puede(permisos, 'repuestos.configurar')
      : puede(permisos, 'flujos.configurar', origenId)
  return permitido ? null : MOTIVO_SIN_PERMISO_DE_FASES
}

export function sinPermisoDeFases(motivo: string) {
  return fallo('sin_permiso', motivo)
}

// Lo que vuelve del repositorio, dicho como resultado de una action: el motivo junto a su campo.
export function comoResultado<T>(resultado: ResultadoDeFase<T>): ResultadoDeAccion<T> {
  if (resultado.ok) {
    return resultado
  }
  const { campo, error } = resultado
  return { ok: false, error, ...(campo ? { porCampo: { [campo]: error.mensaje } } : {}) }
}
