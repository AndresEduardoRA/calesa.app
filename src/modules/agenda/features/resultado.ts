import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { FalloDeEscritura, ResultadoDeEscritura } from '../entities/escritura'

export const MENSAJE_DE_VALIDACION = 'Revisa los campos marcados.'

// Lo que vuelve del repositorio, dicho como resultado de una action: el motivo junto a su campo.
export function comoResultado(
  resultado: { ok: true; data: ResultadoDeEscritura } | FalloDeEscritura,
): ResultadoDeAccion<ResultadoDeEscritura> {
  if (resultado.ok) {
    return resultado
  }
  const { campo, error } = resultado
  return { ok: false, error, ...(campo ? { porCampo: { [campo]: error.mensaje } } : {}) }
}
