import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { FalloDeVinculo } from '../../../entities/repositorios'

// Lo que vuelve del repositorio, dicho como resultado de una action: el motivo junto a su campo.
export function comoResultado<Dato>(
  resultado: { ok: true; data: Dato } | FalloDeVinculo,
): ResultadoDeAccion<Dato> {
  if (resultado.ok) {
    return resultado
  }
  const { campo, error } = resultado
  return { ok: false, error, ...(campo ? { porCampo: { [campo]: error.mensaje } } : {}) }
}

export const MENSAJE_DE_VALIDACION = 'Revisa los datos y vuelve a intentarlo.'
