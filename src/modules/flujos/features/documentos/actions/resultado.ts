import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'
import type { ResultadoDeTipo } from '../../../entities/documentos/repositorios'

export const MOTIVO_SIN_PERMISO_TIPOS_DE_EMPRESA =
  'Los tipos de documento de toda la empresa los cambia quien gestiona los catálogos de logística.'
export const MOTIVO_SIN_PERMISO_TIPOS_DEL_FLUJO =
  'No puedes configurar los tipos de documento de este flujo.'

// Quién cambia un grupo: los de toda la empresa (`flujoId` nulo), quien gestiona los catálogos de logística; los de un flujo, quien lo configura
// (`flujos.configurar`, o `repuestos.configurar` para el de repuestos; el permiso por origen lo decide la base). Es la primera llave: la base vuelve a exigirlo.
export function motivoSinPermisoDelGrupo(
  permisos: Permisos,
  flujoId: string | null,
): string | null {
  if (flujoId === null) {
    return puede(permisos, 'logistica.catalogos.gestionar')
      ? null
      : MOTIVO_SIN_PERMISO_TIPOS_DE_EMPRESA
  }
  return puede(permisos, 'flujos.configurar') || puede(permisos, 'repuestos.configurar')
    ? null
    : MOTIVO_SIN_PERMISO_TIPOS_DEL_FLUJO
}

export function sinPermisoDeTipos(motivo: string) {
  return fallo('sin_permiso', motivo)
}

// Lo que vuelve del repositorio, dicho como resultado de una action: el motivo junto a su campo.
export function comoResultado<T>(resultado: ResultadoDeTipo<T>): ResultadoDeAccion<T> {
  if (resultado.ok) {
    return resultado
  }
  const { campo, error } = resultado
  return { ok: false, error, ...(campo ? { porCampo: { [campo]: error.mensaje } } : {}) }
}
