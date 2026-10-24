import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { FalloDeNivel } from '../../../entities/repositorios-de-niveles'

// Lo que vuelve del repositorio, dicho como resultado de una action: el motivo junto a su campo.
export function comoResultado<T>(
  resultado: { ok: true; data: T } | FalloDeNivel,
): ResultadoDeAccion<T> {
  if (resultado.ok) {
    return resultado
  }
  const { campo, error } = resultado
  return { ok: false, error, ...(campo ? { porCampo: { [campo]: error.mensaje } } : {}) }
}
