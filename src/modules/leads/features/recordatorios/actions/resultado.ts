import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { FalloDeRecordatorio, ResultadoDeRecordatorio } from '../../../entities/repositorios'

// Lo que vuelve del repositorio, dicho como resultado de una action: el motivo junto a su campo.
export function comoResultado(
  resultado: { ok: true; data: ResultadoDeRecordatorio } | FalloDeRecordatorio,
): ResultadoDeAccion<ResultadoDeRecordatorio> {
  if (resultado.ok) {
    return resultado
  }
  const { campo, error } = resultado
  return { ok: false, error, ...(campo ? { porCampo: { [campo]: error.mensaje } } : {}) }
}
