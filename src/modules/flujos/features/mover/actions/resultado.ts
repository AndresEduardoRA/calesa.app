import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { MOTIVO_SIN_PERMISO_DE_MOVER } from '../../../entities/mover/para-mover'
import type { ResultadoDeMover } from '../../../entities/mover/repositorios'

export function sinPermisoDeMover() {
  return fallo('sin_permiso', MOTIVO_SIN_PERMISO_DE_MOVER)
}

// Lo que vuelve de la base, dicho como resultado de una action: el código del rechazo (`conflicto`, `requisitos`, `rol`, `nota`, `transicion`, `acceso`…) va como
// campo con su texto, para que la pantalla ponga cada motivo junto a lo que corresponde.
export function comoResultadoDeMover<T>(resultado: ResultadoDeMover<T>): ResultadoDeAccion<T> {
  if (resultado.ok) return resultado
  const { codigo, error } = resultado
  return { ok: false, error, ...(codigo ? { porCampo: { [codigo]: error.mensaje } } : {}) }
}
